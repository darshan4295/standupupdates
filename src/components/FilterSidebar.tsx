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
      <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-base font-medium">
        {member.name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative w-8 h-8">
      {imageLoading && (
        <div className="absolute inset-0 rounded-full bg-slate-300 animate-pulse" />
      )}
      <img
        src={member.avatar}
        alt={member.name}
        className={`w-8 h-8 rounded-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
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
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-50 shadow-xl transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-slate-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 lg:hidden">
          <h2 className="text-xl font-bold text-slate-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-300 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Search */}
          <div>
            <label className="block text-base font-bold text-slate-800 mb-2 flex items-center">
              <Search className="w-5 h-5 inline mr-2.5" />
              Search Updates
            </label>
            <input
              type="text"
              placeholder="Search in messages..."
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-400 bg-white rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-600 text-sm transition-colors duration-150 ease-in-out hover:border-sky-500 placeholder-slate-400"
            />
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-base font-bold text-slate-800 mb-2 flex items-center">
              <Users className="w-5 h-5 inline mr-2.5" />
              Team Members ({teamMembers.length})
            </label>
            {teamMembers.length === 0 ? (
              <div className="text-sm text-slate-500 p-4 text-center border border-dashed border-slate-300 rounded-lg">
                <User className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                No team members found
              </div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto"> {/* Reduced space-y for tighter list items */}
                {teamMembers.map((member) => (
                  <label 
                    key={member.id} 
                    className={`flex items-center space-x-3 cursor-pointer p-2.5 rounded-lg transition-colors duration-150 ease-in-out ${
                      filters.selectedMembers.includes(member.id) ? 'bg-sky-100 hover:bg-sky-200' : 'hover:bg-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.selectedMembers.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="h-4 w-4 rounded border-slate-400 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 focus:ring-offset-white"
                    />
                    
                    <ProfileImage member={member} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {member.email}
                      </p>
                      {member.jobTitle && (
                        <p className="text-xs text-slate-400 truncate">
                          {member.jobTitle}
                        </p>
                      )}
                    </div>
                    
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
            <label className="block text-base font-bold text-slate-800 mb-2 flex items-center">
              <FolderOpen className="w-5 h-5 inline mr-2.5" />
              Project
            </label>
            <select
              value={filters.projectFilter}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-400 bg-white rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-600 text-sm transition-colors duration-150 ease-in-out hover:border-sky-500 placeholder-slate-400"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-base font-bold text-slate-800 mb-2 flex items-center">
              <Calendar className="w-5 h-5 inline mr-2.5" />
              Date Range
            </label>
            <div className="space-y-2">
              <input
                type="date"
                placeholder="Start date"
                value={filters.dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-400 bg-white rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-600 text-sm transition-colors duration-150 ease-in-out hover:border-sky-500 placeholder-slate-400"
              />
              <input
                type="date"
                placeholder="End date"
                value={filters.dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-400 bg-white rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-600 text-sm transition-colors duration-150 ease-in-out hover:border-sky-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Active Filters Summary */}
          {(filters.searchTerm || filters.selectedMembers.length > 0 || filters.projectFilter || filters.dateRange.start || filters.dateRange.end) && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
              <h4 className="text-base font-bold text-sky-900 mb-2.5">Active Filters:</h4>
              <div className="space-y-1.5 text-sm text-sky-800">
                {filters.searchTerm && <p>Search: "{filters.searchTerm}"</p>}
                {filters.selectedMembers.length > 0 && (
                  <p>Members: {filters.selectedMembers.length} selected</p>
                )}
                {filters.projectFilter && <p>Project: {filters.projectFilter}</p>}
                {filters.dateRange.start && <p>From: {filters.dateRange.start}</p>}
                {filters.dateRange.end && <p>To: {filters.dateRange.end}</p>}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-50 rounded-lg transition-colors duration-150 ease-in-out shadow hover:shadow-md"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </>
  );
};