import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { updateUserPreferences } from '@/actions/user';
import { revalidatePath } from 'next/cache';

const actor = vi.hoisted(() => ({ id: '' }));
vi.mock('@/auth', () => ({ auth: vi.fn(async () => actor.id ? { user: { id: actor.id } } : null) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  actor.id = randomUUID();
  await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
});
afterAll(() => prisma.$disconnect());

describe('user preference updates (W05)', () => {
  it('persists the signed-in user preferences without refreshing an unrelated route', async () => {
    vi.mocked(revalidatePath).mockClear();

    const result = await updateUserPreferences({ emailNotifications: false, pushNotifications: false });

    expect(result).toMatchObject({ success: true });
    await expect(prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { emailNotifications: true, pushNotifications: true },
    })).resolves.toEqual({ emailNotifications: false, pushNotifications: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
