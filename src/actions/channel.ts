'use server';

import { createHash, randomUUID } from 'node:crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createNotification } from './notification';
import { NotificationType, Prisma, type ChannelType } from '@prisma/client';
import { messageHtmlToText } from '@/lib/message-html';

type ChannelPostingPermission =
  | 'EVERYONE'
  | 'ADMIN_ONLY'
  | 'OWNER_ONLY'
  | 'SELECTED_MEMBERS';

const createChannelSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Channel name must be lowercase with dashes only'),
  type: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  workspaceId: z.string(),
});

async function getUnreadCountsByChannel(userId: string, channelIds: string[]) {
  if (channelIds.length === 0) return new Map<string, number>();
  const now = new Date();

  const rows = await prisma.$queryRaw<Array<{ channelId: string; unreadCount: bigint }>>(Prisma.sql`
    SELECT message."channelId" AS "channelId", COUNT(message."id") AS "unreadCount"
    FROM "channel_members" AS member
    INNER JOIN "messages" AS message
      ON message."channelId" = member."channelId"
      AND message."createdAt" > member."lastViewedAt"
      AND message."userId" <> ${userId}
      AND message."parentId" IS NULL
      AND message."type" = 'REGULAR'
      AND message."isDeleted" = false
      AND (message."scheduledAt" IS NULL OR message."scheduledAt" <= ${now})
    WHERE member."userId" = ${userId}
      AND member."channelId" IN (${Prisma.join(channelIds)})
    GROUP BY message."channelId"
  `);

  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.channelId, Number(row.unreadCount));
  return counts;
}

export async function createChannel(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const name = formData.get('name') as string;
  const type = (formData.get('type') as string) || 'PUBLIC';
  const workspaceId = formData.get('workspaceId') as string;

  const validated = createChannelSchema.safeParse({ name, type, workspaceId });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Invalid data' };
  }

  // Check user is member of workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: validated.data.workspaceId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) return { error: 'Not a member of this workspace' };

  try {
    // Create channel and automatically add creator as member
    const channel = await prisma.channel.create({
      data: {
        name: validated.data.name,
        type: validated.data.type,
        workspaceId: validated.data.workspaceId,
        creatorId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
          },
        },
      },
    });

    return { success: true, channel };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { error: 'A channel with this name already exists' };
    }
    console.error(error);
    return { error: 'Failed to create channel' };
  }
}

