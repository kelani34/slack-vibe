import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import type { DirectMessageInboxItem } from '@/actions/channel';
import DirectMessagesPage from './page';

const fixture = vi.hoisted(() => ({
  auth: vi.fn(),
  getDirectMessageInbox: vi.fn(),
  getWorkspaceMembers: vi.fn(),
  findWorkspace: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: fixture.auth }));
vi.mock('@/actions/channel', () => ({ getDirectMessageInbox: fixture.getDirectMessageInbox }));
vi.mock('@/actions/workspace', () => ({ getWorkspaceMembers: fixture.getWorkspaceMembers }));
vi.mock('@/lib/prisma', () => ({ prisma: { workspace: { findUnique: fixture.findWorkspace } } }));
vi.mock('@/components/direct-message-compose-dialog', () => ({
  DirectMessageComposeDialog: () => <button>New message</button>,
}));
vi.mock('@/components/ui/button', () => ({ Button: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const peer = (id: string, name: string) => ({
  id,
  name,
  displayName: name,
  avatarUrl: null,
  image: null,
});

const group: DirectMessageInboxItem = {
  id: 'group-1',
  createdAt: new Date('2026-09-25T12:00:00Z'),
  name: 'Project Crew',
  type: 'DIRECT',
  directKey: null,
  lastViewedAt: new Date('2026-09-25T12:00:00Z'),
  unreadCount: 0,
  participants: [peer('alex', 'Alex'), peer('sam', 'Sam')],
  avatarParticipants: [peer('alex', 'Alex'), peer('sam', 'Sam'), peer('viewer', 'Current User')],
  lastMessage: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  fixture.auth.mockResolvedValue({ user: { id: 'viewer' } });
  fixture.findWorkspace.mockResolvedValue({ id: 'workspace-1', name: 'Acme' });
  fixture.getDirectMessageInbox.mockResolvedValue({ items: [group], nextCursor: null });
  fixture.getWorkspaceMembers.mockResolvedValue([]);
});

it('stacks at least two real participant avatars in a group DM inbox row', async () => {
  const page = await DirectMessagesPage({
    params: Promise.resolve({ workspaceSlug: 'acme' }),
    searchParams: Promise.resolve({}),
  });
  render(page);

  const avatarStack = screen.getByRole('img', { name: '3 participants' });
  expect(avatarStack).toHaveClass('-space-x-2');
  expect(avatarStack.querySelectorAll('[data-avatar-stack-index]')).toHaveLength(3);
});
