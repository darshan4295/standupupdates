import { renderHook, act } from '@testing-library/react';
import { useStandupData } from './useStandupData';
import { TeamsApiService } from '../services/teamsApiService';
import { ProfilePhotoService } from '../services/ProfilePhotoService'; // Import for mocking

// Mock TeamsApiService
jest.mock('../services/teamsApiService', () => ({
  TeamsApiService: {
    fetchMessages: jest.fn(),
    refreshMessages: jest.fn(), // Though refreshData in hook now calls fetchMessages
  },
}));

// Mock ProfilePhotoService as it's used internally for enhancing team members
jest.mock('../services/ProfilePhotoService', () => ({
  ProfilePhotoService: {
    setAccessToken: jest.fn(),
    enhanceTeamMembersWithPhotos: jest.fn(async (members) => members), // Just return members
    clearCache: jest.fn(),
    getFallbackAvatar: jest.fn((name) => `avatar_for_${name}`),
  },
}));


const mockInitialMessagesPage1 = [
  { id: 'msg1', member: { id: 'user1', name: 'User One' }, date: '2023-01-01', rawMessage: 'Yesterday I did A' },
  { id: 'msg2', member: { id: 'user2', name: 'User Two' }, date: '2023-01-01', rawMessage: 'Yesterday I did B' },
];
const mockNextPageSkipToken1 = 'skipTokenForPage2';

const mockInitialMessagesPage2 = [
  { id: 'msg0', member: { id: 'user0', name: 'User Zero' }, date: '2022-12-31', rawMessage: 'Older message' },
];

