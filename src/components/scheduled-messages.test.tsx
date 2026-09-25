import { render } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { ScheduledMessages } from './scheduled-messages';

const fixture = vi.hoisted(() => ({
  getScheduledMessages: vi.fn(),
  query: undefined as undefined | { enabled?: boolean; queryKey: readonly unknown[]; queryFn: () => Promise<unknown> },
}));

vi.mock('@/actions/message', () => ({
  getScheduledMessages: fixture.getScheduledMessages,
  cancelScheduledMessage: vi.fn(),
  sendScheduledMessageNow: vi.fn(),
  updateScheduledMessage: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (query: typeof fixture.query) => {
    fixture.query = query;
    return { data: undefined };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.query = undefined;
  fixture.getScheduledMessages.mockResolvedValue([]);
});

it('scopes scheduled-message reads by actor, workspace, channel, and thread', async () => {
  render(
    <ScheduledMessages
      actorId="viewer"
      workspaceId="workspace"
      channelId="channel"
      parentId="root"
    />,
  );

  expect(fixture.query?.queryKey).toEqual([
    'scheduled-messages',
    'viewer',
    'workspace',
    'channel',
    'root',
  ]);
  expect(fixture.query?.enabled).toBe(true);
  await fixture.query?.queryFn();
  expect(fixture.getScheduledMessages).toHaveBeenCalledWith('channel', 'workspace', 'root');
});

it('does not fetch scheduled messages without an authenticated actor identity', () => {
  render(<ScheduledMessages workspaceId="workspace" channelId="channel" />);

  expect(fixture.query?.enabled).toBe(false);
  expect(fixture.getScheduledMessages).not.toHaveBeenCalled();
});
