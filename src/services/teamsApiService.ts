import { StandupUpdate, TeamsMessage } from '../types';
import { MessageParser } from './MessageParser'; // Import your enhanced MessageParser

export class TeamsApiService {
  private static messageCache = new Map<string, StandupUpdate[]>();
  
  /**
   * Fetch and parse standup messages from a Teams chat
   */
  static async fetchMessages(
    chatId: string,
    accessToken?: string,
    skipToken?: string
  ): Promise<{ messages: StandupUpdate[]; nextSkipToken?: string }> {
    console.log('TeamsApiService: Fetching messages...', { chatId, hasToken: !!accessToken, skipToken });
    
    if (!accessToken) {
      console.warn('TeamsApiService: No access token provided, cannot fetch messages');
      return { messages: [], nextSkipToken: undefined };
    }

    try {
      // Set the access token for MessageParser
      MessageParser.setAccessToken(accessToken);
      
      // Fetch raw messages from Microsoft Graph API
      let url = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}/messages`;
      if (skipToken) {
        // The skipToken from Graph API is usually a full URL or a URL with a query string.
        // We need to ensure we're correctly appending it.
        // If skipToken is a full URL, it might already include query parameters.
        // For now, assuming skipToken is just the token value, not a full URL.
        // Microsoft Graph API typically provides $skipToken as a parameter in the @odata.nextLink.
        // Let's assume the skipToken provided to this function is the raw token value.
        // Or, if @odata.nextLink is passed directly, it would be a full URL.
        // The prompt says "append to the Microsoft Graph API URL (e.g., ...?$skipToken={skipToken})"
        // This implies skipToken is the value, not the full URL.
        // However, fetchAllMessages uses data['@odata.nextLink'] directly.
        // Let's clarify: if skipToken is from @odata.nextLink, it IS the full URL.
        // The example "$skipToken={skipToken}" implies it's just the token value part.
        // Let's assume the skipToken parameter to *this function* is the raw token value itself.
        // If the full nextLink is passed as skipToken, the URL construction would be different.

        // Re-reading: "nextSkipToken: The @odata.nextLink value from the API response, which will be used as the skipToken for the next request."
        // This means the `skipToken` parameter to this function will be the *full* `@odata.nextLink`.
        // So, the URL for the request IS the skipToken if provided.
        if (skipToken.startsWith("https://graph.microsoft.com/")) {
          url = skipToken; // Use the full URL from @odata.nextLink
        } else {
          // This case handles if a raw token value (not a full URL) is passed,
          // though based on the @odata.nextLink usage, this might be less common.
          url = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}/messages?$skipToken=${skipToken}`;
        }
      }
      console.log('TeamsApiService: Making API call to:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('TeamsApiService: Raw API response:', {
        hasValue: !!data.value,
        isArray: Array.isArray(data.value),
        messageCount: data.value?.length || 0,
        // firstMessage: data.value?.[0], // Commenting out to avoid excessive logging if response is huge
        nextLink: data['@odata.nextLink'],
        // fullResponse: data // Commenting out to avoid excessive logging
      });

      // Extract messages from the Graph API response
      const rawMessages: TeamsMessage[] = data.value || [];
      
      let nextSkipTokenValue: string | undefined = data['@odata.nextLink'];

      // As per requirement: "nextSkipToken: The @odata.nextLink value from the API response... If there are no more messages, nextSkipToken should be undefined."
      // data['@odata.nextLink'] will be undefined if there's no next page.

      if (rawMessages.length === 0 && !nextSkipTokenValue) {
        console.log('TeamsApiService: No messages found in chat and no next page.');
        return { messages: [], nextSkipToken: undefined };
      }

      console.log('TeamsApiService: Parsing messages with MessageParser...');
      const standupUpdates = await MessageParser.parseMultipleStandupMessages(rawMessages);
      
      console.log('TeamsApiService: Parsing complete:', {
        rawMessageCount: rawMessages.length,
        parsedUpdateCount: standupUpdates.length,
        // standupUpdates // Commenting out to avoid excessive logging
      });

      // Cache the results - this will cache only the current page's messages.
      // This might need adjustment depending on overall caching strategy for paginated data.
      // For now, sticking to the existing pattern: cache what was fetched.
      if (!skipToken) { // Only cache if it's the first page (no skipToken)
        this.messageCache.set(chatId, standupUpdates);
      }
      
      return { messages: standupUpdates, nextSkipToken: nextSkipTokenValue };

    } catch (error) {
      console.error('TeamsApiService: Error fetching messages:', error);
      // Ensure the promise rejects with the error for proper error handling upstream.
      throw error;
    }
  }

  /**
   * Refresh messages (bypass cache)
   */
  static async refreshMessages(chatId: string, accessToken?: string): Promise<StandupUpdate[]> {
    console.log('TeamsApiService: Refreshing messages (bypassing cache)...');
    
    // Clear cache for this chat
    this.messageCache.delete(chatId);
    
    // Clear MessageParser cache
    MessageParser.clearUserCache();
    
    // Fetch fresh data - first page only
    // The original refreshMessages returned StandupUpdate[], implying it fetched and refreshed everything it knew.
    // Now fetchMessages returns a paginated result.
    // To maintain the Promise<StandupUpdate[]> signature, we'll fetch the first page and return its messages.
    // If a full refresh is needed, the caller should use fetchAllMessages.
    const result = await this.fetchMessages(chatId, accessToken); // Fetches the first page
    return result.messages;
  }

  /**
   * Get cached messages if available
   */
  static getCachedMessages(chatId: string): StandupUpdate[] | undefined {
    return this.messageCache.get(chatId);
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    this.messageCache.clear();
    MessageParser.clearUserCache();
  }

  /**
   * Fetch messages with pagination support
   */
  static async fetchAllMessages(chatId: string, accessToken?: string, pageSize: number = 50): Promise<StandupUpdate[]> {
    console.log('TeamsApiService: Fetching all messages with pagination...');
    
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    MessageParser.setAccessToken(accessToken);
    
    let allMessages: TeamsMessage[] = [];
    let nextLink: string | undefined = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}/messages?$top=${pageSize}`;

    try {
      while (nextLink) {
        console.log('TeamsApiService: Fetching page:', nextLink);
        
        const response = await fetch(nextLink, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const messages: TeamsMessage[] = data.value || [];
        
        allMessages = allMessages.concat(messages);
        nextLink = data['@odata.nextLink'];
        
        console.log('TeamsApiService: Page loaded:', {
          pageMessages: messages.length,
          totalMessages: allMessages.length,
          hasNextPage: !!nextLink
        });
      }

      console.log('TeamsApiService: All pages loaded, parsing messages...');
      const standupUpdates = await MessageParser.parseMultipleStandupMessages(allMessages);
      
      console.log('TeamsApiService: All messages parsed:', {
        totalRawMessages: allMessages.length,
        parsedUpdates: standupUpdates.length
      });

      // Cache the results
      this.messageCache.set(chatId, standupUpdates);
      
      return standupUpdates;

    } catch (error) {
      console.error('TeamsApiService: Error fetching all messages:', error);
      throw error;
    }
  }

  /**
   * Test the API connection and permissions
   */
  static async testConnection(chatId: string, accessToken?: string): Promise<boolean> {
    if (!accessToken) {
      console.error('TeamsApiService: No access token for connection test');
      return false;
    }

    try {
      const url = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const success = response.ok;
      console.log('TeamsApiService: Connection test result:', {
        success,
        status: response.status,
        statusText: response.statusText
      });

      return success;

    } catch (error) {
      console.error('TeamsApiService: Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get chat information
   */
  static async getChatInfo(chatId: string, accessToken?: string): Promise<any> {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    try {
      const url = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch chat info: ${response.status} ${response.statusText}`);
      }

      const chatInfo = await response.json();
      console.log('TeamsApiService: Chat info:', chatInfo);
      
      return chatInfo;

    } catch (error) {
      console.error('TeamsApiService: Error fetching chat info:', error);
      throw error;
    }
  }
}