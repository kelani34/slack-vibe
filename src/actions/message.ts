'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createNotification } from './notification';
import { NotificationType } from '@prisma/client';

const sendMessageSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  content: z.string().optional(),
  parentId: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(), // ISO date string
  attachments: z
    .array(
      z.object({
        url: z.string(),
        name: z.string(),
        type: z.string(),
        size: z.number(),
      })
    )
    .optional(),
});

export async function sendMessage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    console.error('sendMessage: No session or user id');
    return { error: 'Unauthorized' };
  }

  const channelId = formData.get('channelId') as string;
  const content = formData.get('content') as string;
  const parentIdRaw = formData.get('parentId');
  const parentId = parentIdRaw ? String(parentIdRaw) : null;
  const scheduledAtRaw = formData.get('scheduledAt') as string | null;

  const attachmentsJson = formData.get('attachments') as string | null;
  let attachments;
  try {
    attachments = attachmentsJson ? JSON.parse(attachmentsJson) : undefined;
    if (Array.isArray(attachments) && attachments.length === 0) {
      attachments = undefined;
    }
  } catch (e) {
    attachments = undefined;
  }

  const validated = sendMessageSchema.safeParse({
    content: content || undefined,
    channelId,
    parentId,
    scheduledAt: scheduledAtRaw,
    attachments,
  });

  if (!validated.success) {
    console.error('Validation error:', validated.error.issues);
    return { error: validated.error.issues[0]?.message || 'Invalid data' };
  }

  if (
    !validated.data.content &&
    (!validated.data.attachments || validated.data.attachments.length === 0)
  ) {
    console.error('sendMessage: Empty content');
    return { error: 'Message cannot be empty' };
  }

  try {
    const messageData: any = {
      content: validated.data.content || '',
      channelId: validated.data.channelId,
      userId: session.user.id,
      parentId: validated.data.parentId || null,
      scheduledAt: validated.data.scheduledAt
        ? new Date(validated.data.scheduledAt)
        : null,
    };

    // Only add attachments if they exist
    if (validated.data.attachments && validated.data.attachments.length > 0) {
      messageData.attachments = {
        create: validated.data.attachments,
      };
    }

    // Check posting permissions
    const channel = await prisma.channel.findUnique({
      where: { id: validated.data.channelId },
      select: {
        creatorId: true,
        postingPermission: true,
        workspaceId: true,
        isArchived: true,
      },
    });

    if (!channel) return { error: 'Channel not found' };

    if (channel.isArchived) {
      return { error: 'Channel is archived' };
    }

    // Only enforce permissions for main channel messages (not replies)
    if (!validated.data.parentId) {
      if (channel.postingPermission === 'OWNER_ONLY') {
        const isCreator = channel.creatorId === session.user.id;
        if (!isCreator) {
          const member = await prisma.workspaceMember.findUnique({
            where: {
              workspaceId_userId: {
                workspaceId: channel.workspaceId,
                userId: session.user.id,
              },
            },
            select: { role: true },
          });

          if (member?.role !== 'OWNER') {
            return { error: 'Only the owner can post in this channel' };
          }
        }
      } else if (channel.postingPermission === 'ADMIN_ONLY') {
        const member = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: channel.workspaceId,
              userId: session.user.id,
            },
          },
          select: { role: true },
        });

        if (member?.role !== 'OWNER' && member?.role !== 'ADMIN') {
          return { error: 'Only admins can post in this channel' };
        }
      }
    }

    const message = await prisma.message.create({
      data: messageData,
      include: {
        user: true,
        attachments: true,
      },
    });



    // Notify mentioned users
    if (validated.data.content) {
      const mentionMatches = validated.data.content.matchAll(/data-type="mention" data-id="([^"]+)"/g);
      const mentionedUserIds = new Set<string>();
      for (const match of mentionMatches) {
        mentionedUserIds.add(match[1]);
      }

      for (const mentionedUserId of mentionedUserIds) {
        if (mentionedUserId !== session.user.id) {
          await createNotification({
            userId: mentionedUserId,
            actorId: session.user.id,
            type: NotificationType.MENTION,
            resourceId: message.id,
            resourceType: 'message',
          });
        }
      }
    }

    // Notify thread participants if reply
    if (validated.data.parentId) {
      // 1. Get thread parent author
      const parentMessage = await prisma.message.findUnique({
        where: { id: validated.data.parentId },
        select: { userId: true },
      });

      // 2. Get all other participants in the thread
      const threadMessages = await prisma.message.findMany({
        where: { parentId: validated.data.parentId },
        select: { userId: true },
        distinct: ['userId'],
      });

      // 3. Collect unique user IDs to notify
      const recipients = new Set<string>();

      // Add parent author
      if (parentMessage) recipients.add(parentMessage.userId);

      // Add other participants
      threadMessages.forEach((msg) => recipients.add(msg.userId));

      // Remove current user (sender)
      recipients.delete(session.user.id);

      // Remove already mentioned users (they got MENTION notification)
      // Note: mentionedUserIds is defined in the previous block if validated.data.content exists.
      // We need to access it. It seems I need to widen the scope or ensure I can access it.
      // Looking at the file, mentionedUserIds is defined inside `if (validated.data.content)`.
      // I should duplicate the set logic or move the variable up if I want to be perfectly clean, 
      // but for now, let's assume I can't access it easily without refactoring the previous block.
      // Actually, looking at the code structure provided in view_file, `mentionedUserIds` is scoped to the `if`.
      // I will just re-extract mentions or just notify them as REPLY as well?
      // "Subscribed to thread" is usually a separate reason. 
      // Slack usually doesn't double notify for Mention + Thread.
      // Let's re-parse mentions to be safe or just accept double notification risk?
      // Better: Re-parse is cheap.
      
      const mentionedIds = new Set<string>();
       if (validated.data.content) {
        const mentionMatches = validated.data.content.matchAll(/data-type="mention" data-id="([^"]+)"/g);
        for (const match of mentionMatches) {
          mentionedIds.add(match[1]);
        }
      }
      
      // Remove mentioned users from reply recipients
      mentionedIds.forEach(id => recipients.delete(id));

      // 4. Send notifications
      for (const recipientId of recipients) {
         await createNotification({
            userId: recipientId,
            actorId: session.user.id,
            type: NotificationType.REPLY,
            resourceId: message.id,
            resourceType: 'message',
         });
      }
    }

    revalidatePath(`/`);

    if (validated.data.scheduledAt) {
      return { success: true, scheduled: true, message };
    }

    return { success: true, message };
  } catch (error) {
    console.error('sendMessage error:', error);
    return { error: 'Failed to send message' };
  }
}

