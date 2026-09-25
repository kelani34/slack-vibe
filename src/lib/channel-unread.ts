import type { Message } from '@prisma/client';

export function unreadCountAfterMessage(
  currentCount: number,
  message: Partial<Message>,
  viewerId: string,
  lastViewedAt: Date,
) {
  if (
    !message.id ||
    message.userId === viewerId ||
    message.type !== 'REGULAR' ||
    message.parentId !== null ||
    message.scheduledAt !== null ||
    message.isDeleted !== false ||
    !message.createdAt ||
    !Number.isFinite(message.createdAt.getTime()) ||
    message.createdAt <= lastViewedAt
  ) {
    return currentCount;
  }

  return currentCount + 1;
}
