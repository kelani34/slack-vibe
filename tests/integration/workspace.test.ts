import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createWorkspace, getWorkspaces, getWorkspaceMembers, joinWorkspaceByCode } from '@/actions/workspace';
import { revalidatePath } from 'next/cache';

const actor = vi.hoisted(() => ({ id: '' }));
vi.mock('@/auth', () => ({ auth: vi.fn(async () => actor.id ? { user: { id: actor.id } } : null) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  actor.id = randomUUID();
  await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
});
afterAll(() => prisma.$disconnect());

function input(slug = `team-${randomUUID()}`) {
  const form = new FormData();
  form.set('name', 'Fixture team');
  form.set('slug', slug);
  return form;
}

describe('Workspace creation with actual PostgreSQL (F02 / A16)', () => {
  it('atomically gives the creator owner role and membership in each default channel', async () => {
    vi.mocked(revalidatePath).mockClear();
    const result = await createWorkspace(null, input());
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true });
    if (!('workspaceId' in result)) throw new Error('Expected created workspace');
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: result.workspaceId }, include: { members: true, channels: { include: { members: true } } },
    });
    expect(workspace.members).toEqual([expect.objectContaining({ userId: actor.id, role: 'OWNER' })]);
    expect(workspace.channels.map(channel => channel.name).sort()).toEqual(['general', 'random']);
    for (const channel of workspace.channels) {
      expect(channel.members).toEqual([expect.objectContaining({ userId: actor.id })]);
    }
  });

  it('rejects unauthenticated creation without writing a workspace', async () => {
    actor.id = '';
    const slug = `anonymous-${randomUUID()}`;
    expect(await createWorkspace(null, input(slug))).toEqual({ error: 'Not authenticated' });
    expect(await prisma.workspace.count({ where: { slug } })).toBe(0);
  });

  it('allows one concurrent slug winner without partial extra channels', async () => {
    const slug = `concurrent-${randomUUID()}`;
    const results = await Promise.all([createWorkspace(null, input(slug)), createWorkspace(null, input(slug))]);
    expect(results.filter(result => 'success' in result)).toHaveLength(1);
    expect(results.filter(result => 'error' in result)).toEqual([{ error: 'Slug already exists' }]);
    expect(await prisma.workspace.count({ where: { slug } })).toBe(1);
    expect(await prisma.channel.count({ where: { workspace: { slug } } })).toBe(2);
  });

  it('lists only current actor memberships', async () => {
    const form = input();
    await createWorkspace(null, form);
    const otherUser = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    actor.id = otherUser.id;
    expect(await getWorkspaces()).toEqual([]);
  });

  it('does not expose workspace members to an outsider', async () => {
    const form = input();
    await createWorkspace(null, form);
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { slug: form.get('slug') as string } });
    actor.id = randomUUID();
    await prisma.user.create({ data: { id: actor.id, email: `${actor.id}@example.test` } });
    expect(await getWorkspaceMembers(workspace.slug)).toEqual([]);
  });

  it('joins from an invite and relies on the redirect instead of invalidating route trees', async () => {
    const created = await createWorkspace(null, input());
    if (!('workspaceId' in created)) throw new Error('Expected created workspace');
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: created.workspaceId } });
    const invitee = await prisma.user.create({ data: { email: `${randomUUID()}@example.test` } });
    actor.id = invitee.id;
    vi.mocked(revalidatePath).mockClear();

    const result = await joinWorkspaceByCode(workspace.inviteCode);

    expect(result).toMatchObject({ success: true, slug: workspace.slug });
    expect(await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: invitee.id } },
    })).not.toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
