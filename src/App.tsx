import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/authConfig';
import { Header } from './components/Header';
import { FilterSidebar } from './components/FilterSidebar';
import { StandupCard } from './components/StandupCard';
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
    updates,
    totalUpdates,
    loading,
    error,
    filters,
    setFilters,
    teamMembers,
    projects,
    refreshData,
    clearFilters,
    fetchMoreMessages,
    hasMoreMessages
  } = useStandupData({ accessToken, chatId: selectedChatId });

  const scrollContainerRef = useRef<HTMLElement>(null);
  const scrollInfoRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  // const [isLoadingMore, setIsLoadingMore] = useState(false); // For a dedicated "load more" spinner

  const handleToggleFilters = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  // Scroll handler for infinite scroll
  const handleScroll = useCallback(async () => {
    if (!scrollContainerRef.current || !fetchMoreMessages) {
      return;
    }
    const { scrollTop } = scrollContainerRef.current;

    if (scrollTop < 50 && !loading && hasMoreMessages && accessToken && selectedChatId) {
      console.log('App: Reached top, fetching more messages...');
      // Store scroll height and position *before* fetching new data
      scrollInfoRef.current = {
        scrollHeight: scrollContainerRef.current.scrollHeight,
        scrollTop: scrollContainerRef.current.scrollTop,
      };
      // setIsLoadingMore(true); // For dedicated spinner
      try {
        await fetchMoreMessages();
      } catch (e) {
        console.error("App: Error fetching more messages:", e);
        // Error is already handled in useStandupData
      } finally {
        // setIsLoadingMore(false);
      }
    }
  }, [loading, hasMoreMessages, fetchMoreMessages, accessToken, selectedChatId]);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Maintain scroll position after new messages are loaded (older messages prepended)
  useLayoutEffect(() => {
    if (scrollInfoRef.current && scrollContainerRef.current && updates.length > 0) {
      const { scrollHeight: oldScrollHeight, scrollTop: oldScrollTop } = scrollInfoRef.current;
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      const scrollHeightDifference = newScrollHeight - oldScrollHeight;

      if (scrollHeightDifference > 0) { // Content was added
        scrollContainerRef.current.scrollTop = oldScrollTop + scrollHeightDifference;
      }
      scrollInfoRef.current = null; // Reset after adjustment
    }
    // We want this to run when updates change, specifically when new items are prepended.
    // Depending on updates array directly might be too frequent if updates can change for other reasons.
    // Using updates.length or updates[0]?.id could be more targeted if updates have stable IDs.
  }, [updates]);


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
        totalUpdates={totalUpdates}
        filteredUpdates={updates.length}
        updates={updates}
        teamMembers={teamMembers} // Used for DashboardView's teamMembers (display) & allTeamMembers (filter)
        projects={projects} // Pass projects
        filters={filters} // Pass filters state
        setFilters={setFilters} // Pass setFilters function
        accessToken={accessToken}
        selectedChatId={selectedChatId}
        onAuthChange={handleAuthChange}
        onChatSelect={handleChatSelect}
      />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <FilterSidebar
          filters={filters}
          onFiltersChange={setFilters}
          teamMembers={teamMembers}
          projects={projects}
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
        />
        
        <main ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6 lg:p-8">
            {/* Optional: Dedicated loader for "loading more"
            {isLoadingMore && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-slate-600">Loading older messages...</span>
              </div>
            )}
            */}
            {!accessToken && (
              <div className="mb-6 p-4 bg-sky-100 border border-sky-300 rounded-lg">
                <h3 className="text-sm font-medium text-sky-700 mb-2">
                  Connect to Microsoft Teams
                </h3>
                <p className="text-sm text-sky-600">
                  Sign in with your Microsoft account or provide an access token to access your Teams chats and scan for standup messages.
                  Currently showing sample data.
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
            
            {loading && updates.length === 0 ? ( // Show main loader only on initial load
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <span className="ml-3 text-slate-700">Loading standup updates...</span>
              </div>
            ) : updates.length === 0 && !loading ? ( // Ensure not loading before showing empty state
              <EmptyState
                type={totalUpdates === 0 ? 'no-data' : 'no-results'}
                onClearFilters={totalUpdates > 0 ? clearFilters : undefined}
              />
            ) : (
              <div className="space-y-6">
                {/* Optional: Dedicated loader for "loading more" when loading is true but updates are present */}
                {loading && updates.length > 0 && (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-sm text-slate-600">Loading older messages...</span>
                  </div>
                )}
                {updates.map((update) => (
                  <StandupCard key={update.id} update={update} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
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