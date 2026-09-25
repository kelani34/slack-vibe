import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MessageList } from './message-list';

const fixture = vi.hoisted(() => ({
  handlers: [] as Array<{
    table: string;
    callback: (payload: {
      eventType: string;
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => void;
  }>,
  subscriptionStatuses: [] as Array<(status: string) => void>,
  getMessageById: vi.fn(),
  getMessageContext: vi.fn(),
  queryData: { pages: [[]], pageParams: [undefined] } as unknown,
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
  cancelQueries: vi.fn().mockResolvedValue(undefined),
  invalidateQueries: vi.fn(),
  queryKeys: [] as unknown[][],
  queryEnabled: [] as boolean[],
  queryClient: {
    getQueryData: (...args: unknown[]) => fixture.getQueryData(...args),
    invalidateQueries: (...args: unknown[]) => fixture.invalidateQueries(...args),
    setQueryData: (...args: unknown[]) => fixture.setQueryData(...args),
    cancelQueries: (...args: unknown[]) => fixture.cancelQueries(...args),
  },
}));

vi.mock('@/actions/message', () => ({
  getMessages: vi.fn().mockResolvedValue([]),
  getMessageById: fixture.getMessageById,
  getMessageContext: fixture.getMessageContext,
}));
vi.mock('@/actions/channel-member', () => ({
  markChannelAsRead: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/components/message-item', () => ({
  MessageItem: ({ message, isHighlighted }: { message: { content: string }; isHighlighted: boolean }) => (
    <div data-highlighted={isHighlighted ? 'true' : 'false'}>{message.content}</div>
  ),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => {
      const channel = {
        on: (_event: string, filter: { table: string }, callback: (payload: {
          eventType: string;
          new: Record<string, unknown>;
          old: Record<string, unknown>;
        }) => void) => {
          fixture.handlers.push({ table: filter.table, callback });
          return channel;
        },
        subscribe: (callback?: (status: string) => void) => {
          if (callback) fixture.subscriptionStatuses.push(callback);
          return channel;
        },
      };
      return channel;
      },
    removeChannel: vi.fn(),
  }),
}));
vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
    fixture.queryKeys.push(queryKey);
    fixture.queryEnabled.push(enabled ?? true);
    return {
      data: fixture.queryData,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
    };
  },
  useQueryClient: () => fixture.queryClient,
}));
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: false }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.handlers = [];
  fixture.subscriptionStatuses = [];
  fixture.queryKeys = [];
  fixture.queryEnabled = [];
  fixture.queryData = { pages: [[]], pageParams: [undefined] };
  fixture.getQueryData.mockImplementation(() => fixture.queryData);
  fixture.setQueryData.mockImplementation((_key, value) => {
    fixture.queryData = value;
  });
  fixture.getMessageContext.mockResolvedValue(null);
});

it('does not fetch timeline data until the viewer identity is known', () => {
  render(
    <MessageList
      channelId="channel-1"
      workspaceId="workspace-1"
    />,
  );

  expect(fixture.queryEnabled).toEqual([false]);
});

it('scopes timeline cache to the current actor, workspace, and channel', () => {
  render(
    <MessageList
      channelId="channel-1"
      currentUserId="viewer"
      workspaceId="workspace-1"
    />,
  );

  expect(fixture.queryKeys).toContainEqual([
    'messages',
    'viewer',
    'workspace-1',
    'channel-1',
  ]);
  expect(fixture.queryEnabled).toEqual([true]);
});

it('hydrates an incoming message only through the focused conversation subscription', async () => {
  render(<MessageList channelId="channel-1" currentUserId="viewer" workspaceId="workspace-1" />);

  const incomingMessage = {
    id: 'message-1',
    channelId: 'channel-1',
    userId: 'other-user',
    parentId: null,
    scheduledAt: null,
    isDeleted: false,
  };
  act(() => {
    window.dispatchEvent(new CustomEvent('supabase-new-message', { detail: incomingMessage }));
  });
  expect(fixture.getMessageById).not.toHaveBeenCalled();

  const messageSubscription = fixture.handlers.find(({ table }) => table === 'messages');
  expect(messageSubscription).toBeDefined();
  act(() => {
    messageSubscription?.callback({ eventType: 'INSERT', new: incomingMessage, old: {} });
    messageSubscription?.callback({ eventType: 'INSERT', new: incomingMessage, old: {} });
  });

  await waitFor(() => expect(fixture.getMessageById).toHaveBeenCalledTimes(1));
  expect(fixture.getMessageById).toHaveBeenCalledWith('message-1');
});

it('does not hydrate thread replies or unpublished scheduled messages as root timeline rows', () => {
  render(<MessageList channelId="channel-1" currentUserId="viewer" workspaceId="workspace-1" />);
  const messageSubscription = fixture.handlers.find(({ table }) => table === 'messages');
  expect(messageSubscription).toBeDefined();

  act(() => {
    messageSubscription?.callback({
      eventType: 'INSERT',
      new: { id: 'reply-1', channelId: 'channel-1', userId: 'other-user', parentId: 'root-1', scheduledAt: null, isDeleted: false },
      old: {},
    });
    messageSubscription?.callback({
      eventType: 'INSERT',
      new: { id: 'scheduled-1', channelId: 'channel-1', userId: 'other-user', parentId: null, scheduledAt: new Date(Date.now() + 60_000), isDeleted: false },
      old: {},
    });
  });

  expect(fixture.getMessageById).not.toHaveBeenCalled();
});

