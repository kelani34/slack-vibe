import { act, render } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ThreadSidebar } from './thread-sidebar';

const fixture = vi.hoisted(() => ({
  handlers: [] as Array<(payload: { eventType: string; new: Record<string, unknown> }) => void>,
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
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
  useQuery: () => ({ data: undefined, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: fixture.invalidateQueries }),
}));
vi.mock('@/stores/profile-store', () => ({
  useProfileStore: (selector: (state: { setActiveProfile: () => void }) => unknown) =>
    selector({ setActiveProfile: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.handlers = [];
});

it('refreshes the thread and root timeline when a reply arrives', () => {
  render(
    <ThreadSidebar
      parentMessageId="root-1"
      channelId="channel-1"
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
    queryKey: ['messages', 'channel-1', 'root-1'],
    exact: true,
  });
  expect(fixture.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['messages', 'channel-1'],
    exact: true,
  });
  expect(fixture.invalidateQueries).toHaveBeenCalledTimes(2);
});

it('does not refresh either view for scheduled or deleted reply rows', () => {
  render(
    <ThreadSidebar
      parentMessageId="root-1"
      channelId="channel-1"
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
