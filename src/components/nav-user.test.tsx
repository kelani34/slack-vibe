import { SidebarProvider } from '@/components/ui/sidebar';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock('next-auth/react', () => ({ signOut }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => vi.unstubAllGlobals());

import { NavUser } from './nav-user';

describe('account menu', () => {
  it('ends the Auth.js session and returns to login when Log out is selected', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const clearCache = vi.spyOn(queryClient, 'clear');
    queryClient.setQueryData(['messages', 'private-channel'], ['private message']);
    window.localStorage.setItem('slack-vibe:draft:user-1:channel-1:root', '<p>Private draft</p>');
    window.localStorage.setItem('slack-vibe:draft:user-2:channel-1:root', '<p>Other account</p>');
    render(
      <SidebarProvider>
        <QueryClientProvider client={queryClient}>
          <NavUser user={{ id: 'user-1', name: 'Taiwo', email: 'taiwo@example.test', avatar: '' }} />
        </QueryClientProvider>
      </SidebarProvider>,
    );

    await user.click(screen.getByRole('button', { name: /Taiwo/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));

    expect(signOut).toHaveBeenCalledWith({ redirectTo: '/login' });
    expect(clearCache.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0]);
    expect(queryClient.getQueryData(['messages', 'private-channel'])).toBeUndefined();
    expect(window.localStorage.getItem('slack-vibe:draft:user-1:channel-1:root')).toBeNull();
    expect(window.localStorage.getItem('slack-vibe:draft:user-2:channel-1:root')).toBe('<p>Other account</p>');
  });
});
