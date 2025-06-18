import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Users, FolderOpen, X, User } from 'lucide-react';
import { FilterOptions, TeamMember } from '../types';

interface FilterSidebarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  teamMembers: TeamMember[];
  projects: string[];
  isOpen: boolean;
  onClose: () => void;
}

// Component for handling profile images with fallback
const ProfileImage: React.FC<{ member: TeamMember }> = ({ member }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0078D4&color=fff&size=24`;

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    console.warn(`Failed to load profile image for ${member.name}:`, member.avatar);
    setImageLoading(false);
    setImageError(true);
  };

  // Debug logging for profile images
  useEffect(() => {
    console.log(`ProfileImage for ${member.name}:`, {
      hasAvatar: !!member.avatar,
      avatarUrl: member.avatar,
      avatarType: typeof member.avatar,
      avatarStartsWith: member.avatar?.substring(0, 20)
    });
  }, [member]);

  // If no avatar URL is provided or it's the same as fallback, use fallback directly
  if (!member.avatar || member.avatar === fallbackImage || imageError) {
    return (
      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
        {member.name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative w-6 h-6">
      {imageLoading && (
        <div className="absolute inset-0 rounded-full bg-gray-200 animate-pulse" />
      )}
      <img
        src={member.avatar}
        alt={member.name}
        className={`w-6 h-6 rounded-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
};

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFiltersChange,
  teamMembers,
  projects,
  isOpen,
  onClose
}) => {
  // Debug logging for team members
  useEffect(() => {
    console.log('FilterSidebar: Team members received:', {
      count: teamMembers.length,
      members: teamMembers.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        hasAvatar: !!m.avatar,
        avatarPreview: m.avatar?.substring(0, 50) + '...'
      }))
    });
  }, [teamMembers]);

  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({ ...filters, searchTerm });
  };

  const handleMemberToggle = (memberId: string) => {
    const newSelectedMembers = filters.selectedMembers.includes(memberId)
      ? filters.selectedMembers.filter(id => id !== memberId)
      : [...filters.selectedMembers, memberId];
    onFiltersChange({ ...filters, selectedMembers: newSelectedMembers });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: { ...filters.dateRange, [field]: value }
    });
  };

  const handleProjectChange = (project: string) => {
    onFiltersChange({ ...filters, projectFilter: project });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      selectedMembers: [],
      dateRange: { start: '', end: '' },
      projectFilter: ''
    });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Search Updates
            </label>
            <input
              type="text"
              placeholder="Search in messages..."
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Team Members ({teamMembers.length})
            </label>
            {teamMembers.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 text-center border border-dashed border-gray-300 rounded-md">
                <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                No team members found
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teamMembers.map((member) => (
                  <label 
                    key={member.id} 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.selectedMembers.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    {/* Enhanced Profile Image Component */}
                    <ProfileImage member={member} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email}
                      </p>
                      {member.jobTitle && (
                        <p className="text-xs text-gray-400 truncate">
                          {member.jobTitle}
                        </p>
                      )}
                    </div>
                    
                    {/* Debug indicator for real vs fallback images */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs">
                        {member.avatar && !member.avatar.includes('ui-avatars.com') ? (
                          <span className="text-green-600" title="Real profile photo">●</span>
                        ) : (
                          <span className="text-orange-600" title="Fallback avatar">●</span>
                        )}
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Projects */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FolderOpen className="w-4 h-4 inline mr-2" />
              Project
            </label>
            <select
              value={filters.projectFilter}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date Range
            </label>
            <div className="space-y-2">
              <input
                type="date"
                placeholder="Start date"
                value={filters.dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="date"
                placeholder="End date"
                value={filters.dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Active Filters Summary */}
          {(filters.searchTerm || filters.selectedMembers.length > 0 || filters.projectFilter || filters.dateRange.start || filters.dateRange.end) && (
            <div className="p-3 bg-blue-50 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Active Filters:</h4>
              <div className="space-y-1 text-xs text-blue-700">
                {filters.searchTerm && <div>Search: "{filters.searchTerm}"</div>}
                {filters.selectedMembers.length > 0 && (
                  <div>Members: {filters.selectedMembers.length} selected</div>
                )}
                {filters.projectFilter && <div>Project: {filters.projectFilter}</div>}
                {filters.dateRange.start && <div>From: {filters.dateRange.start}</div>}
                {filters.dateRange.end && <div>To: {filters.dateRange.end}</div>}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </>
  );
};