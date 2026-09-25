import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createUploadIntent, finalizeUploadIntent } from '@/actions/upload';
import { createAdminClient } from '@/lib/supabase/admin';

const actor = vi.hoisted(() => ({ id: '' }));
const storage = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  createSignedUrl: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/auth', () => ({ auth: vi.fn(async () => actor.id ? { user: { id: actor.id } } : null) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

beforeEach(async () => {
  vi.clearAllMocks();
  actor.id = randomUUID();
  await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
  storage.createSignedUploadUrl.mockResolvedValue({ data: { token: 'signed-upload-token' }, error: null });
  storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.example.test/signed-prefix' }, error: null });
  storage.list.mockResolvedValue({ data: [{ name: 'note.txt', metadata: { size: 4 } }], error: null });
  storage.remove.mockResolvedValue({ data: [], error: null });
  storage.from.mockReturnValue({
    createSignedUploadUrl: storage.createSignedUploadUrl,
    createSignedUrl: storage.createSignedUrl,
    list: storage.list,
    remove: storage.remove,
  });
  vi.mocked(createAdminClient).mockReturnValue({ storage: { from: storage.from } } as unknown as ReturnType<typeof createAdminClient>);
});

afterEach(() => vi.unstubAllGlobals());
afterAll(() => prisma.$disconnect());

async function fixture() {
  const owner = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Upload access fixture',
      slug: `upload-access-${randomUUID()}`,
      ownerId: owner.id,
      members: { create: [{ userId: owner.id, role: 'OWNER' }, { userId: actor.id, role: 'MEMBER' }] },
      channels: { create: { name: 'private', type: 'PRIVATE', creatorId: owner.id, members: { create: { userId: owner.id } } } },
    },
    include: { channels: true },
  });
  return { channel: workspace.channels[0] };
}

function inputFor(channelId: string, overrides: Partial<{ name: string; type: string; size: number }> = {}) {
  return { channelId, name: 'note.txt', type: 'text/plain', size: 4, ...overrides };
}

