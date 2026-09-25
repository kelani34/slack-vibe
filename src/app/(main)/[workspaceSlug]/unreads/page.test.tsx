import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import UnreadsPage from './page';

const fixture = vi.hoisted(() => ({
  auth: vi.fn(),
  getUnreadInbox: vi.fn(),
  findWorkspace: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: fixture.auth }));
vi.mock('@/actions/channel', () => ({ getUnreadInbox: fixture.getUnreadInbox }));
vi.mock('@/lib/prisma', () => ({ prisma: { workspace: { findUnique: fixture.findWorkspace } } }));
vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('not found'); }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('@/components/mark-unread-conversation-read', () => ({
  MarkUnreadConversationRead: ({ channelId, label }: { channelId: string; label: string }) => (
    <button data-channel-id={channelId}>{label}</button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.auth.mockResolvedValue({ user: { id: 'viewer' } });
  fixture.findWorkspace.mockResolvedValue({ id: 'workspace-1', name: 'Acme' });
  fixture.getUnreadInbox.mockResolvedValue({
    items: [{
      id: 'channel-1',
      name: 'general',
      type: 'PUBLIC',
      directKey: null,
      unreadCount: 3,
      firstUnreadMessageId: 'message-1',
      participants: [],
      avatarParticipants: [],
    }],
    nextCursor: null,
  });
});

it('opens the earliest unread message and keeps mark-read explicit', async () => {
  const page = await UnreadsPage({
    params: Promise.resolve({ workspaceSlug: 'acme' }),
    searchParams: Promise.resolve({}),
  });
  render(page);

  expect(screen.getByRole('heading', { name: 'Unread' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Open first unread in #general/i }))
    .toHaveAttribute('href', '/acme/channel-1?message=message-1');
  expect(screen.getByRole('button', { name: /Mark #general as read/i }))
    .toHaveAttribute('data-channel-id', 'channel-1');
  expect(fixture.getUnreadInbox).toHaveBeenCalledWith('workspace-1', 25, undefined);
});

it('uses the group identity and stacked participant avatars for unread DMs', async () => {
  const participant = (id: string, displayName: string) => ({
    id,
    name: displayName,
    displayName,
    avatarUrl: null,
    image: null,
  });
  fixture.getUnreadInbox.mockResolvedValue({
    items: [{
      id: 'group-1',
      name: 'Project Crew',
      type: 'DIRECT',
      directKey: null,
      unreadCount: 2,
      firstUnreadMessageId: 'group-message-1',
      participants: [participant('alex', 'Alex'), participant('sam', 'Sam')],
      avatarParticipants: [
        participant('alex', 'Alex'),
        participant('sam', 'Sam'),
        participant('viewer', 'Viewer'),
      ],
    }],
    nextCursor: null,
  });
  const page = await UnreadsPage({
    params: Promise.resolve({ workspaceSlug: 'acme' }),
    searchParams: Promise.resolve({}),
  });
  render(page);

  const stack = screen.getByRole('img', { name: '3 participants' });
  expect(stack.querySelectorAll('[data-avatar-stack-index]')).toHaveLength(3);
  expect(screen.getByRole('link', { name: /Open first unread in Project Crew/i }))
    .toHaveAttribute('href', '/acme/group-1?message=group-message-1');
});

it('shows a useful caught-up state without marking anything read', async () => {
  fixture.getUnreadInbox.mockResolvedValue({ items: [], nextCursor: null });
  const page = await UnreadsPage({
    params: Promise.resolve({ workspaceSlug: 'acme' }),
    searchParams: Promise.resolve({}),
  });
  render(page);

  expect(screen.getByText(/You are all caught up/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /mark .* as read/i })).not.toBeInTheDocument();
});