// Get only channels user is a member of (excluding archived)
export async function getChannels(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;

  const channels = await prisma.channel.findMany({
    where: {
      workspaceId,
      isArchived: false, // Exclude archived channels from sidebar
      workspace: { is: { members: { some: { userId } } } },
      members: {
        some: {
          userId,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      directKey: true,
      members: {
        where: { userId },
        select: {
          lastViewedAt: true,
        },
      },
    },
  });

  const directChannelIds = channels
    .filter((channel) => channel.type === 'DIRECT' || channel.name.startsWith('dm-'))
    .map(({ id }) => id);
  const directMembers = directChannelIds.length
    ? await prisma.channelMember.findMany({
        where: { channelId: { in: directChannelIds } },
        orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
        select: {
          channelId: true,
          userId: true,
          user: {
            select: { id: true, name: true, displayName: true, avatarUrl: true, image: true },
          },
        },
      })
    : [];
  const directMembersByChannel = new Map<string, typeof directMembers>();
  for (const member of directMembers) {
    const members = directMembersByChannel.get(member.channelId);
    if (members) members.push(member);
    else directMembersByChannel.set(member.channelId, [member]);
  }

  const unreadCounts = await getUnreadCountsByChannel(userId, channels.map(({ id }) => id));
  const channelsWithCounts = channels.map((channel) => {
    const { members, ...rest } = channel;
    const lastViewedAt = members[0]?.lastViewedAt || new Date(); // Default to now if the membership changed mid-query
    const unreadCount = unreadCounts.get(channel.id) ?? 0;

    const isDirect = channel.type === 'DIRECT' || channel.name.startsWith('dm-');
    const isGroupDirect = channel.type === 'DIRECT' && channel.directKey === null;
    const channelMembers = directMembersByChannel.get(channel.id) ?? [];
    const directUsers = isDirect
      ? channelMembers
          .filter((member) => member.userId !== userId)
          .map((member) => member.user)
      : [];
    const directAvatarUsers = isDirect
      ? channelMembers
          .filter((member) => isGroupDirect || member.userId !== userId)
          .sort(
            (left, right) =>
              Number(left.userId === userId) - Number(right.userId === userId) ||
              left.userId.localeCompare(right.userId),
          )
          .map((member) => member.user)
      : [];
    return {
      ...rest,
      lastViewedAt,
      unreadCount,
      directUser: directUsers[0],
      directUsers,
      directAvatarUsers,
    };
  });

  return channelsWithCounts;
}

export async function getWorkspaceChannels(slug: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  return prisma.channel.findMany({
    where: {
      isArchived: false,
      workspace: {
        is: {
          slug,
          members: { some: { userId } },
        },
      },
      members: { some: { userId } },
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}

export type DirectMessageParticipant = {
  id: string;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  image: string | null;
};

export type DirectMessageInboxItem = {
  id: string;
  createdAt: Date;
  name: string;
  type: ChannelType;
  directKey: string | null;
  lastViewedAt: Date;
  unreadCount: number;
  participants: DirectMessageParticipant[];
  avatarParticipants: DirectMessageParticipant[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: Date;
    userId: string;
    attachments: { id: string }[];
  } | null;
};

export type DirectMessageInbox = {
  items: DirectMessageInboxItem[];
  nextCursor: string | null;
};

export type UnreadInboxItem = {
  id: string;
  name: string;
  type: ChannelType;
  directKey: string | null;
  unreadCount: number;
  firstUnreadMessageId: string;
  participants: DirectMessageParticipant[];
  avatarParticipants: DirectMessageParticipant[];
};

export type UnreadInbox = {
  items: UnreadInboxItem[];
  nextCursor: string | null;
};

type UnreadInboxSummary = {
  id: string;
  name: string;
  type: ChannelType;
  directKey: string | null;
  unreadCount: bigint;
  firstUnreadMessageId: string;
  lastUnreadAt: Date;
};

const unreadCursorSchema = z.object({
  channelId: z.string().min(1),
  lastUnreadAt: z.string().datetime(),
  scopeHash: z.string().regex(/^[a-f0-9]{64}$/),
});

function unreadScopeHash(userId: string, workspaceId: string) {
  return createHash('sha256').update(JSON.stringify([userId, workspaceId])).digest('hex');
}

function encodeUnreadCursor(summary: UnreadInboxSummary, scopeHash: string) {
  return Buffer.from(JSON.stringify({
    channelId: summary.id,
    lastUnreadAt: summary.lastUnreadAt.toISOString(),
    scopeHash,
  })).toString('base64url');
}

function decodeUnreadCursor(cursor: string, scopeHash: string) {
  if (cursor.length > 1024) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const parsed = unreadCursorSchema.safeParse(value);
    return parsed.success && parsed.data.scopeHash === scopeHash ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getUnreadInbox(
  workspaceId: string,
  limit = 25,
  cursor?: string,
): Promise<UnreadInbox> {
  const session = await auth();
  if (!session?.user?.id) return { items: [], nextCursor: null };

  const userId = session.user.id;
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true },
  });
  if (!workspaceMember) return { items: [], nextCursor: null };

  const pageSize = Math.min(Math.max(Number.isInteger(limit) ? limit : 25, 1), 50);
  const scopeHash = unreadScopeHash(userId, workspaceId);
  const pageCursor = cursor ? decodeUnreadCursor(cursor, scopeHash) : null;
  if (cursor && !pageCursor) return { items: [], nextCursor: null };

  const now = new Date();
  const cursorFilter = pageCursor
    ? Prisma.sql`AND (summary."lastUnreadAt", summary."channelId") < (${new Date(pageCursor.lastUnreadAt)}, ${pageCursor.channelId})`
    : Prisma.empty;
  const summaries = await prisma.$queryRaw<UnreadInboxSummary[]>(Prisma.sql`
    WITH visible_unread AS (
      SELECT
        channel."id" AS "channelId",
        message."id" AS "messageId",
        message."createdAt" AS "createdAt"
      FROM "channels" AS channel
      INNER JOIN "workspace_members" AS workspace_member
        ON workspace_member."workspaceId" = channel."workspaceId"
        AND workspace_member."userId" = ${userId}
      INNER JOIN "channel_members" AS channel_member
        ON channel_member."channelId" = channel."id"
        AND channel_member."userId" = workspace_member."userId"
      INNER JOIN "messages" AS message
        ON message."channelId" = channel."id"
        AND message."createdAt" > channel_member."lastViewedAt"
        AND message."userId" <> ${userId}
        AND message."parentId" IS NULL
        AND message."type" = 'REGULAR'
        AND message."isDeleted" = false
        AND (message."scheduledAt" IS NULL OR message."scheduledAt" <= ${now})
      WHERE channel."workspaceId" = ${workspaceId}
        AND channel."isArchived" = false
    ), summaries AS (
      SELECT
        "channelId",
        COUNT(*) AS "unreadCount",
        (array_agg("messageId" ORDER BY "createdAt" ASC, "messageId" ASC))[1] AS "firstUnreadMessageId",
        MAX("createdAt") AS "lastUnreadAt"
      FROM visible_unread
      GROUP BY "channelId"
    )
    SELECT
      channel."id" AS "id",
      channel."name" AS "name",
      channel."type" AS "type",
      channel."directKey" AS "directKey",
      summary."unreadCount" AS "unreadCount",
      summary."firstUnreadMessageId" AS "firstUnreadMessageId",
      summary."lastUnreadAt" AS "lastUnreadAt"
    FROM summaries AS summary
    INNER JOIN "channels" AS channel ON channel."id" = summary."channelId"
    WHERE true
      ${cursorFilter}
    ORDER BY summary."lastUnreadAt" DESC, summary."channelId" DESC
    LIMIT ${pageSize + 1}
  `);

  const pageSummaries = summaries.slice(0, pageSize);
  const directChannelIds = pageSummaries
    .filter(({ type, name }) => type === 'DIRECT' || name.startsWith('dm-'))
    .map(({ id }) => id);
  const directMembers = directChannelIds.length
    ? await prisma.channelMember.findMany({
        where: {
          channelId: { in: directChannelIds },
          channel: {
            workspaceId,
            isArchived: false,
            workspace: { members: { some: { userId } } },
            members: { some: { userId } },
          },
        },
        orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
        select: {
          channelId: true,
          userId: true,
          user: { select: { id: true, name: true, displayName: true, avatarUrl: true, image: true } },
        },
      })
    : [];
  const membersByChannel = new Map<string, typeof directMembers>();
  for (const member of directMembers) {
    const members = membersByChannel.get(member.channelId);
    if (members) members.push(member);
    else membersByChannel.set(member.channelId, [member]);
  }

  const items = pageSummaries.map((summary): UnreadInboxItem => {
    const group = summary.type === 'DIRECT' && summary.directKey === null;
    const members = membersByChannel.get(summary.id) ?? [];
    const peers = members.filter(({ userId: memberId }) => memberId !== userId);
    const avatarMembers = members
      .filter(({ userId: memberId }) => group || memberId !== userId)
      .sort((left, right) =>
        Number(left.userId === userId) - Number(right.userId === userId) ||
        left.userId.localeCompare(right.userId),
      );

    return {
      id: summary.id,
      name: summary.name,
      type: summary.type,
      directKey: summary.directKey,
      unreadCount: Number(summary.unreadCount),
      firstUnreadMessageId: summary.firstUnreadMessageId,
      participants: peers.map(({ user }) => user),
      avatarParticipants: avatarMembers.map(({ user }) => user),
    };
  });

  return {
    items,
    nextCursor: summaries.length > pageSize && pageSummaries.length > 0
      ? encodeUnreadCursor(pageSummaries[pageSummaries.length - 1], scopeHash)
      : null,
  };
}

type DirectMessageInboxSummary = {
  id: string;
  createdAt: Date;
  name: string;
  type: ChannelType;
  directKey: string | null;
  lastViewedAt: Date;
  unreadCount: bigint;
  activityAt: Date;
};

export async function getDirectMessageInbox(
  workspaceId: string,
  limit = 25,
  cursor?: string,
  unreadOnly = false,
): Promise<DirectMessageInbox> {
  const session = await auth();
  if (!session?.user?.id) return { items: [], nextCursor: null };

  const userId = session.user.id;
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true },
  });
  if (!workspaceMember) return { items: [], nextCursor: null };

  const pageSize = Math.min(Math.max(limit, 1), 50);
  const now = new Date();
  const cursorFilter = cursor
    ? Prisma.sql`AND ROW(summary."activityAt", summary."id") < (
        SELECT cursor_summary."activityAt", cursor_summary."id"
        FROM summaries AS cursor_summary
        WHERE cursor_summary."id" = ${cursor}
      )`
    : Prisma.empty;
  const unreadFilter = unreadOnly ? Prisma.sql`AND summary."unreadCount" > 0` : Prisma.empty;
  const summaries = await prisma.$queryRaw<DirectMessageInboxSummary[]>(Prisma.sql`
    WITH summaries AS (
      SELECT
        channel."id" AS "id",
        channel."createdAt" AS "createdAt",
        channel."name" AS "name",
        channel."type" AS "type",
        channel."directKey" AS "directKey",
        current_member."lastViewedAt" AS "lastViewedAt",
        COALESCE(last_message."createdAt", channel."createdAt") AS "activityAt",
        unread."unreadCount" AS "unreadCount"
      FROM "channels" AS channel
      INNER JOIN "channel_members" AS current_member
        ON current_member."channelId" = channel."id"
        AND current_member."userId" = ${userId}
      LEFT JOIN LATERAL (
        SELECT message."createdAt"
        FROM "messages" AS message
        WHERE message."channelId" = channel."id"
          AND message."parentId" IS NULL
          AND message."type" = 'REGULAR'
          AND message."isDeleted" = false
          AND (message."scheduledAt" IS NULL OR message."scheduledAt" <= ${now})
        ORDER BY message."createdAt" DESC, message."id" DESC
        LIMIT 1
      ) AS last_message ON true
      CROSS JOIN LATERAL (
        SELECT COUNT(*) AS "unreadCount"
        FROM "messages" AS unread_message
        WHERE unread_message."channelId" = channel."id"
          AND unread_message."createdAt" > current_member."lastViewedAt"
          AND unread_message."userId" <> ${userId}
          AND unread_message."parentId" IS NULL
          AND unread_message."type" = 'REGULAR'
          AND unread_message."isDeleted" = false
          AND (unread_message."scheduledAt" IS NULL OR unread_message."scheduledAt" <= ${now})
      ) AS unread
      WHERE channel."workspaceId" = ${workspaceId}
        AND channel."isArchived" = false
        AND (
          channel."type" = 'DIRECT'
          OR (channel."type" = 'PRIVATE' AND channel."name" LIKE 'dm-%')
        )
    )
    SELECT summary.*
    FROM summaries AS summary
    WHERE true
      ${unreadFilter}
      ${cursorFilter}
    ORDER BY summary."activityAt" DESC, summary."id" DESC
    LIMIT ${pageSize + 1}
  `);

  const pageSummaries = summaries.slice(0, pageSize);
  const detailChannels = pageSummaries.length
    ? await prisma.channel.findMany({
        where: {
          id: { in: pageSummaries.map(({ id }) => id) },
          workspaceId,
          isArchived: false,
          workspace: { members: { some: { userId } } },
          members: { some: { userId } },
          OR: [
            { type: 'DIRECT' },
            { type: 'PRIVATE', name: { startsWith: 'dm-' } },
          ],
        },
        select: {
          id: true,
          members: {
            orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  avatarUrl: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            where: {
              parentId: null,
              type: 'REGULAR',
              isDeleted: false,
              OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: {
              id: true,
              content: true,
              createdAt: true,
              userId: true,
              attachments: { select: { id: true }, take: 1 },
            },
          },
        },
      })
    : [];
  const detailsById = new Map(detailChannels.map((channel) => [channel.id, channel]));
  const items = pageSummaries.flatMap((summary): DirectMessageInboxItem[] => {
    const channel = detailsById.get(summary.id);
    if (!channel) return [];

    const isGroupDirect = summary.type === 'DIRECT' && summary.directKey === null;
    const peers = channel.members.filter((member) => member.userId !== userId);
    const avatarParticipants = channel.members
      .filter((member) => isGroupDirect || member.userId !== userId)
      .sort(
        (left, right) =>
          Number(left.userId === userId) - Number(right.userId === userId) ||
          left.userId.localeCompare(right.userId),
      )
      .map((member) => member.user);

    return [{
      id: summary.id,
      createdAt: summary.createdAt,
      name: summary.name,
      type: summary.type,
      directKey: summary.directKey,
      lastViewedAt: summary.lastViewedAt,
      unreadCount: Number(summary.unreadCount),
      participants: peers.map((member) => member.user),
      avatarParticipants,
      lastMessage: channel.messages[0] ?? null,
    }];
  });

  return {
    items,
    nextCursor: summaries.length > pageSize ? pageSummaries.at(-1)?.id ?? null : null,
  };
}

// Get ALL channels in workspace (for browse page)
export async function getAllChannels(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: session.user.id,
      },
    },
    select: { id: true },
  });
  if (!workspaceMember) return [];

  const channels = await prisma.channel.findMany({
    where: {
      workspaceId,
      type: 'PUBLIC', // Only show public channels in browse
      // Include archived channels
    },
    include: {
      members: {
        where: {
          userId: session.user.id,
        },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return channels.map((channel) => ({
    ...channel,
    isMember: channel.members.length > 0,
    memberCount: channel._count.members,
  }));
}

export async function deleteChannel(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { workspace: true },
  });

  if (!channel) return { error: 'Channel not found' };

  // Check user is admin/owner
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: channel.workspaceId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || membership.role === 'MEMBER') {
    return { error: 'Only admins can delete channels' };
  }

  // Get members to notify
  const members = await prisma.channelMember.findMany({
    where: { channelId },
    select: { userId: true },
  });

  await prisma.channel.delete({ where: { id: channelId } });

  // Notify members
  for (const member of members) {
    if (member.userId !== session.user.id) {
       await createNotification({
         userId: member.userId,
         actorId: session.user.id,
         type: NotificationType.CHANNEL_DELETE,
         resourceId: channelId, // Note: Resource deleted, but ID preserved for notification text/history
         resourceType: 'channel',
       });
    }
  }

  return { success: true };
}

