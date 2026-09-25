import { describe, expect, it } from 'vitest';
import type { Message } from '@prisma/client';
import { unreadCountAfterMessage } from './channel-unread';

const cursor = new Date('2026-09-24T12:00:00.000Z');
const ignoredMessages: Array<[string, Partial<Message>]> = [
  ['own message', { userId: 'viewer' }],
  ['thread reply', { parentId: 'root-message' }],
  ['scheduled message', { scheduledAt: new Date('2026-09-24T12:05:00.000Z') }],
  ['system event', { type: 'SYSTEM' }],
  ['deleted message', { isDeleted: true }],
  ['message at or before the cursor', { createdAt: cursor }],
];

describe('unreadCountAfterMessage', () => {
  it('increments for a published root message from another member after the read cursor', () => {
    expect(unreadCountAfterMessage(2, {
      id: 'message-1',
      userId: 'other-user',
      type: 'REGULAR',
      parentId: null,
      scheduledAt: null,
      isDeleted: false,
      createdAt: new Date('2026-09-24T12:01:00.000Z'),
    }, 'viewer', cursor)).toBe(3);
  });

  it.each(ignoredMessages)('does not increment for a %s', (_caseName, overrides) => {
    expect(unreadCountAfterMessage(2, {
      id: 'message-1',
      userId: 'other-user',
      type: 'REGULAR',
      parentId: null,
      scheduledAt: null,
      isDeleted: false,
      createdAt: new Date('2026-09-24T12:01:00.000Z'),
      ...overrides,
    }, 'viewer', cursor)).toBe(2);
  });
});