export async function getMessages(channelId: string, cursor?: string) {
  const session = await auth();
  if (!session?.user) {
    return [];
  }

  // Only get messages that are NOT scheduled for the future
  try {
    const messages = await prisma.message.findMany({
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where: {
        channelId,
        parentId: null,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
      include: {
        channel: {
          select: {
            workspaceId: true,
          },
        },
        user: true,
        attachments: true,
        reactions: true,
        replies: {
          select: {
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          distinct: ['userId'],
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return messages.reverse();
  } catch (error) {
    console.error('getMessages error:', error);
    return [];
  }
}

export async function getScheduledMessages(
  channelId: string,
  parentId?: string
) {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Get scheduled messages for this user in this channel (and optionally thread)
  const messages = await prisma.message.findMany({
    where: {
      channelId,
      userId: session.user.id,
      parentId: parentId || null, // null for channel, parentId for threads
      scheduledAt: { gt: new Date() },
    },
    include: {
      user: true,
      attachments: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return messages;
}

export async function cancelScheduledMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) return { error: 'Message not found' };
  if (message.userId !== session.user.id) return { error: 'Unauthorized' };
  if (!message.scheduledAt || message.scheduledAt <= new Date()) {
    return { error: 'Message already sent' };
  }

  await prisma.message.delete({ where: { id: messageId } });
  revalidatePath(`/`);
  return { success: true };
}

export async function getMessageById(messageId: string) {
  const session = await auth();
  if (!session?.user) return null;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      user: true,
      attachments: true,
      reactions: true,
    },
  });

  return message;
}

export async function getThreadMessages(parentId: string) {
  const session = await auth();
  if (!session?.user) return [];

  const messages = await prisma.message.findMany({
    where: { parentId },
    include: {
      user: true,
      attachments: true,
      reactions: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return messages;
}

// Edit a message (only allowed within 30 minutes of creation)
export async function editMessage(messageId: string, newContent: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) return { error: 'Message not found' };
  if (message.userId !== session.user.id) return { error: 'Not your message' };

  // Check if within 30 minutes
  const createdAt = new Date(message.createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

  if (diffMinutes > 30) {
    return { error: 'Can only edit messages within 30 minutes of sending' };
  }

  await prisma.message.update({
    where: { id: messageId },
    data: {
      content: newContent,
      isEdited: true,
    },
  });

  revalidatePath('/');
  return { success: true };
}

// Delete a message (soft delete)
export async function deleteMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      channel: true,
    },
  });

  if (!message) return { error: 'Message not found' };

  const isAuthor = message.userId === session.user.id;

  if (!isAuthor) {
    // Check if user is admin/owner
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: message.channel.workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      return { error: 'Not authorized to delete this message' };
    }
  }

  await prisma.message.delete({
    where: { id: messageId },
  });

  revalidatePath('/');
  return { success: true };
}
