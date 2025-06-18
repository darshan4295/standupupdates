import React from 'react';
import { StandupUpdate, TeamMember, FilterOptions } from '../types';

interface DashboardViewProps {
  updates: StandupUpdate[];
  teamMembers: TeamMember[]; // Team members to display updates for
  allTeamMembers: TeamMember[]; // All team members for filter population
  projects: string[]; // All unique project names for filter population
  filters: FilterOptions;
  setFilters: (filters: FilterOptions | ((prevFilters: FilterOptions) => FilterOptions)) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  updates,
  teamMembers,
  allTeamMembers,
  projects,
  filters,
  setFilters
}) => {
  const totalUpdates = updates.length;

  const userUpdatesCount = teamMembers.reduce((acc, member) => {
    acc[member.name] = updates.filter(update => update.member.id === member.id).length;
    return acc;
  }, {} as Record<string, number>);

  const handleFilterChange = (filterName: keyof FilterOptions, value: any) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value,
    }));
  };

  return (
    <div className="bg-gray-100 p-4 md:p-6 min-h-[calc(100vh-4rem)]"> {/* Changed bg-gray-50 to bg-gray-100 for slightly more contrast with white cards, ensured full height */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Column 1: Filters */}
        <div className="lg:col-span-1 bg-white shadow-xl rounded-lg p-6 border border-gray-200 h-fit"> {/* Slightly increased shadow */}
          <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b border-gray-300 pb-3">Filters</h3> {/* Adjusted text color and margins/padding for heading */}

          <div className="space-y-5"> {/* Added space-y for consistent spacing between filter groups */}
            {/* Search Filter */}
            <div>
              <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                id="search-filter" // Changed id to be more specific
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                placeholder="Keywords..."
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow duration-150 ease-in-out hover:shadow-md"
              />
            </div>

            {/* Team Members Filter */}
            <div>
              <label htmlFor="team-members-filter" className="block text-sm font-medium text-gray-700 mb-1">Team Member</label>
              <select
                id="team-members-filter"
                value={filters.selectedMembers.length > 0 ? filters.selectedMembers[0] : ''}
                onChange={(e) => handleFilterChange('selectedMembers', e.target.value ? [e.target.value] : [])}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow duration-150 ease-in-out hover:shadow-md"
              >
                <option value="">All Members</option>
                {allTeamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label htmlFor="date-range-start-filter" className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  id="date-range-start-filter" // Changed id
                  aria-label="Start date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow duration-150 ease-in-out hover:shadow-md"
                />
                <input
                  type="date"
                  id="date-range-end-filter" // Changed id
                  aria-label="End date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow duration-150 ease-in-out hover:shadow-md"
                />
              </div>
            </div>

            {/* Project Filter */}
            <div>
              <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                id="project-filter"
                value={filters.projectFilter}
                onChange={(e) => handleFilterChange('projectFilter', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow duration-150 ease-in-out hover:shadow-md"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Column 2, 3 & 4: Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Total Updates Display */}
          <div className="bg-white shadow-xl rounded-lg p-6 border border-gray-200"> {/* Slightly increased shadow */}
            <h3 className="text-xl font-semibold text-blue-700 mb-2">Total Displayed Updates</h3> {/* Increased font size and changed color for emphasis */}
            <p className="text-6xl font-bold text-blue-600">{totalUpdates}</p> {/* Increased font size */}
          </div>

          {/* User-wise Updates */}
          <div className="bg-white shadow-xl rounded-lg p-6 border border-gray-200"> {/* Slightly increased shadow */}
            <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b border-gray-300 pb-3">User-wise Updates</h3> {/* Matched Filter heading style */}
            {teamMembers.length > 0 ? (
              <ul className="space-y-4"> {/* Increased spacing in list */}
                {teamMembers.map(member => (
                  <li
                    key={member.id}
                    className="flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-md border border-gray-200 transition-all duration-150 ease-in-out hover:scale-[1.01]" /* Enhanced list item style */
                  >
                    <span className="text-gray-800 font-medium text-md">{member.name}</span> {/* Slightly larger text */}
                    <span className="text-blue-700 bg-blue-100 px-3 py-1 rounded-full text-sm font-semibold"> {/* Styled badge */}
                      {userUpdatesCount[member.name] || 0} updates
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-center py-4">No updates found for the selected filters, or no team members to display.</p> // Centered and styled empty state
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
