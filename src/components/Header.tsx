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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Teams Message Scanner</h1>
                <p className="text-sm text-gray-500">
                  {filteredUpdates} of {totalUpdates} standup updates
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <ChatSelector
                accessToken={accessToken}
                selectedChatId={selectedChatId}
                onChatSelect={onChatSelect || (() => {})}
              />

              <button
                onClick={toggleDashboard} // Toggle dashboard visibility
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
              </button>

              <button
                onClick={onToggleFilters}
                className="lg:hidden inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>

              <button
                onClick={onRefresh}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Refresh className="w-4 h-4 mr-2" />
                Refresh
              </button>

              <button
                onClick={handleExport}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>

              <AuthSection onAuthChange={onAuthChange} currentToken={accessToken} />
            </div>
          </div>
        </div>
      </header>
      {showDashboard && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 bg-gray-100"> {/* Added bg-gray-100 for better contrast if DashboardView itself is white/light */}
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