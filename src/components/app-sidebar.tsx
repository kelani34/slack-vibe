'use client';

import * as React from 'react';
import { GalleryVerticalEnd, Hash, Settings, Users, Bell } from 'lucide-react';
import Link from 'next/link';
import { NotificationSidebar } from '@/components/notification-sidebar';
import { NotificationList } from '@/components/notification-list';
import { useNotificationStore } from '@/stores/notification-store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { NavChannels } from '@/components/nav-channels';
import { NavUser } from '@/components/nav-user';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import type { Channel, Workspace } from '@prisma/client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// ... (imports)

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  channels: (Channel & { unreadCount?: number })[];
  starredChannels: (Channel & { unreadCount?: number })[];
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
}

export function AppSidebar({
  workspaces,
  currentWorkspace,
  channels,
  starredChannels,
  user,
  ...props
}: AppSidebarProps) {
  const router = useRouter();
  const { isOpen, setIsOpen, unreadCount } = useNotificationStore();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  // Use ref for channels to avoid re-subscribing when unread counts change
  const channelsRef = React.useRef(channels);
  const starredChannelsRef = React.useRef(starredChannels);

  useEffect(() => {
    channelsRef.current = channels;
    starredChannelsRef.current = starredChannels;
  }, [channels, starredChannels]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('sidebar-realtime')
      // Listen for membership changes (added/removed from channels)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_members',
          filter: `userId=eq.${user.id}`,
        },
        () => {
          router.refresh();
        }
      )
      // Listen for starred channel changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'starred_channels',
          filter: `userId=eq.${user.id}`,
        },
        () => {
          router.refresh();
        }
      )
      // Listen for new notifications
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${user.id}`,
        },
        () => {
          // Fetch fresh notifications to get actor details and update count
          useNotificationStore.getState().fetchNotifications();
          router.refresh();
        }
      )
      // Listen for new messages to update unread counts
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          // Refresh if message is in one of our channels and NOT from us
          const allChannelIds = new Set([
            ...channelsRef.current.map((c) => c.id),
            ...starredChannelsRef.current.map((c) => c.id),
          ]);

          if (
            allChannelIds.has(payload.new.channelId) &&
            payload.new.userId !== user.id
          ) {
            // Dispatch global event for MessageList to consume if its own subscription fails
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('supabase-new-message', {
                detail: payload.new,
              });
              window.dispatchEvent(event);
            }

            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, router]); // Dependency list kept minimal to avoid re-subscription loops

  const formattedWorkspaces = workspaces.map((w) => ({
    name: w.name,
    // ...
    slug: w.slug,
    logo: GalleryVerticalEnd,
    plan: 'Free',
  }));

  // Get starred channel IDs for filtering
  const starredIds = new Set(starredChannels.map((c) => c.id));

  // Non-starred channels
  const nonStarredChannels = channels.filter((c) => !starredIds.has(c.id));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={formattedWorkspaces}
          currentWorkspaceSlug={currentWorkspace?.slug}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <SidebarMenuButton 
                    isActive={isOpen || isPopoverOpen} 
                    tooltip="Activity"
                  >
                    <Bell className="h-4 w-4" />
                    <span>Activity</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="w-[500px] p-0">
                  <div className="p-4 border-b">
                    <h4 className="font-medium text-sm">Notifications</h4>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto p-2">
                    <NotificationList onItemClick={() => setIsPopoverOpen(false)} />
                  </div>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {isOpen ? (
          <NotificationSidebar />
        ) : (
          <>
            {/* Starred Channels Section */}
            <NavChannels
              channels={starredChannels}
              workspaceSlug={currentWorkspace?.slug}
              workspaceId={currentWorkspace?.id}
              sectionLabel="Starred"
              showCreateButton={false}
            />

            {/* All Channels Section */}
            <NavChannels
              channels={nonStarredChannels}
              workspaceSlug={currentWorkspace?.slug}
              workspaceId={currentWorkspace?.id}
              sectionLabel="Channels"
              showCreateButton={true}
            />

            {/* Workspace Settings */}
            <SidebarGroup className="group-data-[collapsible=icon]:hidden mt-auto">
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={`/${currentWorkspace?.slug}/browse-channels`}>
                      <Hash className="h-4 w-4" />
                      <span>Browse Channels</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={`/${currentWorkspace?.slug}/members`}>
                      <Users className="h-4 w-4" />
                      <span>Members</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={`/${currentWorkspace?.slug}/settings`}>
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
