import React, { useState, useCallback, useEffect } from 'react';
import { StandupUpdate, TeamMember, FilterOptions } from '../types';
import { aiSummaryService } from '../../services/aiSummaryService';

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
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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

  const handleGenerateSummary = useCallback(async () => {
    setIsGeneratingSummary(true);
    setSummaryResult(null);
    setSummaryError(null);

    const textToSummarize = updates.map(update => update.rawMessage).join('\\n\\n');

    if (!textToSummarize.trim()) {
      setSummaryError('No text available to summarize from the current selection.');
      setIsGeneratingSummary(false);
      return;
    }

    try {
      const summary = await aiSummaryService.generateSummary(textToSummarize);
      setSummaryResult(summary);
    } catch (error: any) {
      console.error('Error generating summary:', error);
      // Set the summaryError state directly with the message from the service
      setSummaryError(error.message || 'An unknown error occurred during summary generation.');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [updates]);

  // Clear summary when filters change
  useEffect(() => {
    setSummaryResult(null);
    setSummaryError(null);
  }, [filters]);

  return (
    <div className="bg-slate-50 p-4 md:p-6 min-h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">

        {/* Column 1: Filters */}
        <div className="lg:col-span-1 bg-white shadow-xl rounded-lg p-6 border border-slate-200 h-fit">
          <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-200 pb-4">Filters</h3>

          <div className="space-y-6">
            {/* Search Filter */}
            <div>
              <label htmlFor="search-filter" className="block text-sm font-semibold text-slate-700 mb-2">Search</label>
              <input
                type="text"
                id="search-filter"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                placeholder="Keywords..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition duration-150 ease-in-out hover:border-sky-400 placeholder-slate-400"
              />
            </div>

            {/* Team Members Filter */}
            <div>
              <label htmlFor="team-members-filter" className="block text-sm font-semibold text-slate-700 mb-2">Team Member</label>
              <select
                id="team-members-filter"
                value={filters.selectedMembers.length > 0 ? filters.selectedMembers[0] : ''}
                onChange={(e) => handleFilterChange('selectedMembers', e.target.value ? [e.target.value] : [])}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition duration-150 ease-in-out hover:border-sky-400 placeholder-slate-400"
              >
                <option value="">All Members</option>
                {allTeamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label htmlFor="date-range-start-filter" className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  id="date-range-start-filter"
                  aria-label="Start date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition duration-150 ease-in-out hover:border-sky-400 placeholder-slate-400"
                />
                <input
                  type="date"
                  id="date-range-end-filter"
                  aria-label="End date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition duration-150 ease-in-out hover:border-sky-400 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Project Filter */}
            <div>
              <label htmlFor="project-filter" className="block text-sm font-semibold text-slate-700 mb-2">Project</label>
              <select
                id="project-filter"
                value={filters.projectFilter}
                onChange={(e) => handleFilterChange('projectFilter', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition duration-150 ease-in-out hover:border-sky-400 placeholder-slate-400"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>

            {/* AI Summary Button */}
            {(filters.projectFilter || (filters.selectedMembers && filters.selectedMembers.length > 0)) && (
              <div>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="w-full mt-4 p-2.5 bg-sky-600 text-white rounded-lg shadow-md hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingSummary ? 'Generating Summary...' : 'Generate AI Summary'}
                </button>
                {summaryError && !isGeneratingSummary && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-500">{summaryError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Column 2, 3 & 4: Main Content Area */}
        <div className="lg:col-span-3 space-y-8">

          {/* AI Summary Display */}
          {isGeneratingSummary && (
            <div className="bg-white shadow-xl rounded-xl p-6 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 mb-4">AI Generated Summary</h3>
              <p className="text-slate-600 animate-pulse">Generating summary, please wait...</p>
            </div>
          )}
          {summaryResult && !isGeneratingSummary && (
            <div className="bg-white shadow-xl rounded-xl p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">AI Generated Summary</h3>
                <button
                  onClick={() => setSummaryResult(null)}
                  className="text-slate-500 hover:text-slate-700 text-sm"
                  aria-label="Close summary"
                >
                  &times; Close
                </button>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{summaryResult}</p>
            </div>
          )}
          {/* General errors (like API failures) are shown near the button.
              Specific 'no text' errors are also shown near the button.
              This block is likely redundant now.
          */}


          {/* Total Updates Display */}
          <div className="bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-xl rounded-xl p-6">
            <h3 className="text-xl font-medium text-sky-50 mb-1.5">Total Displayed Updates</h3>
            <p className="text-5xl sm:text-6xl font-extrabold text-white">{totalUpdates}</p>
          </div>

          {/* User-wise Updates */}
          <div className="bg-white shadow-xl rounded-xl p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-200 pb-4">User-wise Updates</h3>
            {teamMembers.length > 0 ? (
              <ul className="space-y-3">
                {teamMembers.map(member => (
                  <li
                    key={member.id}
                    className="flex justify-between items-center bg-slate-50 hover:bg-sky-100 rounded-lg shadow-sm border border-slate-200/75 transition-all duration-200 ease-in-out hover:shadow-lg hover:border-sky-300 p-4"
                  >
                    <span className="text-slate-800 font-semibold text-base">{member.name}</span>
                    <span className="text-sky-800 bg-sky-200 px-3 py-1 rounded-full text-xs font-bold">
                      {userUpdatesCount[member.name] || 0} updates
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-center py-8 text-lg">No updates found for the selected filters, or no team members to display.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