export async function updateChannel(
  channelId: string,
  data: {
    name?: string;
    topics?: string[];
    description?: string;
    isArchived?: boolean;
    type?: 'PUBLIC' | 'PRIVATE';
    postingPermission?: ChannelPostingPermission;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const userId = session.user.id;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) return { error: 'Channel not found' };

  // Check user is member of channel
  const member = await prisma.channelMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId: userId,
      },
    },
  });

  if (!member) return { error: 'You are not a member of this channel' };

  // Let's allow topic/desc edit by anyone, but others by admin/owner/creator
  const isCreator = channel.creatorId === userId;

  if (
    data.isArchived !== undefined ||
    data.type !== undefined ||
    data.postingPermission !== undefined ||
    data.name !== undefined
  ) {
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: channel.workspaceId,
          userId: userId,
        },
      },
    });
    const isAdmin =
      workspaceMember?.role === 'ADMIN' || workspaceMember?.role === 'OWNER';

    if (!isAdmin && !isCreator) {
      return {
        error: 'Only admins or channel creator can update channel settings',
      };
    }
  }

  // Check for changes and generate system messages
  const systemMessages: string[] = [];

  if (data.name && data.name !== channel.name) {
    systemMessages.push(`renamed the channel to #${data.name}`);
  }

  if (
    data.description !== undefined &&
    data.description !== channel.description
  ) {
    if (data.description) {
      systemMessages.push(`set the channel description: ${data.description}`);
    } else {
      systemMessages.push(`removed the channel description`);
    }
  }

  if (data.topics) {
    const existingTopics = new Set(channel.topics || []);
    const newTopics = new Set(data.topics);
    const areDifferent =
      existingTopics.size !== newTopics.size ||
      [...existingTopics].some((t) => !newTopics.has(t));

    if (areDifferent) {
      if (data.topics.length > 0) {
        systemMessages.push(
          `set the channel topics: ${data.topics.join(', ')}`
        );
      } else {
        systemMessages.push(`cleared channel topics`);
      }
    }
  }

  if (data.isArchived !== undefined && data.isArchived !== channel.isArchived) {
    systemMessages.push(
      data.isArchived ? 'archived the channel' : 'unarchived the channel'
    );
  }

  if (data.type !== undefined && data.type !== channel.type) {
    systemMessages.push(
      data.type === 'PRIVATE'
        ? 'made the channel private'
        : 'made the channel public'
    );
  }

  if (
    data.postingPermission !== undefined &&
    data.postingPermission !== channel.postingPermission
  ) {
    systemMessages.push('updated posting permissions');
  }

  await prisma.$transaction(async (tx) => {
    await tx.channel.update({
      where: { id: channelId },
      data,
    });

    // If archiving, remove from starred channels
    if (data.isArchived) {
      await tx.starredChannel.deleteMany({
        where: { channelId },
      });
    }

    for (const msg of systemMessages) {
      await tx.message.create({
        data: {
          content: messageHtmlToText(msg),
          channelId,
          userId: userId,
          type: 'SYSTEM',
        },
      });
    }
  });

  // Notify members if archived
  if (data.isArchived) {
    const members = await prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    
    for (const member of members) {
      if (member.userId !== userId) {
        await createNotification({
          userId: member.userId,
          actorId: userId,
          type: NotificationType.CHANNEL_ARCHIVE,
          resourceId: channelId,
          resourceType: 'channel',
        });
      }
    }
  }

  return { success: true };
}

