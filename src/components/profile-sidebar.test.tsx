import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { ProfileSidebar } from './profile-sidebar';

const fixture = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  getUserProfile: vi.fn(),
  profileQueryKey: [] as string[],
  getOrCreateDirectMessage: vi.fn(),
  profileLoading: false,
  profileError: false,
  profileMissing: false,
  refetchProfile: vi.fn(),
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
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    fixture.profileQueryKey = queryKey;
    return {
      data: fixture.profileMissing ? null : fixture.profile,
      isLoading: fixture.profileLoading,
      isError: fixture.profileError,
      refetch: fixture.refetchProfile,
    };
  },
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
  fixture.profileQueryKey = [];
  fixture.profileLoading = false;
  fixture.profileError = false;
  fixture.profileMissing = false;
  fixture.getOrCreateDirectMessage.mockResolvedValue({ success: true, channelId: 'direct-1' });
});

it('scopes cached member profiles to the workspace that authorized the read', () => {
  render(
    <ProfileSidebar
      workspaceSlug="acme"
      workspaceId="workspace-1"
      currentUserId="current"
    />,
  );

  expect(fixture.profileQueryKey).toEqual(['user-profile', 'peer', 'workspace-1']);
});

it('offers a retry when the profile request fails without implying the user is missing', async () => {
  fixture.profileError = true;
  fixture.profileMissing = true;
  const user = userEvent.setup();
  render(
    <ProfileSidebar
      workspaceSlug="acme"
      workspaceId="workspace"
      currentUserId="current"
    />,
  );

  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load this profile.');
  expect(screen.queryByText('User not found')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetchProfile).toHaveBeenCalledOnce();
});

it('retains cached profile content when a background refresh fails', () => {
  fixture.profileError = true;
  render(
    <ProfileSidebar
      workspaceSlug="acme"
      workspaceId="workspace"
      currentUserId="current"
    />,
  );

  expect(screen.getByRole('heading', { name: 'Alex Rivera' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t refresh this profile.');
});

it('shows an accessible profile-shaped skeleton while the profile loads', () => {
  fixture.profileLoading = true;
  render(
    <ProfileSidebar
      workspaceSlug="acme"
      workspaceId="workspace"
      currentUserId="current"
    />,
  );

  const loading = screen.getByRole('status', { name: 'Loading profile' });
  const skeletons = loading.querySelectorAll('[data-slot="skeleton"]');
  expect(skeletons).toHaveLength(4);
  skeletons.forEach((skeleton) => expect(skeleton).toHaveClass('motion-reduce:animate-none'));
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
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

it('names profile controls and keeps touch targets large on compact screens', () => {
  render(
    <ProfileSidebar
      workspaceSlug="acme"
      workspaceId="workspace"
      currentUserId="current"
      onBack={vi.fn()}
    />,
  );

  for (const name of ['Back to conversation', 'More profile actions', 'Close profile']) {
    expect(screen.getByRole('button', { name })).toHaveClass(
      'h-11',
      'w-11',
      'sm:h-8',
      'sm:w-8',
    );
  }
});
