'use client';

import * as React from 'react';
import { GalleryVerticalEnd, Hash, Settings, Users, Bell, Bookmark, CalendarClock, Search, Inbox } from 'lucide-react';
import Link from 'next/link';
import { NotificationSidebar } from '@/components/notification-sidebar';
import { NotificationList } from '@/components/notification-list';
import { useNotificationStore } from '@/stores/notification-store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchDialog } from '@/components/search-dialog';

import { NavChannels, type SidebarChannel } from '@/components/nav-channels';
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
import type { Message, Workspace } from '@prisma/client';

import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { unreadCountAfterMessage } from '@/lib/channel-unread';
import { useIsMobile } from '@/hooks/use-mobile';

// ... (imports)

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  channels: SidebarChannel[];
  starredChannels: SidebarChannel[];
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
}

type ChannelUnreadOverride = {
  count: number;
  serverCount: number | undefined;
  lastViewedAt: number | undefined;
};

function displayedUnreadCount(
  channel: SidebarChannel,
  overrides: Map<string, ChannelUnreadOverride>,
) {
  const override = overrides.get(channel.id);
  const lastViewedAt = channel.lastViewedAt?.getTime();
  if (
    !override ||
    override.serverCount !== channel.unreadCount ||
    override.lastViewedAt !== lastViewedAt
  ) {
    return channel.unreadCount ?? 0;
  }
  return override.count;
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
  const params = useParams();
  const isMobile = useIsMobile();
  const currentChannelId = params?.channelId as string | undefined;
  const { isOpen, unreadCount } = useNotificationStore();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [liveUnreadCounts, setLiveUnreadCounts] = React.useState<Map<string, ChannelUnreadOverride>>(() => new Map());
  
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Use ref for channels to avoid re-subscribing when unread counts change
  const channelsRef = React.useRef(channels);
  const currentChannelIdRef = React.useRef(currentChannelId);
  const liveUnreadCountsRef = React.useRef(liveUnreadCounts);
  const seenMessageIdsRef = React.useRef(new Set<string>());

  const setLiveUnreadCount = React.useCallback((channel: SidebarChannel, count: number) => {
    const next = new Map(liveUnreadCountsRef.current);
    next.set(channel.id, {
      count,
      serverCount: channel.unreadCount,
      lastViewedAt: channel.lastViewedAt?.getTime(),
    });
    liveUnreadCountsRef.current = next;
    setLiveUnreadCounts(next);
  }, []);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels, starredChannels]);

  useEffect(() => {
    currentChannelIdRef.current = currentChannelId;
  }, [currentChannelId]);

  useEffect(() => {
    const supabase = createClient();
    let connectionNeedsResync = false;
    let effectIsActive = true;

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
        (payload: { new: Partial<Message> }) => {
          const message = payload.new;
          const channel = channelsRef.current.find(({ id }) => id === message.channelId);
          if (!channel || !message.id) return;
          if (seenMessageIdsRef.current.has(message.id)) return;
          seenMessageIdsRef.current.add(message.id);
          if (seenMessageIdsRef.current.size > 500) {
            const oldestId = seenMessageIdsRef.current.values().next().value;
            if (oldestId) seenMessageIdsRef.current.delete(oldestId);
          }

          const currentCount = displayedUnreadCount(channel, liveUnreadCountsRef.current);
          const nextCount = unreadCountAfterMessage(currentCount, message, user.id, channel.lastViewedAt ?? new Date());
          if (nextCount === currentCount || message.userId === user.id) return;

          const channelIsFocused =
            currentChannelIdRef.current === channel.id &&
            document.visibilityState === 'visible' &&
            document.hasFocus();
          if (!channelIsFocused) setLiveUnreadCount(channel, nextCount);
        }
      )
      .subscribe((status) => {
        if (!effectIsActive) return;

        if (status === 'SUBSCRIBED') {
          if (connectionNeedsResync) {
            connectionNeedsResync = false;
            router.refresh();
            void useNotificationStore.getState().fetchNotifications();
          }
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          connectionNeedsResync = true;
        }
      });

    const handleChannelRead = (event: Event) => {
      const detail = (event as CustomEvent<{ channelId?: string }>).detail;
      const channel = detail?.channelId && channelsRef.current.find(({ id }) => id === detail.channelId);
      if (channel) setLiveUnreadCount(channel, 0);
    };
    window.addEventListener('channel-read', handleChannelRead);

    return () => {
      effectIsActive = false;
      supabase.removeChannel(channel);
      window.removeEventListener('channel-read', handleChannelRead);
    };
  }, [setLiveUnreadCount, user.id, router]); // Keep the subscription stable between channel switches

  const formattedWorkspaces = workspaces.map((w) => ({
    name: w.name,
    // ...
    slug: w.slug,
    logo: GalleryVerticalEnd,
    plan: 'Free',
  }));

  // Get starred channel IDs for filtering
  const channelsWithUnread = channels.map((channel) => {
    const count = displayedUnreadCount(channel, liveUnreadCounts);
    return count === channel.unreadCount ? channel : { ...channel, unreadCount: count };
  });
  const starredChannelsWithUnread = starredChannels.map((channel) => {
    const count = displayedUnreadCount(channel, liveUnreadCounts);
    return count === channel.unreadCount ? channel : { ...channel, unreadCount: count };
  });
  const starredIds = new Set(starredChannelsWithUnread.map((c) => c.id));

  // Non-starred channels
  const isDirectMessage = (channel: SidebarChannel) =>
    channel.type === 'DIRECT' || channel.name.startsWith('dm-');
  const directMessages = channelsWithUnread.filter(isDirectMessage);
  const nonStarredChannels = channelsWithUnread.filter(
    (channel) => !isDirectMessage(channel) && !starredIds.has(channel.id)
  );
  const starredRegularChannels = starredChannelsWithUnread.filter((channel) => !isDirectMessage(channel));
  const totalUnreadMessages = channelsWithUnread.reduce(
    (total, channel) => total + (channel.unreadCount ?? 0),
    0,
  );

  // ... (previous useEffects)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher
          workspaces={formattedWorkspaces}
          currentWorkspaceSlug={currentWorkspace?.slug}
        />
        <SidebarMenu>
           <SidebarMenuItem>
             <SidebarMenuButton onClick={() => setIsSearchOpen(true)} tooltip="Search">
                <Search className="h-4 w-4" />
                <span>Search</span>
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
             </SidebarMenuButton>
           </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>

        {isOpen ? (
          <NotificationSidebar />
        ) : (
          <>
            {/* Starred Channels Section */}
            <NavChannels
              channels={starredRegularChannels}
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

            <NavChannels
              channels={directMessages}
              workspaceSlug={currentWorkspace?.slug}
              workspaceId={currentWorkspace?.id}
              sectionLabel="Direct messages"
              sectionHref={`/${currentWorkspace?.slug}/dms`}
              showCreateButton={false}
              isDirect
            />

            {/* Workspace Settings and Activity */}
            <SidebarGroup className="group-data-[collapsible=icon]:hidden mt-auto">
              {/* ... existing items ... */} 
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Unread">
                    <Link
                      href={`/${currentWorkspace?.slug}/unreads`}
                      aria-label={`Unread ${totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}`}
                    >
                      <Inbox className="h-4 w-4" />
                      <span>Unread</span>
                      {totalUnreadMessages > 0 && (
                        <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                          {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                    <PopoverContent
                      side={isMobile ? 'top' : 'right'}
                      align="start"
                      className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[500px] overflow-hidden p-0"
                    >
                      <div className="p-4 border-b">
                        <h4 className="font-medium text-sm">Notifications</h4>
                      </div>
                      <div className="max-h-[min(500px,calc(100dvh-7rem))] overflow-y-auto p-2">
                        <NotificationList onItemClick={() => setIsPopoverOpen(false)} />
                      </div>
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={`/${currentWorkspace?.slug}/saved-items`}>
                      <Bookmark className="h-4 w-4" />
                      <span>Saved Items</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={`/${currentWorkspace?.slug}/scheduled`}>
                      <CalendarClock className="h-4 w-4" />
                      <span>Scheduled</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
      <SearchDialog 
        open={isSearchOpen} 
        onOpenChange={setIsSearchOpen}
        workspaceSlug={currentWorkspace?.slug}
      />
    </Sidebar>
  );
}
