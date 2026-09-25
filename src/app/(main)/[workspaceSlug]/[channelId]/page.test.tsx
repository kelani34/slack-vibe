import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import ChannelPage from './page';

const fixture = vi.hoisted(() => ({
  auth: vi.fn(),
  channelFindUnique: vi.fn(),
  starredFindUnique: vi.fn(),
  workspaceFindUnique: vi.fn(),
  workspaceMemberFindUnique: vi.fn(),
  channelMemberFindUnique: vi.fn(),
  channelMemberFindMany: vi.fn(),
  getWorkspaceMembers: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: fixture.auth }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    channel: { findUnique: fixture.channelFindUnique },
    starredChannel: { findUnique: fixture.starredFindUnique },
    workspace: { findUnique: fixture.workspaceFindUnique },
    workspaceMember: { findUnique: fixture.workspaceMemberFindUnique },
    channelMember: {
      findUnique: fixture.channelMemberFindUnique,
      findMany: fixture.channelMemberFindMany,
    },
  },
}));
vi.mock('@/actions/workspace', () => ({ getWorkspaceMembers: fixture.getWorkspaceMembers }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('@/components/chat-panel', () => ({
  ChatPanel: ({ messagePlaceholder }: { messagePlaceholder?: string }) => (
    <div data-testid="message-placeholder">{messagePlaceholder}</div>
  ),
}));
vi.mock('@/components/direct-message-actions', () => ({
  DirectMessageActions: () => <div data-testid="direct-message-actions" />,
}));
vi.mock('@/components/channel/channel-access-denied', () => ({
  ChannelAccessDenied: () => <div>Access denied</div>,
}));
vi.mock('@/components/star-button', () => ({ StarButton: () => null }));
vi.mock('@/components/channel/channel-details-dialog', () => ({
  ChannelDetailsDialog: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.auth.mockResolvedValue({ user: { id: 'current', name: 'Current', image: null } });
  fixture.channelFindUnique.mockResolvedValue({
    id: 'group-1',
    workspaceId: 'workspace',
    name: 'Project Crew',
    type: 'DIRECT',
    directKey: null,
    creatorId: 'current',
    isArchived: false,
    postingPermission: 'EVERYONE',
    workspace: { slug: 'acme' },
  });
  fixture.starredFindUnique.mockResolvedValue(null);
  fixture.workspaceFindUnique.mockResolvedValue({ id: 'workspace' });
  fixture.workspaceMemberFindUnique.mockResolvedValue({ role: 'MEMBER' });
  fixture.channelMemberFindUnique.mockResolvedValue({ lastViewedAt: new Date('2026-01-01') });
  fixture.channelMemberFindMany.mockResolvedValue([
    { user: { id: 'current', name: 'Current', displayName: 'Current User', avatarUrl: null, image: null } },
    { user: { id: 'alex', name: 'Alex', displayName: 'Alex Rivera', avatarUrl: null, image: null } },
  ]);
  fixture.getWorkspaceMembers.mockResolvedValue([]);
});

it('renders group identity, participant avatars and mobile back navigation', async () => {
  const page = await ChannelPage({ params: Promise.resolve({ workspaceSlug: 'acme', channelId: 'group-1' }) });
  render(page);

  expect(screen.getByRole('heading', { name: 'Project Crew' })).toBeInTheDocument();
  const avatarStack = screen.getByRole('img', { name: '2 participants' });
  expect(avatarStack.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);
  expect(screen.getByRole('link', { name: 'Back to direct messages' })).toHaveAttribute('href', '/acme/dms');
  expect(screen.getByTestId('message-placeholder')).toHaveTextContent('Message Project Crew...');
  expect(screen.getByTestId('direct-message-actions')).toBeInTheDocument();
});
