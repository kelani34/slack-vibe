'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notification';
import { NotificationType } from '@prisma/client';

// Toggle reaction on a message
export async function toggleReaction(messageId: string, emoji: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      const reaction = await prisma.reaction.create({
        data: {
          messageId,
          userId: session.user.id,
          emoji,
        },
        include: {
          message: {
            select: { userId: true },
          },
        },
      });

      if (reaction.message.userId !== session.user.id) {
        await createNotification({
          userId: reaction.message.userId,
          actorId: session.user.id,
          type: NotificationType.REACTION,
          resourceId: messageId,
          resourceType: 'message',
        });
      }
    }

    return { success: true };
  } catch (error) {
    return { error: 'Failed to toggle reaction' };
  }
}

// Bookmark a message
export async function bookmarkMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await prisma.bookmarkedMessage.create({
      data: {
        userId: session.user.id,
        messageId,
      },
    });
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: 'Already bookmarked' };
    }
    return { error: 'Failed to bookmark message' };
  }
}

// Remove bookmark from a message
export async function unbookmarkMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await prisma.bookmarkedMessage.delete({
      where: {
        userId_messageId: {
          userId: session.user.id,
          messageId,
        },
      },
    });
    return { success: true };
  } catch (error) {
    return { error: 'Failed to remove bookmark' };
  }
}

// Check if a message is bookmarked
export async function isMessageBookmarked(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) return false;

  const bookmark = await prisma.bookmarkedMessage.findUnique({
    where: {
      userId_messageId: {
        userId: session.user.id,
        messageId,
      },
    },
  });

  return !!bookmark;
}

// Get all bookmarked messages for user
export async function getBookmarkedMessages() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const bookmarks = await prisma.bookmarkedMessage.findMany({
    where: { userId: session.user.id },
    include: {
      message: {
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          channel: {
            select: { id: true, name: true, workspaceId: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return bookmarks;
}

// Pin a message to channel
export async function pinMessage(messageId: string, channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await prisma.$transaction([
      prisma.pinnedMessage.create({
        data: {
          channelId,
          messageId,
          pinnedBy: session.user.id,
        },
      }),
      prisma.message.update({
        where: { id: messageId },
        data: { isPinned: true },
      }),
    ]);

    // Notify message author about the pin
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { userId: true },
    });

    if (message && message.userId !== session.user.id) {
      await createNotification({
        userId: message.userId,
        actorId: session.user.id,
        type: NotificationType.PIN,
        resourceId: messageId,
        resourceType: 'message',
      });
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: 'Already pinned' };
    }
    return { error: 'Failed to pin message' };
  }
}

// Unpin a message from channel
export async function unpinMessage(messageId: string, channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await prisma.$transaction([
      prisma.pinnedMessage.delete({
        where: {
          channelId_messageId: {
            channelId,
            messageId,
          },
        },
      }),
      prisma.message.update({
        where: { id: messageId },
        data: { isPinned: false },
      }),
    ]);

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to unpin message' };
  }
}

// Get pinned messages for a channel
export async function getPinnedMessages(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const pinned = await prisma.pinnedMessage.findMany({
    where: { channelId },
    include: {
      message: {
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return pinned;
}

// Forward a message to another channel
export async function forwardMessage(
  messageId: string,
  targetChannelId: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    // Get original message
    const original = await prisma.message.findUnique({
      where: { id: messageId },
      include: { user: true },
    });

    if (!original) return { error: 'Message not found' };

    // Create forwarded message with attribution
    const forwardedContent = `<p><em>Forwarded from @${original.user.name}</em></p>${original.content}`;

    await prisma.message.create({
      data: {
        channelId: targetChannelId,
        userId: session.user.id,
        content: forwardedContent,
      },
    });

    return { success: true };
  } catch (error) {
    return { error: 'Failed to forward message' };
  }
}

// Get user's bookmarked message IDs for a channel (for styling)
export async function getBookmarkedMessageIds(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const bookmarks = await prisma.bookmarkedMessage.findMany({
    where: {
      userId: session.user.id,
      message: { channelId },
    },
    select: { messageId: true },
  });

  return bookmarks.map((b) => b.messageId);
}
