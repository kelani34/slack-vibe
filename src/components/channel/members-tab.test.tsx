import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MembersTab } from './members-tab';
import { ChannelMembersDialog } from '../channel-members-dialog';

const fixture = vi.hoisted(() => ({
  loading: false,
  error: false,
  availableError: false,
  data: undefined as unknown,
  refetch: vi.fn(),
  refetchAvailable: vi.fn(),
  queryKeys: [] as string[][],
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    fixture.queryKeys.push(queryKey);
    const availableMembers = queryKey[0] === 'available-members';
    return {
      data: fixture.data,
      isLoading: fixture.loading,
      isError: availableMembers ? fixture.availableError : fixture.error,
      refetch: availableMembers ? fixture.refetchAvailable : fixture.refetch,
    };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
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
  fixture.error = false;
  fixture.availableError = false;
  fixture.data = undefined;
  fixture.queryKeys = [];
});

it('scopes both member projections to the current actor and workspace', () => {
  render(
    <MembersTab
      channelId="channel"
      workspaceId="workspace"
      currentUserId="current"
      isArchived={false}
    />,
  );

  expect(fixture.queryKeys).toContainEqual([
    'channel-members',
    'current',
    'workspace',
    'channel',
  ]);
  expect(fixture.queryKeys).toContainEqual([
    'available-members',
    'current',
    'workspace',
    'channel',
  ]);
});

it('uses the same actor and workspace cache scope in the channel members dialog', async () => {
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

  expect(fixture.queryKeys).toContainEqual([
    'channel-members',
    'current',
    'workspace',
    'channel',
  ]);
  expect(fixture.queryKeys).toContainEqual([
    'available-members',
    'current',
    'workspace',
    'channel',
  ]);
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

it('offers a retry when the channel member list fails to load', async () => {
  fixture.error = true;
  const user = userEvent.setup();
  render(
    <MembersTab
      channelId="channel"
      workspaceId="workspace"
      currentUserId="current"
      isArchived={false}
    />,
  );

  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load channel members.');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetch).toHaveBeenCalledOnce();
});

it('offers a retry when the channel members dialog list fails to load', async () => {
  fixture.error = true;
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
  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load channel members.');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetch).toHaveBeenCalledOnce();
});

it('keeps cached members visible and offers a retry after refresh fails', async () => {
  fixture.error = true;
  fixture.data = [{
    id: 'member-1',
    user: {
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.test',
      image: null,
      avatarUrl: null,
      role: 'MEMBER',
    },
  }];
  const user = userEvent.setup();
  render(
    <MembersTab
      channelId="channel"
      workspaceId="workspace"
      currentUserId="current"
      isArchived={false}
    />,
  );

  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t refresh channel members.');
  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetch).toHaveBeenCalledOnce();
});

it('offers a retry when the add-member list fails in the Members tab', async () => {
  fixture.availableError = true;
  const user = userEvent.setup();
  render(
    <MembersTab
      channelId="channel"
      workspaceId="workspace"
      currentUserId="current"
      isArchived={false}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Add Members' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load available members.');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetchAvailable).toHaveBeenCalledOnce();
});

it('offers a retry when the add-member list fails in the dialog', async () => {
  fixture.availableError = true;
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
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load available members.');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(fixture.refetchAvailable).toHaveBeenCalledOnce();
});