// Leave a channel
export async function leaveChannel(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) return { error: 'Channel not found' };

  // Check if member
  const member = await prisma.channelMember.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId: session.user.id,
      },
    },
  });

  if (!member) return { error: 'You are not a member of this channel' };

  const userId = session.user.id;

  // Prevent creator from leaving (optional rule, but good practice for now unless we have transfer ownership)
  if (channel.creatorId === userId) {
    return {
      error:
        'As the channel creator, you cannot leave. You must archive or delete the channel.',
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.channelMember.delete({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });

    await tx.message.create({
      data: {
        content: messageHtmlToText('left the channel'),
        type: 'SYSTEM',
        channelId,
        userId,
      },
    });
  });

  return { success: true };
}

export async function getDistinctTopics(workspaceId: string) {
  const channels = await prisma.channel.findMany({
    where: { workspaceId },
    select: { topics: true },
  });

  const allTopics = new Set<string>();
  channels.forEach((c) => c.topics.forEach((t) => allTopics.add(t)));
  return Array.from(allTopics).sort();
}

export async function getOrCreateDirectMessage(workspaceId: string, otherUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const currentUserId = session.user.id;

  const [currentMember, otherMember] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: currentUserId } },
      select: { id: true },
    }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: otherUserId } },
      select: { id: true },
    }),
  ]);
  if (!currentMember) return { error: 'Not a member of this workspace' };
  if (!otherMember) return { error: 'User is not a member of this workspace' };
  if (currentUserId === otherUserId) return { error: 'Cannot message yourself' };

  const directName = `dm-${[currentUserId, otherUserId].sort().join('-')}`;

  const keyedConversation = await prisma.channel.findFirst({
    where: {
      workspaceId,
      directKey: directName,
      members: {
        every: { userId: { in: [currentUserId, otherUserId] } },
      },
    },
    select: {
      id: true,
      members: { select: { userId: true } },
    },
  });

  if (
    keyedConversation?.members.length === 2 &&
    keyedConversation.members.every(({ userId }) => [currentUserId, otherUserId].includes(userId))
  ) {
    return { success: true, channelId: keyedConversation.id };
  }

  // 1. Try to find an existing direct conversation. The PRIVATE/name branch
  // keeps legacy DMs visible while existing data is migrated forward.
  const channels = await prisma.channel.findMany({
    where: {
      workspaceId,
      OR: [{ type: 'DIRECT' }, { type: 'PRIVATE', name: { startsWith: 'dm-' } }],
      members: {
        every: {
          userId: { in: [currentUserId, otherUserId] }
        }
      }
    },
    include: {
      members: true
    }
  });

  // Filter for exact match of 2 members
  const existingTwosome = channels.find(c => c.members.length === 2);

  if (existingTwosome) {
    if (existingTwosome.type === 'DIRECT' && !existingTwosome.directKey) {
      await prisma.channel.update({
        where: { id: existingTwosome.id },
        data: { directKey: directName },
      });
    }
    return { success: true, channelId: existingTwosome.id };
  }

  // 2. Create new DIRECT channel
  try {
    const channel = await prisma.channel.create({
      data: {
        name: directName,
        type: 'DIRECT',
        directKey: directName,
        workspaceId,
        creatorId: currentUserId,
        members: {
          create: [
            { userId: currentUserId },
            { userId: otherUserId }
          ]
        }
      }
    });
    
    return { success: true, channelId: channel.id };

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const racedChannel = await prisma.channel.findFirst({
        where: {
          workspaceId,
          OR: [{ directKey: directName }, { name: directName }],
        },
        select: { id: true },
      });
      if (racedChannel) return { success: true, channelId: racedChannel.id };
    }
    console.error('Failed to create DM', error);
    return { error: 'Failed to create conversation' };
  }
}