describe('useStandupData Hook', () => {
  const mockAccessToken = 'test-token';
  const mockChatId = 'test-chat-id';

  beforeEach(() => {
    jest.clearAllMocks();
    // Provide a default implementation for fetchMessages that can be overridden in specific tests
    (TeamsApiService.fetchMessages as jest.Mock).mockResolvedValue({
      messages: [],
      nextSkipToken: undefined
    });
  });

  test('initial load sets messages, loading state, and pagination tokens', async () => {
    (TeamsApiService.fetchMessages as jest.Mock).mockResolvedValueOnce({
      messages: mockInitialMessagesPage1,
      nextSkipToken: mockNextPageSkipToken1,
    });

    const { result, rerender } = renderHook(
      ({ accessToken, chatId }) => useStandupData({ accessToken, chatId }),
      { initialProps: { accessToken: undefined, chatId: mockChatId } }
    );

    // Initially, no token, so loading might be true, but no data
    expect(result.current.loading).toBe(true);

    // Update props to provide accessToken, triggering useEffect
    rerender({ accessToken: mockAccessToken, chatId: mockChatId });

    await act(async () => {
      // Wait for promises to resolve, e.g., by waiting for loading to be false
      await new Promise(resolve => setTimeout(resolve, 0)); // allow microtasks to run
    });

    // Need to wait for loading to become false after async operations
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.updates).toEqual(mockInitialMessagesPage1);
    expect(result.current.hasMoreMessages).toBe(true);
    // Accessing nextPageSkipToken directly is not possible as it's not returned.
    // We verify its effect via hasMoreMessages and subsequent calls to fetchMoreMessages.
    expect(TeamsApiService.fetchMessages).toHaveBeenCalledWith(mockChatId, mockAccessToken);
  });

  test('fetchMoreMessages successfully loads next page and prepends messages', async () => {
    // Initial setup: Page 1 loaded
    (TeamsApiService.fetchMessages as jest.Mock)
      .mockResolvedValueOnce({ // For initial load
        messages: mockInitialMessagesPage1,
        nextSkipToken: mockNextPageSkipToken1,
      })
      .mockResolvedValueOnce({ // For fetchMoreMessages call
        messages: mockInitialMessagesPage2,
        nextSkipToken: undefined, // No more pages after this
      });

    const { result, rerender } = renderHook(
      ({ accessToken, chatId }) => useStandupData({ accessToken, chatId }),
      { initialProps: { accessToken: undefined, chatId: mockChatId } }
    );
    rerender({ accessToken: mockAccessToken, chatId: mockChatId });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMoreMessages).toBe(true);

    await act(async () => {
      await result.current.fetchMoreMessages();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.updates).toEqual([...mockInitialMessagesPage2, ...mockInitialMessagesPage1]);
    expect(result.current.hasMoreMessages).toBe(false);
    expect(TeamsApiService.fetchMessages).toHaveBeenCalledTimes(2);
    expect(TeamsApiService.fetchMessages).toHaveBeenLastCalledWith(mockChatId, mockAccessToken, mockNextPageSkipToken1);
  });

  test('fetchMoreMessages does not call API if no more messages (hasMoreMessages is false)', async () => {
    (TeamsApiService.fetchMessages as jest.Mock).mockResolvedValueOnce({ // Initial load
      messages: mockInitialMessagesPage1,
      nextSkipToken: undefined, // No skip token initially
    });

    const { result, rerender } = renderHook(
        ({ accessToken, chatId }) => useStandupData({ accessToken, chatId }),
        { initialProps: { accessToken: undefined, chatId: mockChatId } }
    );
    rerender({ accessToken: mockAccessToken, chatId: mockChatId });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMoreMessages).toBe(false);

    (TeamsApiService.fetchMessages as jest.Mock).mockClear(); // Clear call count from initial load

    await act(async () => {
      await result.current.fetchMoreMessages();
    });

    expect(TeamsApiService.fetchMessages).not.toHaveBeenCalled();
  });

  test('fetchMoreMessages does not call API if loading', async () => {
    (TeamsApiService.fetchMessages as jest.Mock).mockResolvedValueOnce({
        messages: mockInitialMessagesPage1,
        nextSkipToken: mockNextPageSkipToken1,
    });

    const { result, rerender } = renderHook(
        ({ accessToken, chatId }) => useStandupData({ accessToken, chatId }),
        { initialProps: { accessToken: undefined, chatId: mockChatId } }
    );
    rerender({ accessToken: mockAccessToken, chatId: mockChatId });

    await waitFor(() => expect(result.current.loading).toBe(false)); // Wait for initial load to complete

    // Manually set loading to true to simulate an ongoing process
    act(() => {
        // This is tricky as loading is managed internally.
        // We can check that if fetchMoreMessages is called while previous one is not finished,
        // it doesn't make a new API call. The hook's internal loading state should prevent this.
        // The current implementation of fetchMoreMessages already checks for `loading`.
    });
    (TeamsApiService.fetchMessages as jest.Mock).mockClear(); // Clear after initial load

    // Call fetchMoreMessages multiple times quickly
    // The hook's `loading` state should prevent multiple API calls.
    // This test is more about the internal guard of fetchMoreMessages.
    act(() => {
        result.current.fetchMoreMessages(); // First call, sets loading to true
        result.current.fetchMoreMessages(); // Second call, should be ignored due to loading state
    });

    // It should be called once for the first fetchMoreMessages, but not for the second
    // (TeamsApiService.fetchMessages will be called once by the first non-ignored call)
    // The mockResolvedValueOnce for the fetchMoreMessages call itself:
    (TeamsApiService.fetchMessages as jest.Mock).mockResolvedValueOnce({
        messages: mockInitialMessagesPage2,
        nextSkipToken: undefined
    });

    // Wait for the fetchMoreMessages call to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(TeamsApiService.fetchMessages).toHaveBeenCalledTimes(1);
  });


  test('refreshData resets pagination and fetches first page', async () => {
    // Initial setup: Page 1 and Page 2 loaded (so nextPageSkipToken would be undefined)
    (TeamsApiService.fetchMessages as jest.Mock)
      .mockResolvedValueOnce({ // Initial load
        messages: mockInitialMessagesPage1,
        nextSkipToken: mockNextPageSkipToken1,
      })
      .mockResolvedValueOnce({ // fetchMoreMessages
        messages: mockInitialMessagesPage2,
        nextSkipToken: undefined,
      });

    const { result, rerender } = renderHook(
        ({ accessToken, chatId }) => useStandupData({ accessToken, chatId }),
        { initialProps: { accessToken: undefined, chatId: mockChatId } }
    );
    rerender({ accessToken: mockAccessToken, chatId: mockChatId });

    await waitFor(() => expect(result.current.loading).toBe(false)); // Initial load done
    await act(async () => { await result.current.fetchMoreMessages(); });
    await waitFor(() => expect(result.current.loading).toBe(false)); // fetchMore done

    expect(result.current.updates).toEqual([...mockInitialMessagesPage2, ...mockInitialMessagesPage1]);
    expect(result.current.hasMoreMessages).toBe(false);

    // Now, mock for refreshData call
    const refreshedMessagesPage1 = [{ id: 'newMsg1', member: {id: 'userNew'}, date: '2023-01-02', rawMessage: 'Refreshed data' }];
    const newNextPageSkipToken = 'refreshedSkipToken';
    (TeamsApiService.fetchMessages as jest.Mock).mockResolvedValueOnce({
      messages: refreshedMessagesPage1,
      nextSkipToken: newNextPageSkipToken,
    });

    (TeamsApiService.fetchMessages as jest.Mock).mockClear(); // Clear previous call counts

    await act(async () => {
      await result.current.refreshData();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.updates).toEqual(refreshedMessagesPage1);
    expect(result.current.hasMoreMessages).toBe(true); // Because newNextPageSkipToken is present
    expect(TeamsApiService.fetchMessages).toHaveBeenCalledTimes(1);
    expect(TeamsApiService.fetchMessages).toHaveBeenCalledWith(mockChatId, mockAccessToken); // No skipToken for refresh
  });
});

// Helper to wait for next tick for async updates in tests
// (Already used waitFor, but this is another common pattern)
// const flushPromises = () => new Promise(setImmediate);

// A more robust waitFor, if needed, from RTL docs:
import {waitFor} from '@testing-library/react'
// Example: await waitFor(() => expect(mockAPI).toHaveBeenCalledTimes(1))
