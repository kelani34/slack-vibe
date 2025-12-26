'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MessageList } from '@/components/message-list';
import { MessageInput } from '@/components/message-input';
import { ThreadSidebar } from '@/components/thread-sidebar';
import { ProfileSidebar } from '@/components/profile-sidebar';
import { PinnedBookmarkedPanel } from '@/components/pinned-bookmarked-panel';
import { useThreadStore } from '@/stores/thread-store';
import { useProfileStore } from '@/stores/profile-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { ChannelAccessDenied } from '@/components/channel/channel-access-denied';

interface ChatPanelProps {
  channelId: string;
  workspaceId: string;
  workspaceSlug: string;
  userId: string;
  userRole?: string;
  channelCreatorId?: string | null;
  isArchived: boolean;
  channelPostingPermission?:
    | 'EVERYONE'
    | 'ADMIN_ONLY'
    | 'OWNER_ONLY'
    | 'SELECTED_MEMBERS';
  currentUser?: {
    id: string;
    name: string;
    image?: string | null;
  };
  isChannelMember?: boolean;
  lastReadAt?: Date;
}

export function ChatPanel({
  channelId,
  workspaceSlug,
  userId,
  userRole,
  isArchived = false,
  channelCreatorId,
  channelPostingPermission = 'EVERYONE',
  currentUser,
  isChannelMember = true,
  lastReadAt,
}: ChatPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMember, setIsMember] = useState(isChannelMember);

  // Realtime channel updates (permissions, archive status, membership)
  useEffect(() => {
    const supabase = createClient();

    // Channel settings updates
    const channelSettings = supabase
      .channel(`channel-settings:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channels',
          filter: `id=eq.${channelId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    // Membership updates - handle kicking/leaving immediately
    const memberChannel = supabase
      .channel(`channel-membership:${channelId}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT and DELETE
          schema: 'public',
          table: 'channel_members',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          // Check if it affects current user
          if (payload.old && (payload.old as any).user_id === userId) {
            if (payload.eventType === 'DELETE') {
              setIsMember(false);
            }
          } else if (payload.new && (payload.new as any).user_id === userId) {
            if (payload.eventType === 'INSERT') {
              setIsMember(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSettings);
      supabase.removeChannel(memberChannel);
    };
  }, [channelId, router, userId]);

  if (!isMember) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChannelAccessDenied />
        </div>
      </div>
    );
  }

  // Highlighted message for scroll-to and flash animation
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);

  // Get thread and message from URL (for shareable links)
  const urlThreadId = searchParams.get('thread');
  const urlMessageId = searchParams.get('message');

  // Use Zustand stores
  const storedThreadId = useThreadStore(
    (state) => state.activeThreads[channelId] || null
  );
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  const activeProfileUserId = useProfileStore(
    (state) => state.activeProfileUserId
  );
  const previousView = useProfileStore((state) => state.previousView);
  const setActiveProfile = useProfileStore((state) => state.setActiveProfile);
  const clearProfile = useProfileStore((state) => state.clearProfile);

  // URL takes priority for initial load, then use stored state
  const activeThreadId = urlThreadId || storedThreadId;

  // Sync URL thread to store on initial load
  useEffect(() => {
    if (urlThreadId && urlThreadId !== storedThreadId) {
      setActiveThread(channelId, urlThreadId);
    }
  }, [urlThreadId, storedThreadId, channelId, setActiveThread]);

  // Handle message link highlight on initial load
  useEffect(() => {
    if (urlMessageId) {
      // If thread param also exists, delay to let thread load first
      const delay = urlThreadId ? 600 : 0;
      const timer = setTimeout(() => {
        setHighlightedMessageId(urlMessageId);
        // Clear highlight after 1 second
        setTimeout(() => {
          setHighlightedMessageId(null);
          // Clear from URL
          const params = new URLSearchParams(searchParams.toString());
          params.delete('message');
          const newUrl = params.toString()
            ? `${pathname}?${params.toString()}`
            : pathname;
          router.replace(newUrl, { scroll: false });
        }, 1000);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [urlMessageId, urlThreadId, pathname, router, searchParams]);

  const handleThreadSelect = (threadId: string) => {
    // Close profile sidebar when opening thread
    clearProfile();
    setActiveThread(channelId, threadId);
    // Update URL for shareable links
    const params = new URLSearchParams(searchParams.toString());
    params.set('thread', threadId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleThreadClose = () => {
    setActiveThread(channelId, null);
    // Remove thread from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('thread');
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const handleProfileSelectFromChannel = (profileUserId: string) => {
    // If thread is open, track that so user can go back to it
    const fromView = activeThreadId ? 'thread' : 'channel';
    setActiveProfile(profileUserId, fromView);
  };

  const handleProfileBack = () => {
    // If opened from thread, restore thread view
    if (previousView === 'thread' && storedThreadId) {
      clearProfile();
      // Restore thread in URL
      const params = new URLSearchParams(searchParams.toString());
      params.set('thread', storedThreadId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else {
      clearProfile();
    }
  };

  // Handle click on pinned/bookmarked message
  const handlePinnedMessageClick = (
    messageId: string,
    parentId?: string | null
  ) => {
    // If message is in a thread, open the thread first
    if (parentId) {
      // Open the thread
      setActiveThread(channelId, parentId);
      const params = new URLSearchParams(searchParams.toString());
      params.set('thread', parentId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      // Delay highlight to let thread load
      setTimeout(() => {
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 1000);
      }, 500);
    } else {
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 1000);
    }
  };

  // Determine which sidebar to show (profile takes priority if selected)
  const showProfile = !!activeProfileUserId;
  const showThread = !!activeThreadId && !showProfile;

  // Permission Logic
  const isWorkspaceAdmin = userRole === 'ADMIN' || userRole === 'OWNER';
  const isCreator = userId === channelCreatorId;
  const canPost =
    channelPostingPermission === 'EVERYONE' ||
    (channelPostingPermission === 'ADMIN_ONLY' && isWorkspaceAdmin) ||
    (channelPostingPermission === 'OWNER_ONLY' &&
      (userRole === 'OWNER' || isCreator));

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Pinned/Bookmarked panel */}
        <PinnedBookmarkedPanel
          channelId={channelId}
          onMessageClick={handlePinnedMessageClick}
        />
        <MessageList
          channelId={channelId}
          onThreadSelect={handleThreadSelect}
          onProfileSelect={handleProfileSelectFromChannel}
          highlightedMessageId={highlightedMessageId}
          currentUserId={userId}
          userRole={userRole}
          isArchived={isArchived}
          lastReadAt={lastReadAt}
        />

        <MessageInput
          channelId={channelId}
          currentUser={currentUser}
          isArchived={isArchived}
          isDisabled={!canPost}
          disabledMessage="You do not have permission to post in this channel"
        />
      </div>
      {showThread && (
        <ThreadSidebar
          parentMessageId={activeThreadId!}
          channelId={channelId}
          onClose={handleThreadClose}
          highlightedMessageId={highlightedMessageId}
          currentUserId={userId}
          userRole={userRole}
          isArchived={isArchived}
          currentUser={currentUser}
        />
      )}
      {showProfile && (
        <ProfileSidebar
          workspaceSlug={workspaceSlug}
          currentUserId={userId}
          onBack={previousView === 'thread' ? handleProfileBack : undefined}
        />
      )}
    </div>
  );
}
