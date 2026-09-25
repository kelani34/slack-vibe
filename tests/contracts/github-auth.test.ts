import { Auth, type AuthConfig } from '@auth/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import authConfig from '@/auth.config';

const origin = 'http://localhost:3100';
const issuer = 'https://github.com/login/oauth';
const logger = { error: vi.fn(), warn: vi.fn(), debug: vi.fn() };

function config(): AuthConfig {
  const github = authConfig.providers[0];
  return {
    ...authConfig,
    secret: 'isolated-auth-contract-secret-at-least-32-characters',
    trustHost: true,
    basePath: '/api/auth',
    logger,
    providers: [{ ...github, clientId: 'fixture-client', clientSecret: 'fixture-secret' }],
  };
}

async function beginLogin() {
  const cookies = new Map<string, string>();
  const remember = (response: Response) => {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const separator = pair.indexOf('=');
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  };
  const cookieHeader = () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; ');
  const csrf = await Auth(new Request(`${origin}/api/auth/csrf`), config());
  remember(csrf);
  const { csrfToken } = await csrf.json();
  const response = await Auth(new Request(`${origin}/api/auth/signin/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookieHeader() },
    body: new URLSearchParams({ csrfToken, callbackUrl: `${origin}/` }),
  }), config());
  remember(response);
  expect(response.status).toBe(302);
  const authorization = new URL(response.headers.get('location')!);
  expect(authorization.origin).toBe('https://github.com');
  expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
  return { authorization, cookieHeader };
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('GitHub OAuth callback (F01 / B03)', () => {
  it('accepts the legitimate issuer through the real callback handler and creates a session', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url === `${issuer}/access_token`) {
        return Response.json({ access_token: 'synthetic-access-token', token_type: 'bearer', scope: 'read:user user:email' });
      }
      if (url === 'https://api.github.com/user') {
        return Response.json({ id: 42, login: 'fixture', name: 'Fixture User', email: 'fixture@example.test', avatar_url: null });
      }
      throw new Error(`Unexpected contract request: ${new URL(url).origin}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const { authorization, cookieHeader } = await beginLogin();
    const callback = new URL(`${origin}/api/auth/callback/github`);
    callback.searchParams.set('code', 'synthetic-authorization-code');
    callback.searchParams.set('iss', issuer);
    const state = authorization.searchParams.get('state');
    if (state) callback.searchParams.set('state', state);
    const response = await Auth(new Request(callback, { headers: { Cookie: cookieHeader() } }), config());
    expect(response.headers.get('location')).toBe(`${origin}/`);
    expect(response.headers.getSetCookie().some(cookie => cookie.startsWith('authjs.session-token='))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('rejects a forged issuer before exchanging the authorization code', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { authorization, cookieHeader } = await beginLogin();
    const callback = new URL(`${origin}/api/auth/callback/github`);
    callback.searchParams.set('code', 'synthetic-code');
    callback.searchParams.set('iss', 'https://attacker.example');
    const state = authorization.searchParams.get('state');
    if (state) callback.searchParams.set('state', state);
    const response = await Auth(new Request(callback, { headers: { Cookie: cookieHeader() } }), config());
    expect(response.headers.get('location')).toContain('error=Configuration');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('binds sign-in to both state and PKCE', async () => {
    const { authorization } = await beginLogin();
    expect(authorization.searchParams.get('state')).toBeTruthy();
    expect(authorization.searchParams.get('code_challenge')).toBeTruthy();
  });
});
