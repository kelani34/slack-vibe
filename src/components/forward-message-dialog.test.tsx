import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { ForwardMessageDialog } from './forward-message-dialog';

const fixture = vi.hoisted(() => ({
  getChannels: vi.fn(),
  getWorkspaceChannels: vi.fn(),
  forwardMessage: vi.fn(),
  queryKey: [] as unknown[],
  queryLoading: false,
  queryError: false,
  channels: undefined as Array<{ id: string; name: string }> | undefined,
  refetchChannels: vi.fn(),
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
    return {
      data: fixture.channels,
      isLoading: fixture.queryLoading,
      isError: fixture.queryError,
      refetch: fixture.refetchChannels,
    };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.queryKey = [];
  fixture.queryLoading = false;
  fixture.queryError = false;
  fixture.channels = undefined;
  fixture.getChannels.mockResolvedValue([]);
  fixture.getWorkspaceChannels.mockResolvedValue([]);
});

it('uses the bounded channel-option query when the forwarding picker opens', () => {
  fixture.channels = [];
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
  expect(screen.getByText('No channels are available to forward this message to.')).toBeInTheDocument();
});

it('announces when destination channels are loading', () => {
  fixture.queryLoading = true;
  render(
    <ForwardMessageDialog
      messageId="message-1"
      actorId="actor-1"
      workspaceSlug="team"
      onOpenChange={vi.fn()}
    />,
  );

  expect(screen.getByRole('status', { name: 'Loading destination channels' })).toHaveTextContent('Loading channels…');
  expect(screen.getByRole('combobox', { name: 'Destination channel' })).toBeDisabled();
});

it('offers a retry when the destination-channel query fails', async () => {
  fixture.queryError = true;
  const user = userEvent.setup();
  render(
    <ForwardMessageDialog
      messageId="message-1"
      actorId="actor-1"
      workspaceSlug="team"
      onOpenChange={vi.fn()}
    />,
  );

  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load destination channels.');
  expect(screen.getByRole('combobox', { name: 'Destination channel' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetchChannels).toHaveBeenCalledOnce();
});

it('keeps cached destination channels available when refresh fails', async () => {
  fixture.queryError = true;
  fixture.channels = [{ id: 'channel-1', name: 'general' }];
  const user = userEvent.setup();
  render(
    <ForwardMessageDialog
      messageId="message-1"
      actorId="actor-1"
      workspaceSlug="team"
      onOpenChange={vi.fn()}
    />,
  );

  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t refresh destination channels.');
  expect(screen.getByRole('combobox', { name: 'Destination channel' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetchChannels).toHaveBeenCalledOnce();
});
