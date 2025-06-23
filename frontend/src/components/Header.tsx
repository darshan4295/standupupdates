import React, { useState } from 'react';
import { MessageSquare, Filter, Download, RefreshCw as Refresh, LayoutDashboard } from 'lucide-react';
import { AuthSection } from './AuthSection';
import { ChatSelector } from './ChatSelector';
import DashboardView from './DashboardView'; // Import DashboardView (default import)
import { StandupUpdate, TeamMember, FilterOptions } from '../types'; // Import types, including FilterOptions

interface HeaderProps {
  onToggleFilters: () => void;
  onRefresh: () => void;
  totalUpdates: number;
  filteredUpdates: number;
  updates: StandupUpdate[];
  teamMembers: TeamMember[]; // This will be used for DashboardView's teamMembers (display) and allTeamMembers (filter)
  projects: string[]; // For DashboardView filters
  filters: FilterOptions; // For DashboardView filters
  setFilters: (filters: FilterOptions | ((prevFilters: FilterOptions) => FilterOptions)) => void; // For DashboardView filters
  accessToken?: string;
  selectedChatId?: string;
  onAuthChange?: (isAuthenticated: boolean, accessToken?: string) => void;
  onChatSelect?: (chatId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleFilters,
  onRefresh,
  totalUpdates,
  filteredUpdates,
  updates,
  teamMembers, // This is the array from useStandupData
  projects,
  filters,
  setFilters,
  accessToken,
  selectedChatId,
  onAuthChange,
  onChatSelect
}) => {
  const [showDashboard, setShowDashboard] = useState(false); // State for dashboard visibility

  const handleExport = () => {
    // Implementation for export functionality
    console.log('Export functionality would be implemented here');
  };

  const toggleDashboard = () => {
    setShowDashboard(!showDashboard);
  };

  return (
    <>
      <header className="bg-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-11 h-11 bg-sky-600 rounded-xl">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Teams Message Scanner</h1>
                <p className="text-xs text-slate-300 tracking-wide">
                  {filteredUpdates} of {totalUpdates} standup updates
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ChatSelector
                accessToken={accessToken}
                selectedChatId={selectedChatId}
                onChatSelect={onChatSelect || (() => {})}
              />

              <button
                onClick={toggleDashboard} // Toggle dashboard visibility
                className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold bg-slate-700/70 hover:bg-slate-600/90 text-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-400 transition-all duration-150 ease-in-out shadow-sm hover:shadow-md"
              >
                <LayoutDashboard className="w-5 h-5 mr-1.5" />
                {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
              </button>

              <button
                onClick={onToggleFilters}
                className="lg:hidden inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold bg-slate-700/70 hover:bg-slate-600/90 text-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-400 transition-all duration-150 ease-in-out shadow-sm hover:shadow-md"
              >
                <Filter className="w-5 h-5 mr-1.5" />
                Filters
              </button>

              <button
                onClick={onRefresh}
                className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold bg-slate-700/70 hover:bg-slate-600/90 text-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-400 transition-all duration-150 ease-in-out shadow-sm hover:shadow-md"
              >
                <Refresh className="w-5 h-5 mr-1.5" />
                Refresh
              </button>

              <button
                onClick={handleExport}
                className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold bg-slate-700/70 hover:bg-slate-600/90 text-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-400 transition-all duration-150 ease-in-out shadow-sm hover:shadow-md"
              >
                <Download className="w-5 h-5 mr-1.5" />
                Export
              </button>

              <AuthSection onAuthChange={onAuthChange} currentToken={accessToken} />
            </div>
          </div>
        </div>
      </header>
      {showDashboard && (
        <div className="max-w-full py-4 bg-slate-100 border-b border-slate-300 shadow-inner">
          <DashboardView
            updates={updates}
            teamMembers={teamMembers} // For display in user-wise list
            allTeamMembers={teamMembers} // For populating member filter
            projects={projects}
            filters={filters}
            setFilters={setFilters}
          />
        </div>
      )}
    </>
  );
};