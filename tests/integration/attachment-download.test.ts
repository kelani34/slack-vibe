import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getAttachmentAccessUrls } from '@/actions/attachment';
import { createAdminClient } from '@/lib/supabase/admin';

const actor = vi.hoisted(() => ({ id: '' }));
vi.mock('@/auth', () => ({ auth: vi.fn(async () => actor.id ? { user: { id: actor.id } } : null) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

const signedUrl = 'https://storage.example.test/sign/private-object?token=short-lived';
const fixture = vi.hoisted(() => ({ createSignedUrl: vi.fn() }));

beforeEach(async () => {
  vi.clearAllMocks();
  actor.id = randomUUID();
  await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
  fixture.createSignedUrl.mockResolvedValue({ data: { signedUrl }, error: null });
  const from = vi.fn(() => ({ createSignedUrl: fixture.createSignedUrl }));
  vi.mocked(createAdminClient).mockReturnValue({ storage: { from } } as unknown as ReturnType<typeof createAdminClient>);
});

afterAll(() => prisma.$disconnect());

async function privateAttachmentFixture() {
  const owner = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Attachment download fixture',
      slug: `attachment-download-${randomUUID()}`,
      ownerId: owner.id,
      members: { create: [{ userId: owner.id, role: 'OWNER' }, { userId: actor.id, role: 'MEMBER' }] },
      channels: { create: { name: 'private', type: 'PRIVATE', creatorId: owner.id, members: { create: { userId: owner.id } } } },
    },
    include: { channels: true },
  });
  const channel = workspace.channels[0];
  const message = await prisma.message.create({ data: { channelId: channel.id, userId: owner.id, content: 'file fixture' } });
  const attachment = await prisma.attachment.create({
    data: {
      messageId: message.id,
      url: null,
      storageBucket: 'workspace-files-private',
      storagePath: `${channel.id}/object-id.png`,
      type: 'image/png',
      name: 'private.png',
      size: 12,
    },
  });
  return { channel, attachment };
}

describe('private attachment download grants (A06 / F30)', () => {
  it('requires storage bucket and object path references to be stored together', async () => {
    const { attachment } = await privateAttachmentFixture();

    await expect(prisma.attachment.create({
      data: {
        messageId: attachment.messageId,
        url: 'https://legacy.example.test/incomplete',
        storageBucket: 'workspace-files-private',
        type: 'image/png',
        name: 'incomplete.png',
        size: 12,
      },
    })).rejects.toThrow();
  });

  it('does not retain a permanent public URL beside a private object locator', async () => {
    const { attachment } = await privateAttachmentFixture();

    await expect(prisma.attachment.update({
      where: { id: attachment.id },
      data: { url: 'https://public.example.test/private-object' },
    })).rejects.toThrow();
  });

  it('rejects anonymous requests before loading storage', async () => {
    const { attachment } = await privateAttachmentFixture();
    actor.id = '';

    expect(await getAttachmentAccessUrls(attachment.id)).toEqual({ error: 'Unauthorized' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('does not sign an attachment for a workspace member outside its channel', async () => {
    const { attachment } = await privateAttachmentFixture();

    expect(await getAttachmentAccessUrls(attachment.id)).toEqual({ error: 'File not found' });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(fixture.createSignedUrl).not.toHaveBeenCalled();
  });

  it('does not grant downloads for deleted messages', async () => {
    const { channel, attachment } = await privateAttachmentFixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    await prisma.message.update({ where: { id: attachment.messageId }, data: { isDeleted: true } });

    expect(await getAttachmentAccessUrls(attachment.id)).toEqual({ error: 'File not found' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('does not grant downloads for messages scheduled in the future', async () => {
    const { channel, attachment } = await privateAttachmentFixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    await prisma.message.update({
      where: { id: attachment.messageId },
      data: { scheduledAt: new Date(Date.now() + 60_000) },
    });

    expect(await getAttachmentAccessUrls(attachment.id)).toEqual({ error: 'File not found' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('refuses object paths that are not scoped to the attachment message channel', async () => {
    const { channel, attachment } = await privateAttachmentFixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    await prisma.attachment.update({
      where: { id: attachment.id },
      data: { storagePath: 'another-channel/private.png' },
    });

    expect(await getAttachmentAccessUrls(attachment.id)).toEqual({ error: 'Private file is unavailable' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('creates short-lived preview and download grants only for current channel members', async () => {
    const { channel, attachment } = await privateAttachmentFixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });

    expect(await getAttachmentAccessUrls(attachment.id)).toEqual({
      previewUrl: signedUrl,
      downloadUrl: signedUrl,
    });
    expect(fixture.createSignedUrl).toHaveBeenNthCalledWith(1, attachment.storagePath, 300);
    expect(fixture.createSignedUrl).toHaveBeenNthCalledWith(2, attachment.storagePath, 300, { download: true });
  });

  it('does not expose storage errors or signed URLs when grant creation fails', async () => {
    const { channel, attachment } = await privateAttachmentFixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    fixture.createSignedUrl.mockResolvedValueOnce({ data: null, error: new Error('sensitive provider detail') });

    expect(await getAttachmentAccessUrls(attachment.id)).toEqual({ error: 'Could not create a download link' });
  });
});
