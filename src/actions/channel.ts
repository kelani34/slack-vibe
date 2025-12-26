'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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
        type: validated.data.type as any,
        workspaceId: validated.data.workspaceId,
        creatorId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
          },
        },
      },
    });

    revalidatePath(`/${validated.data.workspaceId}`);
    return { success: true, channel };
  } catch (error: any) {
    if (error.code === 'P2002') {
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

  // Explicitly cast to any to avoid type errors with 'members' if generated definition is stale
  const channels = await prisma.channel.findMany({
    where: {
      workspaceId,
      isArchived: false, // Exclude archived channels from sidebar
      members: {
        some: {
          userId,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      members: {
        where: { userId },
        select: { lastViewedAt: true },
      },
    },
  });

  // Calculate unread counts
  const channelsWithCounts = await Promise.all(
    (channels as any[]).map(async (channel) => {
      const lastViewedAt = channel.members[0]?.lastViewedAt || new Date(); // Default to now if not found (assume read)

      const unreadCount = await prisma.message.count({
        where: {
          channelId: channel.id,
          createdAt: { gt: lastViewedAt },
          userId: { not: userId }, // Don't count own messages as unread
        },
      });

      // Clean up the members array from the result we return to client
      const { members, ...rest } = channel;
      return {
        ...rest,
        lastViewedAt,
        unreadCount,
      };
    })
  );

  return channelsWithCounts;
}

// Get ALL channels in workspace (for browse page)
export async function getAllChannels(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

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

  await prisma.channel.delete({ where: { id: channelId } });
  revalidatePath(`/`);
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
          content: msg,
          channelId,
          userId: userId,
          type: 'SYSTEM',
        },
      });
    }
  });

  revalidatePath(`/`);
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
        content: 'left the channel',
        type: 'SYSTEM',
        channelId,
        userId,
      },
    });
  });

  revalidatePath(`/`);
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
