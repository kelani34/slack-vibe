'use server';

import { createHash } from 'node:crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createNotification } from './notification';
import { NotificationType, Prisma } from '@prisma/client';
import { sanitizeMessageHtml } from '@/lib/message-html';
import { parseSearchQuery } from '@/lib/search-query';

const sendMessageSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  content: z.string().optional(),
  parentId: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(), // ISO date string
  clientMutationId: z.string().uuid(),
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

async function sanitizeChannelMessageHtml(channelId: string, content: string) {
  const candidate = sanitizeMessageHtml(content);
  const mentionIds = Array.from(
    new Set(
      Array.from(candidate.matchAll(/data-type="mention" data-id="([^"]+)"/g), ([, id]) => id),
    ),
  );
  if (mentionIds.length === 0) return candidate;

  const channelMembers = await prisma.channelMember.findMany({
    where: { channelId, userId: { in: mentionIds } },
    select: { userId: true },
  });
  return sanitizeMessageHtml(content, new Set(channelMembers.map(({ userId }) => userId)));
}

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
  const clientMutationId = formData.get('clientMutationId') || undefined;

  const attachmentsJson = formData.get('attachments') as string | null;
  let attachments;
  try {
    attachments = attachmentsJson ? JSON.parse(attachmentsJson) : undefined;
    if (Array.isArray(attachments) && attachments.length === 0) {
      attachments = undefined;
    }
  } catch {
    attachments = undefined;
  }

  const validated = sendMessageSchema.safeParse({
    content: content || undefined,
    channelId,
    parentId,
    scheduledAt: scheduledAtRaw,
    clientMutationId,
    attachments,
  });

  if (!validated.success) {
    console.error('Validation error:', validated.error.issues);
    return { error: validated.error.issues[0]?.message || 'Invalid data' };
  }

  let safeContent = sanitizeMessageHtml(validated.data.content || '');
  if (
    !safeContent.trim() &&
    (!validated.data.attachments || validated.data.attachments.length === 0)
  ) {
    console.error('sendMessage: Empty content');
    return { error: 'Message cannot be empty' };
  }

  const requestHash = createHash('sha256')
    .update(
      JSON.stringify({
        channelId: validated.data.channelId,
        userId: session.user.id,
        parentId: validated.data.parentId || null,
        scheduledAt: validated.data.scheduledAt || null,
        content: safeContent,
        attachments: validated.data.attachments || [],
      }),
    )
    .digest('hex');

  try {
    const messageData: Prisma.MessageUncheckedCreateInput = {
      content: safeContent,
      channelId: validated.data.channelId,
      userId: session.user.id,
      parentId: validated.data.parentId || null,
      scheduledAt: validated.data.scheduledAt
        ? new Date(validated.data.scheduledAt)
        : null,
      clientMutationId: validated.data.clientMutationId,
      requestHash,
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
        id: true,
        creatorId: true,
        postingPermission: true,
        workspaceId: true,
        isArchived: true,
      },
    });

    if (!channel) return { error: 'Channel not found' };

    const membership = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: channel.id, userId: session.user.id } },
      select: { userId: true },
    });
    if (!membership) return { error: 'Not a member of this channel' };

    const existing = await prisma.message.findUnique({
      where: {
        userId_clientMutationId: {
          userId: session.user.id,
          clientMutationId: validated.data.clientMutationId,
        },
      },
      include: { user: true, attachments: true },
      omit: { requestHash: false },
    });
    if (existing) {
      const { requestHash: existingRequestHash, ...message } = existing;
      if (existingRequestHash !== requestHash) {
        return { error: 'This send key was already used for another message' };
      }
      return validated.data.scheduledAt
        ? { success: true, scheduled: true, message }
        : { success: true, message };
    }

    safeContent = await sanitizeChannelMessageHtml(
      channel.id,
      validated.data.content || '',
    );
    messageData.content = safeContent;

    if (validated.data.parentId) {
      const parent = await prisma.message.findUnique({
        where: { id: validated.data.parentId },
        select: { channelId: true, scheduledAt: true },
      });
      if (!parent || parent.channelId !== channel.id) {
        return { error: 'Parent message not found in this channel' };
      }
      if (parent.scheduledAt && parent.scheduledAt > new Date()) {
        return { error: 'Cannot reply to a scheduled message' };
      }
    }

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
      } else if (channel.postingPermission === 'SELECTED_MEMBERS') {
        const allowed = await prisma.channelPostingAllowedMember.findUnique({
          where: { channelId_userId: { channelId: channel.id, userId: session.user.id } },
          select: { userId: true },
        });
        if (!allowed) return { error: 'You cannot post in this channel' };
      }
    }

    let message;
    try {
      message = await prisma.message.create({
        data: messageData,
        include: { user: true, attachments: true },
        omit: { requestHash: true },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      const existing = await prisma.message.findUnique({
        where: {
          userId_clientMutationId: {
            userId: session.user.id,
            clientMutationId: validated.data.clientMutationId,
          },
        },
        include: { user: true, attachments: true },
        omit: { requestHash: false },
      });
      if (!existing) throw error;

      const { requestHash: existingRequestHash, ...canonicalMessage } = existing;
      if (existingRequestHash !== requestHash) {
        return { error: 'This send key was already used for another message' };
      }
      return validated.data.scheduledAt
        ? { success: true, scheduled: true, message: canonicalMessage }
        : { success: true, message: canonicalMessage };
    }



    // Notify mentioned users
    if (safeContent) {
      const mentionMatches = safeContent.matchAll(/data-type="mention" data-id="([^"]+)"/g);
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

  // Get users hidden by current user
  const hiddenUsers = await prisma.hiddenUser.findMany({
    where: { userId: session.user.id },
    select: { hiddenUserId: true },
  });
  const hiddenUserIds = hiddenUsers.map(h => h.hiddenUserId);

  // Only get messages that are NOT scheduled for the future AND not from hidden users
  try {
    const messages = await prisma.message.findMany({
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where: {
        channelId,
        channel: { members: { some: { userId: session.user.id } } },
        parentId: null,
        userId: { notIn: hiddenUserIds },
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
  workspaceId: string,
  parentId?: string,
) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const [workspaceMember, channelMember] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: session.user.id },
      },
      select: { id: true },
    }),
    prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
        members: { some: { userId: session.user.id } },
      },
      select: { id: true },
    }),
  ]);
  if (!workspaceMember || !channelMember) return [];

  return prisma.message.findMany({
    where: {
      channelId,
      userId: session.user.id,
      parentId: parentId || null, // null for channel, parentId for threads
      scheduledAt: { gt: new Date() },
    },
    select: {
      id: true,
      channelId: true,
      content: true,
      parentId: true,
      scheduledAt: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function cancelScheduledMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) return { error: 'Message not found' };
  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: message.channelId, userId: session.user.id } },
    select: { id: true },
  });
  if (!member) return { error: 'Not a member of this channel' };
  if (message.userId !== session.user.id) return { error: 'Unauthorized' };
  if (!message.scheduledAt || message.scheduledAt <= new Date()) {
    return { error: 'Message already sent' };
  }

  await prisma.message.delete({ where: { id: messageId } });
  return { success: true };
}

