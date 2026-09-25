import { describe, expect, it, vi } from 'vitest';

const { authWrapper } = vi.hoisted(() => ({
  authWrapper: vi.fn((handler: (request: never) => Response | undefined) => handler),
}));

vi.mock('next-auth', () => ({
  default: () => ({ auth: authWrapper }),
}));

import proxy, { config } from '@/proxy';

type ProxyRequest = {
  auth: { user: { id: string } } | null;
  nextUrl: { origin: string; pathname: string; search: string; searchParams: URLSearchParams };
};

function runProxy(pathname: string, authenticated: boolean) {
  const url = new URL(pathname, 'https://workspace.example.test');
  const request: ProxyRequest = {
    auth: authenticated ? { user: { id: 'user-1' } } : null,
    nextUrl: { origin: url.origin, pathname: url.pathname, search: url.search, searchParams: url.searchParams },
  };
  return (proxy as unknown as (request: never) => Response | undefined)(request as never);
}

describe('Next.js proxy authentication boundary', () => {
  it('redirects anonymous requests for protected routes to sign in', () => {
    const response = runProxy('/workspace', false);

    expect(response?.status).toBe(302);
    const loginUrl = new URL(response!.headers.get('location')!);
    expect(loginUrl.origin).toBe('https://workspace.example.test');
    expect(loginUrl.pathname).toBe('/login');
    expect(loginUrl.searchParams.get('callbackUrl')).toBe('/workspace');
  });

  it('preserves a requested deep link and query through login', () => {
    const response = runProxy('/workspace/general?thread=reply-1', false);
    const loginUrl = new URL(response!.headers.get('location')!);

    expect(loginUrl.searchParams.get('callbackUrl')).toBe('/workspace/general?thread=reply-1');
  });

  it('keeps invitation routes available before sign in', () => {
    expect(runProxy('/invite/invitation-token', false)).toBeUndefined();
  });

  it('allows an authenticated request to a protected route', () => {
    expect(runProxy('/workspace', true)).toBeUndefined();
  });

  it('redirects an authenticated visitor away from the sign-in page', () => {
    const response = runProxy('/login', true);

    expect(response?.status).toBe(302);
    expect(response?.headers.get('location')).toBe('https://workspace.example.test/');
  });

  it('returns an authenticated visitor to a safe callback requested by the login page', () => {
    const response = runProxy('/login?callbackUrl=%2Finvite%2Finvite-token', true);

    expect(response?.headers.get('location')).toBe('https://workspace.example.test/invite/invite-token');
  });

  it('keeps anonymous login public and runs the proxy for authenticated login redirects', () => {
    const matcher = new RegExp(`^${config.matcher[0]}`);

    expect(runProxy('/login', false)).toBeUndefined();
    expect(matcher.test('/login')).toBe(true);
    expect(matcher.test('/api/auth/session')).toBe(false);
  });
});
