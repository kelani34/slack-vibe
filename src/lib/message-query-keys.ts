export const messageQueryKeys = {
  workspace: (actorId: string, workspaceId: string) =>
    ['messages', actorId, workspaceId] as const,
  timeline: (actorId: string, workspaceId: string, channelId: string) =>
    ['messages', actorId, workspaceId, channelId] as const,
  thread: (actorId: string, workspaceId: string, channelId: string, parentId: string) =>
    ['messages', actorId, workspaceId, channelId, parentId] as const,
  detail: (actorId: string, workspaceId: string, messageId: string) =>
    ['message', actorId, workspaceId, messageId] as const,
};