export async function updateScheduledMessage(
  messageId: string,
  content: string,
  scheduledAt: Date
) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  if (!sanitizeMessageHtml(content).trim()) return { error: 'Message cannot be empty' };
  if (scheduledAt <= new Date()) return { error: 'Schedule time must be in the future' };

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return { error: 'Message not found' };
  if (message.userId !== session.user.id) return { error: 'Unauthorized' };
  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: message.channelId, userId: session.user.id } },
    select: { id: true },
  });
  if (!member) return { error: 'Not a member of this channel' };
  if (!message.scheduledAt || message.scheduledAt <= new Date()) return { error: 'Message already sent' };

  const safeContent = await sanitizeChannelMessageHtml(message.channelId, content);
  if (!safeContent.trim()) return { error: 'Message cannot be empty' };

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: safeContent, scheduledAt },
  });
  return { success: true, message: updated };
}

export async function sendScheduledMessageNow(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return { error: 'Message not found' };
  if (message.userId !== session.user.id) return { error: 'Unauthorized' };
  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: message.channelId, userId: session.user.id } },
    select: { id: true },
  });
  if (!member) return { error: 'Not a member of this channel' };
  if (!message.scheduledAt || message.scheduledAt <= new Date()) return { error: 'Message already sent' };

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { scheduledAt: null },
  });
  return { success: true, message: updated };
}

export async function getMessageById(messageId: string) {
  const session = await auth();
  if (!session?.user) return null;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      channel: {
        select: {
          members: {
            where: { userId: session.user.id },
            select: { userId: true },
          },
        },
      },
      user: true,
      attachments: true,
      reactions: true,
    },
  });

  if (!message || message.channel.members.length === 0) return null;
  const { channel, ...visibleMessage } = message;
  void channel;
  return visibleMessage;
}

