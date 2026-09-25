import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ThreadSidebar } from './thread-sidebar';

const fixture = vi.hoisted(() => ({
  handlers: [] as Array<(payload: { eventType: string; new: Record<string, unknown> }) => void>,
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  repliesLoading: false,
  repliesError: false,
  repliesData: undefined as Array<{ id: string; userId: string; createdAt: string }> | undefined,
  refetchReplies: vi.fn(),
  queryKeys: [] as unknown[][],
}));

vi.mock('@/actions/message', () => ({
  getMessageById: vi.fn(),
  getThreadMessages: vi.fn(),
}));
vi.mock('@/components/message-input', () => ({ MessageInput: () => null }));
vi.mock('@/components/message-item', () => ({ MessageItem: () => null }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => {
      const channel = {
        on: (_event: string, _filter: unknown, callback: (payload: { eventType: string; new: Record<string, unknown> }) => void) => {
          fixture.handlers.push(callback);
          return channel;
        },
        subscribe: vi.fn(),
      };
      return channel;
    },
    removeChannel: vi.fn(),
  }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    fixture.queryKeys.push(queryKey);
    return {
      data: fixture.repliesData,
      isLoading: fixture.repliesLoading,
      isError: fixture.repliesError,
      refetch: fixture.refetchReplies,
    };
  },
  useQueryClient: () => ({ invalidateQueries: fixture.invalidateQueries }),
}));
vi.mock('@/stores/profile-store', () => ({
  useProfileStore: (selector: (state: { setActiveProfile: () => void }) => unknown) =>
    selector({ setActiveProfile: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.handlers = [];
  fixture.repliesLoading = false;
  fixture.repliesError = false;
  fixture.repliesData = undefined;
  fixture.queryKeys = [];
});

it('scopes the parent and reply caches to the actor and workspace', () => {
  render(
    <ThreadSidebar
      parentMessageId="root-1"
      channelId="channel-1"
      workspaceId="workspace-1"
      currentUserId="viewer"
      onClose={vi.fn()}
    />,
  );

  expect(fixture.queryKeys).toContainEqual([
    'message',
    'viewer',
    'workspace-1',
    'root-1',
  ]);
  expect(fixture.queryKeys).toContainEqual([
    'messages',
    'viewer',
    'workspace-1',
    'channel-1',
    'root-1',
  ]);
});

it('shows an accessible reply-shaped skeleton while replies load', () => {
  fixture.repliesLoading = true;
  const { container } = render(
    <ThreadSidebar
      parentMessageId="root-1"
      channelId="channel-1"
      workspaceId="workspace-1"
      onClose={vi.fn()}
    />,
  );

  expect(screen.getByRole('status', { name: 'Loading replies' })).toBeInTheDocument();
  const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
  expect(skeletons).toHaveLength(9);
  skeletons.forEach((skeleton) => expect(skeleton).toHaveClass('motion-reduce:animate-none'));
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});

it('offers a retry when the replies request fails', async () => {
  fixture.repliesError = true;
  const user = userEvent.setup();
  render(
    <ThreadSidebar
      parentMessageId="root-1"
      channelId="channel-1"
      workspaceId="workspace-1"
      onClose={vi.fn()}
    />,
  );

  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load replies.');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetchReplies).toHaveBeenCalledOnce();
});

it('keeps cached replies visible and offers a retry when refresh fails', async () => {
  fixture.repliesError = true;
  fixture.repliesData = [{ id: 'reply-1', userId: 'user-1', createdAt: '2026-09-25T12:00:00.000Z' }];
  const user = userEvent.setup();
  render(
    <ThreadSidebar
      parentMessageId="root-1"
      channelId="channel-1"
      workspaceId="workspace-1"
      onClose={vi.fn()}
    />,
  );

  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t refresh replies.');
  expect(screen.getByText('1 reply')).toBeInTheDocument();
  expect(screen.queryByText('Couldn’t load replies.')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetchReplies).toHaveBeenCalledOnce();
});

it('refreshes the thread and root timeline when a reply arrives', () => {
  render(
    <ThreadSidebar
      parentMessageId="root-1"
      channelId="channel-1"
      workspaceId="workspace-1"
      onClose={vi.fn()}
    />,
  );
  const onReply = fixture.handlers[0];
  expect(onReply).toBeDefined();

  act(() => {
    onReply?.({
      eventType: 'INSERT',
      new: {
        id: 'reply-1',
        channelId: 'channel-1',
        parentId: 'root-1',
        scheduledAt: null,
        isDeleted: false,
      },
    });
  });

  expect(fixture.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['messages', 'anonymous', 'workspace-1', 'channel-1', 'root-1'],
    exact: true,
  });
  expect(fixture.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['messages', 'anonymous', 'workspace-1', 'channel-1'],
    exact: true,
  });
  expect(fixture.invalidateQueries).toHaveBeenCalledTimes(2);
});

it('does not refresh either view for scheduled or deleted reply rows', () => {
  render(
    <ThreadSidebar
      parentMessageId="root-1"
      channelId="channel-1"
      workspaceId="workspace-1"
      onClose={vi.fn()}
    />,
  );
  const onReply = fixture.handlers[0];

  act(() => {
    onReply?.({
      eventType: 'INSERT',
      new: { id: 'scheduled-1', channelId: 'channel-1', parentId: 'root-1', scheduledAt: new Date() },
    });
    onReply?.({
      eventType: 'INSERT',
      new: { id: 'deleted-1', channelId: 'channel-1', parentId: 'root-1', scheduledAt: null, isDeleted: true },
    });
  });

  expect(fixture.invalidateQueries).not.toHaveBeenCalled();
});
