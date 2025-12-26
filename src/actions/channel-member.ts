'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { User } from '@prisma/client';

export async function getChannelMembers(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true },
  });

  if (!channel) return [];

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

  return members.map((m) => ({
    ...m,
    user: {
      ...m.user,
      role: m.user.memberships[0]?.role || 'MEMBER',
    },
  }));
}

export async function getChannelMemberCount(channelId: string) {
  const count = await prisma.channelMember.count({
    where: { channelId },
  });
  return count;
}

export async function addChannelMember(channelId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const currentUserId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.channelMember.create({
        data: {
          channelId,
          userId,
        },
      });

      const addedUser = await tx.user.findUnique({ where: { id: userId } });

      await tx.message.create({
        data: {
          content: `added ${addedUser?.name || 'someone'} to the channel`,
          type: 'SYSTEM',
          channelId,
          userId: currentUserId,
        },
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: 'User already in channel' };
    }
    return { error: 'Failed to add member' };
  }
}

export async function removeChannelMember(channelId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const currentUserId = session.user.id;

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

    await prisma.$transaction(async (tx) => {
      await tx.channelMember.deleteMany({
        where: {
          channelId,
          userId,
        },
      });

      await tx.message.create({
        data: {
          content: `removed ${removedUser?.name || 'someone'} from the channel`,
          type: 'SYSTEM',
          channelId,
          userId: currentUserId,
        },
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to remove member' };
  }
}

export async function leaveChannel(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.channelMember.deleteMany({
        where: {
          channelId,
          userId: userId,
        },
      });

      await tx.message.create({
        data: {
          content: 'left the channel',
          type: 'SYSTEM',
          channelId,
          userId: userId,
        },
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to leave channel' };
  }
}

export async function joinChannel(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const userId = session.user.id;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (channel?.isArchived) {
    return { error: 'Cannot join an archived channel' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.channelMember.create({
        data: {
          channelId,
          userId: userId,
        },
      });

      await tx.message.create({
        data: {
          content: 'joined the channel',
          type: 'SYSTEM',
          channelId,
          userId: userId,
        },
      });
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') {
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

  return (workspaceMembers as any).map((m: any) => m.user);
}

export async function markChannelAsRead(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  await prisma.channelMember.update({
    where: {
      channelId_userId: {
        channelId,
        userId: session.user.id,
      },
    },
    data: {
      lastViewedAt: new Date(),
    },
  });

  revalidatePath('/'); // Revalidate everything to update sidebar counts
  return { success: true };
}