const messageContextInclude = {
  user: { select: { id: true, name: true, avatarUrl: true } },
  attachments: true,
  reactions: true,
  replies: {
    select: {
      content: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    distinct: ['userId'],
  },
  _count: { select: { replies: true } },
} satisfies Prisma.MessageInclude;

type MessageContextMessage = Prisma.MessageGetPayload<{
  include: typeof messageContextInclude;
}>;

export async function getMessageContext(messageId: string, channelId: string): Promise<{
  targetMessageId: string;
  threadId: string | null;
  messages: MessageContextMessage[];
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const hiddenUsers = await prisma.hiddenUser.findMany({
    where: { userId: session.user.id },
    select: { hiddenUserId: true },
  });
  const publishedContext: Prisma.MessageWhereInput = {
    channelId,
    isDeleted: false,
    userId: { notIn: hiddenUsers.map(({ hiddenUserId }) => hiddenUserId) },
    channel: { members: { some: { userId: session.user.id } } },
    OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
  };

  try {
    const target = await prisma.message.findFirst({
      where: { ...publishedContext, id: messageId },
      select: { id: true, channelId: true, parentId: true, createdAt: true },
    });
    if (!target) return null;

    const root = target.parentId
      ? await prisma.message.findFirst({
          where: { ...publishedContext, id: target.parentId, parentId: null },
          select: { id: true, channelId: true, createdAt: true },
        })
      : target;
    if (!root) return null;

    const beforeBoundary: Prisma.MessageWhereInput = {
      OR: [
        { createdAt: { lt: root.createdAt } },
        { createdAt: root.createdAt, id: { lt: root.id } },
      ],
    };
    const afterBoundary: Prisma.MessageWhereInput = {
      OR: [
        { createdAt: { gt: root.createdAt } },
        { createdAt: root.createdAt, id: { gt: root.id } },
      ],
    };
    const [before, anchor, after] = await Promise.all([
      prisma.message.findMany({
        where: { ...publishedContext, parentId: null, AND: [beforeBoundary] },
        include: messageContextInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 24,
      }),
      prisma.message.findFirst({
        where: { ...publishedContext, id: root.id, parentId: null },
        include: messageContextInclude,
      }),
      prisma.message.findMany({
        where: { ...publishedContext, parentId: null, AND: [afterBoundary] },
        include: messageContextInclude,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 25,
      }),
    ]);
    if (!anchor) return null;

    return {
      targetMessageId: target.id,
      threadId: target.parentId,
      messages: [...before.reverse(), anchor, ...after],
    };
  } catch (error) {
    console.error('getMessageContext error:', error);
    throw new Error('Unable to load message context');
  }
}

export async function getThreadMessages(parentId: string) {
  const session = await auth();
  if (!session?.user) return [];

  // Get users hidden by current user
  const hiddenUsers = await prisma.hiddenUser.findMany({
    where: { userId: session.user.id },
    select: { hiddenUserId: true },
  });
  const hiddenUserIds = hiddenUsers.map(h => h.hiddenUserId);

  const messages = await prisma.message.findMany({
    where: { 
      parentId,
      channel: { members: { some: { userId: session.user.id } } },
      userId: { notIn: hiddenUserIds },
    },
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

  const channelMember = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: message.channelId, userId: session.user.id } },
    select: { id: true },
  });
  if (!channelMember) return { error: 'Not a member of this channel' };
  if (message.userId !== session.user.id) return { error: 'Not your message' };

  const safeContent = await sanitizeChannelMessageHtml(message.channelId, newContent);
  if (!safeContent.trim()) return { error: 'Message cannot be empty' };

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
      content: safeContent,
      isEdited: true,
    },
  });

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

  const channelMember = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: message.channelId, userId: session.user.id } },
    select: { id: true },
  });
  if (!channelMember) return { error: 'Not a member of this channel' };

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

  return { success: true };
}

