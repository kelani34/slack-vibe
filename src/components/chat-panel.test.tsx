import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ChatPanel } from './chat-panel';

const fixture = vi.hoisted(() => ({
  membership: undefined as undefined | ((event: { eventType: string; old: { user_id: string }; new: object }) => void),
  markRead: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: fixture.refresh, replace: fixture.replace }),
  usePathname: () => '/workspace/channel',
  useSearchParams: () => fixture.searchParams,
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: (topic: string) => ({
      on: (_event: string, _filter: object, callback: typeof fixture.membership) => {
        if (topic.startsWith('channel-membership:')) fixture.membership = callback;
        return { subscribe: () => ({ topic }) };
      },
    }),
    removeChannel: vi.fn(),
  }),
}));
vi.mock('@/stores/notification-store', () => ({
  useNotificationStore: (selector: (state: { markChannelAsRead: typeof fixture.markRead }) => unknown) => selector({ markChannelAsRead: fixture.markRead }),
}));
vi.mock('@/components/message-list', () => ({
  MessageList: ({
    jumpToMessageId,
    onContextExit,
  }: {
    jumpToMessageId?: string | null;
    onContextExit?: () => void;
  }) => (
    <div data-testid="conversation-messages" data-jump-target={jumpToMessageId ?? ''}>
      Conversation messages
      <button onClick={onContextExit}>Return to latest</button>
    </div>
  ),
}));
vi.mock('@/components/message-input', () => ({ MessageInput: () => <textarea aria-label="Message" /> }));
vi.mock('@/components/thread-sidebar', () => ({ ThreadSidebar: () => null }));
vi.mock('@/components/profile-sidebar', () => ({ ProfileSidebar: () => null }));
vi.mock('@/components/pinned-bookmarked-panel', () => ({ PinnedBookmarkedPanel: () => null }));
vi.mock('@/components/channel/channel-access-denied', () => ({ ChannelAccessDenied: () => <p>Access denied</p> }));
vi.mock('@/components/forward-message-dialog', () => ({ ForwardMessageDialog: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.searchParams = new URLSearchParams();
});

it('replaces a mounted conversation with denial on membership removal without a hook-order crash (A07)', () => {
  render(<ChatPanel channelId="channel" workspaceId="workspace" workspaceSlug="workspace" userId="member" isArchived={false} />);
  expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
  act(() => fixture.membership?.({ eventType: 'DELETE', old: { user_id: 'member' }, new: {} }));
  expect(screen.getByText('Access denied')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument();
});

it('passes a deep-linked message target to the conversation context loader', () => {
  fixture.searchParams = new URLSearchParams('message=old-message');
  render(<ChatPanel channelId="channel" workspaceId="workspace" workspaceSlug="workspace" userId="member" isArchived={false} />);

  expect(screen.getByTestId('conversation-messages')).toHaveAttribute(
    'data-jump-target',
    'old-message',
  );
});

it('clears only the message context URL when returning to the latest timeline', async () => {
  fixture.searchParams = new URLSearchParams('message=old-message&thread=root-message');
  render(<ChatPanel channelId="channel" workspaceId="workspace" workspaceSlug="workspace" userId="member" isArchived={false} />);

  await screen.findByRole('button', { name: 'Return to latest' }).then((button) => button.click());

  expect(fixture.replace).toHaveBeenCalledWith(
    '/workspace/channel?thread=root-message',
    { scroll: false },
  );
});