async function startIntent(input: ReturnType<typeof inputFor>) {
  const result = await createUploadIntent(input);
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('file upload access boundaries (A01 / A05 / F29)', () => {
  it('requires authentication and refuses unsupported or invalid file metadata', async () => {
    const { channel } = await fixture();
    actor.id = '';
    expect(await createUploadIntent(inputFor(channel.id))).toEqual({ error: 'Unauthorized' });
    actor.id = randomUUID();
    await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });

    expect(await createUploadIntent(inputFor(channel.id, { type: 'application/x-msdownload' }))).toMatchObject({ error: expect.any(String) });
    expect(await createUploadIntent(inputFor(channel.id, { type: 'image/svg+xml' }))).toEqual({ error: 'File type is not supported' });
    expect(await createUploadIntent(inputFor(channel.id, { type: 'image/x-unknown' }))).toEqual({ error: 'File type is not supported' });
    expect(await createUploadIntent(inputFor(channel.id, { size: 0 }))).toMatchObject({ error: expect.any(String) });
    expect(await createUploadIntent(inputFor(channel.id, { size: 10 * 1024 * 1024 + 1 }))).toMatchObject({ error: expect.any(String) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('rejects uploads from a workspace member outside the channel before storage access', async () => {
    const { channel } = await fixture();
    expect(await createUploadIntent(inputFor(channel.id))).toEqual({ error: 'Not a member of this channel' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('creates a private, owner/channel-scoped intent and a signed upload token without receiving file bytes', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });

    const result = await startIntent(inputFor(channel.id));

    expect(result).toMatchObject({
      uploadIntentId: expect.any(String),
      storageBucket: 'workspace-files-private',
      storagePath: expect.stringMatching(new RegExp(`^${channel.id}/${actor.id}/`)),
      token: 'signed-upload-token',
      name: 'note.txt',
      type: 'text/plain',
      size: 4,
    });
    expect(storage.from).toHaveBeenCalledWith('workspace-files-private');
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(result.storagePath, { upsert: false });
    const saved = await prisma.uploadIntent.findUnique({ where: { id: result.uploadIntentId } });
    expect(saved).toMatchObject({ userId: actor.id, channelId: channel.id, status: 'PENDING', size: 4 });
  });

  it('verifies the exact private object and marks its intent uploaded only after finalization', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const created = await startIntent(inputFor(channel.id));
    storage.list.mockResolvedValue({ data: [{ name: created.storagePath.split('/').pop(), metadata: { size: 4 } }], error: null });

    expect(await finalizeUploadIntent(created.uploadIntentId)).toEqual({
      uploadIntentId: created.uploadIntentId,
      name: 'note.txt',
      type: 'text/plain',
      size: 4,
    });
    expect(storage.list).toHaveBeenCalledWith(created.storagePath.slice(0, created.storagePath.lastIndexOf('/')), {
      limit: 10,
      search: created.storagePath.split('/').pop(),
    });
    expect((await prisma.uploadIntent.findUnique({ where: { id: created.uploadIntentId } }))?.status).toBe('UPLOADED');
  });

  it('removes a stored object whose actual size differs from the authorized intent', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const intent = await startIntent(inputFor(channel.id));
    storage.list.mockResolvedValue({ data: [{ name: intent.storagePath.split('/').pop(), metadata: { size: 500 } }], error: null });

    expect(await finalizeUploadIntent(intent.uploadIntentId)).toEqual({ error: 'Uploaded file is unavailable' });
    expect(storage.remove).toHaveBeenCalledWith([intent.storagePath]);
    expect(await prisma.uploadIntent.findUnique({ where: { id: intent.uploadIntentId } })).toBeNull();
  });

  it('rejects and removes objects uploaded with a MIME type different from the intent', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const intent = await startIntent(inputFor(channel.id));
    storage.list.mockResolvedValue({
      data: [{ name: intent.storagePath.split('/').pop(), metadata: { size: 4, mimetype: 'text/html' } }],
      error: null,
    });

    expect(await finalizeUploadIntent(intent.uploadIntentId)).toEqual({ error: 'Uploaded file is unavailable' });
    expect(storage.remove).toHaveBeenCalledWith([intent.storagePath]);
  });

  it('checks image bytes through a short range request and rejects mismatched content', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    storage.list.mockResolvedValue({ data: [{ name: 'image.png', metadata: { size: 12 } }], error: null });
    const intent = await startIntent(inputFor(channel.id, { name: 'image.png', type: 'image/png', size: 12 }));
    storage.list.mockResolvedValue({ data: [{ name: intent.storagePath.split('/').pop(), metadata: { size: 12 } }], error: null });
    const response = new Response(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), { status: 206 });
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal('fetch', fetchMock);

    expect(await finalizeUploadIntent(intent.uploadIntentId)).toEqual({ error: 'File content does not match its declared type' });
    expect(fetchMock).toHaveBeenCalledWith('https://storage.example.test/signed-prefix', expect.objectContaining({ headers: { Range: 'bytes=0-11' } }));
    expect(storage.remove).toHaveBeenCalledWith([intent.storagePath]);
    expect(await prisma.uploadIntent.findUnique({ where: { id: intent.uploadIntentId } })).toBeNull();
  });

  it('accepts matching PNG bytes and makes finalization idempotent', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    storage.list.mockResolvedValue({ data: [{ name: 'image.png', metadata: { size: 12 } }], error: null });
    const intent = await startIntent(inputFor(channel.id, { name: 'image.png', type: 'image/png', size: 12 }));
    storage.list.mockResolvedValue({ data: [{ name: intent.storagePath.split('/').pop(), metadata: { size: 12 } }], error: null });
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]), { status: 206 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await finalizeUploadIntent(intent.uploadIntentId)).toMatchObject({ uploadIntentId: intent.uploadIntentId });
    expect(await finalizeUploadIntent(intent.uploadIntentId)).toMatchObject({ uploadIntentId: intent.uploadIntentId });
    expect(storage.list).toHaveBeenCalledOnce();
  });

  it('does not finalize an expired or inaccessible upload intent', async () => {
    const { channel } = await fixture();
    const intent = await prisma.uploadIntent.create({
      data: {
        userId: actor.id,
        channelId: channel.id,
        storageBucket: 'workspace-files-private',
        storagePath: `${channel.id}/${actor.id}/${randomUUID()}.txt`,
        name: 'expired.txt',
        type: 'text/plain',
        size: 4,
        createdAt: new Date(Date.now() - 120_000),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    expect(await finalizeUploadIntent(intent.id)).toEqual({ error: 'Uploaded file is unavailable' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
