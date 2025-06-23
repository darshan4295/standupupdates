import { TeamsApiService } from './teamsApiService';
import { MessageParser } from './MessageParser'; // Assuming MessageParser is used and might need mocking if it makes external calls

// Mock MessageParser if its methods are complex or make their own calls.
// For fetchMessages, parseMultipleStandupMessages is called.
jest.mock('./MessageParser', () => ({
  MessageParser: {
    setAccessToken: jest.fn(),
    parseMultipleStandupMessages: jest.fn().mockImplementation(async (messages) =>
      messages.map((msg: any) => ({ id: msg.id, content: `parsed ${msg.body.content}`, member: { id: 'user1', name: 'Test User' }, date: '2023-01-01T12:00:00Z', rawMessage: msg.body.content }))
    ),
    clearUserCache: jest.fn(), // If used by refreshMessages indirectly
  },
}));

describe('TeamsApiService.fetchMessages', () => {
  const mockChatId = 'test-chat-id';
  const mockAccessToken = 'test-access-token';
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Spy on global fetch
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    // Restore fetch to its original implementation
    fetchSpy.mockRestore();
  });

  it('should fetch the first page of messages correctly and return nextSkipToken', async () => {
    const mockMessages = [{ id: '1', body: { content: 'Hello' } }, { id: '2', body: { content: 'World' } }];
    const mockNextLink = `https://graph.microsoft.com/v1.0/chats/${mockChatId}/messages?$skipToken=nextToken123`;

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: mockMessages,
        '@odata.nextLink': mockNextLink,
      }),
    } as Response);

    const result = await TeamsApiService.fetchMessages(mockChatId, mockAccessToken);

    expect(fetchSpy).toHaveBeenCalledWith(
      `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(mockChatId)}/messages`,
      expect.any(Object)
    );
    expect(MessageParser.setAccessToken).toHaveBeenCalledWith(mockAccessToken);
    expect(MessageParser.parseMultipleStandupMessages).toHaveBeenCalledWith(mockMessages);

    expect(result.messages).toHaveLength(mockMessages.length);
    expect(result.messages[0].id).toBe(mockMessages[0].id);
    expect(result.messages[0].content).toBe(`parsed ${mockMessages[0].body.content}`);
    expect(result.nextSkipToken).toBe(mockNextLink);
  });

  it('should use the skipToken URL directly if provided', async () => {
    const mockSkippedMessages = [{ id: '3', body: { content: 'More Hello' } }];
    const skipTokenUrl = `https://graph.microsoft.com/v1.0/chats/${mockChatId}/messages?$skipToken=neXtValUe`;

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: mockSkippedMessages,
        // No nextLink, indicating it's the last page
      }),
    } as Response);

    const result = await TeamsApiService.fetchMessages(mockChatId, mockAccessToken, skipTokenUrl);

    expect(fetchSpy).toHaveBeenCalledWith(skipTokenUrl, expect.any(Object));
    expect(MessageParser.parseMultipleStandupMessages).toHaveBeenCalledWith(mockSkippedMessages);

    expect(result.messages).toHaveLength(mockSkippedMessages.length);
    expect(result.messages[0].id).toBe(mockSkippedMessages[0].id);
    expect(result.nextSkipToken).toBeUndefined();
  });

  it('should handle skipToken as a raw token value (alternative case)', async () => {
    const rawSkipToken = "rawToken123";
    const expectedUrl = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(mockChatId)}/messages?$skipToken=${rawSkipToken}`;
    const mockMessages = [{ id: '4', body: { content: 'Raw token message' } }];

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: mockMessages,
      }),
    } as Response);

    await TeamsApiService.fetchMessages(mockChatId, mockAccessToken, rawSkipToken);

    expect(fetchSpy).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
  });


  it('should throw an error if the API call fails', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(TeamsApiService.fetchMessages(mockChatId, mockAccessToken))
      .rejects
      .toThrow('Failed to fetch messages: 500 Internal Server Error');
  });

  it('should return empty messages and no token if no access token is provided', async () => {
    const result = await TeamsApiService.fetchMessages(mockChatId, undefined);
    expect(result.messages).toEqual([]);
    expect(result.nextSkipToken).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should return empty messages and no token if API returns empty value and no nextLink', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: [], // Empty messages
        // No @odata.nextLink
      }),
    } as Response);

    const result = await TeamsApiService.fetchMessages(mockChatId, mockAccessToken);
    expect(result.messages).toEqual([]);
    expect(result.nextSkipToken).toBeUndefined();
  });

  it('should return parsed messages even if nextLink is missing (last page)', async () => {
    const mockMessages = [{ id: '1', body: { content: 'Last page message' } }];
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: mockMessages,
        // No @odata.nextLink
      }),
    } as Response);

    const result = await TeamsApiService.fetchMessages(mockChatId, mockAccessToken);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].id).toBe('1');
    expect(result.nextSkipToken).toBeUndefined();
  });
});