const createGroupDirectMessageSchema = z.object({
  workspaceId: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(2).max(7),
  clientMutationId: z.string().uuid(),
  displayName: z
    .string()
    .trim()
    .max(80)
    .refine((value) => !value.toLowerCase().startsWith('dm-'), 'Group names cannot start with dm-')
    .optional(),
});

const groupDisplayNameSchema = z
  .string()
  .trim()
  .min(1, 'Group name is required')
  .max(80, 'Group name is too long')
  .refine((value) => !value.toLowerCase().startsWith('dm-'), 'Group names cannot start with dm-');

export async function createGroupDirectMessage(
  workspaceId: string,
  participantIds: string[],
  clientMutationId: string,
  displayName?: string,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const currentUserId = session.user.id;

  const validated = createGroupDirectMessageSchema.safeParse({
    workspaceId,
    participantIds: [...new Set(participantIds.filter((id) => id !== currentUserId))],
    clientMutationId,
    displayName,
  });
  if (!validated.success) {
    const displayNameError = validated.error.issues.find((issue) => issue.path[0] === 'displayName');
    const mutationIdError = validated.error.issues.find((issue) => issue.path[0] === 'clientMutationId');
    if (mutationIdError) return { error: 'Invalid group creation request key' };
    return { error: displayNameError?.message || 'Choose at least two other workspace members' };
  }

  const memberIds = [currentUserId, ...validated.data.participantIds];
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId, userId: { in: memberIds } },
    select: { userId: true },
  });
  if (workspaceMembers.length !== memberIds.length) {
    return { error: 'Every participant must belong to this workspace' };
  }

  const creationRequestHash = createHash('sha256')
    .update(JSON.stringify({
      workspaceId,
      creatorId: currentUserId,
      participantIds: [...memberIds].sort(),
      displayName: validated.data.displayName || null,
    }))
    .digest('hex');

  const findCreationResult = async () => {
    const existing = await prisma.channel.findUnique({
      where: { creationMutationId: validated.data.clientMutationId },
      include: {
        members: { select: { userId: true } },
      },
      omit: { creationRequestHash: false },
    });
    if (!existing) return null;
    if (
      existing.workspaceId !== workspaceId ||
      existing.creatorId !== currentUserId ||
      existing.creationRequestHash !== creationRequestHash
    ) {
      return { error: 'Creation key conflicts with a different group request' };
    }
    if (!existing.members.some(({ userId }) => userId === currentUserId)) {
      return { error: 'You are not a member of this conversation' };
    }
    return { success: true as const, channelId: existing.id };
  };

  const existingResult = await findCreationResult();
  if (existingResult) return existingResult;

  try {
    const channel = await prisma.channel.create({
      data: {
        name: validated.data.displayName || `dm-group-${randomUUID()}`,
        type: 'DIRECT',
        creationMutationId: validated.data.clientMutationId,
        creationRequestHash,
        workspaceId,
        creatorId: currentUserId,
        members: {
          create: memberIds.map((userId) => ({ userId })),
        },
      },
      select: { id: true },
    });

    return { success: true, channelId: channel.id };
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      const existingResult = await findCreationResult();
      if (existingResult) return existingResult;
      return { error: 'A conversation with that name already exists' };
    }
    return { error: 'Failed to create group conversation' };
  }
}

