import { expect, it } from 'vitest';
import { shouldShowAvatar } from './message-presentation';

it('groups adjacent messages from the same sender for up to four minutes', () => {
  const previousMessage = { userId: 'alex', createdAt: new Date('2026-09-24T10:00:00Z') };
  expect(
    shouldShowAvatar(
      { userId: 'alex', createdAt: new Date('2026-09-24T10:04:00Z') },
      previousMessage,
    ),
  ).toBe(false);
});

it('shows a sender avatar after five minutes or when the sender changes', () => {
  const previousMessage = { userId: 'alex', createdAt: new Date('2026-09-24T10:00:00Z') };
  expect(
    shouldShowAvatar(
      { userId: 'alex', createdAt: new Date('2026-09-24T10:05:00Z') },
      previousMessage,
    ),
  ).toBe(true);
  expect(
    shouldShowAvatar(
      { userId: 'sam', createdAt: new Date('2026-09-24T10:01:00Z') },
      previousMessage,
    ),
  ).toBe(true);
});
