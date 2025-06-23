import React from 'react'; // Removed useState
import { MessageSquare, Filter, Download, RefreshCw as Refresh } from 'lucide-react'; // Removed LayoutDashboard
import { AuthSection } from './AuthSection';
import { ChatSelector } from './ChatSelector';
// import DashboardView from './DashboardView'; // No longer rendered by Header
// import { StandupUpdate, TeamMember, FilterOptions } from '../types'; // StandupUpdate and other specific props removed

interface HeaderProps {
  onToggleFilters: () => void;
  onRefresh: () => void;
  totalUpdates: number;    // Count of all updates from the report
  filteredUpdates: number; // Count of updates after filtering
  accessToken?: string;
  selectedChatId?: string;
  onAuthChange?: (isAuthenticated: boolean, accessToken?: string) => void;
  onChatSelect?: (chatId: string) => void;
  // Removed props that were for the embedded DashboardView:
  // updates: StandupUpdate[];
  // teamMembers: TeamMember[];
  // projects: string[];
  // filters: FilterOptions;
  // setFilters: (filters: FilterOptions | ((prevFilters: FilterOptions) => FilterOptions)) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleFilters,
  onRefresh,
  totalUpdates,
  filteredUpdates,
  accessToken,
  selectedChatId,
  onAuthChange,
  onChatSelect
}) => {
  // const [showDashboard, setShowDashboard] = useState(false); // Removed: Dashboard is now main view

  const handleExport = () => {
    // Implementation for export functionality
    console.log('Export functionality would be implemented here. Consider what data to export (filteredDailyUpdateReports or full analysisReport).');
  };

  // const toggleDashboard = () => { // Removed
  //   setShowDashboard(!showDashboard);
  // };

  return (
    // Simplified to not return a fragment as DashboardView is removed
    <header className="bg-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-11 h-11 bg-sky-600 rounded-xl">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Teams Standup Dashboard</h1>
              <p className="text-xs text-slate-300 tracking-wide">
                Displaying {filteredUpdates} of {totalUpdates} reports
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ChatSelector
              accessToken={accessToken}
              selectedChatId={selectedChatId}
              onChatSelect={onChatSelect || (() => {})}
            />

            {/* Removed Show/Hide Dashboard button */}
            {/* <button
              onClick={toggleDashboard}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold bg-slate-700/70 hover:bg-slate-600/90 text-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-400 transition-all duration-150 ease-in-out shadow-sm hover:shadow-md"
            >
              <LayoutDashboard className="w-5 h-5 mr-1.5" />
              {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
            </button> */}

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
    // Removed the conditional rendering of DashboardView from here
  );
};