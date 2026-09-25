import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { UserHoverCard } from './user-hover-card';

const fixture = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  getUserDetails: vi.fn(),
  getOrCreateDirectMessage: vi.fn(),
  queryCalls: [] as Array<{ enabled?: boolean }>,
  loading: false,
  error: false,
  noUserData: false,
  refetch: vi.fn(),
  user: {
    id: 'peer',
    name: 'Alex Rivera',
    displayName: null,
    email: 'alex@example.test',
    avatarUrl: null,
    role: 'MEMBER',
    status: 'OFFLINE',
    timezone: null,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: fixture.push, refresh: fixture.refresh }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled?: boolean }) => {
    fixture.queryCalls.push(options);
    return {
      data: fixture.noUserData ? undefined : fixture.user,
      isLoading: fixture.loading,
      isError: fixture.error,
      refetch: fixture.refetch,
    };
  },
}));
vi.mock('@/actions/user', () => ({ getUserDetailsForCard: fixture.getUserDetails }));
vi.mock('@/actions/channel', () => ({
  getOrCreateDirectMessage: fixture.getOrCreateDirectMessage,
}));
vi.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children, onOpenChange }: {
    children: ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => <div onMouseEnter={() => onOpenChange?.(true)}>{children}</div>,
  HoverCardTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  HoverCardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.queryCalls = [];
  fixture.loading = false;
  fixture.error = false;
  fixture.noUserData = false;
  fixture.getOrCreateDirectMessage.mockResolvedValue({ success: true, channelId: 'direct-1' });
});

it('refreshes the workspace shell after starting a DM from a member card', async () => {
  const user = userEvent.setup();
  render(
    <UserHoverCard userId="peer" workspaceId="workspace" workspaceSlug="acme">
      <button type="button">Open member card</button>
    </UserHoverCard>,
  );

  await user.hover(screen.getByRole('button', { name: 'Open member card' }));
  await user.click(screen.getByRole('button', { name: 'Message' }));

  expect(fixture.push).toHaveBeenCalledWith('/acme/direct-1');
  expect(fixture.refresh).toHaveBeenCalledOnce();
});

it('loads member details only when the hover card opens', async () => {
  const user = userEvent.setup();
  render(
    <UserHoverCard userId="peer" workspaceId="workspace" workspaceSlug="acme">
      <button type="button">Open member card</button>
    </UserHoverCard>,
  );

  expect(fixture.queryCalls.at(-1)?.enabled).toBe(false);
  await user.hover(screen.getByRole('button', { name: 'Open member card' }));
  expect(fixture.queryCalls.at(-1)?.enabled).toBe(true);
});

it('announces member-detail loading with reduced-motion-aware skeletons', async () => {
  fixture.loading = true;
  const user = userEvent.setup();
  const { container } = render(
    <UserHoverCard userId="peer" workspaceId="workspace" workspaceSlug="acme">
      <button type="button">Open member card</button>
    </UserHoverCard>,
  );

  await user.hover(screen.getByRole('button', { name: 'Open member card' }));
  expect(screen.getByRole('status', { name: 'Loading member details' })).toBeInTheDocument();
  container.querySelectorAll('[data-slot="skeleton"]').forEach((skeleton) => {
    expect(skeleton).toHaveClass('motion-reduce:animate-none');
  });
});

it('offers a retry when member details fail to load', async () => {
  fixture.error = true;
  fixture.noUserData = true;
  const user = userEvent.setup();
  render(
    <UserHoverCard userId="peer" workspaceId="workspace" workspaceSlug="acme">
      <button type="button">Open member card</button>
    </UserHoverCard>,
  );

  await user.hover(screen.getByRole('button', { name: 'Open member card' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load member details.');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetch).toHaveBeenCalledOnce();
});

it('keeps cached member details visible when refresh fails', async () => {
  fixture.error = true;
  const user = userEvent.setup();
  render(
    <UserHoverCard userId="peer" workspaceId="workspace" workspaceSlug="acme">
      <button type="button">Open member card</button>
    </UserHoverCard>,
  );

  await user.hover(screen.getByRole('button', { name: 'Open member card' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t refresh member details.');
  expect(screen.getByRole('heading', { name: 'Alex Rivera' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetch).toHaveBeenCalledOnce();
});
