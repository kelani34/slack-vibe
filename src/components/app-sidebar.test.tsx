import { act, render } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { AppSidebar } from './app-sidebar';

const fixture = vi.hoisted(() => ({
  refresh: vi.fn(),
  fetchNotifications: vi.fn(),
  statusCallbacks: [] as Array<(status: string) => void>,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ workspaceSlug: 'acme', channelId: 'channel-1' }),
  useRouter: () => ({ refresh: fixture.refresh }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; 'aria-label'?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => {
      const channel = {
        on: () => channel,
        subscribe: (callback?: (status: string) => void) => {
          if (callback) fixture.statusCallbacks.push(callback);
          return channel;
        },
      };
      return channel;
    },
    removeChannel: vi.fn(),
  }),
}));
vi.mock('@/stores/notification-store', () => ({
  useNotificationStore: Object.assign(
    () => ({ isOpen: false, unreadCount: 0 }),
    { getState: () => ({ fetchNotifications: fixture.fetchNotifications }) },
  ),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));

vi.mock('@/components/ui/sidebar', () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const Button = ({ children }: { children: React.ReactNode }) => <button>{children}</button>;
  return {
    Sidebar: Container,
    SidebarContent: Container,
    SidebarFooter: Container,
    SidebarGroup: Container,
    SidebarGroupLabel: Container,
    SidebarHeader: Container,
    SidebarMenu: Container,
    SidebarMenuItem: Container,
    SidebarMenuButton: Button,
    SidebarRail: Container,
  };
});
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children, className, side }: { children: React.ReactNode; className?: string; side?: string }) => (
    <div data-testid="activity-popover" data-side={side} className={className}>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/nav-channels', () => ({ NavChannels: () => null }));
vi.mock('@/components/nav-user', () => ({ NavUser: () => null }));
vi.mock('@/components/workspace-switcher', () => ({ WorkspaceSwitcher: () => null }));
vi.mock('@/components/notification-sidebar', () => ({ NotificationSidebar: () => null }));
vi.mock('@/components/notification-list', () => ({ NotificationList: () => null }));
vi.mock('@/components/search-dialog', () => ({ SearchDialog: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.statusCallbacks = [];
});

it('refreshes sidebar summaries and notifications once after realtime reconnects', () => {
  const view = render(
    <AppSidebar
      workspaces={[]}
      currentWorkspace={{ id: 'workspace-1', slug: 'acme', name: 'Acme' } as never}
      channels={[]}
      starredChannels={[]}
      user={{ id: 'viewer', name: 'Viewer', email: 'viewer@example.test', avatar: '' }}
    />,
  );
  const onStatus = fixture.statusCallbacks[0];
  expect(onStatus).toBeDefined();

  act(() => onStatus?.('SUBSCRIBED'));
  expect(fixture.refresh).not.toHaveBeenCalled();
  expect(fixture.fetchNotifications).not.toHaveBeenCalled();

  act(() => {
    onStatus?.('TIMED_OUT');
    onStatus?.('CHANNEL_ERROR');
    onStatus?.('SUBSCRIBED');
  });

  expect(fixture.refresh).toHaveBeenCalledTimes(1);
  expect(fixture.fetchNotifications).toHaveBeenCalledTimes(1);

  view.unmount();
  act(() => {
    onStatus?.('TIMED_OUT');
    onStatus?.('SUBSCRIBED');
  });
  expect(fixture.refresh).toHaveBeenCalledTimes(1);
});

it('links to the workspace unread inbox with the current unread total', () => {
  const view = render(
    <AppSidebar
      workspaces={[]}
      currentWorkspace={{ id: 'workspace-1', slug: 'acme', name: 'Acme' } as never}
      channels={[{ id: 'channel-1', name: 'general', type: 'PUBLIC', unreadCount: 4 } as never]}
      starredChannels={[]}
      user={{ id: 'viewer', name: 'Viewer', email: 'viewer@example.test', avatar: '' }}
    />,
  );

  expect(view.getByRole('link', { name: /Unread 4/ })).toHaveAttribute('href', '/acme/unreads');
});

it('bounds the activity surface to the current viewport', () => {
  const view = render(
    <AppSidebar
      workspaces={[]}
      currentWorkspace={{ id: 'workspace-1', slug: 'acme', name: 'Acme' } as never}
      channels={[]}
      starredChannels={[]}
      user={{ id: 'viewer', name: 'Viewer', email: 'viewer@example.test', avatar: '' }}
    />,
  );

  expect(view.getByTestId('activity-popover')).toHaveClass(
    'w-[calc(100vw-2rem)]',
    'max-w-[500px]',
    'max-h-[calc(100dvh-2rem)]',
  );
  expect(view.getByTestId('activity-popover')).toHaveAttribute('data-side', 'top');
});
