import { useState, useEffect, useMemo } from 'react';
import { StandupUpdate, FilterOptions, TeamMember } from '../types';
import { TeamsApiService } from '../services/teamsApiService';
import { ProfilePhotoService } from '../services/ProfilePhotoService';
import { mockTeamMembers } from '../services/mockData';

interface UseStandupDataProps {
  accessToken?: string;
  chatId?: string;
}

export const useStandupData = ({ accessToken, chatId }: UseStandupDataProps = {}) => {
  const [updates, setUpdates] = useState<StandupUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    selectedMembers: [],
    dateRange: { start: '', end: '' },
    projectFilter: ''
  });

  // Default chat ID
  const defaultChatId = '19:0ff2ed4d24904eda9d794c796ba49a78@thread.v2';
  const activeChatId = chatId || defaultChatId;

  // Load data when chat ID or access token changes
  useEffect(() => {
    const loadData = async () => {
      console.log('useStandupData: Loading data...', { 
        activeChatId, 
        hasToken: !!accessToken,
        tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : 'none'
      });
      
      setLoading(true);
      setError(null);
      
      try {
        // Set access token for profile photo service
        if (accessToken) {
          ProfilePhotoService.setAccessToken(accessToken);
        }

        // Fetch standup updates
        const standupUpdates = await TeamsApiService.fetchMessages(activeChatId, accessToken);
        
        console.log('useStandupData: Received standup updates:', {
          count: standupUpdates.length,
          updates: standupUpdates
        });
        
        // Validate that we received the correct format
        if (!Array.isArray(standupUpdates)) {
          throw new Error('TeamsApiService did not return an array of updates');
        }

        // Additional validation for each update
        const validUpdates = standupUpdates.filter(update => {
          if (!update || !update.member || !update.member.id) {
            console.warn('Invalid update filtered out:', update);
            return false;
          }
          return true;
        });

        console.log('useStandupData: Valid updates after filtering:', validUpdates.length);
        setUpdates(validUpdates);
        
        if (validUpdates.length === 0 && standupUpdates.length > 0) {
          setError(`${standupUpdates.length} updates were received but none were valid standup messages`);
        }
        
      } catch (error) {
        console.error('useStandupData: Failed to load standup data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
        setUpdates([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeChatId, accessToken]);

  // Filter updates based on current filters
  const filteredUpdates = useMemo(() => {
    return updates.filter(update => {
      // Ensure update and member exist
      if (!update || !update.member || !update.member.id) {
        return false;
      }

      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          (update.member.name || '').toLowerCase().includes(searchLower) ||
          (update.member.email || '').toLowerCase().includes(searchLower) ||
          (update.projectName || '').toLowerCase().includes(searchLower) ||
          (update.accomplishments || []).some(acc => (acc || '').toLowerCase().includes(searchLower)) ||
          (update.todayPlans || []).some(plan => (plan || '').toLowerCase().includes(searchLower)) ||
          (update.carryForward && update.carryForward.toLowerCase().includes(searchLower)) ||
          (update.rawMessage || '').toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Member filter
      if (filters.selectedMembers.length > 0 && !filters.selectedMembers.includes(update.member.id)) {
        return false;
      }

      // Project filter
      if (filters.projectFilter && update.projectName !== filters.projectFilter) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.start && update.date < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && update.date > filters.dateRange.end) {
        return false;
      }

      return true;
    });
  }, [updates, filters]);

  // Get unique projects
  const projects = useMemo(() => {
    const projectSet = new Set<string>();
    updates.forEach(update => {
      if (update && update.projectName) {
        projectSet.add(update.projectName);
      }
    });
    return Array.from(projectSet).sort();
  }, [updates]);

  // Get team members from the actual updates with enhanced profile photos
  const teamMembers = useMemo(() => {
    const membersMap = new Map<string, TeamMember>();
    
    // Add members from updates
    updates.forEach(update => {
      if (update && update.member && update.member.id) {
        if (!membersMap.has(update.member.id)) {
          membersMap.set(update.member.id, {
            ...update.member,
            // Ensure required fields have fallbacks
            name: update.member.name || 'Unknown User',
            email: update.member.email || `unknown.${update.member.id}@company.com`,
            avatar: update.member.avatar || ProfilePhotoService.getFallbackAvatar(update.member.name || 'Unknown')
          });
        }
      }
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
  const [enhancedTeamMembers, setEnhancedTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const enhanceWithRealPhotos = async () => {
      if (teamMembers.length === 0 || !accessToken) {
        setEnhancedTeamMembers(teamMembers);
        return;
      }

      setPhotoLoading(true);
      try {
        console.log('useStandupData: Enhancing team members with real photos...');
        const enhanced = await ProfilePhotoService.enhanceTeamMembersWithPhotos(teamMembers);
        setEnhancedTeamMembers(enhanced);
        console.log('useStandupData: Photo enhancement complete');
      } catch (error) {
        console.error('useStandupData: Failed to enhance photos:', error);
        setEnhancedTeamMembers(teamMembers);
      } finally {
        setPhotoLoading(false);
      }
    };

    enhanceWithRealPhotos();
  }, [teamMembers, accessToken]);

  const refreshData = async () => {
    console.log('useStandupData: Refreshing data...');
    setLoading(true);
    setError(null);
    
    try {
      // Clear caches
      ProfilePhotoService.clearCache();
      
      const standupUpdates = await TeamsApiService.refreshMessages(activeChatId, accessToken);
      console.log('useStandupData: Refreshed updates:', standupUpdates.length);
      setUpdates(standupUpdates);
    } catch (error) {
      console.error('useStandupData: Failed to refresh standup data:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      selectedMembers: [],
      dateRange: { start: '', end: '' },
      projectFilter: ''
    });
  };

  return {
    updates: filteredUpdates,
    totalUpdates: updates.length,
    loading,
    photoLoading,
    error,
    filters,
    setFilters,
    teamMembers: enhancedTeamMembers, // Use enhanced team members with real photos
    projects,
    refreshData,
    clearFilters
  };
};