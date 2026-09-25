'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function getUserProfile(userId: string, workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [requester, target] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
      select: { id: true },
    }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true },
    }),
  ]);
  if (!requester || !target) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      image: true,
      avatarUrl: true,
      githubUrl: true,
      timezone: true,
      status: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  return user;
}

export async function updateProfile(data: {
  name?: string;
  displayName?: string;
  avatarUrl?: string;
  timezone?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        timezone: data.timezone,
      },
    });
    return { success: true };
  } catch {
    return { error: 'Failed to update profile' };
  }
}

export async function hideUser(hiddenUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  // Can't hide yourself
  if (hiddenUserId === session.user.id) {
    return { error: 'Cannot hide yourself' };
  }

  try {
    await prisma.hiddenUser.create({
      data: {
        userId: session.user.id,
        hiddenUserId,
      },
    });
    return { success: true };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { error: 'User already hidden' };
    }
    return { error: 'Failed to hide user' };
  }
}

export async function unhideUser(hiddenUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  await prisma.hiddenUser.deleteMany({
    where: {
      userId: session.user.id,
      hiddenUserId,
    },
  });
  return { success: true };
}

export async function getHiddenUsers() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const hidden = await prisma.hiddenUser.findMany({
    where: { userId: session.user.id },
    select: { hiddenUserId: true },
  });

  return hidden.map((h) => h.hiddenUserId);
}

export async function updatePresence() {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      lastSeenAt: new Date(),
      status: 'ONLINE',
    },
  });
}

export async function setUserOffline() {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { status: 'OFFLINE' },
  });
}

export async function getUserDetailsForCard(userId: string, workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [requester, data] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
      select: { id: true },
    }),
    prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            image: true,
            avatarUrl: true,
            timezone: true,
            status: true,
            email: true,
          },
        },
      },
    }),
  ]);

  if (!requester || !data) return null;

  return {
    ...data.user,
    role: data.role,
    joinedAt: data.joinedAt,
  };
}

export async function updateUserPreferences(preferences: {
  emailNotifications: boolean;
  pushNotifications: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
      },
    });

    return { success: true, user };
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return { success: false, error: 'Failed to update preferences' };
  }
}
