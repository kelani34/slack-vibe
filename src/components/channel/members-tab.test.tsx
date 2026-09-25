import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MembersTab } from './members-tab';
import { ChannelMembersDialog } from '../channel-members-dialog';

const fixture = vi.hoisted(() => ({ loading: false }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined, isLoading: fixture.loading }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/actions/channel-member', () => ({
  getChannelMembers: vi.fn(),
  removeChannelMember: vi.fn(),
  addChannelMember: vi.fn(),
  getWorkspaceMembersNotInChannel: vi.fn(),
}));
vi.mock('@/stores/profile-store', () => ({
  useProfileStore: () => ({ setActiveProfile: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  fixture.loading = false;
});

it('shows an accessible list-shaped skeleton while channel members load', () => {
  fixture.loading = true;
  const { container } = render(
    <MembersTab
      channelId="channel"
      workspaceId="workspace"
      currentUserId="current"
      isArchived={false}
    />,
  );

  expect(screen.getByRole('status', { name: 'Loading channel members' })).toBeInTheDocument();
  const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
  expect(skeletons).toHaveLength(20);
  skeletons.forEach((skeleton) => expect(skeleton).toHaveClass('motion-reduce:animate-none'));
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});

it('uses the same loading state in the channel members dialog', async () => {
  fixture.loading = true;
  const user = userEvent.setup();
  render(
    <ChannelMembersDialog
      channelId="channel"
      workspaceId="workspace"
      workspaceSlug="acme"
      memberCount={3}
      currentUserId="current"
    />,
  );

  await user.click(screen.getByRole('button', { name: '3' }));

  const loading = screen.getByRole('status', { name: 'Loading channel members' });
  expect(loading.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(20);
});
