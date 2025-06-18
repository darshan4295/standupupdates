import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App'; // Assuming App.tsx exports the App component correctly
import { TeamsApiService } from './services/teamsApiService';
import { PublicClientApplication } from '@azure/msal-browser';

// Mock MSAL instance and MsalProvider
jest.mock('@azure/msal-react', () => ({
  MsalProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMsal: () => ({
    instance: new PublicClientApplication({ auth: { clientId: 'test-client-id' } }),
    accounts: [],
    inProgress: 'none',
  }),
  AuthenticatedTemplate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UnauthenticatedTemplate: () => null,
}));

// Mock TeamsApiService
jest.mock('./services/teamsApiService');

// Mock ProfilePhotoService (used by useStandupData -> Header -> DashboardView)
jest.mock('./services/ProfilePhotoService', () => ({
  ProfilePhotoService: {
    setAccessToken: jest.fn(),
    enhanceTeamMembersWithPhotos: jest.fn(async (members) => members),
    clearCache: jest.fn(),
    getFallbackAvatar: jest.fn((name) => `avatar_for_${name}`),
  },
}));


const mockPage1Messages = [
  { id: 'p1_msg1', member: { id: 'user1', name: 'User One' }, date: '2023-10-27T10:00:00Z', rawMessage: 'Page 1 Message 1', accomplishments: ['P1M1 Accomp'], todayPlans: ['P1M1 Plan'] },
  { id: 'p1_msg2', member: { id: 'user2', name: 'User Two' }, date: '2023-10-27T09:00:00Z', rawMessage: 'Page 1 Message 2', accomplishments: ['P1M2 Accomp'], todayPlans: ['P1M2 Plan'] },
];
const mockPage1NextToken = 'skipTokenPage2';

const mockPage0Messages = [ // Older messages
  { id: 'p0_msg1', member: { id: 'user3', name: 'User Three' }, date: '2023-10-26T10:00:00Z', rawMessage: 'Page 0 Message 1 (Older)', accomplishments: ['P0M1 Accomp'], todayPlans: ['P0M1 Plan'] },
];

describe('App Infinite Scrolling Integration Test', () => {
  const mockAccessToken = 'dummy-access-token';
  const mockChatId = 'dummy-chat-id';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock for TeamsApiService.fetchMessages
    (TeamsApiService.fetchMessages as jest.Mock)
      // First call (initial load)
      .mockResolvedValueOnce({
        messages: mockPage1Messages,
        nextSkipToken: mockPage1NextToken,
      })
      // Second call (triggered by scroll to top)
      .mockResolvedValueOnce({
        messages: mockPage0Messages, // Older messages
        nextSkipToken: undefined, // No more pages
      });

    // Mock a successful auth state by simulating handleAuthChange and handleChatSelect
    // This requires some knowledge of App.tsx's internal state management.
    // A more robust way might be to wrap App and provide a context, or use MSAL test utils.
    // For now, we'll assume the Header component can trigger these.
    // We'll need to simulate these being set for useStandupData to fetch.
  });

  test('loads initial messages, then loads older messages on scroll to top', async () => {
    render(<App />);

    // Simulate authentication and chat selection to trigger data loading
    // This is a simplified way; direct state manipulation or deeper component interaction might be needed
    // For this test, we'll assume useStandupData gets triggered if accessToken and chatId are present.
    // We can't directly set state of App here, so we rely on initial props of useStandupData (which are undefined)
    // then its useEffect runs. We need to make sure useStandupData gets the token and chatID.
    // The most straightforward way is to ensure the mocked service is called.

    // We need to provide an access token and select a chat for useStandupData to run.
    // Since AppContent is where useStandupData is, and App handles MSAL, this is tricky.
    // Let's assume that Header component somehow sets accessToken and selectedChatId.
    // For the test, we'll rely on the fact that useStandupData is called.
    // The mock for fetchMessages will be used by useStandupData.

    // Wait for initial messages (Page 1) to be loaded and displayed
    await waitFor(() => {
      expect(screen.getByText(/Page 1 Message 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Page 1 Message 2/i)).toBeInTheDocument();
    });

    // Ensure "Loading older messages..." indicator is NOT visible initially
    expect(screen.queryByText(/Loading older messages.../i)).not.toBeInTheDocument();

    // Check that fetchMessages was called for the initial load
    expect(TeamsApiService.fetchMessages).toHaveBeenCalledTimes(1);
    // The arguments for the first call would be (undefined, undefined) due to initial state,
    // then (token, chat) after simulated auth. This part is hard to test without deeper App state control.
    // Let's focus on the scroll behavior after initial load.
    // To make this testable, we'd need to ensure useStandupData runs with token/chatId.
    // A simple way: assume initial load happened and check call count.

    // Simulate scroll to top
    const scrollContainer = screen.getByRole('main'); // The <main> tag with ref

    // Ensure the container is actually scrollable in the test environment (JSDOM)
    // JSDOM doesn't do real layout, so scrollHeight, clientHeight might be 0.
    // We might need to set them manually for scrollTop to have an effect.
    Object.defineProperty(scrollContainer, 'scrollHeight', { configurable: true, value: 500 });
    Object.defineProperty(scrollContainer, 'clientHeight', { configurable: true, value: 100 });

    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });

    // Check for "Loading older messages..." indicator
    // This indicator appears if `loading` is true AND `updates.length > 0`.
    await waitFor(() => {
       expect(screen.getByText(/Loading older messages.../i)).toBeInTheDocument();
    });

    // Wait for older messages (Page 0) to be loaded and displayed
    await waitFor(() => {
      expect(screen.getByText(/Page 0 Message 1 \(Older\)/i)).toBeInTheDocument();
    });

    // Verify new messages are prepended
    const allMessages = screen.getAllByRole('article'); // Assuming StandupCard renders an <article>
    // Or check by text content order if possible and more robust
    expect(allMessages[0]).toHaveTextContent(/Page 0 Message 1 \(Older\)/i);
    expect(allMessages[1]).toHaveTextContent(/Page 1 Message 1/i);
    expect(allMessages[2]).toHaveTextContent(/Page 1 Message 2/i);

    // Verify "Loading older messages..." indicator is hidden again
    expect(screen.queryByText(/Loading older messages.../i)).not.toBeInTheDocument();

    // Verify TeamsApiService.fetchMessages was called the second time with the skipToken
    expect(TeamsApiService.fetchMessages).toHaveBeenCalledTimes(2);
    expect(TeamsApiService.fetchMessages).toHaveBeenLastCalledWith(
      undefined, // chatId from useStandupData (might be undefined if not properly set in test)
      undefined, // accessToken from useStandupData
      mockPage1NextToken // This is the critical part for pagination
    );
    // Note: The undefined chatId and accessToken in the assertion above highlight a difficulty
    // in properly setting these up in App.tsx from a test without a lot of boilerplate
    // for simulating Header interactions or MSAL auth flow.
    // The key part of this integration test is that fetchMoreMessages is called with the skipToken.
  });
});
