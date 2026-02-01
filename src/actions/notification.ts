'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getNotifications(offset = 0, limit = 20) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    // Enhance notifications with channelId if resource is a message
    const messageIds = notifications
      .filter(n => 
        n.resourceType === 'message' || 
        ['MENTION', 'REPLY', 'REACTION', 'PIN'].includes(n.type)
      )
      .map(n => n.resourceId);

    const messageChannelMap = new Map<string, { channelId: string, content: string }>();
    
    if (messageIds.length > 0) {
      const messages = await prisma.message.findMany({
        where: { id: { in: messageIds } },
        select: { id: true, channelId: true, content: true },
      });
      messages.forEach(m => messageChannelMap.set(m.id, { channelId: m.channelId, content: m.content }));
    }

    const enhancedNotifications = notifications.map(n => {
      const details = messageChannelMap.get(n.resourceId);
      return {
        ...n,
        channelId: details?.channelId || (n.resourceType === 'channel' ? n.resourceId : undefined),
        resourceContent: details?.content
      };
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    return { notifications: enhancedNotifications, unreadCount };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { error: 'Failed to fetch notifications' };
  }
}

export async function markNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await prisma.notification.update({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
      data: {
        isRead: true,
      },
    });
    return { success: true };
  } catch (error) {
    return { error: 'Failed to mark notification as read' };
  }
}

export async function markNotificationUnread(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await prisma.notification.update({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
      data: {
        isRead: false,
      },
    });
    return { success: true };
  } catch (error) {
    return { error: 'Failed to mark notification as unread' };
  }
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    return { success: true };
  } catch (error) {
    return { error: 'Failed to mark all as read' };
  }
}

export async function markChannelNotificationsRead(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const userId = session.user.id;

  try {
    // 1. Get all message IDs in this channel
    const messages = await prisma.message.findMany({
      where: { channelId },
      select: { id: true },
    });
    const messageIds = messages.map((m) => m.id);

    // 2. Mark notifications as read for:
    //    a) The channel itself (resourceId = channelId)
    //    b) Any messages in the channel (resourceId in messageIds)
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        OR: [
          {
            resourceType: 'channel',
            resourceId: channelId,
          },
          {
            resourceType: 'message',
            resourceId: { in: messageIds },
          },
        ],
      },
      data: {
        isRead: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to mark channel notifications read', error);
    return { error: 'Failed to mark channel notifications read' };
  }
}

// Internal function to create notifications (not exposed to client directly usually, 
// but useful for other server actions)
export async function createNotification({
  userId,
  actorId,
  type,
  resourceId,
  resourceType,
}: {
  userId: string;
  actorId: string;
  type: NotificationType;
  resourceId: string;
  resourceType: string;
}) {
  if (userId === actorId) return; // Don't notify self

  try {
    await prisma.notification.create({
      data: {
        userId,
        actorId,
        type,
        resourceId,
        resourceType,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
