export type GroupCreationIntent = {
  request: string;
  clientMutationId: string;
};

const INTENT_PREFIX = 'slack-vibe:draft:';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function storageKey(userId: string, workspaceId: string) {
  // Sharing the actor-scoped draft prefix makes logout purge pending group intents too.
  return `${INTENT_PREFIX}${userId}:group-create:${workspaceId}`;
}

export function getOrCreateGroupCreationIntent(
  userId: string,
  workspaceId: string,
  request: string,
): GroupCreationIntent | null {
  if (!userId || !workspaceId || !request || typeof window === 'undefined') return null;

  try {
    const key = storageKey(userId, workspaceId);
    const stored = window.localStorage.getItem(key);
    if (stored) {
      try {
        const intent = JSON.parse(stored) as GroupCreationIntent;
        if (intent.request === request && UUID_PATTERN.test(intent.clientMutationId)) return intent;
      } catch {
        // Replace an unreadable stale value with a fresh intent.
      }
    }

    const intent = { request, clientMutationId: window.crypto.randomUUID() };
    window.localStorage.setItem(key, JSON.stringify(intent));
    return intent;
  } catch {
    return null;
  }
}

export function clearGroupCreationIntent(
  userId: string,
  workspaceId: string,
  clientMutationId: string,
) {
  if (!userId || !workspaceId || !clientMutationId || typeof window === 'undefined') return;

  try {
    const key = storageKey(userId, workspaceId);
    const intent = JSON.parse(window.localStorage.getItem(key) || 'null') as GroupCreationIntent | null;
    if (intent?.clientMutationId === clientMutationId) window.localStorage.removeItem(key);
  } catch {
    // Conversation creation has already succeeded; stale local intent data is safe to replace later.
  }
}
