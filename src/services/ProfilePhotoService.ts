import { TeamMember } from "../types";

// ProfilePhotoService.ts
export class ProfilePhotoService {
  private static photoCache = new Map<string, string>();
  private static accessToken: string | null = null;

  static setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Fetch a user's profile photo from Microsoft Graph API
   */
  static async fetchProfilePhoto(userId: string): Promise<string | null> {
    // Check cache first
    if (this.photoCache.has(userId)) {
      return this.photoCache.get(userId)!;
    }

    if (!this.accessToken) {
      console.warn('ProfilePhotoService: No access token available');
      return null;
    }

    try {
      console.log(`ProfilePhotoService: Fetching photo for user ${userId}`);
      
      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/photo/$value`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.ok) {
        const photoBlob = await response.blob();
        const photoUrl = URL.createObjectURL(photoBlob);
        
        // Cache the result
        this.photoCache.set(userId, photoUrl);
        
        console.log(`ProfilePhotoService: Successfully fetched photo for ${userId}`);
        return photoUrl;
      } else {
        console.warn(`ProfilePhotoService: Failed to fetch photo for ${userId}: ${response.status}`);
        return null;
      }

    } catch (error) {
      console.error(`ProfilePhotoService: Error fetching photo for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple profile photos in batch
   */
  static async fetchMultipleProfilePhotos(userIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Filter out already cached photos
    const uncachedIds = userIds.filter(id => !this.photoCache.has(id));
    
    // Return cached results
    userIds.forEach(id => {
      if (this.photoCache.has(id)) {
        results.set(id, this.photoCache.get(id)!);
      }
    });

    if (uncachedIds.length === 0) {
      return results;
    }

    // Fetch uncached photos (we'll do them one by one since Graph API doesn't support batch photo requests)
    const fetchPromises = uncachedIds.map(async (userId) => {
      const photoUrl = await this.fetchProfilePhoto(userId);
      if (photoUrl) {
        results.set(userId, photoUrl);
      }
    });

    await Promise.allSettled(fetchPromises);
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
  static async getProfilePhotoWithFallback(userId: string, userName: string): Promise<string> {
    const realPhoto = await this.fetchProfilePhoto(userId);
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

    console.log('ProfilePhotoService: Enhancing team members with real photos...');
    
    const userIds = teamMembers.map(member => member.id);
    const photos = await this.fetchMultipleProfilePhotos(userIds);
    
    const enhancedMembers = teamMembers.map(member => ({
      ...member,
      avatar: photos.get(member.id) || this.getFallbackAvatar(member.name)
    }));

    console.log('ProfilePhotoService: Enhanced members:', {
      total: enhancedMembers.length,
      withRealPhotos: Array.from(photos.keys()).length,
      withFallbacks: enhancedMembers.length - Array.from(photos.keys()).length
    });

    return enhancedMembers;
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
  }

  /**
   * Preload profile photos for better UX
   */
  static async preloadProfilePhotos(userIds: string[]): Promise<void> {
    console.log('ProfilePhotoService: Preloading profile photos...');
    await this.fetchMultipleProfilePhotos(userIds);
  }
}