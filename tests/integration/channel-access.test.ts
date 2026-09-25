import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getMessages } from '@/actions/message';
import {
  createChannel,
  deleteChannel,
  getAllChannels,
  getChannels,
  getUnreadInbox,
  getWorkspaceChannels,
  createGroupDirectMessage,
  getDirectMessageInbox,
  getOrCreateDirectMessage,
  leaveDirectMessage,
  leaveChannel as leaveChannelFromChannel,
  renameGroupDirectMessage,
  updateChannel,
} from '@/actions/channel';
import {
  addChannelMember,
  getChannelMembers,
  joinChannel,
  leaveChannel,
  markChannelAsRead,
  removeChannelMember,
} from '@/actions/channel-member';
import { toggleStarChannel } from '@/actions/star';
import { getUserProfile, updateProfile } from '@/actions/user';

const actor = vi.hoisted(() => ({ id: '' }));
vi.mock('@/auth', () => ({ auth: vi.fn(async () => actor.id ? { user: { id: actor.id } } : null) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/actions/notification', () => ({ createNotification: vi.fn() }));

beforeEach(async () => {
  actor.id = randomUUID();
  await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
});

afterAll(() => prisma.$disconnect());

async function fixture() {
  const owner = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
  const target = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Channel access fixture',
      slug: `channel-access-${randomUUID()}`,
      ownerId: owner.id,
      members: { create: [{ userId: owner.id, role: 'OWNER' }, { userId: actor.id, role: 'MEMBER' }] },
      channels: {
        create: [
          { name: 'public', type: 'PUBLIC', creatorId: owner.id, members: { create: { userId: owner.id } } },
          { name: 'private', type: 'PRIVATE', creatorId: owner.id, members: { create: { userId: owner.id } } },
        ],
      },
    },
    include: { channels: true },
  });
  return { owner, target, workspace, publicChannel: workspace.channels.find((c) => c.name === 'public')!, privateChannel: workspace.channels.find((c) => c.name === 'private')! };
}

function createGroupWithFreshIntent(workspaceId: string, participantIds: string[], displayName?: string) {
  return createGroupDirectMessage(workspaceId, participantIds, randomUUID(), displayName);
}

