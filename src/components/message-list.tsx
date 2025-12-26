'use client';

import { getMessages, getMessageById } from '@/actions/message';
import { MessageItem } from '@/components/message-item';
import { createClient } from '@/lib/supabase/client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  differenceInMinutes,
  format,
  isSameDay,
  isToday,
  isYesterday,
} from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Message } from '@prisma/client';
import { markChannelAsRead } from '@/actions/channel-member';

interface MessageListProps {
  channelId: string;
  onThreadSelect?: (messageId: string) => void;
  onProfileSelect?: (userId: string) => void;
  highlightedMessageId?: string | null;
  currentUserId?: string;
  userRole?: string;
  isArchived?: boolean;
  lastReadAt?: Date;
}

// Group messages from same user within 5 minutes
function shouldShowAvatar(
  currentMessage: any,
  previousMessage: any | undefined
): boolean {
  if (!previousMessage) return true;
  if (currentMessage.userId !== previousMessage.userId) return true;

  const diff = differenceInMinutes(
    new Date(currentMessage.createdAt),
    new Date(previousMessage.createdAt)
  );
  return diff >= 5;
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM do, yyyy');
}

export function MessageList({
  channelId,
  onThreadSelect,
  onProfileSelect,
  highlightedMessageId,
  currentUserId,
  userRole,
  isArchived = false,
  lastReadAt,
}: MessageListProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref to track if we should auto-scroll to bottom
  const shouldScrollToBottomRef = useRef(true);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['messages', channelId],
      queryFn: ({ pageParam }) =>
        getMessages(channelId, pageParam as string | undefined),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage: any) => {
        // If we got fewer than 50 messages, we've reached the end
        if (!lastPage || lastPage.length < 50) return undefined;
        // Cursor is the ID of the oldest message in the batch (first item because we reversed it in action)
        return lastPage[0]?.id as string;
      },
    });

  // Flatten and reverse pages to get messages in chronological order
  // pages are [NewestBatch, OlderBatch...]
  // Each batch is [Oldest...Newest]
  // We want [OlderBatch, NewestBatch]
  const messages = data?.pages.slice().reverse().flat() || [];

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px 0px 0px 0px', // Trigger before hitting top
  });

  // Track initial lastReadAt to prevent line logic from flickering if revalidated mid-session
  // (We want the line to stay until user leaves/refreshes manually)
  const [initialReadAt] = useState(lastReadAt);

  useEffect(() => {
    // Mark as read on mount
    if (channelId) {
      markChannelAsRead(channelId);
    }
  }, [channelId]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      // ... remainder of scroll logic ...
      // Capture scroll position before loading more
      if (containerRef.current) {
        const { scrollHeight, scrollTop } = containerRef.current;
        // Store current offset from bottom
        const scrollBottom = scrollHeight - scrollTop;

        fetchNextPage().then(() => {
          // ...
        });
      } else {
        fetchNextPage();
      }
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Manage scroll position when messages update
  const prevMessagesLength = useRef(0);
  const prevFirstMessageId = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const isNewMessage = messages.length > prevMessagesLength.current;
    const hasAddedOlderMessages =
      messages.length > 0 &&
      messages[0].id !== prevFirstMessageId.current &&
      prevFirstMessageId.current !== null &&
      messages.length > prevMessagesLength.current; // Simple heuristic

    // If we added older messages (pagination), we need to adjust scroll to prevent jumping
    if (hasAddedOlderMessages) {
      // Ideally we'd have captured scrollHeight before render.
      // But we can assume the browser might have messed it up or kept scrollTop same.
      // If scrollTop is 0 (at top) and we add content, we want scrollTop to be (newHeight - oldHeight).
      // Use useLayoutEffect ideally, but inside this effect:
      // This runs AFTER render.
      // If we implement 'overflow-anchor: auto', we might not need this.
      // Let's rely on standard scrolling first, but if new message at bottom:
    } else if (isNewMessage) {
      // New message at bottom?
      const lastMessage = messages[messages.length - 1];
      const prevLast = prevMessagesLength.current > 0 ? 'unknown' : null; // We don't track prev last easily here without state

      // Force scroll to bottom if we were already there OR if it's the very first load
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isAtBottom || prevMessagesLength.current === 0) {
        shouldScrollToBottomRef.current = true;
      }
    }

    prevMessagesLength.current = messages.length;
    prevFirstMessageId.current = messages[0]?.id || null;

    if (shouldScrollToBottomRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      shouldScrollToBottomRef.current = false;
    }
  }, [messages, isFetchingNextPage]);

  // Realtime updates handled by useEffect below...
  useEffect(() => {
    const supabase = createClient();
    const channelName = `room:${channelId}`;

    // Function to handle appending message from ANY source (Simulated or Realtime)
    const handleNewMessage = async (newMsgPartial: any) => {
      // Filter for current channel
      if (newMsgPartial.channelId !== channelId) return;

      // Ignore own messages (handled by optimistic UI)
      if (newMsgPartial.userId === currentUserId) return;

      try {
        const fullMessage = await getMessageById(newMsgPartial.id);

        if (fullMessage) {
          queryClient.setQueryData(['messages', channelId], (old: any) => {
            if (!old || !old.pages || old.pages.length === 0) return old;

            // Create deep-ish clones
            const newPages = [...old.pages];
            const latestPage = [...newPages[0]];

            // Deduplication check
            if (latestPage.some((m: any) => m.id === fullMessage.id)) {
              return old;
            }

            latestPage.push(fullMessage);
            newPages[0] = latestPage;

            return { ...old, pages: newPages };
          });

          // Ensure unread status is cleared for this active channel
          markChannelAsRead(channelId);
        } else {
          queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
        }
      } catch (err) {
        console.error('MessageList: Error handling new message', err);
        queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      }
    };

    // 1. Listen to global fallback event from AppSidebar
    const handleWindowMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      handleNewMessage(customEvent.detail);
    };

    if (typeof window !== 'undefined') {
      window.removeEventListener('supabase-new-message', handleWindowMessage);
      window.addEventListener('supabase-new-message', handleWindowMessage);
    }

    // 2. Direct Subscription (Backup)
    // We are matching AppSidebar logic EXACTLY: Filter=INSERT, Schema=public, Table=messages
    // Just using a different channel topic to avoid collision.
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'messages',
        },
        async (payload: any) => {
          if (payload.eventType === 'INSERT') {
            handleNewMessage(payload.new);
          } else if (payload.eventType === 'DELETE') {
            // Handle deletions
            const deletedId = payload.old.id;
            queryClient.setQueryData(['messages', channelId], (old: any) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page: any[]) =>
                  page.filter((msg) => msg.id !== deletedId)
                ),
              };
            });
          } else if (payload.eventType === 'UPDATE') {
            // Handle updates (edits)
            const updatedMsg = payload.new;
            queryClient.setQueryData(['messages', channelId], (old: any) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page: any[]) =>
                  page.map((msg) => {
                    if (msg.id === updatedMsg.id) {
                      return { ...msg, ...updatedMsg, isEdited: true };
                    }
                    return msg;
                  })
                ),
              };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        (payload: any) => {
          // Manual cache update for reactions to avoid full refetch
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new;
            queryClient.setQueryData(['messages', channelId], (old: any) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page: any[]) =>
                  page.map((msg) => {
                    if (msg.id === newReaction.messageId) {
                      // Prevent duplicates
                      if (
                        msg.reactions?.some((r: any) => r.id === newReaction.id)
                      ) {
                        return msg;
                      }
                      return {
                        ...msg,
                        reactions: [...(msg.reactions || []), newReaction],
                      };
                    }
                    return msg;
                  })
                ),
              };
            });
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old;
            queryClient.setQueryData(['messages', channelId], (old: any) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page: any[]) =>
                  page.map((msg) => {
                    if (
                      msg.reactions?.some((r: any) => r.id === oldReaction.id)
                    ) {
                      return {
                        ...msg,
                        reactions: msg.reactions.filter(
                          (r: any) => r.id !== oldReaction.id
                        ),
                      };
                    }
                    return msg;
                  })
                ),
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('supabase-new-message', handleWindowMessage);
      }
    };
  }, [channelId, queryClient, currentUserId]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 overflow-hidden flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 relative"
      // overflow-anchor-auto helps maintain scroll position when content is added at top
      style={{ overflowAnchor: 'auto' }}
    >
      <div className="py-4 min-h-full flex flex-col justify-end">
        {/* Loading trigger for older messages */}
        <div
          ref={loadMoreRef}
          className="h-4 flex items-center justify-center w-full my-2"
        >
          {isFetchingNextPage && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>

        {messages?.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : undefined;
          const showAvatar = shouldShowAvatar(message, previousMessage);

          // Determine if we should show "New Messages" line
          // Show ABOVE this message if:
          // 1. We have an initialReadAt
          // 2. This message is NEWER than initialReadAt
          // 3. The PREVIOUS message (index > 0) was OLDER or equal to initialReadAt
          //    OR this is the first message (index 0) and it's unread
          const isFirstUnread =
            initialReadAt &&
            message.userId !== currentUserId &&
            new Date(message.createdAt) > initialReadAt &&
            (!previousMessage ||
              new Date(previousMessage.createdAt) <= initialReadAt);

          return (
            <div key={message.id}>
              {isFirstUnread && (
                <div className="relative py-2 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-red-500" />
                  </div>
                  <div className="relative bg-background px-2 text-xs font-bold text-red-500">
                    New Messages
                  </div>
                </div>
              )}
              {(!previousMessage ||
                !isSameDay(
                  new Date(previousMessage.createdAt),
                  new Date(message.createdAt)
                )) && (
                <div className="relative py-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative bg-background px-4 text-xs font-medium text-muted-foreground border border-border rounded-full py-1 shadow-sm">
                    {formatDateLabel(new Date(message.createdAt))}
                  </div>
                </div>
              )}
              <MessageItem
                message={message}
                showAvatar={showAvatar}
                onThreadSelect={onThreadSelect}
                onProfileSelect={onProfileSelect}
                showThreadIndicator={true}
                isHighlighted={highlightedMessageId === message.id}
                currentUserId={currentUserId}
                userRole={userRole}
                isArchived={isArchived}
              />
            </div>
          );
        })}
        {messages?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        )}

        <div ref={scrollRef} />
      </div>
    </div>
  );
}
