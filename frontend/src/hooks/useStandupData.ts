import { useState, useEffect, useMemo, useCallback } from 'react';
import { StandupAnalysisReport, DailyUpdateReportItem, FilterOptions, TeamMember } from '../types';
// import { TeamsApiService } from '../services/teamsApiService'; // May not be needed directly here anymore
import { ProfilePhotoService } from '../services/ProfilePhotoService';
import { mockTeamMembers } from '../services/mockData'; // For potential avatar enrichment

interface UseStandupDataProps {
  accessToken?: string; // May be needed for the backend API call
  chatId?: string;
}

// Define the expected structure of the API response
interface ApiResponse {
  success: boolean;
  data?: StandupAnalysisReport;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  // const [nextPageSkipToken, setNextPageSkipToken] = useState<string | undefined>(undefined); // Removed, report is a single object
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    selectedMembers: [], // These will now filter by employeeName (string)
    dateRange: { start: '', end: '' },
    projectFilter: ''
  });

  // Default chat ID
  const defaultChatId = '19:0ff2ed4d24904eda9d794c796ba49a78@thread.v2';
  const activeChatId = chatId || defaultChatId;

  // Load data when chat ID or access token changes
  useEffect(() => {
    const loadData = async () => {
      if (!activeChatId) {
        setLoading(false);
        setError("Chat ID is not selected.");
        setAnalysisReport(null);
        return;
      }
      console.log('useStandupData: Loading analysis data...', { activeChatId, hasToken: !!accessToken });
      setLoading(true);
      setError(null);
      setAnalysisReport(null);
      
      try {
        // Set access token for profile photo service if it's used later
        if (accessToken) {
          ProfilePhotoService.setAccessToken(accessToken);
        }

        // Fetch analysis from the backend
        const serverResponse = await fetch('http://localhost:3000/api/analyze-chat', { // Assuming server is on port 3000
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: activeChatId,
            accessToken: accessToken // Send token if backend needs it for MS Graph calls
          }),
        });

        if (!serverResponse.ok) {
          const errorData = await serverResponse.json().catch(() => ({ message: 'Failed to fetch analysis and parse error response' }));
          throw new Error(errorData.message || `Server responded with ${serverResponse.status}`);
        }

        const responseData: ApiResponse = await serverResponse.json();

        if (responseData.success && responseData.data) {
          setAnalysisReport(responseData.data);
          console.log('useStandupData: Received analysis report:', responseData.data);
          console.log('useStandupData: AI Usage:', responseData.usage);
        } else {
          throw new Error(responseData.message || responseData.error || 'Failed to get analysis data from server');
        }
        
      } catch (err) {
        console.error('useStandupData: Failed to load standup analysis data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analysis data');
        setAnalysisReport(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeChatId, accessToken]);

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

      // Member filter (now by employeeName)
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

  // Get team members from the analysis report (employeeName)
  // This will be a list of unique employee names.
  // For richer TeamMember objects (with ID, email, avatar), we might need another source or a mapping.
  // For now, creating simple TeamMember objects from names.
  const teamMembersForFilter = useMemo(() => {
    if (!analysisReport?.dailyUpdateReports && !analysisReport?.duplicationSummary?.details) return [];

    const memberNames = new Set<string>();
    analysisReport?.dailyUpdateReports?.forEach(report => memberNames.add(report.employeeName));
    analysisReport?.duplicationSummary?.details?.forEach(detail => memberNames.add(detail.employeeName));

    // Create TeamMember like objects for filter consistency. ID can be the name for now.
    return Array.from(memberNames).sort().map(name => ({
      id: name, // Using name as ID for now, this might need refinement
      name: name,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`, // Placeholder email
      avatar: ProfilePhotoService.getFallbackAvatar(name) // Use fallback avatar
    }));
  }, [analysisReport]);

  // This is the old teamMembers structure. We need to adapt it.
  const teamMembers = useMemo(() => {
    const membersMap = new Map<string, TeamMember>();
    
    // Extract employee names from daily reports and duplication summary
    const employeeNames = new Set<string>();
    analysisReport?.dailyUpdateReports?.forEach(report => {
      if (report.employeeName) employeeNames.add(report.employeeName);
    });
    analysisReport?.duplicationSummary?.details?.forEach(detail => {
      if (detail.employeeName) employeeNames.add(detail.employeeName);
    });

    Array.from(employeeNames).forEach(name => {
      // For now, we only have names. We'll create a basic TeamMember object.
      // ID and email will be derived or mocked. Avatars can use fallbacks.
      // A more robust solution would involve fetching full member details from Graph API
      // or having a mapping if the AI provides user IDs.
      const memberId = name.toLowerCase().replace(/\s+/g, '_'); // Simple ID from name
      membersMap.set(memberId, {
        id: memberId,
        name: name,
        email: `${memberId}@example.com`, // Mock email
        avatar: ProfilePhotoService.getFallbackAvatar(name) // Fallback avatar
      });
    });
    
    // Merge with mock members for additional data if available
    if (mockTeamMembers && Array.isArray(mockTeamMembers)) {
      mockTeamMembers.forEach(mockMember => {
        if (mockMember && mockMember.id && membersMap.has(mockMember.id)) {
          const existingMember = membersMap.get(mockMember.id)!;
          membersMap.set(mockMember.id, {
            ...existingMember,
            // Only use mock avatar if we don't have a real one
            avatar: existingMember.avatar?.includes('ui-avatars.com') ? 
              (mockMember.avatar || existingMember.avatar) : existingMember.avatar,
            jobTitle: existingMember.jobTitle || mockMember.jobTitle,
            department: existingMember.department || mockMember.department
          });
        }
      });
    }
    
    return Array.from(membersMap.values());
  }, [updates]);

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
    if (!activeChatId) {
      setLoading(false);
      setError("Chat ID is not selected for refresh.");
      setAnalysisReport(null);
      return;
    }
    console.log('useStandupData: Refreshing analysis data...', { activeChatId, hasToken: !!accessToken });
    setLoading(true);
    setError(null);
    setAnalysisReport(null); // Clear previous report

    try {
      if (accessToken) {
        ProfilePhotoService.setAccessToken(accessToken); // Ensure service has token
        ProfilePhotoService.clearCache(); // Clear photo cache on refresh
      }

      const serverResponse = await fetch('http://localhost:3000/api/analyze-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeChatId, accessToken }),
      });

      if (!serverResponse.ok) {
        const errorData = await serverResponse.json().catch(() => ({ message: 'Failed to refresh analysis and parse error response' }));
        throw new Error(errorData.message || `Server responded with ${serverResponse.status} during refresh`);
      }

      const responseData: ApiResponse = await serverResponse.json();
      if (responseData.success && responseData.data) {
        setAnalysisReport(responseData.data);
      } else {
        throw new Error(responseData.message || responseData.error || 'Failed to get analysis data from server during refresh');
      }
    } catch (err) {
      console.error('useStandupData: Failed to refresh standup analysis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh analysis data');
      setAnalysisReport(null);
    } finally {
      setLoading(false);
    }
  }, [activeChatId, accessToken]);

  // Initial load and refresh trigger
  useEffect(() => {
    loadDataForHook();
  }, [loadDataForHook]);

  const refreshData = useCallback(() => {
    loadDataForHook();
  }, [loadDataForHook]);

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      selectedMembers: [], // Should now be employee names
      dateRange: { start: '', end: '' },
      projectFilter: ''
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
    projects,
    refreshData,
    clearFilters,
    // fetchMoreMessages and hasMoreMessages are removed as the new API returns a single report object
  };
};