import React, { useState } from 'react';
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
    clearFilters
  } = useStandupData({ accessToken, chatId: selectedChatId });

  const handleToggleFilters = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

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
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6 lg:p-8">
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
            
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <span className="ml-3 text-slate-700">Loading standup updates...</span>
              </div>
            ) : updates.length === 0 ? (
              <EmptyState
                type={totalUpdates === 0 ? 'no-data' : 'no-results'}
                onClearFilters={totalUpdates > 0 ? clearFilters : undefined}
              />
            ) : (
              <div className="space-y-6">
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