'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getUserProfile(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

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
    revalidatePath('/');
    return { success: true };
  } catch (error) {
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
  } catch (error: any) {
    if (error.code === 'P2002') {
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
