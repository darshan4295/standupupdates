import React, { useState, useEffect, useCallback } from 'react'; // Removed useRef, useLayoutEffect
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/authConfig';
import { Header } from './components/Header';
import { FilterSidebar } from './components/FilterSidebar';
// import { StandupCard } from './components/StandupCard'; // Will be replaced by DashboardView
import { DashboardView } from './components/DashboardView'; // Added for future use
import { EmptyState } from './components/EmptyState';
import { useStandupData } from './hooks/useStandupData';
import { Loader2, AlertCircle } from 'lucide-react';

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string>();
  const [selectedChatId, setSelectedChatId] = useState<string>();
  
  const {
    analysisReport,      // New: The full analysis object
    dailyUpdateReports,  // New: Filtered reports for display
    totalUpdatesCount,   // New: Count of all reports before filtering
    loading,
    error,
    filters,
    setFilters,
    teamMembers,         // Renamed in hook to enhancedTeamMembers, used for display if needed by Header/Sidebar
    allTeamMembersForFilter, // New: For populating filters
    projects,
    refreshData,
    clearFilters,
    // fetchMoreMessages and hasMoreMessages are removed from useStandupData
  } = useStandupData({ accessToken, chatId: selectedChatId });

  // const scrollContainerRef = useRef<HTMLElement>(null); // Removed: Infinite scroll not used with single report
  // const scrollInfoRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null); // Removed

  const handleToggleFilters = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  // Infinite scroll logic (handleScroll, useEffect, useLayoutEffect) is removed
  // as the new API returns a single report object, not a list of individual updates to be paginated.

  const handleAuthChange = (isAuthenticated: boolean, token?: string) => {
    console.log('App: Auth change', { isAuthenticated, hasToken: !!token });
    if (isAuthenticated && token) {
      setAccessToken(token);
    } else {
      setAccessToken(undefined);
      setSelectedChatId(undefined);
    }
  };

  const handleChatSelect = (chatId: string) => {
    console.log('App: Chat selected', chatId);
    setSelectedChatId(chatId);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Header
        onToggleFilters={handleToggleFilters}
        onRefresh={refreshData}
        totalUpdates={totalUpdatesCount} // Use new count
        filteredUpdates={dailyUpdateReports.length} // Use length of filtered reports
        // updates prop might be removed from Header or changed if it used it for something specific
        teamMembers={teamMembers} // This is enhancedTeamMembers from useStandupData
        projects={projects}
        filters={filters}
        setFilters={setFilters}
        accessToken={accessToken}
        selectedChatId={selectedChatId}
        onAuthChange={handleAuthChange}
        onChatSelect={handleChatSelect}
      />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <FilterSidebar
          filters={filters}
          onFiltersChange={setFilters}
          teamMembers={allTeamMembersForFilter} // Use the new prop for filter population
          projects={projects}
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
        />
        
        {/* Main content area no longer needs scrollContainerRef for infinite scroll */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-full mx-auto p-4 md:p-6 lg:p-8"> {/* Changed max-w-5xl to full for dashboard */}
            {!accessToken && (
              <div className="mb-6 p-4 bg-sky-100 border border-sky-300 rounded-lg">
                <h3 className="text-sm font-medium text-sky-700 mb-2">Connect to Microsoft Teams</h3>
                <p className="text-sm text-sky-600">
                  Sign in with your Microsoft account or provide an access token to access your Teams chats and scan for standup messages.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <h3 className="text-sm font-medium text-red-700">Error Loading Data</h3>
                </div>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <button
                  onClick={refreshData}
                  className="mt-3 text-xs font-medium bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-100 focus:ring-red-500"
                >
                  Try again
                </button>
              </div>
            )}
            
            {loading && !analysisReport ? ( // Show main loader only on initial load (when analysisReport is null)
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <span className="ml-3 text-slate-700">Loading standup analysis...</span>
              </div>
            ) : !loading && !error && analysisReport && dailyUpdateReports.length === 0 && filtersApplied(filters) ? (
                 // Special empty state for when filters result in no reports
                <EmptyState
                    type="no-results"
                    onClearFilters={clearFilters}
                />
            ) : !loading && !error && (!analysisReport || totalUpdatesCount === 0) ? (
              // Empty state when no data or no updates in the report
              <EmptyState
                type="no-data" // No data at all from the source after loading
                onClearFilters={clearFilters} // Or undefined if no filters to clear
              />
            ) : analysisReport ? (
              // Render DashboardView when data is available
              <DashboardView
                analysisReport={analysisReport}
                filteredDailyUpdateReports={dailyUpdateReports}
                allTeamMembersForFilter={allTeamMembersForFilter}
                allProjectsForFilter={projects}
                filters={filters}
                setFilters={setFilters}
                // photoLoading={photoLoading} // Pass if DashboardView needs it
              />
            ) : null /* Should be covered by loading or error states */ }
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper function to check if any filters are active
const filtersApplied = (filters: typeof useStandupData extends (props: any) => { filters: infer T } ? T : never): boolean => {
  return !!filters.searchTerm || filters.selectedMembers.length > 0 || !!filters.dateRange.start || !!filters.dateRange.end || !!filters.projectFilter;
};

function App() {
  );
}

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AppContent />
    </MsalProvider>
  );
}

export default App;