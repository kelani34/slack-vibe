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
  useQuery: () => ({ data: fixture.user, isLoading: false }),
}));
vi.mock('@/actions/user', () => ({ getUserDetailsForCard: fixture.getUserDetails }));
vi.mock('@/actions/channel', () => ({
  getOrCreateDirectMessage: fixture.getOrCreateDirectMessage,
}));
vi.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  HoverCardTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  HoverCardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.getOrCreateDirectMessage.mockResolvedValue({ success: true, channelId: 'direct-1' });
});

it('refreshes the workspace shell after starting a DM from a member card', async () => {
  const user = userEvent.setup();
  render(
    <UserHoverCard userId="peer" workspaceId="workspace" workspaceSlug="acme">
      <button type="button">Open member card</button>
    </UserHoverCard>,
  );

  await user.click(screen.getByRole('button', { name: 'Message' }));

  expect(fixture.push).toHaveBeenCalledWith('/acme/direct-1');
  expect(fixture.refresh).toHaveBeenCalledOnce();
});