export async function getBookmarkedMessages(workspaceSlug: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Find workspace ID first
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  });

  if (!workspace) return [];

  // Get users hidden by current user
  const hiddenUsers = await prisma.hiddenUser.findMany({
    where: { userId: session.user.id },
    select: { hiddenUserId: true },
  });
  const hiddenUserIds = hiddenUsers.map(h => h.hiddenUserId);

  const bookmarks = await prisma.bookmarkedMessage.findMany({
    where: {
      userId: session.user.id,
      message: {
        channel: {
          workspaceId: workspace.id,
          members: { some: { userId: session.user.id } },
        },
        userId: { notIn: hiddenUserIds },
      },
    },
    include: {
      message: {
        include: {
          user: true,
          channel: true,
          attachments: true,
          reactions: true,
          _count: {
             select: { replies: true }
          }
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return bookmarks.map(b => b.message);
}

type SearchCursor = {
  createdAt: string;
  id: string;
  queryHash: string;
};

type SearchResult = {
  id: string;
  channelId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  user: { name: string | null };
  channel: { name: string };
};

export type SearchMessagePage = {
  items: SearchResult[];
  nextCursor: string | null;
  error?: string;
};

const SEARCH_PAGE_SIZE = 20;
const searchCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
  queryHash: z.string().regex(/^[a-f0-9]{64}$/),
});

function encodeSearchCursor(message: SearchResult, queryHash: string) {
  return Buffer.from(
    JSON.stringify({
      createdAt: message.createdAt.toISOString(),
      id: message.id,
      queryHash,
    } satisfies SearchCursor),
  ).toString('base64url');
}

function decodeSearchCursor(cursor: string, queryHash: string): SearchCursor | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const parsed = searchCursorSchema.safeParse(value);
    if (!parsed.success || parsed.data.queryHash !== queryHash) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function emptySearchPage(error?: string): SearchMessagePage {
  return { items: [], nextCursor: null, ...(error ? { error } : {}) };
}

export async function searchMessages(
  query: string,
  workspaceSlug: string,
  cursor?: string,
): Promise<SearchMessagePage> {
  const session = await auth();
  if (!session?.user?.id) return emptySearchPage();

  const parsedQuery = parseSearchQuery(query);
  if ('error' in parsedQuery) return emptySearchPage(parsedQuery.error);

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  });

  if (!workspace) return emptySearchPage();

  const queryHash = createHash('sha256')
    .update(JSON.stringify([session.user.id, workspace.id, query.trim()]))
    .digest('hex');
  const pageCursor = cursor ? decodeSearchCursor(cursor, queryHash) : null;
  if (cursor && !pageCursor) return emptySearchPage();

  const { text: contentQuery, fromUser, inChannel, has, pinnedOnly, createdAt } = parsedQuery.filters;

  // Get hidden users to exclude
  const hiddenUsers = await prisma.hiddenUser.findMany({
    where: { userId: session.user.id },
    select: { hiddenUserId: true },
  });
  const hiddenUserIds = hiddenUsers.map(h => h.hiddenUserId);

  const channelFilter: Prisma.ChannelWhereInput = {
    workspaceId: workspace.id,
    members: { some: { userId: session.user.id } },
  };

  // Build where clause
  const where: Prisma.MessageWhereInput = {
    channel: channelFilter,
    userId: { notIn: hiddenUserIds },
    content: {
      contains: contentQuery,
      mode: 'insensitive',
    },
    isDeleted: false,
    OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
  };

  if (fromUser) {
    if (fromUser.toLowerCase() === 'me') {
        where.userId = session.user.id;
    } else {
        where.user = {
            name: { contains: fromUser, mode: 'insensitive' },
        };
    }
  }

  if (inChannel) {
    channelFilter.name = { contains: inChannel, mode: 'insensitive' };
  }
  
  if (has) {
    if (has === 'image') {
        where.attachments = { some: { type: { startsWith: 'image/' } } };
    } else if (has === 'video') {
        where.attachments = { some: { type: { startsWith: 'video/' } } };
    } else if (has === 'file') {
        // Assume anything not image/video is generic file, or just any attachment
        where.attachments = { some: {} };
    }
  }

  if (pinnedOnly) where.isPinned = true;

  if (createdAt) where.createdAt = createdAt;

  if (pageCursor) {
    const boundary = new Date(pageCursor.createdAt);
    where.AND = [{
      OR: [
        { createdAt: { lt: boundary } },
        { createdAt: boundary, id: { lt: pageCursor.id } },
      ],
    }];
  }

  try {
    const rows = await prisma.message.findMany({
      where,
      select: {
        id: true,
        channelId: true,
        parentId: true,
        content: true,
        createdAt: true,
        user: { select: { name: true } },
        channel: { select: { name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: SEARCH_PAGE_SIZE + 1,
    });

    const hasMore = rows.length > SEARCH_PAGE_SIZE;
    const items = rows.slice(0, SEARCH_PAGE_SIZE);
    return {
      items,
      nextCursor: hasMore && items.length > 0
        ? encodeSearchCursor(items[items.length - 1], queryHash)
        : null,
    };
  } catch (error) {
    console.error('searchMessages error:', error);
    return emptySearchPage();
  }
}
