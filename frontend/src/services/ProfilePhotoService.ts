import { TeamMember } from "../types";

// ProfilePhotoService.ts
export class ProfilePhotoService {
  private static photoCache = new Map<string, string>();
  private static failedUsers = new Set<string>(); // Track users whose photos failed to load
  private static accessToken: string | null = null;

  static setAccessToken(token: string) {
    this.accessToken = token;
    console.log('ProfilePhotoService: Access token set');
  }

  /**
   * Fetch a user's profile photo from Microsoft Graph API
   */
  static async fetchProfilePhoto(userId: string): Promise<string | null> {
    // Check cache first
    if (this.photoCache.has(userId)) {
      return this.photoCache.get(userId)!;
    }

    // Don't retry failed users
    if (this.failedUsers.has(userId)) {
      return null;
    }

    if (!this.accessToken) {
      console.warn('ProfilePhotoService: No access token available');
      return null;
    }

    try {
      console.log(`ProfilePhotoService: Fetching photo for user ${userId}`);
      
      // First try to get user info to validate the user exists
      const userInfoResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!userInfoResponse.ok) {
        console.warn(`ProfilePhotoService: User ${userId} not found or no permission: ${userInfoResponse.status}`);
        this.failedUsers.add(userId);
        return null;
      }

      // Try to get the photo
      const photoResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/photo/$value`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (photoResponse.ok) {
        const photoBlob = await photoResponse.blob();
        const photoUrl = URL.createObjectURL(photoBlob);
        
        // Cache the result
        this.photoCache.set(userId, photoUrl);
        
        console.log(`ProfilePhotoService: Successfully fetched photo for ${userId}`);
        return photoUrl;
      } else if (photoResponse.status === 404) {
        console.log(`ProfilePhotoService: No photo available for user ${userId}`);
        this.failedUsers.add(userId);
        return null;
      } else {
        console.warn(`ProfilePhotoService: Failed to fetch photo for ${userId}: ${photoResponse.status} ${photoResponse.statusText}`);
        this.failedUsers.add(userId);
        return null;
      }

    } catch (error) {
      console.error(`ProfilePhotoService: Error fetching photo for ${userId}:`, error);
      this.failedUsers.add(userId);
      return null;
    }
  }

  /**
   * Try alternative user ID formats if the first attempt fails
   */
  static async fetchProfilePhotoWithAlternatives(userId: string, userPrincipalName?: string, email?: string): Promise<string | null> {
    // Try original user ID first
    let photoUrl = await this.fetchProfilePhoto(userId);
    if (photoUrl) return photoUrl;

    // Try with userPrincipalName if available
    if (userPrincipalName && userPrincipalName !== userId) {
      console.log(`ProfilePhotoService: Trying with userPrincipalName: ${userPrincipalName}`);
      photoUrl = await this.fetchProfilePhoto(userPrincipalName);
      if (photoUrl) return photoUrl;
    }

    // Try with email if available
    if (email && email !== userId && email !== userPrincipalName) {
      console.log(`ProfilePhotoService: Trying with email: ${email}`);
      photoUrl = await this.fetchProfilePhoto(email);
      if (photoUrl) return photoUrl;
    }

    return null;
  }

  /**
   * Fetch multiple profile photos with rate limiting
   */
  static async fetchMultipleProfilePhotos(userIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Filter out already cached photos and failed users
    const uncachedIds = userIds.filter(id => 
      !this.photoCache.has(id) && !this.failedUsers.has(id)
    );
    
    // Return cached results
    userIds.forEach(id => {
      if (this.photoCache.has(id)) {
        results.set(id, this.photoCache.get(id)!);
      }
    });

    if (uncachedIds.length === 0) {
      return results;
    }

    console.log(`ProfilePhotoService: Fetching photos for ${uncachedIds.length} users`);

    // Fetch photos with rate limiting (max 3 concurrent requests)
    const batchSize = 3;
    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (userId) => {
        const photoUrl = await this.fetchProfilePhoto(userId);
        if (photoUrl) {
          results.set(userId, photoUrl);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < uncachedIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Generate a fallback avatar URL
   */
  static getFallbackAvatar(name: string, size: number = 96): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0078D4&color=fff&size=${size}`;
  }

  /**
   * Get a profile photo with fallback
   */
  static async getProfilePhotoWithFallback(userId: string, userName: string, email?: string): Promise<string> {
    const realPhoto = await this.fetchProfilePhotoWithAlternatives(userId, email, email);
    return realPhoto || this.getFallbackAvatar(userName);
  }

  /**
   * Update team members with real profile photos
   */
  static async enhanceTeamMembersWithPhotos(teamMembers: TeamMember[]): Promise<TeamMember[]> {
    if (!this.accessToken) {
      console.warn('ProfilePhotoService: No access token, cannot enhance photos');
      return teamMembers;
    }

    console.log('ProfilePhotoService: Enhancing team members with real photos...', {
      memberCount: teamMembers.length,
      members: teamMembers.map(m => ({ id: m.id, name: m.name, email: m.email }))
    });
    
    const userIds = teamMembers.map(member => member.id);
    const photos = await this.fetchMultipleProfilePhotos(userIds);
    
    const enhancedMembers = teamMembers.map(member => {
      const photoUrl = photos.get(member.id);
      const finalAvatar = photoUrl || this.getFallbackAvatar(member.name);
      
      console.log(`ProfilePhotoService: ${member.name} - ${photoUrl ? 'Real photo' : 'Fallback avatar'}`);
      
      return {
        ...member,
        avatar: finalAvatar
      };
    });

    console.log('ProfilePhotoService: Enhancement complete:', {
      total: enhancedMembers.length,
      withRealPhotos: Array.from(photos.keys()).length,
      withFallbacks: enhancedMembers.length - Array.from(photos.keys()).length,
      failedUsers: Array.from(this.failedUsers)
    });

    return enhancedMembers;
  }

  /**
   * Check if we have permission to read user photos
   */
  static async testPhotoPermissions(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      // Try to read our own photo first
      const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const hasPermission = response.ok || response.status === 404; // 404 means permission is OK but no photo
      console.log('ProfilePhotoService: Photo permission test:', { hasPermission, status: response.status });
      
      return hasPermission;
    } catch (error) {
      console.error('ProfilePhotoService: Permission test failed:', error);
      return false;
    }
  }

  /**
   * Clear the photo cache
   */
  static clearCache() {
    // Revoke blob URLs to free memory
    this.photoCache.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    this.photoCache.clear();
    this.failedUsers.clear();
    console.log('ProfilePhotoService: Cache cleared');
  }

  /**
   * Get debug info about the current state
   */
  static getDebugInfo() {
    return {
      hasAccessToken: !!this.accessToken,
      cachedPhotos: this.photoCache.size,
      failedUsers: Array.from(this.failedUsers),
      cacheEntries: Array.from(this.photoCache.entries()).map(([id, url]) => ({
        id,
        urlType: url.startsWith('blob:') ? 'blob' : 'other'
      }))
    };
  }
}