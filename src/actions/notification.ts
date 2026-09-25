'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

type NotificationPageRow = {
  id: string | null;
  userId: string | null;
  actorId: string | null;
  type: NotificationType | null;
  resourceId: string | null;
  resourceType: string | null;
  isRead: boolean | null;
  createdAt: Date | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  actorEmail: string | null;
  channelId: string | null;
  resourceContent: string | null;
  unreadCount: bigint;
};

export async function getNotifications(offset = 0, limit = 20) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
    const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(0, Math.floor(limit))) : 20;
    const rows = await prisma.$queryRaw<NotificationPageRow[]>`
      WITH visible AS (
        SELECT
          notification."id",
          notification."userId",
          notification."actorId",
          notification."type",
          notification."resourceId",
          notification."resourceType",
          notification."isRead",
          notification."createdAt",
          actor."name" AS "actorName",
          actor."avatarUrl" AS "actorAvatarUrl",
          actor."email" AS "actorEmail",
          CASE
            WHEN notification."resourceType" = 'message'
              OR notification."type" IN ('MENTION', 'REPLY', 'REACTION', 'PIN')
              THEN message."channelId"
            WHEN notification."resourceType" = 'channel'
              OR notification."type" IN ('CHANNEL_ADD', 'CHANNEL_REMOVE', 'CHANNEL_ARCHIVE', 'CHANNEL_DELETE')
              THEN notification."resourceId"
            ELSE NULL
          END AS "channelId",
          CASE
            WHEN notification."resourceType" = 'message'
              OR notification."type" IN ('MENTION', 'REPLY', 'REACTION', 'PIN')
              THEN message."content"
            ELSE NULL
          END AS "resourceContent"
        FROM "notifications" AS notification
        JOIN "users" AS actor ON actor."id" = notification."actorId"
        LEFT JOIN "messages" AS message
          ON message."id" = notification."resourceId"
          AND (
            notification."resourceType" = 'message'
            OR notification."type" IN ('MENTION', 'REPLY', 'REACTION', 'PIN')
          )
        WHERE notification."userId" = ${session.user.id}
          AND CASE
            WHEN notification."resourceType" = 'message'
              OR notification."type" IN ('MENTION', 'REPLY', 'REACTION', 'PIN')
              THEN message."id" IS NOT NULL AND EXISTS (
                SELECT 1
                FROM "channel_members" AS membership
                WHERE membership."channelId" = message."channelId"
                  AND membership."userId" = ${session.user.id}
              )
            WHEN notification."resourceType" = 'channel'
              OR notification."type" IN ('CHANNEL_ADD', 'CHANNEL_REMOVE', 'CHANNEL_ARCHIVE', 'CHANNEL_DELETE')
              THEN EXISTS (
                SELECT 1
                FROM "channel_members" AS membership
                WHERE membership."channelId" = notification."resourceId"
                  AND membership."userId" = ${session.user.id}
              )
            ELSE TRUE
          END
      ),
      page AS (
        SELECT *
        FROM visible
        ORDER BY "createdAt" DESC, "id" DESC
        OFFSET ${safeOffset}
        LIMIT ${safeLimit}
      ),
      unread AS (
        SELECT COUNT(*) AS "unreadCount"
        FROM visible
        WHERE "isRead" = FALSE
      )
      SELECT
        page."id",
        page."userId",
        page."actorId",
        page."type",
        page."resourceId",
        page."resourceType",
        page."isRead",
        page."createdAt",
        page."actorName",
        page."actorAvatarUrl",
        page."actorEmail",
        page."channelId",
        page."resourceContent",
        unread."unreadCount"
      FROM unread
      LEFT JOIN page ON TRUE
      ORDER BY page."createdAt" DESC NULLS LAST, page."id" DESC NULLS LAST
    `;

    return {
      notifications: rows.flatMap((row) => row.id ? [{
        id: row.id,
        userId: row.userId!,
        actorId: row.actorId!,
        type: row.type!,
        resourceId: row.resourceId!,
        resourceType: row.resourceType!,
        isRead: row.isRead!,
        createdAt: row.createdAt!,
        actor: {
          id: row.actorId!,
          name: row.actorName,
          avatarUrl: row.actorAvatarUrl,
          email: row.actorEmail!,
        },
        channelId: row.channelId ?? undefined,
        resourceContent: row.resourceContent ?? undefined,
      }] : []),
      unreadCount: Number(rows[0]?.unreadCount ?? 0),
    };
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
  } catch {
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
  } catch {
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
  } catch {
    return { error: 'Failed to mark all as read' };
  }
}

export async function markChannelNotificationsRead(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const userId = session.user.id;

  try {
    const member = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { id: true },
    });
    if (!member) return { error: 'You are not a member of this channel' };

    await prisma.$executeRaw`
      UPDATE "notifications" AS notification
      SET "isRead" = TRUE
      WHERE notification."userId" = ${userId}
        AND notification."isRead" = FALSE
        AND EXISTS (
          SELECT 1
          FROM "channel_members" AS membership
          WHERE membership."channelId" = ${channelId}
            AND membership."userId" = ${userId}
        )
        AND (
          (notification."resourceType" = 'channel' AND notification."resourceId" = ${channelId})
          OR (
            notification."resourceType" = 'message'
            AND EXISTS (
              SELECT 1
              FROM "messages" AS message
              WHERE message."id" = notification."resourceId"
                AND message."channelId" = ${channelId}
            )
          )
        )
    `;

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
