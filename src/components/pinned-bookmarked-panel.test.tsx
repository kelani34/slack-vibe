import { act, render } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { getBookmarkedMessages, getPinnedMessages } from '@/actions/message-actions';
import { PinnedBookmarkedPanel } from './pinned-bookmarked-panel';

const fixture = vi.hoisted(() => ({
  queryKeys: [] as Array<readonly unknown[]>,
  queryFns: [] as Array<() => Promise<unknown>>,
  getPinnedMessages: vi.fn(),
  getBookmarkedMessages: vi.fn(),
}));

vi.mock('@/actions/message-actions', () => ({
  getPinnedMessages: fixture.getPinnedMessages,
  getBookmarkedMessages: fixture.getBookmarkedMessages,
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey, queryFn }: { queryKey: readonly unknown[]; queryFn: () => Promise<unknown> }) => {
    fixture.queryKeys.push(queryKey);
    fixture.queryFns.push(queryFn);
    return { data: [] };
  },
}));

beforeEach(() => {
  fixture.queryKeys = [];
  fixture.queryFns = [];
  vi.resetAllMocks();
});

it('scopes pinned and bookmarked queries to actor, workspace, and channel', () => {
  render(
    <PinnedBookmarkedPanel
      channelId="channel-1"
      workspaceId="workspace-1"
      currentUserId="user-1"
      onMessageClick={vi.fn()}
    />,
  );

  expect(fixture.queryKeys).toEqual([
    ['pinned-messages', 'user-1', 'workspace-1', 'channel-1'],
    ['bookmarked-messages', 'user-1', 'workspace-1', 'channel-1'],
  ]);
});

it('loads bookmarks for only the active channel', async () => {
  render(
    <PinnedBookmarkedPanel
      channelId="channel-1"
      workspaceId="workspace-1"
      currentUserId="user-1"
      onMessageClick={vi.fn()}
    />,
  );

  await act(async () => {
    await fixture.queryFns[0]?.();
    await fixture.queryFns[1]?.();
  });

  expect(getBookmarkedMessages).toHaveBeenCalledWith('channel-1', 'workspace-1');
  expect(getPinnedMessages).toHaveBeenCalledWith('channel-1', 'workspace-1');
});