export async function renameGroupDirectMessage(channelId: string, displayName: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const currentUserId = session.user.id;

  const validated = groupDisplayNameSchema.safeParse(displayName);
  if (!validated.success) return { error: validated.error.issues[0]?.message || 'Invalid group name' };

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      type: true,
      directKey: true,
      name: true,
      creatorId: true,
      workspaceId: true,
      members: { select: { userId: true } },
    },
  });
  if (!channel) return { error: 'Conversation not found' };
  if (channel.type !== 'DIRECT' || channel.directKey !== null) {
    return { error: 'Only group conversations can be renamed' };
  }
  if (!channel.members.some(({ userId }) => userId === currentUserId)) {
    return { error: 'You are not a member of this conversation' };
  }
  if (channel.creatorId !== currentUserId) {
    return { error: 'Only the group creator can rename this conversation' };
  }
  if (channel.name === validated.data) return { success: true };

  try {
    await prisma.channel.update({ where: { id: channel.id }, data: { name: validated.data } });
    return { success: true };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { error: 'A conversation with that name already exists' };
    }
    return { error: 'Failed to rename group conversation' };
  }
}

export async function leaveDirectMessage(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const currentUserId = session.user.id;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      type: true,
      directKey: true,
      name: true,
      workspaceId: true,
      members: { select: { userId: true } },
    },
  });
  if (!channel) return { error: 'Conversation not found' };
  if (!channel.members.some(({ userId }) => userId === currentUserId)) {
    return { error: 'You are not a member of this conversation' };
  }
  if (channel.type !== 'DIRECT' || channel.directKey !== null) {
    return { error: 'One-to-one conversations cannot be left' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.channelMember.delete({
      where: { channelId_userId: { channelId: channel.id, userId: currentUserId } },
    });
    await tx.message.create({
      data: {
        channelId: channel.id,
        userId: currentUserId,
        type: 'SYSTEM',
        content: messageHtmlToText('left the group conversation'),
      },
    });
  });

  return { success: true };
}
