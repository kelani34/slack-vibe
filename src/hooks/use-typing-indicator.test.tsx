import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  const client = {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  };
  return {
    channel,
    client,
    createClient: vi.fn(() => client),
  };
});

vi.mock('@/lib/supabase/client', () => ({ createClient: fixture.createClient }));

import { useTypingIndicator } from './use-typing-indicator';

beforeEach(() => {
  vi.clearAllMocks();
  fixture.channel.on.mockReturnValue(fixture.channel);
  fixture.channel.subscribe.mockReturnValue(fixture.channel);
  fixture.client.channel.mockReturnValue(fixture.channel);
});

it('keeps one realtime client and channel across rerenders and removes the channel on unmount', () => {
  const { rerender, unmount } = renderHook(
    ({ channelId }) => useTypingIndicator(channelId, { id: 'user-1', name: 'Alex' }),
    { initialProps: { channelId: 'channel-1' } },
  );

  rerender({ channelId: 'channel-1' });

  expect(fixture.createClient).toHaveBeenCalledTimes(1);
  expect(fixture.client.channel).toHaveBeenCalledTimes(1);
  expect(fixture.channel.subscribe).toHaveBeenCalledTimes(1);

  unmount();

  expect(fixture.client.removeChannel).toHaveBeenCalledWith(fixture.channel);
});
