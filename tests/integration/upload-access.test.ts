import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/actions/upload';
import { createAdminClient } from '@/lib/supabase/admin';

const actor = vi.hoisted(() => ({ id: '' }));
vi.mock('@/auth', () => ({ auth: vi.fn(async () => actor.id ? { user: { id: actor.id } } : null) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

beforeEach(async () => {
  vi.clearAllMocks();
  actor.id = randomUUID();
  await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
  const upload = vi.fn(async () => ({ error: null }));
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://files.example.test/attachment' } }));
  const from = vi.fn(() => ({ upload, getPublicUrl }));
  vi.mocked(createAdminClient).mockReturnValue({ storage: { from } } as unknown as ReturnType<typeof createAdminClient>);
});

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

function formFor(channelId: string, file: File) {
  const form = new FormData();
  form.set('channelId', channelId);
  form.set('file', file);
  return form;
}

describe('file upload access boundaries (A01 / A05)', () => {
  it('rejects uploads from a workspace member outside the channel', async () => {
    const { channel } = await fixture();
    expect(await uploadFile(formFor(channel.id, new File(['safe'], 'note.txt', { type: 'text/plain' })))).toEqual({ error: 'Not a member of this channel' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('rejects unsupported and oversized files before storage access', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    expect(await uploadFile(formFor(channel.id, new File(['binary'], 'script.exe', { type: 'application/x-msdownload' })))).toEqual({ error: 'File type is not supported' });
    const oversized = new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' });
    expect(await uploadFile(formFor(channel.id, oversized))).toEqual({ error: 'File is too large' });
  });

  it('rejects file bytes that do not match the declared image MIME type', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });

    const result = await uploadFile(
      formFor(channel.id, new File(['not a png'], 'image.png', { type: 'image/png' })),
    );

    expect(result).toEqual({ error: 'File content does not match its declared type' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('accepts a PNG whose leading bytes match the declared MIME type', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

    const result = await uploadFile(
      formFor(channel.id, new File([pngHeader], 'image.png', { type: 'image/png' })),
    );

    expect(result).toMatchObject({ name: 'image.png', type: 'image/png' });
    expect(createAdminClient).toHaveBeenCalledOnce();
  });

  it('rejects SVG uploads because active document content is not an image allowlist entry', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });

    const result = await uploadFile(
      formFor(channel.id, new File(['<svg onload="alert(1)"></svg>'], 'image.svg', { type: 'image/svg+xml' })),
    );

    expect(result).toEqual({ error: 'File type is not supported' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('uploads an allowed file only after channel membership is verified', async () => {
    const { channel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const result = await uploadFile(formFor(channel.id, new File(['safe'], 'note.txt', { type: 'text/plain' })));
    expect(result).toMatchObject({ url: 'https://files.example.test/attachment', name: 'note.txt', type: 'text/plain' });
    expect(createAdminClient).toHaveBeenCalledOnce();
  });
});
