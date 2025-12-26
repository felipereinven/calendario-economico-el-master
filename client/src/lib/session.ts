/**
 * User identification for cross-device sync
 * Simple and consistent approach using a single user ID
 */

const USER_ID_KEY = 'ec-user-id';

/**
 * Get or create a persistent user ID
 * This ID should remain consistent across devices for the same user
 * In production, this would come from authentication
 */
export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  
  return userId;
}

/**
 * Set a user ID (for importing from another device or after login)
 */
export function setUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

/**
 * Get session ID for API calls (same as userId for simplicity)
 */
export function getSessionId(): string {
  return getUserId();
}

/**
 * Clear user data (for logout or reset)
 */
export function clearSession(): void {
  localStorage.removeItem(USER_ID_KEY);
}

/**
 * Export user ID for cross-device sync
 * Users can copy this ID and import it on another device
 */
export function exportUserId(): string {
  return getUserId();
}

/**
 * Get base user ID (same as getUserId for consistency)
 */
export function getBaseUserId(): string {
  return getUserId();
}

