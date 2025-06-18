import { StandupUpdate, TeamsMessage } from '../types';
import { MessageParser } from './MessageParser'; // Import your enhanced MessageParser

export class TeamsApiService {
  private static messageCache = new Map<string, StandupUpdate[]>();
  
  /**
   * Fetch and parse standup messages from a Teams chat
   */
  static async fetchMessages(chatId: string, accessToken?: string): Promise<StandupUpdate[]> {
    console.log('TeamsApiService: Fetching messages...', { chatId, hasToken: !!accessToken });
    
    if (!accessToken) {
      console.warn('TeamsApiService: No access token provided, cannot fetch messages');
      return [];
    }

    try {
      // Set the access token for MessageParser
      MessageParser.setAccessToken(accessToken);
      
      // Fetch raw messages from Microsoft Graph API
      const url = `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}/messages`;
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
        firstMessage: data.value?.[0],
        fullResponse: data
      });

      // Extract messages from the Graph API response
      const rawMessages: TeamsMessage[] = data.value || [];
      
      if (rawMessages.length === 0) {
        console.log('TeamsApiService: No messages found in chat');
        return [];
      }

      // Parse messages using the enhanced MessageParser
      console.log('TeamsApiService: Parsing messages with MessageParser...');
      const standupUpdates = await MessageParser.parseMultipleStandupMessages(rawMessages);
      
      console.log('TeamsApiService: Parsing complete:', {
        rawMessageCount: rawMessages.length,
        parsedUpdateCount: standupUpdates.length,
        standupUpdates
      });

      // Cache the results
      this.messageCache.set(chatId, standupUpdates);
      
      return standupUpdates;

    } catch (error) {
      console.error('TeamsApiService: Error fetching messages:', error);
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
    
    // Fetch fresh data
    return this.fetchMessages(chatId, accessToken);
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