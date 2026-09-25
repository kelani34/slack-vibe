'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { messageHtmlToText } from '@/lib/message-html';

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric'),
});

export async function createWorkspace(_prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }
  const userId = session.user.id;

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;

  const validated = createWorkspaceSchema.safeParse({ name, slug });

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name: validated.data.name,
        slug: validated.data.slug,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
        channels: {
          create: ['general', 'random'].map((name) => ({
            name,
            creatorId: userId,
            members: { create: { userId } },
          })),
        },
      },
    });

    return { success: true, workspaceId: workspace.id, slug: workspace.slug };
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return { error: 'Slug already exists' };
    }
    console.error(error);
    return { error: 'Failed to create workspace' };
  }
}

export async function getWorkspaces() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: true,
    },
  });

  return memberships.map((m) => m.workspace);
}

export async function joinWorkspaceByCode(inviteCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }
  const userId = session.user.id;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode },
      include: {
        channels: {
          where: { name: { in: ['general', 'random'] } },
        },
      },
    });

    if (!workspace) {
      return { error: 'Invalid invite code' };
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId,
        },
      },
    });

    if (existingMember) {
      return { success: true, slug: workspace.slug, alreadyJoined: true };
    }

    // Join workspace and default channels transaction
    await prisma.$transaction(async (tx) => {
      // Add to workspace
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: 'MEMBER',
        },
      });

      // Add to default channels
      for (const channel of workspace.channels) {
        await tx.channelMember.create({
          data: {
            channelId: channel.id,
            userId,
          },
        });
        // System message for joining channel
        await tx.message.create({
          data: {
            content: messageHtmlToText('joined the channel'),
            type: 'SYSTEM',
            channelId: channel.id,
            userId,
          },
        });
      }
    });

    return { success: true, slug: workspace.slug };
  } catch (error) {
    console.error('Join workspace error:', error);
    return { error: 'Failed to join workspace' };
  }
}

export async function getWorkspaceMembers(workspaceSlug: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  });

  if (!workspace) return [];

  const requester = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: session.user.id,
      },
    },
    select: { id: true },
  });
  if (!requester) return [];

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          displayName: true,
          avatarUrl: true,
          image: true,
          email: true,
        },
      },
    },
  });

  return members.map(m => m.user);
}
