import { beforeEach, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { uploadIntent: { findMany: fixture.findMany, deleteMany: fixture.deleteMany } },
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ storage: { from: fixture.from } }),
}));

import { GET } from './route';

const secret = 'cron-secret-with-more-than-16-characters';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', secret);
  fixture.from.mockReturnValue({ remove: fixture.remove });
  fixture.remove.mockResolvedValue({ data: [], error: null });
  fixture.deleteMany.mockResolvedValue({ count: 2 });
  fixture.findMany.mockResolvedValue([
    { id: 'expired-pending', storageBucket: 'workspace-files-private', storagePath: 'channel/user/object-a.pdf' },
    { id: 'expired-uploaded', storageBucket: 'workspace-files-private', storagePath: 'channel/user/object-b.pdf' },
  ]);
});

it('rejects missing or incorrect cron authorization before touching storage or the database', async () => {
  const missing = await GET(new Request('https://app.example/api/cron/cleanup-uploads'));
  const incorrect = await GET(new Request('https://app.example/api/cron/cleanup-uploads', {
    headers: { authorization: 'Bearer wrong-secret' },
  }));

  expect(missing.status).toBe(401);
  expect(incorrect.status).toBe(401);
  expect(fixture.findMany).not.toHaveBeenCalled();
  expect(fixture.remove).not.toHaveBeenCalled();

  vi.stubEnv('CRON_SECRET', '');
  const unconfigured = await GET(new Request('https://app.example/api/cron/cleanup-uploads', {
    headers: { authorization: `Bearer ${secret}` },
  }));
  expect(unconfigured.status).toBe(401);
});

it('removes only bounded expired, unattached private objects before deleting their intents', async () => {
  const beforeCleanup = Date.now();
  const response = await GET(new Request('https://app.example/api/cron/cleanup-uploads', {
    headers: { authorization: `Bearer ${secret}` },
  }));

  expect(response.status).toBe(200);
  expect(fixture.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      storageBucket: 'workspace-files-private',
      expiresAt: { lt: expect.any(Date) },
      attachment: null,
    }),
    orderBy: { expiresAt: 'asc' },
    take: 100,
  }));
  const cutoff = fixture.findMany.mock.calls[0][0].where.expiresAt.lt as Date;
  expect(cutoff.getTime()).toBeGreaterThanOrEqual(beforeCleanup - 60 * 60 * 1000 - 100);
  expect(cutoff.getTime()).toBeLessThanOrEqual(Date.now() - 60 * 60 * 1000);
  expect(fixture.from).toHaveBeenCalledWith('workspace-files-private');
  expect(fixture.remove).toHaveBeenCalledWith(['channel/user/object-a.pdf', 'channel/user/object-b.pdf']);
  expect(fixture.deleteMany).toHaveBeenCalledWith({
    where: { id: { in: ['expired-pending', 'expired-uploaded'] }, expiresAt: { lt: cutoff }, attachment: null },
  });
  expect(await response.json()).toEqual({ examined: 2, deleted: 2 });
});

it('does not initialize storage when no expired unattached intents are found', async () => {
  fixture.findMany.mockResolvedValue([]);

  const response = await GET(new Request('https://app.example/api/cron/cleanup-uploads', {
    headers: { authorization: `Bearer ${secret}` },
  }));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ examined: 0, deleted: 0 });
  expect(fixture.from).not.toHaveBeenCalled();
  expect(fixture.deleteMany).not.toHaveBeenCalled();
});

it('keeps expired intent rows when provider cleanup fails so the next run can retry', async () => {
  fixture.remove.mockResolvedValue({ data: null, error: new Error('storage unavailable') });

  const response = await GET(new Request('https://app.example/api/cron/cleanup-uploads', {
    headers: { authorization: `Bearer ${secret}` },
  }));

  expect(response.status).toBe(503);
  expect(fixture.deleteMany).not.toHaveBeenCalled();
  expect(await response.json()).toMatchObject({ examined: 2, deleted: 0 });
});

it('reports a retryable failure if provider cleanup succeeds but expired intent deletion fails', async () => {
  fixture.deleteMany.mockRejectedValue(new Error('database unavailable'));

  const response = await GET(new Request('https://app.example/api/cron/cleanup-uploads', {
    headers: { authorization: `Bearer ${secret}` },
  }));

  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ examined: 2, deleted: 0 });
});
