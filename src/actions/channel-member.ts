'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from './notification';
import { NotificationType } from '@prisma/client';
import { messageHtmlToText } from '@/lib/message-html';

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function getChannelMembers(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true, members: { where: { userId: session.user.id }, select: { id: true } } },
  });

  if (!channel || channel.members.length === 0) return [];

  const members = await prisma.channelMember.findMany({
    where: { channelId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          image: true,
          memberships: {
            where: { workspaceId: channel.workspaceId },
            select: { role: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return members.map((m: (typeof members)[number]) => ({
    ...m,
    user: {
      ...m.user,
      role: m.user.memberships[0]?.role || 'MEMBER',
    },
  }));
}

export async function getChannelMemberCount(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId: session.user.id } },
    select: { id: true },
  });
  if (!member) return 0;

  const count = await prisma.channelMember.count({
    where: { channelId },
  });
  return count;
}

export async function addChannelMember(channelId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const currentUserId = session.user.id;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true, creatorId: true, members: { where: { userId: currentUserId }, select: { id: true } } },
  });
  if (!channel) return { error: 'Channel not found' };

  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: channel.workspaceId, userId: currentUserId } },
    select: { role: true },
  });
  if (!workspaceMember) return { error: 'Not a member of this workspace' };
  const canManage =
    channel.members.length > 0 ||
    channel.creatorId === currentUserId ||
    workspaceMember.role === 'ADMIN' ||
    workspaceMember.role === 'OWNER';
  if (!canManage) return { error: 'Only channel members or workspace admins can add members' };

  const targetWorkspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: channel.workspaceId, userId } },
    select: { id: true },
  });
  if (!targetWorkspaceMember) return { error: 'User is not a member of this workspace' };

  try {
    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.channelMember.create({
        data: {
          channelId,
          userId,
        },
      });

      const addedUser = await tx.user.findUnique({ where: { id: userId } });

      await tx.message.create({
        data: {
          content: messageHtmlToText(`added ${addedUser?.name || 'someone'} to the channel`),
          type: 'SYSTEM',
          channelId,
          userId: currentUserId,
        },
      });
    });



    await createNotification({
      userId,
      actorId: currentUserId,
      type: NotificationType.CHANNEL_ADD,
      resourceId: channelId,
      resourceType: 'channel',
    });

    return { success: true };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { error: 'User already in channel' };
    }
    return { error: 'Failed to add member' };
  }
}

export async function removeChannelMember(channelId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const currentUserId = session.user.id;

  const channelAccess = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      workspaceId: true,
      creatorId: true,
      members: { where: { userId: currentUserId }, select: { id: true } },
    },
  });
  if (!channelAccess) return { error: 'Channel not found' };
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: channelAccess.workspaceId, userId: currentUserId } },
    select: { role: true },
  });
  if (!workspaceMember) return { error: 'Not a member of this workspace' };
  const canManage =
    channelAccess.creatorId === currentUserId ||
    workspaceMember.role === 'ADMIN' ||
    workspaceMember.role === 'OWNER';
  if (!canManage) return { error: 'Only channel creator or workspace admins can remove members' };

  try {
    const [removedUser, channel] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.channel.findUnique({
        where: { id: channelId },
        select: { creatorId: true },
      }),
    ]);

    if (userId === channel?.creatorId) {
      return { error: 'Cannot remove the channel creator' };
    }

    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.channelMember.deleteMany({
        where: {
          channelId,
          userId,
        },
      });

      await tx.message.create({
        data: {
          content: messageHtmlToText(`removed ${removedUser?.name || 'someone'} from the channel`),
          type: 'SYSTEM',
          channelId,
          userId: currentUserId,
        },
      });
    });

    return { success: true };
  } catch {
    return { error: 'Failed to remove member' };
  }
}

export async function leaveChannel(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.channelMember.deleteMany({
        where: {
          channelId,
          userId: userId,
        },
      });

      await tx.message.create({
        data: {
          content: messageHtmlToText('left the channel'),
          type: 'SYSTEM',
          channelId,
          userId: userId,
        },
      });
    });

    return { success: true };
  } catch {
    return { error: 'Failed to leave channel' };
  }
}

export async function joinChannel(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const userId = session.user.id;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, workspaceId: true, type: true, isArchived: true },
  });

  if (!channel) return { error: 'Channel not found' };
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: channel.workspaceId, userId } },
    select: { id: true },
  });
  if (!workspaceMember) return { error: 'Not a member of this workspace' };
  if (channel.type !== 'PUBLIC') return { error: 'Private channels require an invitation' };

  if (channel.isArchived) {
    return { error: 'Cannot join an archived channel' };
  }

  try {
    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.channelMember.create({
        data: {
          channelId,
          userId: userId,
        },
      });

      await tx.message.create({
        data: {
          content: messageHtmlToText('joined the channel'),
          type: 'SYSTEM',
          channelId,
          userId: userId,
        },
      });
    });

    return { success: true };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { error: 'Already in channel' };
    }
    return { error: 'Failed to join channel' };
  }
}

export async function getWorkspaceMembersNotInChannel(
  workspaceId: string,
  channelId: string
): Promise<
  {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    image: string | null;
  }[]
> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const requester = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    select: { id: true },
  });
  if (!requester) return [];

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true },
  });
  if (!channel || channel.workspaceId !== workspaceId) return [];

  // Get all workspace members who are NOT in this channel
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      NOT: {
        user: {
          channelMemberships: {
            some: { channelId },
          },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          image: true,
        },
      },
    },
  });

  return workspaceMembers.map((member) => member.user);
}

export async function markChannelAsRead(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const result = await prisma.channelMember.updateMany({
    where: { channelId, userId: session.user.id },
    data: { lastViewedAt: new Date() },
  });
  if (result.count === 0) return { error: 'You are not a member of this channel' };

  return { success: true };
}
