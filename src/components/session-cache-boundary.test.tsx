import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useSession, replace, refresh } = vi.hoisted(() => ({ useSession: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));

import { SessionCacheBoundary } from './session-cache-boundary';

function renderBoundary(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionCacheBoundary />
    </QueryClientProvider>,
  );
}

describe('session cache boundary', () => {
  beforeEach(() => {
    useSession.mockReset();
    replace.mockReset();
    refresh.mockReset();
  });

  it('clears private query data after another tab signs out', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['messages', 'private-channel'], ['private message']);
    useSession.mockReturnValue({ status: 'authenticated', data: { user: { id: 'user-1' } } });

    const view = renderBoundary(queryClient);
    await waitFor(() => expect(queryClient.getQueryData(['messages', 'private-channel'])).toEqual(['private message']));
    window.history.replaceState({}, '', '/team/channel?focus=message-1');

    useSession.mockReturnValue({ status: 'unauthenticated', data: null });
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <SessionCacheBoundary />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(queryClient.getQueryData(['messages', 'private-channel'])).toBeUndefined());
    expect(replace).toHaveBeenCalledWith('/login?callbackUrl=%2Fteam%2Fchannel%3Ffocus%3Dmessage-1');
  });

  it('clears the previous account cache when the authenticated actor changes', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['messages', 'private-channel'], ['user 1 message']);
    useSession.mockReturnValue({ status: 'authenticated', data: { user: { id: 'user-1' } } });

    const view = renderBoundary(queryClient);
    await waitFor(() => expect(queryClient.getQueryData(['messages', 'private-channel'])).toEqual(['user 1 message']));

    useSession.mockReturnValue({ status: 'authenticated', data: { user: { id: 'user-2' } } });
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <SessionCacheBoundary />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(queryClient.getQueryData(['messages', 'private-channel'])).toBeUndefined());
    expect(refresh).toHaveBeenCalledOnce();
  });
});