describe('channel access boundaries (A01 / A03)', () => {
  it('does not expose browse results to users outside the workspace', async () => {
    const { workspace } = await fixture();
    actor.id = randomUUID();
    await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
    expect(await getAllChannels(workspace.id)).toEqual([]);
  });

  it('does not expose channel summaries after workspace membership is revoked', async () => {
    const { workspace, publicChannel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: publicChannel.id, userId: actor.id } });
    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: actor.id } },
    });

    expect(await getChannels(workspace.id)).toEqual([]);
  });

  it('loads only searchable channel names without unread or participant projections', async () => {
    const { workspace, publicChannel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: publicChannel.id, userId: actor.id } });
    const aggregateRead = vi.spyOn(prisma, '$queryRaw');
    const channelRead = vi.spyOn(prisma.channel, 'findMany');
    try {
      expect(await getWorkspaceChannels(workspace.slug)).toEqual([
        { id: publicChannel.id, name: publicChannel.name },
      ]);
      expect(aggregateRead).not.toHaveBeenCalled();
      expect(channelRead.mock.calls.at(-1)?.[0]?.select).toEqual({ id: true, name: true });
    } finally {
      aggregateRead.mockRestore();
      channelRead.mockRestore();
    }
  });

  it('creates a channel without revalidating an unrelated path', async () => {
    const { workspace } = await fixture();
    const form = new FormData();
    form.set('name', 'research');
    form.set('type', 'PUBLIC');
    form.set('workspaceId', workspace.id);
    vi.mocked(revalidatePath).mockClear();

    expect(await createChannel(form)).toMatchObject({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('deletes a channel without invalidating the full route tree', async () => {
    const { owner, publicChannel } = await fixture();
    actor.id = owner.id;
    vi.mocked(revalidatePath).mockClear();

    expect(await deleteChannel(publicChannel.id)).toEqual({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('requires workspace membership before joining a public channel', async () => {
    const { publicChannel } = await fixture();
    actor.id = randomUUID();
    await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
    expect(await joinChannel(publicChannel.id)).toEqual({ error: 'Not a member of this workspace' });
  });

  it('does not allow a private channel to be joined by channel id', async () => {
    const { privateChannel, workspace } = await fixture();
    expect(await joinChannel(privateChannel.id)).toEqual({ error: 'Private channels require an invitation' });
    expect(await prisma.channelMember.count({ where: { channelId: privateChannel.id, userId: actor.id } })).toBe(0);
    expect(await getAllChannels(workspace.id)).toHaveLength(1);
  });

  it('leaves a channel without invalidating the full route tree', async () => {
    const { publicChannel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: publicChannel.id, userId: actor.id } });
    vi.mocked(revalidatePath).mockClear();

    expect(await leaveChannelFromChannel(publicChannel.id)).toEqual({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('requires channel membership to read members and mark a channel read', async () => {
    const { publicChannel } = await fixture();
    expect(await getChannelMembers(publicChannel.id)).toEqual([]);
    expect(await markChannelAsRead(publicChannel.id)).toEqual({ error: 'You are not a member of this channel' });
  });

  it('advances the read cursor without invalidating the full route tree', async () => {
    const { publicChannel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: publicChannel.id, userId: actor.id } });
    const before = (await prisma.channelMember.findUniqueOrThrow({
      where: { channelId_userId: { channelId: publicChannel.id, userId: actor.id } },
      select: { lastViewedAt: true },
    })).lastViewedAt;
    const memberLookup = vi.spyOn(prisma.channelMember, 'findUnique');
    const memberUpdateMany = vi.spyOn(prisma.channelMember, 'updateMany');
    vi.mocked(revalidatePath).mockClear();

    expect(await markChannelAsRead(publicChannel.id)).toEqual({ success: true });

    const after = (await prisma.channelMember.findUniqueOrThrow({
      where: { channelId_userId: { channelId: publicChannel.id, userId: actor.id } },
      select: { lastViewedAt: true },
    })).lastViewedAt;
    expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(memberLookup).not.toHaveBeenCalled();
    expect(memberUpdateMany).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('marks only the selected conversation read', async () => {
    const { publicChannel, privateChannel } = await fixture();
    const before = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.channelMember.createMany({
      data: [
        { channelId: publicChannel.id, userId: actor.id, lastViewedAt: before },
        { channelId: privateChannel.id, userId: actor.id, lastViewedAt: before },
      ],
    });

    expect(await markChannelAsRead(publicChannel.id)).toEqual({ success: true });

    const [selected, other] = await Promise.all([
      prisma.channelMember.findUniqueOrThrow({
        where: { channelId_userId: { channelId: publicChannel.id, userId: actor.id } },
        select: { lastViewedAt: true },
      }),
      prisma.channelMember.findUniqueOrThrow({
        where: { channelId_userId: { channelId: privateChannel.id, userId: actor.id } },
        select: { lastViewedAt: true },
      }),
    ]);

    expect(selected.lastViewedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(other.lastViewedAt).toEqual(before);
  });

  it('keeps a message created after the explicit read boundary unread', async () => {
    const { owner, workspace, publicChannel } = await fixture();
    await prisma.channelMember.create({
      data: {
        channelId: publicChannel.id,
        userId: actor.id,
        lastViewedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    await prisma.message.create({
      data: { channelId: publicChannel.id, userId: owner.id, content: 'before explicit read' },
    });
    expect(await markChannelAsRead(publicChannel.id)).toEqual({ success: true });

    const afterBoundary = await prisma.message.create({
      data: { channelId: publicChannel.id, userId: owner.id, content: 'after explicit read' },
    });

    expect(await getUnreadInbox(workspace.id)).toMatchObject({
      items: [{ id: publicChannel.id, unreadCount: 1, firstUnreadMessageId: afterBoundary.id }],
      nextCursor: null,
    });
  });

  it('does not allow a workspace member outside the channel to add another user', async () => {
    const { publicChannel, target } = await fixture();
    expect(await addChannelMember(publicChannel.id, target.id)).toEqual({ error: 'Only channel members or workspace admins can add members' });
  });

  it('keeps add/remove membership updates out of root route invalidation', async () => {
    const { target, workspace, publicChannel } = await fixture();
    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: actor.id } },
      data: { role: 'ADMIN' },
    });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: target.id } });
    await prisma.channelMember.create({ data: { channelId: publicChannel.id, userId: actor.id } });
    vi.mocked(revalidatePath).mockClear();

    expect(await addChannelMember(publicChannel.id, target.id)).toEqual({ success: true });
    expect(await removeChannelMember(publicChannel.id, target.id)).toEqual({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('keeps public-channel join and leave out of root route invalidation', async () => {
    const { publicChannel } = await fixture();
    vi.mocked(revalidatePath).mockClear();

    expect(await joinChannel(publicChannel.id)).toEqual({ success: true });
    expect(await leaveChannel(publicChannel.id)).toEqual({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('sanitizes user-controlled channel descriptions in system-event writes', async () => {
    const { publicChannel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: publicChannel.id, userId: actor.id } });

    expect(
      await updateChannel(publicChannel.id, {
        description: '<img src=x onerror=run()>Project update<script>steal()</script>',
      }),
    ).toMatchObject({ success: true });
    const systemMessage = await prisma.message.findFirst({
      where: { channelId: publicChannel.id, type: 'SYSTEM', userId: actor.id },
    });
    expect(systemMessage?.content).toBe('set the channel description: Project update');
    expect(systemMessage?.content).not.toMatch(/<img|<script|onerror/i);
  });

  it('updates channel settings without invalidating the root route', async () => {
    const { workspace, publicChannel } = await fixture();
    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: actor.id } },
      data: { role: 'ADMIN' },
    });
    await prisma.channelMember.create({ data: { channelId: publicChannel.id, userId: actor.id } });
    vi.mocked(revalidatePath).mockClear();

    expect(await updateChannel(publicChannel.id, { postingPermission: 'ADMIN_ONLY' })).toEqual({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('stores safe plain text when a member name enters an add-member system event', async () => {
    const { target, workspace, publicChannel } = await fixture();
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: target.id } });
    await prisma.user.update({
      where: { id: target.id },
      data: { name: '<img src=x onerror=run()>Harper<script>steal()</script>' },
    });
    await prisma.channelMember.create({ data: { channelId: publicChannel.id, userId: actor.id } });

    expect(await addChannelMember(publicChannel.id, target.id)).toEqual({ success: true });
    const systemMessage = await prisma.message.findFirst({
      where: { channelId: publicChannel.id, type: 'SYSTEM', userId: actor.id },
    });
    expect(systemMessage?.content).toBe('added Harper to the channel');
    expect(systemMessage?.content).not.toMatch(/<img|<script|onerror/i);
  });

  it('does not allow a workspace member outside the channel to star it', async () => {
    const { publicChannel } = await fixture();
    expect(await toggleStarChannel(publicChannel.id)).toEqual({ error: 'You are not a member of this channel' });
    expect(await prisma.starredChannel.count({ where: { channelId: publicChannel.id, userId: actor.id } })).toBe(0);
  });

  it('persists star toggles without invalidating the root route', async () => {
    const { publicChannel } = await fixture();
    await prisma.channelMember.create({ data: { channelId: publicChannel.id, userId: actor.id } });
    vi.mocked(revalidatePath).mockClear();

    expect(await toggleStarChannel(publicChannel.id)).toEqual({ success: true, starred: true });
    expect(await toggleStarChannel(publicChannel.id)).toEqual({ success: true, starred: false });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('only returns profiles for members of the requested workspace', async () => {
    const { owner, target, workspace } = await fixture();
    expect(await getUserProfile(owner.id, workspace.id)).toMatchObject({ id: owner.id });
    expect(await getUserProfile(target.id, workspace.id)).toBeNull();
  });

  it('updates the current profile without invalidating the full route tree', async () => {
    vi.mocked(revalidatePath).mockClear();

    expect(await updateProfile({ displayName: 'Taiwo K.' })).toEqual({ success: true });

    expect(revalidatePath).not.toHaveBeenCalled();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: actor.id } })).displayName).toBe('Taiwo K.');
  });

  it('requires both people to belong to the workspace before creating a direct message', async () => {
    const { target, workspace } = await fixture();
    expect(await getOrCreateDirectMessage(workspace.id, target.id)).toEqual({ error: 'User is not a member of this workspace' });
    expect(await getOrCreateDirectMessage(workspace.id, actor.id)).toEqual({ error: 'Cannot message yourself' });
  });

  it('creates one DIRECT channel and exposes it in the direct-messages section data', async () => {
    const { owner, workspace } = await fixture();
    vi.mocked(revalidatePath).mockClear();
    const first = await getOrCreateDirectMessage(workspace.id, owner.id);
    expect(revalidatePath).not.toHaveBeenCalled();
    const second = await getOrCreateDirectMessage(workspace.id, owner.id);
    expect(first).toMatchObject({ success: true });
    expect(second).toEqual(first);
    if (!first.channelId) throw new Error('Expected direct channel id');
    const direct = await prisma.channel.findUnique({ where: { id: first.channelId } });
    expect(direct?.type).toBe('DIRECT');
    expect(direct?.directKey).toBe(`dm-${[actor.id, owner.id].sort().join('-')}`);
    expect(await prisma.channel.count({ where: { workspaceId: workspace.id, type: 'DIRECT' } })).toBe(1);
    expect((await getChannels(workspace.id)).find((channel) => channel.id === first.channelId)?.directUser?.id).toBe(owner.id);
  });

  it('projects only the viewer membership and direct-conversation participants for the sidebar', async () => {
    const { owner, target, workspace, publicChannel } = await fixture();
    const additionalUsers = Array.from({ length: 12 }, () => ({
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    }));
    await prisma.user.createMany({ data: additionalUsers });
    await prisma.workspaceMember.createMany({
      data: additionalUsers.map(({ id }) => ({ workspaceId: workspace.id, userId: id })),
    });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: target.id } });
    await prisma.channelMember.createMany({
      data: [
        { channelId: publicChannel.id, userId: actor.id },
        ...additionalUsers.map(({ id }) => ({ channelId: publicChannel.id, userId: id })),
      ],
    });
    const direct = await getOrCreateDirectMessage(workspace.id, owner.id);
    const group = await createGroupWithFreshIntent(workspace.id, [owner.id, target.id]);
    if (!direct.channelId || !group.channelId) throw new Error('Expected direct conversations');

    const channelRead = vi.spyOn(prisma.channel, 'findMany');
    const participantRead = vi.spyOn(prisma.channelMember, 'findMany');
    try {
      const channels = await getChannels(workspace.id);
      const sidebarQuery = channelRead.mock.calls.find(([args]) => args?.where?.workspaceId === workspace.id)?.[0];
      expect(sidebarQuery?.select?.members).toEqual({
        where: { userId: actor.id },
        select: { lastViewedAt: true },
      });
      expect(participantRead).toHaveBeenCalledWith(expect.objectContaining({
        where: { channelId: { in: expect.arrayContaining([direct.channelId, group.channelId]) } },
      }));
      expect(channels.find(({ id }) => id === publicChannel.id)?.directUsers).toEqual([]);
      expect(channels.find(({ id }) => id === direct.channelId)?.directUsers?.map(({ id }) => id)).toEqual([owner.id]);
      expect(channels.find(({ id }) => id === group.channelId)?.directAvatarUsers?.map(({ id }) => id).sort()).toEqual(
        [actor.id, owner.id, target.id].sort(),
      );
    } finally {
      channelRead.mockRestore();
      participantRead.mockRestore();
    }
  });

  it('batches channel unread counts and counts only unread published root messages', async () => {
    const { owner, workspace, publicChannel, privateChannel } = await fixture();
    await prisma.channel.createMany({
      data: Array.from({ length: 48 }, (_, index) => ({
        name: `summary-${index}`,
        type: 'PUBLIC' as const,
        workspaceId: workspace.id,
        creatorId: owner.id,
      })),
    });
    const additionalChannels = await prisma.channel.findMany({
      where: { workspaceId: workspace.id, name: { startsWith: 'summary-' } },
      select: { id: true },
    });
    await prisma.channelMember.createMany({
      data: additionalChannels.map(({ id }) => ({ channelId: id, userId: actor.id })),
    });
    const now = new Date();
    const publicReadAt = new Date(now.getTime() - 60 * 60 * 1000);
    const privateReadAt = new Date(now.getTime() - 10 * 60 * 1000);
    await prisma.channelMember.createMany({
      data: [
        { channelId: publicChannel.id, userId: actor.id, lastViewedAt: publicReadAt },
        { channelId: privateChannel.id, userId: actor.id, lastViewedAt: privateReadAt },
      ],
    });

    const publicRoot = await prisma.message.create({
      data: {
        channelId: publicChannel.id,
        userId: owner.id,
        content: '<p>Unread root</p>',
        createdAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
    });
    await prisma.message.createMany({
      data: [
        {
          channelId: publicChannel.id,
          userId: owner.id,
          parentId: publicRoot.id,
          content: '<p>Thread reply</p>',
          createdAt: new Date(now.getTime() - 20 * 60 * 1000),
        },
        {
          channelId: publicChannel.id,
          userId: actor.id,
          content: '<p>Own message</p>',
          createdAt: new Date(now.getTime() - 15 * 60 * 1000),
        },
        {
          channelId: publicChannel.id,
          userId: owner.id,
          content: '<p>Future schedule</p>',
          scheduledAt: new Date(now.getTime() + 60 * 60 * 1000),
          createdAt: new Date(now.getTime() - 5 * 60 * 1000),
        },
        {
          channelId: publicChannel.id,
          userId: owner.id,
          type: 'SYSTEM',
          content: 'Member joined',
          createdAt: new Date(now.getTime() - 4 * 60 * 1000),
        },
        {
          channelId: publicChannel.id,
          userId: owner.id,
          content: '<p>Deleted message</p>',
          isDeleted: true,
          createdAt: new Date(now.getTime() - 3 * 60 * 1000),
        },
        {
          channelId: privateChannel.id,
          userId: owner.id,
          content: '<p>Already read</p>',
          createdAt: new Date(now.getTime() - 30 * 60 * 1000),
        },
        {
          channelId: privateChannel.id,
          userId: owner.id,
          content: '<p>Unread in this channel</p>',
          createdAt: new Date(now.getTime() - 5 * 60 * 1000),
        },
      ],
    });

    const countSpy = vi.spyOn(prisma.message, 'count');
    const aggregateSpy = vi.spyOn(prisma, '$queryRaw');
    try {
      const channels = await getChannels(workspace.id);
      expect(channels).toHaveLength(50);
      expect(channels.find(({ id }) => id === publicChannel.id)?.unreadCount).toBe(1);
      expect(channels.find(({ id }) => id === privateChannel.id)?.unreadCount).toBe(1);
      expect(countSpy).not.toHaveBeenCalled();
      expect(aggregateSpy).toHaveBeenCalledTimes(1);
    } finally {
      countSpy.mockRestore();
      aggregateSpy.mockRestore();
    }
  });

  it('returns authorized unread conversations and their earliest unread root message', async () => {
    const { owner, workspace, publicChannel, privateChannel } = await fixture();
    const readAt = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.channelMember.create({
      data: { channelId: publicChannel.id, userId: actor.id, lastViewedAt: readAt },
    });
    const firstUnread = await prisma.message.create({
      data: {
        channelId: publicChannel.id,
        userId: owner.id,
        content: 'first unread',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });
    const threadParent = await prisma.message.create({
      data: {
        channelId: publicChannel.id,
        userId: owner.id,
        content: 'later unread root',
        createdAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    });
    await prisma.message.createMany({
      data: [
        {
          channelId: publicChannel.id,
          userId: owner.id,
          parentId: threadParent.id,
          content: 'thread reply',
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
        },
        { channelId: publicChannel.id, userId: actor.id, content: 'own message' },
        { channelId: publicChannel.id, userId: owner.id, type: 'SYSTEM', content: 'system event' },
        {
          channelId: publicChannel.id,
          userId: owner.id,
          content: 'future message',
          scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        { channelId: publicChannel.id, userId: owner.id, content: 'deleted message', isDeleted: true },
        { channelId: privateChannel.id, userId: owner.id, content: 'private without membership' },
      ],
    });

    const result = await getUnreadInbox(workspace.id);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: publicChannel.id,
      name: publicChannel.name,
      unreadCount: 2,
      firstUnreadMessageId: firstUnread.id,
    });
  });

  it('paginates unread rows by activity and rejects a cursor from another workspace', async () => {
    const { owner, workspace, publicChannel, privateChannel } = await fixture();
    const readAt = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.channelMember.createMany({
      data: [
        { channelId: publicChannel.id, userId: actor.id, lastViewedAt: readAt },
        { channelId: privateChannel.id, userId: actor.id, lastViewedAt: readAt },
      ],
    });
    await prisma.message.create({
      data: {
        channelId: publicChannel.id,
        userId: owner.id,
        content: 'older unread',
        createdAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    });
    await prisma.message.create({
      data: {
        channelId: privateChannel.id,
        userId: owner.id,
        content: 'newer unread',
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    });

    const firstPage = await getUnreadInbox(workspace.id, 1);
    const secondPage = await getUnreadInbox(workspace.id, 1, firstPage.nextCursor ?? undefined);

    expect(firstPage.items.map(({ id }) => id)).toEqual([privateChannel.id]);
    expect(firstPage.nextCursor).toBeTruthy();
    expect(secondPage.items.map(({ id }) => id)).toEqual([publicChannel.id]);
    const otherWorkspace = await prisma.workspace.create({
      data: {
        name: 'Other workspace',
        slug: `other-unread-${randomUUID()}`,
        ownerId: actor.id,
        members: { create: { userId: actor.id, role: 'OWNER' } },
      },
    });
    expect(await getUnreadInbox(otherWorkspace.id, 1, firstPage.nextCursor!)).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('denies stale channel memberships after workspace removal', async () => {
    const { owner, workspace, publicChannel } = await fixture();
    await prisma.channelMember.create({
      data: { channelId: publicChannel.id, userId: actor.id, lastViewedAt: new Date(Date.now() - 60 * 60 * 1000) },
    });
    await prisma.message.create({
      data: { channelId: publicChannel.id, userId: owner.id, content: 'unread' },
    });
    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: actor.id } },
    });

    expect(await getUnreadInbox(workspace.id)).toEqual({ items: [], nextCursor: null });
  });

  it('batches inbox unread totals across conversations', async () => {
    const { owner, target, workspace } = await fixture();
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: target.id } });
    const first = await getOrCreateDirectMessage(workspace.id, owner.id);
    const second = await getOrCreateDirectMessage(workspace.id, target.id);
    if (!first.channelId || !second.channelId) throw new Error('Expected direct channel ids');

    const readAt = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.channelMember.updateMany({
      where: { userId: actor.id, channelId: { in: [first.channelId, second.channelId] } },
      data: { lastViewedAt: readAt },
    });
    await prisma.message.createMany({
      data: [
        { channelId: first.channelId, userId: owner.id, content: '<p>First DM</p>' },
        { channelId: second.channelId, userId: target.id, content: '<p>Second DM</p>' },
      ],
    });

    const countSpy = vi.spyOn(prisma.message, 'count');
    const aggregateSpy = vi.spyOn(prisma, '$queryRaw');
    try {
      const inbox = await getDirectMessageInbox(workspace.id);
      expect(inbox.items).toHaveLength(2);
      expect(inbox.items.map(({ unreadCount }) => unreadCount)).toEqual([1, 1]);
      expect(countSpy).not.toHaveBeenCalled();
      expect(aggregateSpy).toHaveBeenCalledTimes(1);
    } finally {
      countSpy.mockRestore();
      aggregateSpy.mockRestore();
    }
  });

  it('returns participant identity, latest message and unread state for the DM inbox', async () => {
    const { owner, workspace } = await fixture();
    const created = await getOrCreateDirectMessage(workspace.id, owner.id);
    if (!created.channelId) throw new Error('Expected direct channel id');

    await prisma.message.create({
      data: {
        channelId: created.channelId,
        userId: owner.id,
        content: '<p>Private inbox preview</p>',
      },
    });

    const inbox = await getDirectMessageInbox(workspace.id);
    expect(inbox.nextCursor).toBeNull();
    expect(inbox.items).toHaveLength(1);
    expect(inbox.items[0]).toMatchObject({
      id: created.channelId,
      unreadCount: 1,
      participants: [{ id: owner.id }],
      lastMessage: { content: '<p>Private inbox preview</p>', userId: owner.id },
    });
    expect((await getDirectMessageInbox(workspace.id, 25, undefined, true)).items).toHaveLength(1);
    expect(await getDirectMessageInbox(workspace.id, 25, 'missing-channel')).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('loads only the requested DM cursor page before hydrating conversation details', async () => {
    const { workspace } = await fixture();
    const now = new Date();
    const peers = Array.from({ length: 26 }, () => ({
      id: randomUUID(),
      email: `${randomUUID()}@example.test`,
    }));
    await prisma.user.createMany({ data: peers });
    await prisma.workspaceMember.createMany({
      data: peers.map(({ id }) => ({ workspaceId: workspace.id, userId: id })),
    });

    const conversations = peers.map(({ id: peerId }, index) => {
      const directKey = `dm-${[actor.id, peerId].sort().join('-')}`;
      const conversationId = randomUUID();
      return {
        index,
        id: conversationId,
        peerId,
        channel: {
          id: conversationId,
          workspaceId: workspace.id,
          name: directKey,
          type: 'DIRECT' as const,
          directKey,
          creatorId: actor.id,
          createdAt: new Date(now.getTime() - (peers.length - index) * 60_000),
        },
      };
    });
    await prisma.channel.createMany({ data: conversations.map(({ channel }) => channel) });
    await prisma.channelMember.createMany({
      data: conversations.flatMap(({ channel, peerId, index }) => [
        {
          channelId: channel.id,
          userId: actor.id,
          lastViewedAt: new Date(
            index % 2 === 0 ? now.getTime() - 24 * 60 * 60 * 1000 : now.getTime() + 60_000,
          ),
        },
        {
          channelId: channel.id,
          userId: peerId,
          lastViewedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      ]),
    });
    await prisma.message.createMany({
      data: conversations.map(({ channel, peerId }, index) => ({
        channelId: channel.id,
        userId: peerId,
        content: `<p>Recent activity ${index}</p>`,
        createdAt: new Date(now.getTime() - index * 1_000),
      })),
    });

    const channelFindManySpy = vi.spyOn(prisma.channel, 'findMany');
    try {
      const firstPage = await getDirectMessageInbox(workspace.id, 25);
      const secondPage = await getDirectMessageInbox(workspace.id, 25, firstPage.nextCursor ?? undefined);
      const firstUnreadPage = await getDirectMessageInbox(workspace.id, 10, undefined, true);
      const secondUnreadPage = await getDirectMessageInbox(
        workspace.id,
        10,
        firstUnreadPage.nextCursor ?? undefined,
        true,
      );
      expect(firstPage.items).toHaveLength(25);
      expect(secondPage.items).toHaveLength(1);
      expect(firstPage.nextCursor).toBe(firstPage.items.at(-1)?.id);
      expect(secondPage.nextCursor).toBeNull();
      expect(new Set([...firstPage.items, ...secondPage.items].map(({ id }) => id)).size).toBe(26);
      expect(firstPage.items[0]?.lastMessage?.content).toContain('Recent activity 0');
      expect(firstUnreadPage.items).toHaveLength(10);
      expect(secondUnreadPage.items).toHaveLength(3);
      expect([...firstUnreadPage.items, ...secondUnreadPage.items].every(({ unreadCount }) => unreadCount > 0)).toBe(true);
      expect(channelFindManySpy.mock.calls.map(([args]) => args?.where?.id)).toEqual([
        { in: firstPage.items.map(({ id }) => id) },
        { in: secondPage.items.map(({ id }) => id) },
        { in: firstUnreadPage.items.map(({ id }) => id) },
        { in: secondUnreadPage.items.map(({ id }) => id) },
      ]);
    } finally {
      channelFindManySpy.mockRestore();
    }
  });

  it('keeps two remaining group members in the avatar set after someone leaves', async () => {
    const { owner, workspace } = await fixture();
    const teammate = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: teammate.id } });
    const created = await createGroupWithFreshIntent(workspace.id, [owner.id, teammate.id]);
    if (!created.channelId) throw new Error('Expected group conversation id');

    expect(await leaveDirectMessage(created.channelId)).toEqual({ success: true });

    actor.id = owner.id;
    const inbox = await getDirectMessageInbox(workspace.id);
    const group = inbox.items.find(({ id }) => id === created.channelId);
    expect(group?.participants.map(({ id }) => id)).toEqual([teammate.id]);
    expect(group?.avatarParticipants.map(({ id }) => id).sort()).toEqual([owner.id, teammate.id].sort());
    const sidebarGroup = (await getChannels(workspace.id)).find(({ id }) => id === created.channelId);
    expect(sidebarGroup?.directAvatarUsers?.map(({ id }) => id).sort()).toEqual(
      [owner.id, teammate.id].sort(),
    );
  });

  it('validates group recipients and creates a named DIRECT conversation', async () => {
    const { owner, workspace } = await fixture();
    const teammate = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: teammate.id } });

    expect(await createGroupDirectMessage(workspace.id, [owner.id], randomUUID())).toEqual({
      error: 'Choose at least two other workspace members',
    });
    expect(await createGroupDirectMessage(workspace.id, [owner.id, randomUUID()], randomUUID())).toEqual({
      error: 'Every participant must belong to this workspace',
    });
    expect(await createGroupDirectMessage(workspace.id, [owner.id, teammate.id], 'invalid-key')).toEqual({
      error: 'Invalid group creation request key',
    });

    vi.mocked(revalidatePath).mockClear();
    const created = await createGroupWithFreshIntent(
      workspace.id,
      [owner.id, owner.id, teammate.id],
      'Launch team',
    );
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(created).toMatchObject({ success: true });
    if (!created.channelId) throw new Error('Expected group channel id');

    const group = await prisma.channel.findUnique({
      where: { id: created.channelId },
      include: { members: { select: { userId: true } } },
    });
    expect(group).not.toHaveProperty('creationMutationId');
    expect(group).not.toHaveProperty('creationRequestHash');
    expect(group).toMatchObject({ type: 'DIRECT', name: 'Launch team', directKey: null });
    expect(group?.members.map(({ userId }) => userId).sort()).toEqual(
      [actor.id, owner.id, teammate.id].sort(),
    );
  });

  it('returns one group for concurrent creation retries and rejects key reuse with changed intent', async () => {
    const creatorId = actor.id;
    const { owner, workspace } = await fixture();
    const teammate = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: teammate.id } });
    const clientMutationId = randomUUID();

    const [first, retry] = await Promise.all([
      createGroupDirectMessage(workspace.id, [owner.id, teammate.id], clientMutationId),
      createGroupDirectMessage(workspace.id, [owner.id, teammate.id], clientMutationId),
    ]);

    expect(first.channelId).toBeTruthy();
    expect(retry.channelId).toBe(first.channelId);
    expect(await prisma.channel.count({ where: { id: { in: [first.channelId!, retry.channelId!] } } })).toBe(1);
    expect(
      await createGroupDirectMessage(workspace.id, [owner.id, teammate.id], clientMutationId, 'Different intent'),
    ).toEqual({ error: 'Creation key conflicts with a different group request' });

    actor.id = owner.id;
    expect(
      await createGroupDirectMessage(workspace.id, [creatorId, teammate.id], clientMutationId),
    ).toEqual({ error: 'Creation key conflicts with a different group request' });
  });

  it('restricts group lifecycle changes to valid names and active members', async () => {
    const { owner, workspace } = await fixture();
    const teammate = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: teammate.id } });
    const created = await createGroupWithFreshIntent(workspace.id, [owner.id, teammate.id], 'Launch team');
    if (!created.channelId) throw new Error('Expected group channel id');

    vi.mocked(revalidatePath).mockClear();
    expect(await renameGroupDirectMessage(created.channelId, 'dm-internal')).toEqual({
      error: 'Group names cannot start with dm-',
    });
    expect(await renameGroupDirectMessage(created.channelId, 'Core launch')).toEqual({ success: true });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect((await prisma.channel.findUnique({ where: { id: created.channelId } }))?.name).toBe('Core launch');

    vi.mocked(revalidatePath).mockClear();
    expect(await leaveDirectMessage(created.channelId)).toEqual({ success: true });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(await prisma.channelMember.count({ where: { channelId: created.channelId } })).toBe(2);
    expect(await leaveDirectMessage(created.channelId)).toEqual({ error: 'You are not a member of this conversation' });
  });

  it('keeps a group manageable and leaveable after it has two active participants', async () => {
    const creatorId = actor.id;
    const { owner, workspace } = await fixture();
    const teammate = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: teammate.id } });
    const created = await createGroupWithFreshIntent(workspace.id, [owner.id, teammate.id], 'Launch team');
    if (!created.channelId) throw new Error('Expected group conversation id');

    actor.id = owner.id;
    expect(await leaveDirectMessage(created.channelId)).toEqual({ success: true });
    actor.id = creatorId;

    expect(await renameGroupDirectMessage(created.channelId, 'Core launch')).toEqual({ success: true });
    expect(await leaveDirectMessage(created.channelId)).toEqual({ success: true });
    expect(await prisma.channelMember.count({ where: { channelId: created.channelId } })).toBe(1);
  });

  it('keeps one-to-one conversations out of group-only actions', async () => {
    const { owner, workspace } = await fixture();
    const direct = await getOrCreateDirectMessage(workspace.id, owner.id);
    if (!direct.channelId) throw new Error('Expected one-to-one conversation id');

    expect(await renameGroupDirectMessage(direct.channelId, 'Core launch')).toEqual({
      error: 'Only group conversations can be renamed',
    });
    expect(await leaveDirectMessage(direct.channelId)).toEqual({
      error: 'One-to-one conversations cannot be left',
    });
  });

  it('creates a new conversation generation when a group gains a participant', async () => {
    const { owner, workspace } = await fixture();
    const teammate = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    const newParticipant = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    await prisma.workspaceMember.createMany({
      data: [
        { workspaceId: workspace.id, userId: teammate.id },
        { workspaceId: workspace.id, userId: newParticipant.id },
      ],
    });

    const original = await createGroupWithFreshIntent(workspace.id, [owner.id, teammate.id], 'Launch team');
    if (!original.channelId) throw new Error('Expected original group conversation id');
    await prisma.message.create({
      data: {
        content: 'Private history before the new participant joined',
        channelId: original.channelId,
        userId: actor.id,
      },
    });
    const expanded = await createGroupWithFreshIntent(
      workspace.id,
      [owner.id, teammate.id, newParticipant.id],
      'Launch team expanded',
    );
    expect(original.channelId).toBeTruthy();
    expect(expanded.channelId).toBeTruthy();
    expect(expanded.channelId).not.toBe(original.channelId);
    expect(await prisma.channelMember.count({ where: { channelId: original.channelId } })).toBe(3);
    expect(await prisma.channelMember.count({ where: { channelId: expanded.channelId } })).toBe(4);
    if (!expanded.channelId) throw new Error('Expected new group generation id');
    await prisma.message.create({
      data: {
        content: 'Visible only in the new generation',
        channelId: expanded.channelId,
        userId: newParticipant.id,
      },
    });

    actor.id = newParticipant.id;
    expect(await getMessages(original.channelId)).toEqual([]);
    expect((await getMessages(expanded.channelId)).map(({ content }) => content)).toEqual([
      'Visible only in the new generation',
    ]);
  });
});
