import { render } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { ForwardMessageDialog } from './forward-message-dialog';

const fixture = vi.hoisted(() => ({
  getChannels: vi.fn(),
  getWorkspaceChannels: vi.fn(),
  forwardMessage: vi.fn(),
  queryKey: [] as unknown[],
}));

vi.mock('@/actions/channel', () => ({
  getChannels: fixture.getChannels,
  getWorkspaceChannels: fixture.getWorkspaceChannels,
}));
vi.mock('@/actions/message-actions', () => ({ forwardMessage: fixture.forwardMessage }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey, queryFn, enabled }: {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
    enabled: boolean;
  }) => {
    fixture.queryKey = queryKey;
    if (enabled) void queryFn();
    return { data: [] };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.queryKey = [];
  fixture.getChannels.mockResolvedValue([]);
  fixture.getWorkspaceChannels.mockResolvedValue([]);
});

it('uses the bounded channel-option query when the forwarding picker opens', () => {
  render(
    <ForwardMessageDialog
      messageId="message-1"
      actorId="actor-1"
      workspaceSlug="team"
      onOpenChange={vi.fn()}
    />,
  );

  expect(fixture.getWorkspaceChannels).toHaveBeenCalledWith('team');
  expect(fixture.queryKey).toEqual(['member-channel-options', 'actor-1', 'team']);
  expect(fixture.getChannels).not.toHaveBeenCalled();
});
