import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';

import { getUserDetailsForCard } from '@/actions/user';
import { prisma } from '@/lib/prisma';

const session = vi.hoisted(() => ({ userId: '' }));

vi.mock('@/auth', () => ({
  auth: vi.fn(async () => session.userId ? { user: { id: session.userId } } : null),
}));

beforeEach(() => {
  session.userId = randomUUID();
});

afterAll(() => prisma.$disconnect());

it('does not expose member contact details to an authenticated user outside the workspace', async () => {
  const outsider = await prisma.user.create({
    data: { id: session.userId, email: `${session.userId}@example.test` },
  });
  const owner = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
  const target = await prisma.user.create({
    data: { email: `${randomUUID()}@example.test`, name: 'Workspace member' },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Member card access',
      slug: `card-access-${randomUUID()}`,
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: 'OWNER' },
          { userId: target.id, role: 'MEMBER' },
        ],
      },
    },
  });

  expect(outsider.id).toBe(session.userId);
  expect(await getUserDetailsForCard(target.id, workspace.id)).toBeNull();
});

it('returns member card details to a requester in the same workspace', async () => {
  const requester = await prisma.user.create({
    data: { id: session.userId, email: `${session.userId}@example.test` },
  });
  const owner = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
  const target = await prisma.user.create({
    data: { email: `${randomUUID()}@example.test`, name: 'Workspace member' },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Member card access',
      slug: `card-access-${randomUUID()}`,
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: 'OWNER' },
          { userId: requester.id, role: 'MEMBER' },
          { userId: target.id, role: 'MEMBER' },
        ],
      },
    },
  });

  expect(await getUserDetailsForCard(target.id, workspace.id)).toMatchObject({
    id: target.id,
    name: 'Workspace member',
    email: target.email,
    role: 'MEMBER',
  });
});
