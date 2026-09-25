import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { ProfileSidebar } from './profile-sidebar';

const fixture = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  getUserProfile: vi.fn(),
  getOrCreateDirectMessage: vi.fn(),
  setActiveProfile: vi.fn(),
  profile: {
    id: 'peer',
    name: 'Alex Rivera',
    displayName: null,
    email: 'alex@example.test',
    avatarUrl: null,
    image: null,
    lastSeenAt: null,
    timezone: null,
    githubUrl: null,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: fixture.push, refresh: fixture.refresh }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: fixture.profile, isLoading: false }),
}));
vi.mock('@/stores/profile-store', () => ({
  useProfileStore: (select: (state: { activeProfileUserId: string; setActiveProfile: typeof fixture.setActiveProfile }) => unknown) =>
    select({ activeProfileUserId: 'peer', setActiveProfile: fixture.setActiveProfile }),
}));
vi.mock('@/actions/user', () => ({
  getUserProfile: fixture.getUserProfile,
  hideUser: vi.fn(),
}));
vi.mock('@/actions/channel', () => ({
  getOrCreateDirectMessage: fixture.getOrCreateDirectMessage,
}));
vi.mock('@/components/edit-profile-dialog', () => ({ EditProfileDialog: () => null }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.getOrCreateDirectMessage.mockResolvedValue({ success: true, channelId: 'direct-1' });
});

it('refreshes the workspace shell after starting a DM from a profile', async () => {
  const user = userEvent.setup();
  render(
    <ProfileSidebar
      workspaceSlug="acme"
      workspaceId="workspace"
      currentUserId="current"
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Message' }));

  expect(fixture.push).toHaveBeenCalledWith('/acme/direct-1');
  expect(fixture.refresh).toHaveBeenCalledOnce();
});