it('loads a bounded old-message context, scrolls to it, and returns to the latest timeline', async () => {
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
  fixture.getMessageContext.mockResolvedValue({
    targetMessageId: 'target-message',
    threadId: null,
    messages: [{
      id: 'target-message',
      channelId: 'channel-1',
      userId: 'author-1',
      parentId: null,
      content: 'Context target message',
      createdAt: new Date('2026-09-24T12:00:00.000Z'),
      updatedAt: new Date('2026-09-24T12:00:00.000Z'),
      user: { id: 'author-1', name: 'Alex', avatarUrl: null },
      reactions: [],
      attachments: [],
      replies: [],
      _count: { replies: 0 },
      isEdited: false,
    }],
  });

  render(
    <MessageList
      channelId="channel-1"
      workspaceId="workspace-1"
      currentUserId="viewer"
      jumpToMessageId="target-message"
    />,
  );

  expect(await screen.findByText('Context target message')).toBeInTheDocument();
  expect(fixture.getMessageContext).toHaveBeenCalledWith('target-message', 'channel-1');
  await waitFor(() => {
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Return to latest' }));
  expect(fixture.setQueryData).toHaveBeenLastCalledWith(
    ['messages', 'viewer', 'workspace-1', 'channel-1'],
    { pages: [[]], pageParams: [undefined] },
  );
  expect(screen.queryByRole('button', { name: 'Return to latest' })).not.toBeInTheDocument();
});

it('restores latest messages, scroll position, and focus when browser Back leaves a context jump', async () => {
  fixture.queryData = {
    pages: [[{
      id: 'latest-message',
      channelId: 'channel-back',
      userId: 'author-1',
      parentId: null,
      content: 'Latest timeline message',
      createdAt: new Date('2026-09-24T12:00:00.000Z'),
      updatedAt: new Date('2026-09-24T12:00:00.000Z'),
      user: { id: 'author-1', name: 'Alex', avatarUrl: null },
      reactions: [],
      attachments: [],
      replies: [],
      _count: { replies: 0 },
      isEdited: false,
    }]],
    pageParams: [undefined],
  };
  fixture.getMessageContext.mockResolvedValue({
    targetMessageId: 'old-message',
    threadId: null,
    messages: [{
      id: 'old-message',
      channelId: 'channel-back',
      userId: 'author-1',
      parentId: null,
      content: 'Old context message',
      createdAt: new Date('2026-09-20T12:00:00.000Z'),
      updatedAt: new Date('2026-09-20T12:00:00.000Z'),
      user: { id: 'author-1', name: 'Alex', avatarUrl: null },
      reactions: [],
      attachments: [],
      replies: [],
      _count: { replies: 0 },
      isEdited: false,
    }],
  });

  const { container, rerender } = render(
    <MessageList channelId="channel-back" currentUserId="viewer" workspaceId="workspace-back" />,
  );
  const scrollContainer = container.firstElementChild as HTMLDivElement;
  Object.defineProperty(scrollContainer, 'scrollHeight', { configurable: true, value: 1000 });
  Object.defineProperty(scrollContainer, 'clientHeight', { configurable: true, value: 500 });
  scrollContainer.scrollTop = 240;
  fireEvent.scroll(scrollContainer);
  const latestMessage = document.getElementById('message-latest-message');
  latestMessage?.focus();

  rerender(
    <MessageList channelId="channel-back" currentUserId="viewer" workspaceId="workspace-back" jumpToMessageId="old-message" />,
  );
  expect(await screen.findByText('Old context message')).toBeInTheDocument();

  rerender(
    <MessageList channelId="channel-back" currentUserId="viewer" workspaceId="workspace-back" />,
  );

  expect(await screen.findByText('Latest timeline message')).toBeInTheDocument();
  expect(screen.queryByText('Old context message')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Return to latest' })).not.toBeInTheDocument();
  expect(scrollContainer.scrollTop).toBe(240);
  expect(document.activeElement).toBe(document.getElementById('message-latest-message'));
});

it('restores a conversation viewport after its message list unmounts and mounts again', async () => {
  fixture.queryData = {
    pages: [[{
      id: 'saved-message',
      channelId: 'channel-remount',
      userId: 'author-1',
      parentId: null,
      content: 'Saved position message',
      createdAt: new Date('2026-09-24T12:00:00.000Z'),
      updatedAt: new Date('2026-09-24T12:00:00.000Z'),
      user: { id: 'author-1', name: 'Alex', avatarUrl: null },
      reactions: [],
      attachments: [],
      replies: [],
      _count: { replies: 0 },
      isEdited: false,
    }]],
    pageParams: [undefined],
  };

  const firstVisit = render(
    <MessageList channelId="channel-remount" currentUserId="viewer" workspaceId="workspace-remount" />,
  );
  expect(await screen.findByText('Saved position message')).toBeInTheDocument();
  const firstScrollContainer = firstVisit.container.firstElementChild as HTMLDivElement;
  Object.defineProperty(firstScrollContainer, 'scrollHeight', { configurable: true, value: 1200 });
  Object.defineProperty(firstScrollContainer, 'clientHeight', { configurable: true, value: 500 });
  firstScrollContainer.scrollTop = 360;
  fireEvent.scroll(firstScrollContainer);
  const focusedMessage = document.getElementById('message-saved-message');
  focusedMessage?.focus();
  firstVisit.unmount();

  const secondVisit = render(
    <MessageList channelId="channel-remount" currentUserId="viewer" workspaceId="workspace-remount" />,
  );
  Object.defineProperty(secondVisit.container.firstElementChild, 'scrollHeight', { configurable: true, value: 1200 });
  Object.defineProperty(secondVisit.container.firstElementChild, 'clientHeight', { configurable: true, value: 500 });
  expect(await screen.findByText('Saved position message')).toBeInTheDocument();
  const restoredContainer = secondVisit.container.firstElementChild as HTMLDivElement;
  expect(restoredContainer.scrollTop).toBe(360);
  expect(document.activeElement).toBe(document.getElementById('message-saved-message'));
});

it('shows a neutral unavailable state when the selected message can no longer be read', async () => {
  render(
    <MessageList
      channelId="channel-1"
      workspaceId="workspace-1"
      jumpToMessageId="removed-message"
    />,
  );

  expect(await screen.findByRole('status')).toHaveTextContent(
    'This message is no longer available. Showing recent messages.',
  );
  expect(screen.queryByText('removed-message')).not.toBeInTheDocument();
});

it('offers retry when context loading fails temporarily', async () => {
  let contextCanLoad = false;
  fixture.getMessageContext.mockImplementation(async () => {
    if (!contextCanLoad) throw new Error('temporary database failure');
    return {
      targetMessageId: 'target-message',
      threadId: null,
      messages: [{
        id: 'target-message',
        channelId: 'channel-1',
        userId: 'author-1',
        parentId: null,
        content: 'Recovered context message',
        createdAt: new Date('2026-09-24T12:00:00.000Z'),
        updatedAt: new Date('2026-09-24T12:00:00.000Z'),
        user: { id: 'author-1', name: 'Alex', avatarUrl: null },
        reactions: [],
        attachments: [],
        replies: [],
        _count: { replies: 0 },
        isEdited: false,
      }],
    };
  });

  render(
    <MessageList
      channelId="channel-1"
      workspaceId="workspace-1"
      jumpToMessageId="target-message"
    />,
  );

  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(
      'Could not load message context. You can retry.',
    ),
  );
  contextCanLoad = true;
  fireEvent.click(screen.getByRole('button', { name: 'Retry context' }));
  expect(await screen.findByText('Recovered context message')).toBeInTheDocument();
  expect(fixture.getMessageContext).toHaveBeenCalledTimes(2);
});

it('hydrates the signed-in user’s message in a second tab', async () => {
  render(<MessageList channelId="channel-1" currentUserId="viewer" workspaceId="workspace-1" />);
  const messageSubscription = fixture.handlers.find(({ table }) => table === 'messages');
  expect(messageSubscription).toBeDefined();

  act(() => {
    messageSubscription?.callback({
      eventType: 'INSERT',
      new: { id: 'own-message', channelId: 'channel-1', userId: 'viewer', parentId: null, scheduledAt: null, isDeleted: false },
      old: {},
    });
  });

  await waitFor(() => expect(fixture.getMessageById).toHaveBeenCalledWith('own-message'));
});

it('skips detail hydration when the message acknowledgement already populated the cache', () => {
  fixture.getQueryData.mockReturnValue({ pages: [[{ id: 'message-1' }]] });
  render(<MessageList channelId="channel-1" currentUserId="viewer" workspaceId="workspace-1" />);
  const messageSubscription = fixture.handlers.find(({ table }) => table === 'messages');
  expect(messageSubscription).toBeDefined();

  act(() => {
    messageSubscription?.callback({
      eventType: 'INSERT',
      new: { id: 'message-1', channelId: 'channel-1', userId: 'viewer', parentId: null, scheduledAt: null, isDeleted: false },
      old: {},
    });
  });

  expect(fixture.getMessageById).not.toHaveBeenCalled();
});

it('refetches the focused conversation once after realtime reconnects', () => {
  render(<MessageList channelId="channel-1" currentUserId="viewer" workspaceId="workspace-1" />);
  const onStatus = fixture.subscriptionStatuses[0];
  expect(onStatus).toBeDefined();

  act(() => onStatus?.('SUBSCRIBED'));
  expect(fixture.invalidateQueries).not.toHaveBeenCalled();

  act(() => {
    onStatus?.('TIMED_OUT');
    onStatus?.('CHANNEL_ERROR');
    onStatus?.('SUBSCRIBED');
  });

  expect(fixture.invalidateQueries).toHaveBeenCalledTimes(1);
  expect(fixture.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['messages', 'viewer', 'workspace-1', 'channel-1'] });
});
