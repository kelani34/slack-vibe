import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { MarkUnreadConversationRead } from './mark-unread-conversation-read';

const fixture = vi.hoisted(() => ({
  markRead: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/actions/channel-member', () => ({ markChannelAsRead: fixture.markRead }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: fixture.refresh }) }));
vi.mock('sonner', () => ({ toast: { error: fixture.error } }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.markRead.mockResolvedValue({ success: true });
});

it('marks only the selected conversation read and refreshes the inbox', async () => {
  const user = userEvent.setup();
  render(<MarkUnreadConversationRead channelId="channel-1" label="Mark general as read" />);

  await user.click(screen.getByRole('button', { name: 'Mark general as read' }));

  expect(fixture.markRead).toHaveBeenCalledWith('channel-1');
  expect(fixture.refresh).toHaveBeenCalledOnce();
  expect(fixture.error).not.toHaveBeenCalled();
});

it('keeps the unread row and reports a rejected read update', async () => {
  fixture.markRead.mockResolvedValue({ error: 'You are not a member of this channel' });
  const user = userEvent.setup();
  render(<MarkUnreadConversationRead channelId="channel-1" label="Mark general as read" />);

  await user.click(screen.getByRole('button', { name: 'Mark general as read' }));

  expect(fixture.refresh).not.toHaveBeenCalled();
  expect(fixture.error).toHaveBeenCalledWith('You are not a member of this channel');
});
