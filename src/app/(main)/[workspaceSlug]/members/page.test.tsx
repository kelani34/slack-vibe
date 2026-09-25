import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import MembersPage from './page';

const fixture = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: fixture.auth }));
vi.mock('@/lib/prisma', () => ({
  prisma: { workspace: { findUnique: fixture.findUnique } },
}));
vi.mock('@/actions/channel', () => ({
  createGroupDirectMessage: vi.fn(),
  getOrCreateDirectMessage: vi.fn(async () => ({ success: true, channelId: 'direct-1' })),
}));
vi.mock('next/navigation', () => ({
  notFound: fixture.notFound,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const currentUser = {
  id: 'current',
  name: 'Current User',
  displayName: 'Current',
  email: 'current@example.test',
  avatarUrl: null,
  image: null,
};
const targetUser = {
  id: 'target',
  name: 'Target User',
  displayName: 'Target',
  email: 'target@example.test',
  avatarUrl: null,
  image: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  fixture.auth.mockResolvedValue({ user: { id: 'current' } });
  fixture.findUnique.mockResolvedValue({
    id: 'workspace',
    name: 'Acme',
    slug: 'acme',
    members: [
      { id: 'membership-current', role: 'MEMBER', user: currentUser },
      { id: 'membership-target', role: 'MEMBER', user: targetUser },
    ],
  });
});

it('limits the member directory to workspace members and offers a preselected DM action', async () => {
  const user = userEvent.setup();
  const page = await MembersPage({ params: Promise.resolve({ workspaceSlug: 'acme' }) });
  render(page);

  expect(fixture.findUnique).toHaveBeenCalledWith(expect.objectContaining({
    where: { slug: 'acme', members: { some: { userId: 'current' } } },
  }));

  await user.click(screen.getByRole('button', { name: 'Message' }));
  expect(screen.getByRole('checkbox', { name: 'Message Target' })).toBeChecked();
  expect(screen.getByText('1 recipient selected')).toBeInTheDocument();
});
