import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock('@/auth', () => ({ signIn }));

import LoginPage from './page';

describe('login return destination', () => {
  it('returns to the validated invitation requested before sign-in', async () => {
    const user = userEvent.setup();
    render(await LoginPage({ searchParams: Promise.resolve({ callbackUrl: '/invite/invite-token' }) }));

    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('github', { redirectTo: '/invite/invite-token' }));
  });

  it('does not pass an external callback URL to the provider flow', async () => {
    const user = userEvent.setup();
    render(await LoginPage({ searchParams: Promise.resolve({ callbackUrl: 'https://attacker.example' }) }));

    await user.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('github', { redirectTo: '/' }));
  });

  it('explains when GitHub denies a sign-in attempt', async () => {
    const searchParams = Promise.resolve({ error: 'AccessDenied' });
    render(await LoginPage({ searchParams }));

    expect(screen.getByRole('alert')).toHaveTextContent('GitHub access was denied. You can try signing in again.');
  });

  it('uses a safe generic message instead of displaying an unknown auth error', async () => {
    const searchParams = Promise.resolve({ error: 'credential-secret-from-provider' });
    render(await LoginPage({ searchParams }));

    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in could not be completed. Please try again.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('credential-secret-from-provider');
  });
});
