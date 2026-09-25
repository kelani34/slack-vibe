import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import WorkspaceLayout from './layout';

const fixture = vi.hoisted(() => ({
  auth: vi.fn(),
  workspaceFindUnique: vi.fn(),
  workspaceMemberFindUnique: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: fixture.auth }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: { findUnique: fixture.workspaceFindUnique },
    workspaceMember: { findUnique: fixture.workspaceMemberFindUnique },
  },
}));
vi.mock('@/actions/workspace', () => ({ getWorkspaces: vi.fn().mockResolvedValue([]) }));
vi.mock('@/actions/channel', () => ({ getChannels: vi.fn().mockResolvedValue([]) }));
vi.mock('@/actions/star', () => ({ getStarredChannels: vi.fn().mockResolvedValue([]) }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock('@/components/app-sidebar', () => ({ AppSidebar: () => null }));
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SidebarInset: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="workspace-shell" className={className}>{children}</div>
  ),
  SidebarTrigger: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.auth.mockResolvedValue({ user: { id: 'viewer', name: 'Viewer' } });
  fixture.workspaceFindUnique.mockResolvedValue({ id: 'workspace-1', slug: 'acme', name: 'Acme' });
  fixture.workspaceMemberFindUnique.mockResolvedValue({ id: 'membership-1' });
});

it('uses the dynamic viewport for the workspace shell', async () => {
  const layout = await WorkspaceLayout({
    children: <div>Conversation</div>,
    params: Promise.resolve({ workspaceSlug: 'acme' }),
  });
  render(layout);

  expect(screen.getByTestId('workspace-shell')).toHaveClass('h-dvh', 'min-h-0');
  expect(screen.getByTestId('workspace-shell')).not.toHaveClass('h-screen');
});
