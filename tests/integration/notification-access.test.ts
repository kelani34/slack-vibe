import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getNotifications, markChannelNotificationsRead } from '@/actions/notification';

const actor = vi.hoisted(() => ({ id: '' }));
vi.mock('@/auth', () => ({ auth: vi.fn(async () => actor.id ? { user: { id: actor.id } } : null) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  actor.id = randomUUID();
  await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
});

afterAll(() => prisma.$disconnect());
afterEach(() => vi.restoreAllMocks());

async function fixture() {
  const owner = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Notification access fixture',
      slug: `notification-access-${randomUUID()}`,
      ownerId: owner.id,
      members: { create: [{ userId: owner.id, role: 'OWNER' }, { userId: actor.id, role: 'MEMBER' }] },
      channels: { create: { name: 'private', type: 'PRIVATE', creatorId: owner.id, members: { create: { userId: owner.id } } } },
    },
    include: { channels: true },
  });
  const channel = workspace.channels[0];
  const message = await prisma.message.create({ data: { channelId: channel.id, userId: owner.id, content: 'private notification' } });
  await prisma.notification.create({
    data: {
      userId: actor.id,
      actorId: owner.id,
      type: 'MENTION',
      resourceId: message.id,
      resourceType: 'message',
    },
  });
  return { owner, channel, message };
}

describe('notification access boundaries (A01 / A04)', () => {
  it('does not expose notifications whose message channel is inaccessible', async () => {
    await fixture();
    expect(await getNotifications()).toEqual({ notifications: [], unreadCount: 0 });
  });

  it('filters notification access before pagination and reads only one bounded page', async () => {
    const { channel, owner } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const accessibleIds: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const message = await prisma.message.create({
        data: { channelId: channel.id, userId: owner.id, content: `notification ${index}` },
      });
      accessibleIds.push(message.id);
      await prisma.notification.create({
        data: {
          userId: actor.id,
          actorId: owner.id,
          type: 'MENTION',
          resourceId: message.id,
          resourceType: 'message',
          createdAt: new Date(Date.UTC(2027, 0, 1, 0, index)),
        },
      });
    }
    const outsiderChannel = await prisma.channel.create({
      data: {
        name: `outsider-${randomUUID()}`,
        type: 'PRIVATE',
        creatorId: owner.id,
        workspaceId: channel.workspaceId,
        members: { create: { userId: owner.id } },
      },
    });
    const outsiderMessage = await prisma.message.create({
      data: { channelId: outsiderChannel.id, userId: owner.id, content: 'must stay hidden' },
    });
    await prisma.notification.create({
      data: {
        userId: actor.id,
        actorId: owner.id,
        type: 'MENTION',
        resourceId: outsiderMessage.id,
        resourceType: 'message',
        createdAt: new Date(Date.UTC(2028, 0, 1)),
      },
    });
    const notificationFindMany = vi.spyOn(prisma.notification, 'findMany');
    const messageFindMany = vi.spyOn(prisma.message, 'findMany');
    const channelMemberFindMany = vi.spyOn(prisma.channelMember, 'findMany');
    const queryRaw = vi.spyOn(prisma, '$queryRaw');

    const result = await getNotifications(0, 2);

    expect(notificationFindMany).not.toHaveBeenCalled();
    expect(messageFindMany).not.toHaveBeenCalled();
    expect(channelMemberFindMany).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      unreadCount: 5,
      notifications: [
        { resourceId: accessibleIds[3], resourceContent: 'notification 3', channelId: channel.id },
        { resourceId: accessibleIds[2], resourceContent: 'notification 2', channelId: channel.id },
      ],
    });
  });

  it('does not mark notifications read for a channel the user cannot access', async () => {
    const { channel, message } = await fixture();
    expect(await markChannelNotificationsRead(channel.id)).toEqual({ error: 'You are not a member of this channel' });
    expect(await prisma.notification.findFirst({ where: { userId: actor.id, resourceId: message.id } })).toMatchObject({ isRead: false });
  });

  it('marks channel notifications read with a bounded relational update', async () => {
    const { owner, channel, message } = await fixture();
    await prisma.channelMember.create({ data: { channelId: channel.id, userId: actor.id } });
    const otherChannel = await prisma.channel.create({
      data: {
        name: `unrelated-${randomUUID()}`,
        type: 'PRIVATE',
        creatorId: owner.id,
        workspaceId: channel.workspaceId,
        members: { create: { userId: owner.id } },
      },
    });
    const otherMessage = await prisma.message.create({
      data: { channelId: otherChannel.id, userId: owner.id, content: 'unrelated notification' },
    });
    await prisma.notification.create({
      data: {
        userId: actor.id,
        actorId: owner.id,
        type: 'CHANNEL_ADD',
        resourceId: channel.id,
        resourceType: 'channel',
      },
    });
    await prisma.notification.create({
      data: {
        userId: actor.id,
        actorId: owner.id,
        type: 'MENTION',
        resourceId: otherMessage.id,
        resourceType: 'message',
      },
    });
    const messageFindMany = vi.spyOn(prisma.message, 'findMany');
    const executeRaw = vi.spyOn(prisma, '$executeRaw');

    expect(await markChannelNotificationsRead(channel.id)).toEqual({ success: true });

    expect(messageFindMany).not.toHaveBeenCalled();
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const notifications = await prisma.notification.findMany({ where: { userId: actor.id } });
    expect(notifications.find(({ resourceId }) => resourceId === message.id)?.isRead).toBe(true);
    expect(notifications.find(({ resourceType, resourceId }) => resourceType === 'channel' && resourceId === channel.id)?.isRead).toBe(true);
    expect(notifications.find(({ resourceId }) => resourceId === otherMessage.id)?.isRead).toBe(false);
  });
});
