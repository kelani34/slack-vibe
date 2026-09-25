import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { NavChannels, type SidebarChannel } from './nav-channels';

const fixture = vi.hoisted(() => ({
  deleteChannel: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/actions/channel', () => ({ deleteChannel: fixture.deleteChannel }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ channelId: 'channel-1' }),
  useRouter: () => ({ refresh: fixture.refresh }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('sonner', () => ({ toast: { error: fixture.error, success: fixture.success } }));
vi.mock('@/components/create-channel-dialog', () => ({
  CreateChannelDialog: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/sidebar', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const button = ({ children, ...props }: { children: ReactNode; title?: string }) => (
    <button {...props}>{children}</button>
  );
  return {
    SidebarGroup: wrapper,
    SidebarGroupAction: button,
    SidebarGroupLabel: wrapper,
    SidebarMenu: wrapper,
    SidebarMenuAction: button,
    SidebarMenuButton: wrapper,
    SidebarMenuItem: wrapper,
    useSidebar: () => ({ isMobile: false }),
  };
});
vi.mock('@/components/ui/dropdown-menu', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  return {
    DropdownMenu: wrapper,
    DropdownMenuContent: wrapper,
    DropdownMenuTrigger: wrapper,
    DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
      <button onClick={onClick}>{children}</button>
    ),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  fixture.deleteChannel.mockResolvedValue({ success: true });
});

it('refreshes the sidebar after deleting a channel from its menu', async () => {
  const user = userEvent.setup();
  const channel = {
    id: 'channel-1',
    name: 'general',
    type: 'PUBLIC',
    directKey: null,
  } as SidebarChannel;
  render(
    <NavChannels
      channels={[channel]}
      workspaceSlug="team"
      workspaceId="workspace"
      showCreateButton={false}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Delete Channel' }));

  expect(fixture.deleteChannel).toHaveBeenCalledWith('channel-1');
  expect(fixture.refresh).toHaveBeenCalledOnce();
});

it('shows a stacked participant avatar pair for group DM sidebar entries', () => {
  render(
    <NavChannels
      channels={[
        {
          id: 'group-1',
          name: 'Project Crew',
          type: 'DIRECT',
          directKey: null,
          directAvatarUsers: [
            { id: 'alex', name: 'Alex', displayName: 'Alex Rivera', avatarUrl: '/alex.png', image: null },
            { id: 'sam', name: 'Sam', displayName: 'Sam Lee', avatarUrl: '/sam.png', image: null },
          ],
        } as SidebarChannel,
      ]}
      workspaceSlug="acme"
      workspaceId="workspace"
      showCreateButton={false}
      isDirect
    />,
  );

  const stack = screen.getByRole('img', { name: '2 participants' });
  expect(stack).toHaveClass('-space-x-2');
  expect(stack.querySelectorAll('[data-avatar-stack-index]')).toHaveLength(2);
  expect(stack.querySelector('[data-avatar-stack-index="0"]')).toHaveStyle({ zIndex: '2' });
  expect(stack.querySelector('[data-avatar-stack-index="1"]')).toHaveStyle({ zIndex: '1' });
});
