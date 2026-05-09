/**
 * In-memory session invalidation.
 * When a user is deleted, their ID is added here.
 * The JWT callback checks this on every request — instant lockout.
 */

const invalidatedUsers = new Set<string>();

export function invalidateUserSession(userId: string) {
  invalidatedUsers.add(userId);
  // Auto-cleanup after 24 hours (JWT maxAge is 30 days, but the user is deleted so
  // they can't re-auth anyway — this just prevents the Set from growing forever)
  setTimeout(() => invalidatedUsers.delete(userId), 24 * 60 * 60 * 1000);
}

export function isSessionInvalidated(userId: string): boolean {
  return invalidatedUsers.has(userId);
}
