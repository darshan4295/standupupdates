import { StandupUpdate, TeamsMessage, TeamMember } from '../types';

// Interface for Microsoft Graph User data
interface GraphUser {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  department?: string;
}

export class MessageParser {
  private static userCache = new Map<string, TeamMember>();
  private static accessToken: string | null = null;

  // Set the access token for Microsoft Graph API calls
  static setAccessToken(token: string) {
    this.accessToken = token;
  }

  // Fetch user details from Microsoft Graph API
// Fetch user details from Microsoft Graph API
  private static async fetchUserDetails(userId: string): Promise<TeamMember | null> {
    // Check cache first
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)!;
    }

    if (!this.accessToken) {
      console.warn('No access token available for fetching user details');
      return null;
    }

    try {
      // Fetch user basic info with expanded fields
      const userResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}?$select=id,displayName,mail,userPrincipalName,jobTitle,department,givenName,surname`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        console.warn(`Failed to fetch user ${userId}: ${userResponse.status} ${userResponse.statusText}`);
        return null;
      }

      const userData: GraphUser = await userResponse.json();

      // Create team member with fallback avatar (ProfilePhotoService will handle real photos)
      const teamMember: TeamMember = {
        id: userData.id,
        name: userData.displayName,
        email: userData.mail || userData.userPrincipalName || `${userData.displayName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=0078D4&color=fff`,
        jobTitle: userData.jobTitle,
        department: userData.department
      };

      // Cache the result
      this.userCache.set(userId, teamMember);
      return teamMember;

    } catch (error) {
      console.error(`Error fetching user details for ${userId}:`, error);
      return null;
    }
  }

  // Batch fetch multiple users for better performance
  private static async fetchMultipleUsers(userIds: string[]): Promise<Map<string, TeamMember>> {
    const results = new Map<string, TeamMember>();
    
    // Filter out already cached users
    const uncachedIds = userIds.filter(id => !this.userCache.has(id));
    
    // Return cached results for already fetched users
    userIds.forEach(id => {
      if (this.userCache.has(id)) {
        results.set(id, this.userCache.get(id)!);
      }
    });

    if (uncachedIds.length === 0) {
      return results;
    }

    if (!this.accessToken) {
      console.warn('No access token available for fetching user details');
      return results;
    }

    try {
      // Use batch request for better performance
      const batchRequests = uncachedIds.map((id, index) => ({
        id: index.toString(),
        method: 'GET',
        url: `/users/${id}?$select=id,displayName,mail,userPrincipalName,jobTitle,department`
      }));

      const batchResponse = await fetch('https://graph.microsoft.com/v1.0/$batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: batchRequests
        })
      });

      if (!batchResponse.ok) {
        throw new Error(`Batch request failed: ${batchResponse.status}`);
      }

      const batchData = await batchResponse.json();
      
      // Process batch responses
      for (const response of batchData.responses) {
        if (response.status === 200) {
          const userData: GraphUser = response.body;
          const userId = userData.id;
          
          // Fetch photo separately (photos can't be batched easily)
          let photoUrl: string | undefined;
          try {
            const photoResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/photo/$value`, {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`
              }
            });

            if (photoResponse.ok) {
              const photoBlob = await photoResponse.blob();
              photoUrl = URL.createObjectURL(photoBlob);
            }
          } catch {
            photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=0078D4&color=fff`;
          }

          const teamMember: TeamMember = {
            id: userData.id,
            name: userData.displayName,
            email: userData.mail || userData.userPrincipalName || `${userData.displayName.toLowerCase().replace(/\s+/g, '.')}@celestialsys.com`,
            avatar: photoUrl,
            jobTitle: userData.jobTitle,
            department: userData.department
          };

          this.userCache.set(userId, teamMember);
          results.set(userId, teamMember);
        }
      }

    } catch (error) {
      console.error('Error in batch user fetch:', error);
    }

    return results;
  }

  static async parseStandupMessage(message: TeamsMessage): Promise<StandupUpdate | null> {
    // Skip system messages or messages without a user
    if (!message.from?.user || message.messageType !== 'message') {
      return null;
    }

    const body = this.stripHtmlTags(message.body.content);
    
    // Check if this looks like a standup message
    if (!this.isStandupMessage(body)) {
      return null;
    }
    
    // Fetch user details from Microsoft Graph
    const userDetails = await this.fetchUserDetails(message.from.user.id);
    
    // Create team member from fetched data or fallback to message data
    const member: TeamMember = userDetails || {
      id: message.from.user.id,
      name: message.from.user.displayName,
      email: `${message.from.user.displayName.toLowerCase().replace(/\s+/g, '.')}@celestialsys.com`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(message.from.user.displayName)}&background=0078D4&color=fff`
    };
    
    // Extract project name
    const projectMatch = body.match(/Project\/Team Name:\s*([^–\n]+?)(?:\s*–|\s+What|\s+\d+\.|\s*$)/i);
    const projectName = projectMatch ? projectMatch[1].trim() : this.extractProjectFromContent(body);
    
    // Extract accomplishments
    const accomplishments = this.extractAccomplishments(body);
    
    // Extract tasks completion status
    const { tasksCompleted, carryForward, carryForwardReason } = this.extractTasksStatus(body);
    
    // Extract today's plans
    const todayPlans = this.extractTodayPlans(body);
    
    if (accomplishments.length === 0 && todayPlans.length === 0) {
      return null; // Not a valid standup message
    }
    
    return {
      id: message.id,
      member,
      projectName,
      date: new Date(message.createdDateTime).toISOString().split('T')[0],
      timestamp: new Date(message.createdDateTime).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      accomplishments,
      tasksCompleted,
      carryForward: carryForward || undefined,
      carryForwardReason: carryForwardReason || undefined,
      todayPlans,
      rawMessage: body
    };
  }

  // Batch parse multiple messages for better performance
  static async parseMultipleStandupMessages(messages: TeamsMessage[]): Promise<StandupUpdate[]> {
    // Extract all unique user IDs from messages
    const userIds = [...new Set(messages
      .filter(msg => msg.from?.user && msg.messageType === 'message')
      .map(msg => msg.from!.user.id))];

    // Fetch all users in batch
    await this.fetchMultipleUsers(userIds);

    // Parse all messages
    const results: StandupUpdate[] = [];
    for (const message of messages) {
      const parsed = await this.parseStandupMessage(message);
      if (parsed) {
        results.push(parsed);
      }
    }

    return results;
  }

  // Clear the user cache (useful for testing or when access token changes)
  static clearUserCache() {
    this.userCache.clear();
  }

  // Get cached user data
  static getCachedUser(userId: string): TeamMember | undefined {
    return this.userCache.get(userId);
  }

  // Rest of the methods remain the same...
  private static stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private static isStandupMessage(text: string): boolean {
    const standupIndicators = [
      /project\/team name/i,
      /accomplishments?\s+yesterday/i,
      /what were your accomplishments/i,
      /plan to work on today/i,
      /what do you plan/i,
      /tasks?\s+completed/i,
      /carry\s+forward/i,
      /pending from yesterday/i
    ];
    
    return standupIndicators.some(pattern => pattern.test(text));
  }
  
  private static extractProjectFromContent(text: string): string {
    const patterns = [
      /project\/team name:\s*([^–\n]+?)(?:\s*–|\s+what|\s+\d+\.|\s*$)/i,
      /project:\s*([^–\n]+?)(?:\s*–|\s+what|\s+\d+\.|\s*$)/i,
      /team:\s*([^–\n]+?)(?:\s*–|\s+what|\s+\d+\.|\s*$)/i,
      /(hitachi|froala|ovation)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Unknown Project';
  }
  
  private static extractAccomplishments(text: string): string[] {
    const accomplishments: string[] = [];
    
    const accomplishmentsMatch = text.match(/(?:what were your )?accomplishments?\s+yesterday[^?]*\?\s*(?:\(tasks\))?\s*(.*?)(?=\s*did you achieve|$)/is);
    
    if (accomplishmentsMatch && accomplishmentsMatch[1].trim()) {
      const accomplishmentsText = accomplishmentsMatch[1];
      const items = this.extractListItems(accomplishmentsText);
      accomplishments.push(...items);
    }
    
    const altMatch = text.match(/accomplishments?\s+yesterday:\s*(.*?)(?=(?:pending from|plan for today|did you achieve|$))/is);
    if (altMatch && accomplishments.length === 0) {
      const items = this.extractListItems(altMatch[1]);
      accomplishments.push(...items);
    }
    
    return accomplishments;
  }
  
  private static extractTasksStatus(text: string): { tasksCompleted: boolean; carryForward: string; carryForwardReason: string } {
    const tasksMatch = text.match(/did you achieve.*?yesterday\?.*?(?:if not.*?why\?)?\s*(.*?)(?=\s*what do you plan|$)/is);
    
    let tasksCompleted = true;
    let carryForward = '';
    let carryForwardReason = '';
    
    if (tasksMatch && tasksMatch[1].trim()) {
      const tasksText = tasksMatch[1].trim();
      tasksCompleted = /yes/i.test(tasksText) && !/no/i.test(tasksText);
      
      if (!tasksCompleted) {
        const carryForwardMatch = tasksText.match(/(?:carry.*?forward|pending).*?:?\s*(.+?)(?:\s*(?:and why|because|reason).*?:?\s*(.+?))?$/is);
        if (carryForwardMatch) {
          carryForward = carryForwardMatch[1].trim();
          carryForwardReason = carryForwardMatch[2]?.trim() || '';
        }
      }
    }
    
    const pendingMatch = text.match(/pending from yesterday:\s*(.*?)(?=(?:plan for today|$))/is);
    if (pendingMatch) {
      tasksCompleted = false;
      const pendingText = pendingMatch[1].trim();
      const reasonMatch = pendingText.match(/\(([^)]+)\)/);
      if (reasonMatch) {
        carryForwardReason = reasonMatch[1];
        carryForward = pendingText.replace(/\([^)]+\)/, '').trim();
      } else {
        carryForward = pendingText;
      }
    }
    
    return { tasksCompleted, carryForward, carryForwardReason };
  }
  
  private static extractTodayPlans(text: string): string[] {
    const plans: string[] = [];
    
    const plansMatch = text.match(/what do you plan.*?today\?\s*(?:\(tasks\))?\s*(.*?)$/is);
    
    if (plansMatch && plansMatch[1].trim()) {
      const plansText = plansMatch[1];
      const items = this.extractListItems(plansText);
      plans.push(...items);
    }
    
    const altMatch = text.match(/plan for today:\s*(.*?)$/is);
    if (altMatch && plans.length === 0) {
      const items = this.extractListItems(altMatch[1]);
      plans.push(...items);
    }
    
    return plans;
  }
  
  private static extractListItems(text: string): string[] {
    const items: string[] = [];
    
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    if (cleanText.length > 20 && !cleanText.includes('.') && !cleanText.includes(';')) {
      items.push(cleanText);
      return items;
    }
    
    const lines = cleanText.split(/\.|;(?=\s*[A-Z])/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    for (const line of lines) {
      const cleaned = line
        .replace(/^\d+\.\s*|^[-*•]\s*|^[a-zA-Z]\.\s*/g, '')
        .replace(/^(hitachi|froala|ovation):\s*/i, '')
        .trim();
      
      if (cleaned.length > 10) {
        items.push(cleaned);
      }
    }
    
    if (items.length === 0 && cleanText.length > 10) {
      items.push(cleanText);
    }
    
    return items;
  }
}