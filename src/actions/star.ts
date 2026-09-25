'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function toggleStarChannel(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId: session.user.id } },
    select: { id: true },
  });
  if (!member) return { error: 'You are not a member of this channel' };

  // Check if already starred
  const existing = await prisma.starredChannel.findUnique({
    where: {
      userId_channelId: {
        userId: session.user.id,
        channelId,
      },
    },
  });

  if (existing) {
    // Unstar
    await prisma.starredChannel.delete({
      where: { id: existing.id },
    });
    return { success: true, starred: false };
  } else {
    // Star
    await prisma.starredChannel.create({
      data: {
        userId: session.user.id,
        channelId,
      },
    });
    return { success: true, starred: true };
  }
}

export async function isChannelStarred(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return false;

  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId: session.user.id } },
    select: { id: true },
  });
  if (!member) return false;

  const starred = await prisma.starredChannel.findUnique({
    where: {
      userId_channelId: {
        userId: session.user.id,
        channelId,
      },
    },
  });

  return !!starred;
}

export async function getStarredChannels(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Only return starred channels that user is also a member of
  const starred = await prisma.starredChannel.findMany({
    where: {
      userId: session.user.id,
      channel: {
        workspaceId,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    include: {
      channel: true,
    },
  });

  return starred.map((s) => s.channel);
}
