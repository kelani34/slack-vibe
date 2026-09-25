const DRAFT_PREFIX = 'slack-vibe:draft:';

export function clearDraftsForUser(userId: string) {
  if (!userId || typeof window === 'undefined') return;

  const userPrefix = `${DRAFT_PREFIX}${userId}:`;

  try {
    const storage = window.localStorage;
    const userDraftKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => key?.startsWith(userPrefix) ?? false);

    userDraftKeys.forEach((key) => storage.removeItem(key));
  } catch {
    // A browser may disable storage; logout should still end the server session.
  }
}
