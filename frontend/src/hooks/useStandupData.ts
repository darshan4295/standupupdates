import { useState, useEffect, useMemo, useCallback } from 'react';
import { StandupAnalysisReport, DailyUpdateReportItem, FilterOptions, TeamMember, CombinedAnalysisResponse, ChatMemberInfo } from '../types';
import { ProfilePhotoService } from '../services/ProfilePhotoService';
import { mockTeamMembers } from '../services/mockData'; // For potential avatar enrichment

interface UseStandupDataProps {
  accessToken?: string;
  chatId?: string;
}

// Define the expected structure of the API response from /api/analyze-chat
interface BackendApiResponse {
  success: boolean;
  data?: CombinedAnalysisResponse; // This now holds both analysis and allChatMembers
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
  message?: string;
  details?: any;
}

export const useStandupData = ({ accessToken, chatId }: UseStandupDataProps = {}) => {
  const [analysisReport, setAnalysisReport] = useState<StandupAnalysisReport | null>(null);
  const [allChatMembersState, setAllChatMembersState] = useState<ChatMemberInfo[]>([]);
  const [membersWithoutUpdates, setMembersWithoutUpdates] = useState<ChatMemberInfo[]>([]); // New state for members without updates
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    selectedMembers: [], // These will now filter by employeeName (string)
    dateRange: { start: '', end: '' },
    projectFilter: '',
    approvalStatus: 'all' // Default to 'all'
  });

  // Default chat ID
  const defaultChatId = '19:0ff2ed4d24904eda9d794c796ba49a78@thread.v2';
  const activeChatId = chatId || defaultChatId;

  // Core data fetching logic
  const fetchAnalysisData = useCallback(async (currentFilters: FilterOptions) => {
    if (!activeChatId) {
      setLoading(false);
      setError("Chat ID is not selected.");
      setAnalysisReport(null);
      setAllChatMembersState([]);
      setMembersWithoutUpdates([]);
      return;
    }
    if (!accessToken) {
      setLoading(false);
      setError("Access token is not available.");
      setAnalysisReport(null);
      setAllChatMembersState([]);
      setMembersWithoutUpdates([]);
      return;
    }

    // Ensure dateRange has valid values before sending
    // The FilterSidebar should initialize this to 'today'
    if (!currentFilters.dateRange.start || !currentFilters.dateRange.end) {
      console.warn('useStandupData: Date range not set, data fetch might be incomplete or use backend defaults.');
      // Potentially set an error or don't fetch, depending on desired behavior
      // For now, we'll let it proceed, but the backend might not filter by date
    }

    console.log('useStandupData: Fetching analysis data...', {
      activeChatId,
      hasToken: !!accessToken,
      startDate: currentFilters.dateRange.start,
      endDate: currentFilters.dateRange.end
    });

    setLoading(true);
    setError(null);
    // Clear previous data before new fetch
    setAnalysisReport(null);
    setAllChatMembersState([]);
    setMembersWithoutUpdates([]);

    try {
      if (accessToken) {
        ProfilePhotoService.setAccessToken(accessToken);
        // Consider clearing photo cache if dates change significantly, or on every refresh
        // ProfilePhotoService.clearCache();
      }

      const serverResponse = await fetch('http://localhost:3000/api/analyze-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChatId,
          accessToken,
          startDate: currentFilters.dateRange.start,
          endDate: currentFilters.dateRange.end,
        }),
      });

      if (!serverResponse.ok) {
        const errorData = await serverResponse.json().catch(() => ({ message: 'Failed to fetch analysis and parse error response' }));
        throw new Error(errorData.message || `Server responded with ${serverResponse.status}`);
      }

      const responseData: BackendApiResponse = await serverResponse.json();
      if (responseData.success && responseData.data) {
        setAnalysisReport(responseData.data.standupAnalysis);
        setAllChatMembersState(responseData.data.allChatMembers || []);
        setMembersWithoutUpdates(responseData.data.membersWithoutUpdates || []);
        console.log('useStandupData: Received combined analysis:', responseData.data);
        if(responseData.usage) console.log('useStandupData: AI Usage:', responseData.usage);
      } else {
        throw new Error(responseData.message || responseData.error || 'Failed to get analysis data from server');
      }
    } catch (err) {
      console.error('useStandupData: Failed to load standup analysis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analysis data');
      setAnalysisReport(null);
      setAllChatMembersState([]);
      setMembersWithoutUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [activeChatId, accessToken]); // This useCallback depends on activeChatId and accessToken

  // Load data when chat ID, access token, or filters (specifically dateRange) change
  useEffect(() => {
    // filters are updated by FilterSidebar, including initial 'Today'
    // We only proceed if dateRange is populated, which FilterSidebar ensures on its mount.
    if (filters.dateRange.start && filters.dateRange.end) {
       fetchAnalysisData(filters);
    }
  }, [fetchAnalysisData, filters]); // Now depends on filters as well

  // Filtered daily update reports based on current filters
  const filteredDailyUpdateReports = useMemo(() => {
    if (!analysisReport?.dailyUpdateReports) return [];

    return analysisReport.dailyUpdateReports.filter(report => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          (report.employeeName || '').toLowerCase().includes(searchLower) ||
          (report.projectTeam || '').toLowerCase().includes(searchLower) ||
          (report.accomplishments || []).some(acc => (acc || '').toLowerCase().includes(searchLower)) ||
          (report.plannedTasksToday || []).some(plan => (plan || '').toLowerCase().includes(searchLower)) ||
          (report.carriedForwardTasks || []).some(task => (task || '').toLowerCase().includes(searchLower)) ||
          (report.carryForwardReason || '').toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Member filter (now by employeeName, which is member.name from ChatMemberInfo)
      if (filters.selectedMembers.length > 0 && !filters.selectedMembers.includes(report.employeeName)) {
        return false;
      }

      // Project filter
      if (filters.projectFilter && report.projectTeam !== filters.projectFilter) {
        return false;
      }

      // Date range filter (using createdDate)
      if (filters.dateRange.start && report.createdDate < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && report.createdDate > filters.dateRange.end) {
        return false;
      }

      // Approval status filter
      if (filters.approvalStatus === 'approved' && !report.approvedBy) {
        return false;
      }
      if (filters.approvalStatus === 'unapproved' && report.approvedBy) {
        return false;
      }

      return true;
    });
  }, [analysisReport, filters]);

  // Get unique project/team names from the analysis report
  const projects = useMemo(() => {
    if (!analysisReport?.dailyUpdateReports) return [];
    const projectSet = new Set<string>();
    analysisReport.dailyUpdateReports.forEach(report => {
      if (report.projectTeam) {
        projectSet.add(report.projectTeam);
      }
    });
    return Array.from(projectSet).sort();
  }, [analysisReport]);

  // teamMembersForFilter: Derived from allChatMembersState for populating the filter sidebar
  const teamMembersForFilter = useMemo(() => {
    if (!allChatMembersState || allChatMembersState.length === 0) return [];
    
    return allChatMembersState.map(member => ({
      id: member.id, // This is the AAD User ID from Graph /members
      name: member.name,
      email: member.email || `${member.name.toLowerCase().replace(/\s+/g, '.')}@example.com`, // Use real email or fallback
      avatar: ProfilePhotoService.getFallbackAvatar(member.name) // Start with fallback
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allChatMembersState]);

  // teamMembers: These are the TeamMember objects that can be enhanced with real photos.
  // Derived from allChatMembersState, as this list is the source of truth for members.
  const teamMembers = useMemo(() => {
    // This directly uses the structure from teamMembersForFilter,
    // as it's already mapped to TeamMember type.
    // The `enhancedTeamMembers` useEffect will then try to fetch real photos for these.
    // The mockTeamMembers merge logic is removed here; if needed for job titles/departments,
    // it should be done more carefully, perhaps in enhanceWithRealPhotos or by matching on email/name,
    // as IDs from mockTeamMembers might not match AAD User IDs from allChatMembersState.
    return teamMembersForFilter;
  }, [teamMembersForFilter]);

  // Enhanced team members with real profile photos
  // This section needs review. If we only have employee names from the AI,
  // fetching real photos via ProfilePhotoService might not be possible unless it supports name-based lookup
  // or we have a way to map names to user IDs that the photo service can use.
  // For now, teamMembers are generated with fallback avatars.
  // If real photos are not feasible, photoLoading state might be removed.
  const [enhancedTeamMembers, setEnhancedTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    // This effect might need to be re-evaluated based on how ProfilePhotoService works with available data.
    // If teamMembers (derived from employeeNames) are already using fallback avatars,
    // and real photos can't be fetched with just names, this effect might simplify or be removed.
    const enhanceWithRealPhotos = async () => {
      if (teamMembers.length === 0 || !accessToken) { // Or if real photo fetching isn't possible
        setEnhancedTeamMembers(teamMembers); // Use teamMembers with fallbacks
        return;
      }

      // Assuming ProfilePhotoService might still try something or this logic is kept for future ID mapping
      setPhotoLoading(true);
      try {
        console.log('useStandupData: Enhancing team members with photos (if possible)...');
        // Potentially, ProfilePhotoService.enhanceTeamMembersWithPhotos might need adjustment
        // if it relies on IDs not present in the simplified teamMembers objects.
        const enhanced = await ProfilePhotoService.enhanceTeamMembersWithPhotos(teamMembers);
        setEnhancedTeamMembers(enhanced);
        console.log('useStandupData: Photo enhancement attempt complete.');
      } catch (error) {
        console.error('useStandupData: Failed to enhance photos:', error);
        setEnhancedTeamMembers(teamMembers); // Fallback to original teamMembers
      } finally {
        setPhotoLoading(false);
      }
    };

    enhanceWithRealPhotos();
  }, [teamMembers, accessToken]);


  const loadDataForHook = useCallback(async () => {
    // This function is called by refreshData. It should use the most current filters.
    // The `filters` object from the outer scope will be used by `fetchAnalysisData`.
    if (filters.dateRange.start && filters.dateRange.end) { // Ensure dates are set
        ProfilePhotoService.clearCache(); // Clear photo cache on manual refresh
        fetchAnalysisData(filters);
    } else {
        // This case should ideally not be hit if FilterSidebar correctly sets initial dates
        console.warn("Refresh called but date range is not set in filters.");
        setError("Date range not set. Cannot refresh.");
    }
  }, [fetchAnalysisData, filters]); // Depends on the current filters state

  const refreshData = useCallback(() => {
    // loadDataForHook already uses the `filters` from its closure,
    // which are updated by setFilters.
    loadDataForHook();
  }, [loadDataForHook]);


  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      selectedMembers: [], // Should now be employee names
      dateRange: { start: '', end: '' }, // Will be reset to 'today' by FilterSidebar effect
      projectFilter: '',
      approvalStatus: 'all' // Reset approval status
    });
  };

  return {
    analysisReport, // The whole report, can be used for duplicationSummary, analysisDateRange etc.
    dailyUpdateReports: filteredDailyUpdateReports, // Filtered individual reports for display
    totalUpdatesCount: analysisReport?.dailyUpdateReports?.length || 0, // Total reports before filtering
    loading,
    photoLoading, // May be removed if real photo fetching isn't viable with names only
    error,
    filters,
    setFilters,
    teamMembers: enhancedTeamMembers, // These are based on names, enhanced with photos if possible
    allTeamMembersForFilter: teamMembersForFilter, // This is the list of TeamMember-like objects for populating filters
    membersWithoutUpdates, // Expose members without updates
    projects,
    refreshData,
    clearFilters,
    // fetchMoreMessages and hasMoreMessages are removed as the new API returns a single report object
  };
};