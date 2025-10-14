// Simple session ID management using localStorage
export function getSessionId(): string {
  const KEY = 'ec-session-id';
  let sessionId = localStorage.getItem(KEY);
  
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(KEY, sessionId);
  }
  
  return sessionId;
}
