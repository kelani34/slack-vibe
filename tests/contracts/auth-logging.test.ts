import { expect, it, vi } from 'vitest';
import NextAuth from 'next-auth';

vi.mock('next-auth', () => ({ default: vi.fn(() => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })) }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

it('does not enable authentication debug logs containing codes and session cookies', async () => {
  await import('@/auth');
  const options = vi.mocked(NextAuth).mock.calls[0][0];
  expect(typeof options).toBe('object');
  if (typeof options === 'object') expect(options.debug).not.toBe(true);
});
