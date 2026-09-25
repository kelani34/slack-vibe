'use client';

import { getMessages, getMessageById, getMessageContext } from '@/actions/message';
import { MessageItem } from '@/components/message-item';
import { createClient } from '@/lib/supabase/client';
import { type InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  format,
  isSameDay,
  isToday,
  isYesterday,
} from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import type { Message, Reaction } from '@prisma/client';
import { markChannelAsRead } from '@/actions/channel-member';
import { shouldShowAvatar } from '@/lib/message-presentation';
import { messageQueryKeys } from '@/lib/message-query-keys';

type MessageListEntry = Pick<
  Message,
  'id' | 'channelId' | 'userId' | 'content' | 'createdAt' | 'updatedAt' | 'parentId'
> & {
  reactions?: Array<Omit<Reaction, 'createdAt'> & { createdAt: Date | string }>;
  replies?: Array<{ content: string; createdAt: Date; user: { id: string; name: string | null; avatarUrl: string | null } }>;
  _count?: { replies: number };
  isEdited?: boolean;
};
type MessagePages = InfiniteData<MessageListEntry[], string | undefined>;
type ConversationViewport = {
  scrollTop: number;
  wasAtBottom: boolean;
  focusedMessageId: string | null;
  focusWasInList: boolean;
};
type MessageRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<Message>;
  old: Partial<Message>;
};
type ReactionRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<Reaction> & { createdAt?: Date | string };
  old: Partial<Reaction>;
};

interface MessageListProps {
  channelId: string;
  onThreadSelect?: (messageId: string) => void;
  onProfileSelect?: (userId: string) => void;
  highlightedMessageId?: string | null;
  jumpToMessageId?: string | null;
  currentUserId?: string;
  userRole?: string;
  isArchived?: boolean;
  lastReadAt?: Date;
  workspaceId: string;
  onForward?: (messageId: string) => void;
  onContextExit?: () => void;
  messages?: Message[];
}

const conversationViewports = new Map<string, ConversationViewport>();

function rememberConversationViewport(key: string, viewport: ConversationViewport) {
  conversationViewports.delete(key);
  if (conversationViewports.size >= 100) {
    const oldestKey = conversationViewports.keys().next().value;
    if (oldestKey) conversationViewports.delete(oldestKey);
  }
  conversationViewports.set(key, viewport);
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM do, yyyy');
}

async function markReadAndUpdateSidebar(channelId: string) {
  if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
  const result = await markChannelAsRead(channelId);
  if ('error' in result) return;
  window.dispatchEvent(new CustomEvent('channel-read', { detail: { channelId } }));
}

export function MessageList({
  channelId,
  onThreadSelect,
  onProfileSelect,
  highlightedMessageId,
  jumpToMessageId,
  currentUserId,
  userRole,
  isArchived = false,
  lastReadAt,
  workspaceId,
  onForward,
  onContextExit,
  messages: providedMessages,
}: MessageListProps) {
  const queryClient = useQueryClient();
  const timelineKey = useMemo(
    () => messageQueryKeys.timeline(currentUserId ?? 'anonymous', workspaceId, channelId),
    [channelId, currentUserId, workspaceId],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportKey = `${currentUserId ?? 'anonymous'}:${workspaceId}:${channelId}`;
  // Ref to track if we should auto-scroll to bottom
  const shouldScrollToBottomRef = useRef(true);
  const pendingViewportRestoreRef = useRef<ConversationViewport | null>(
    jumpToMessageId ? null : conversationViewports.get(viewportKey) ?? null,
  );
  const previousViewportKeyRef = useRef(viewportKey);
  const previousJumpToMessageIdRef = useRef(jumpToMessageId ?? null);
  const prevMessagesLength = useRef(0);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: timelineKey,
      queryFn: ({ pageParam }) =>
        getMessages(channelId, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => {
        // If we got fewer than 50 messages, we've reached the end
        if (!lastPage || lastPage.length < 50) return undefined;
        // Cursor is the ID of the oldest message in the batch (first item because we reversed it in action)
        return lastPage[0]?.id;
      },
      enabled: !providedMessages && !!currentUserId, // Wait for the viewer before fetching private history
    });

  // Flatten and reverse pages to get messages in chronological order
  // pages are [NewestBatch, OlderBatch...]
  // Each batch is [Oldest...Newest]
  // We want [OlderBatch, NewestBatch]
  const messages = useMemo(
    () => providedMessages ?? data?.pages.slice().reverse().flat() ?? [],
    [providedMessages, data?.pages],
  );

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px 0px 0px 0px', // Trigger before hitting top
  });

  // Track initial lastReadAt to prevent line logic from flickering if revalidated mid-session
  // (We want the line to stay until user leaves/refreshes manually)
  const [initialReadAt] = useState(lastReadAt);
  const readCursorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenMessageIdsRef = useRef(new Set<string>());
  const previousTimelineRef = useRef<MessagePages | undefined>(undefined);
  const isShowingContextRef = useRef(false);
  const [contextTargetMessageId, setContextTargetMessageId] = useState<string | null>(null);
  const [contextRequestMessageId, setContextRequestMessageId] = useState(jumpToMessageId ?? null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextUnavailable, setContextUnavailable] = useState(false);
  const [contextLoadFailed, setContextLoadFailed] = useState(false);
  const [contextRetryAttempt, setContextRetryAttempt] = useState(0);

  const rememberCurrentViewport = useCallback(() => {
    const container = containerRef.current;
    if (!container || isShowingContextRef.current) return;

    const activeElement = document.activeElement;
    const focusedMessage = activeElement instanceof HTMLElement
      ? activeElement.closest<HTMLElement>('[data-message-viewport]')
      : null;
    rememberConversationViewport(previousViewportKeyRef.current, {
      scrollTop: container.scrollTop,
      wasAtBottom: container.scrollHeight - container.scrollTop - container.clientHeight < 100,
      focusedMessageId: focusedMessage?.id ?? null,
      focusWasInList: activeElement instanceof Node && container.contains(activeElement),
    });
  }, []);

  const returnToLatest = useCallback((updateLocation = true) => {
    const savedViewport = conversationViewports.get(viewportKey);
    pendingViewportRestoreRef.current = savedViewport
      ? { ...savedViewport, focusWasInList: true }
      : { scrollTop: 0, wasAtBottom: true, focusedMessageId: null, focusWasInList: true };
    const previous = previousTimelineRef.current;
    previousTimelineRef.current = undefined;
    isShowingContextRef.current = false;
    setContextTargetMessageId(null);
    setContextRequestMessageId(null);
    setContextUnavailable(false);
    setContextLoadFailed(false);
    shouldScrollToBottomRef.current = true;
    if (previous) queryClient.setQueryData(timelineKey, previous);
    else void queryClient.invalidateQueries({ queryKey: timelineKey, exact: true });
    if (updateLocation) onContextExit?.();
  }, [onContextExit, queryClient, timelineKey, viewportKey]);

  useEffect(() => {
    if (previousViewportKeyRef.current !== viewportKey) {
      rememberCurrentViewport();
      previousViewportKeyRef.current = viewportKey;
      pendingViewportRestoreRef.current = jumpToMessageId
        ? null
        : conversationViewports.get(viewportKey) ?? null;
      prevMessagesLength.current = 0;
    }

    const previousTarget = previousJumpToMessageIdRef.current;
    previousJumpToMessageIdRef.current = jumpToMessageId ?? null;
    if (jumpToMessageId) {
      setContextRequestMessageId(jumpToMessageId);
      return;
    }

    if (previousTarget && isShowingContextRef.current) returnToLatest(false);
    else if (previousTarget) {
      setContextRequestMessageId(null);
      setContextUnavailable(false);
      setContextLoadFailed(false);
      setIsLoadingContext(false);
    }
  }, [jumpToMessageId, rememberCurrentViewport, returnToLatest, viewportKey]);

  useEffect(() => () => rememberCurrentViewport(), [rememberCurrentViewport]);

  useEffect(() => {
    if (!contextTargetMessageId) return;
    const element = document.getElementById(`message-${contextTargetMessageId}`);
    if (!element) return;
    shouldScrollToBottomRef.current = false;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView?.({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    element.focus({ preventScroll: true });
  }, [contextTargetMessageId, messages]);

  useEffect(() => {
    if (!contextRequestMessageId) return;
    let isCurrentRequest = true;
    const queryKey = timelineKey;
    setContextUnavailable(false);
    setContextLoadFailed(false);
    setIsLoadingContext(true);

    const loadContext = async () => {
      try {
        const context = await getMessageContext(contextRequestMessageId, channelId);
        if (!isCurrentRequest) return;

        if (!context) {
          if (isShowingContextRef.current) {
            const previous = previousTimelineRef.current;
            if (previous) queryClient.setQueryData(queryKey, previous);
            else void queryClient.invalidateQueries({ queryKey, exact: true });
            previousTimelineRef.current = undefined;
            isShowingContextRef.current = false;
            setContextTargetMessageId(null);
          }
          setContextRequestMessageId(null);
          setContextUnavailable(true);
          return;
        }

        if (!isShowingContextRef.current) {
          previousTimelineRef.current = queryClient.getQueryData<MessagePages>(queryKey);
          rememberCurrentViewport();
        }
        await queryClient.cancelQueries({ queryKey, exact: true });
        if (!isCurrentRequest) return;

        isShowingContextRef.current = true;
        shouldScrollToBottomRef.current = false;
        setContextTargetMessageId(context.targetMessageId);
        setContextRequestMessageId(null);
        queryClient.setQueryData<MessagePages>(queryKey, {
          pages: [context.messages],
          pageParams: [undefined],
        });
      } catch {
        if (isCurrentRequest) setContextLoadFailed(true);
      } finally {
        if (isCurrentRequest) setIsLoadingContext(false);
      }
    };

    void loadContext();
    return () => {
      isCurrentRequest = false;
    };
  }, [channelId, contextRequestMessageId, contextRetryAttempt, queryClient, rememberCurrentViewport, timelineKey]);

  useEffect(() => {
    // Mark as read on mount
    if (channelId) {
      void markReadAndUpdateSidebar(channelId);
    }

    return () => {
      if (readCursorTimeout.current) clearTimeout(readCursorTimeout.current);
      readCursorTimeout.current = null;
    };
  }, [channelId]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Manage scroll position when messages update
  useEffect(() => {
    if (!containerRef.current) return;

    if (isShowingContextRef.current) {
      prevMessagesLength.current = messages.length;
      return;
    }

    const pendingViewport = pendingViewportRestoreRef.current;
    if (pendingViewport && messages.length > 0) {
      pendingViewportRestoreRef.current = null;
      const container = containerRef.current;
      shouldScrollToBottomRef.current = false;
      container.scrollTop = pendingViewport.wasAtBottom
        ? container.scrollHeight
        : pendingViewport.scrollTop;
      if (pendingViewport.focusWasInList) {
        const focusTarget = pendingViewport.focusedMessageId
          ? document.getElementById(pendingViewport.focusedMessageId)
          : null;
        (focusTarget ?? container).focus({ preventScroll: true });
      }
      prevMessagesLength.current = messages.length;
      return;
    }

    const isNewMessage = messages.length > prevMessagesLength.current;
    if (isNewMessage) {
      // Force scroll to bottom if we were already there OR if it's the very first load
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isAtBottom || prevMessagesLength.current === 0) {
        shouldScrollToBottomRef.current = true;
      }
    }

    prevMessagesLength.current = messages.length;

    if (shouldScrollToBottomRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      shouldScrollToBottomRef.current = false;
    }
  }, [messages, isFetchingNextPage]);

  // Realtime updates handled by useEffect below...
  useEffect(() => {
    const supabase = createClient();
    const channelName = `room:${channelId}`;
    let connectionNeedsResync = false;
    let effectIsActive = true;

    // The focused conversation owns message hydration; the sidebar only projects unread counts.
    const handleNewMessage = async (newMsgPartial: Partial<Message>) => {
      // Filter for current channel
      if (!newMsgPartial.id || newMsgPartial.channelId !== channelId) return;
      if (newMsgPartial.parentId !== null || newMsgPartial.scheduledAt !== null || newMsgPartial.isDeleted !== false) return;
      const queryKey = timelineKey;
      const cachedMessages = queryClient.getQueryData<MessagePages>(queryKey);
      if (cachedMessages?.pages.some((page) => page.some(({ id }) => id === newMsgPartial.id))) return;
      if (seenMessageIdsRef.current.has(newMsgPartial.id)) return;
      seenMessageIdsRef.current.add(newMsgPartial.id);
      if (seenMessageIdsRef.current.size > 500) {
        const oldestId = seenMessageIdsRef.current.values().next().value;
        if (oldestId) seenMessageIdsRef.current.delete(oldestId);
      }

      try {
        const fullMessage = await getMessageById(newMsgPartial.id);

        if (fullMessage) {
          queryClient.setQueryData<MessagePages>(timelineKey, (old) => {
            if (!old || !old.pages || old.pages.length === 0) return old;

            // Create deep-ish clones
            const newPages = [...old.pages];
            const latestPage = [...newPages[0]];

            // The action acknowledgement and realtime event can arrive in either order.
            if (newPages.some((page) => page.some((message) => message.id === fullMessage.id))) {
              return old;
            }

            latestPage.push({
              ...fullMessage,
              replies: [],
              _count: { replies: 0 },
            });
            newPages[0] = latestPage;

            return { ...old, pages: newPages };
          });

          if (readCursorTimeout.current) clearTimeout(readCursorTimeout.current);
          readCursorTimeout.current = setTimeout(() => {
            void markReadAndUpdateSidebar(channelId);
            readCursorTimeout.current = null;
          }, 250);
        } else {
          queryClient.invalidateQueries({ queryKey });
        }
      } catch (err) {
        seenMessageIdsRef.current.delete(newMsgPartial.id);
        console.error('MessageList: Error handling new message', err);
        queryClient.invalidateQueries({ queryKey });
      }
    };

    // Focused conversation subscription reconciles timeline inserts, edits and deletes.
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'messages',
        },
        (payload: MessageRealtimePayload) => {
          if (payload.eventType === 'INSERT') {
            handleNewMessage(payload.new);
          } else if (payload.eventType === 'DELETE') {
            // Handle deletions
            const deletedId = payload.old.id;
            if (!deletedId) return;
            queryClient.setQueryData<MessagePages>(timelineKey, (old) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page) =>
                  page.filter((message) => message.id !== deletedId)
                ),
              };
            });
          } else if (payload.eventType === 'UPDATE') {
            // Handle updates (edits)
            const updatedMsg = payload.new;
            if (!updatedMsg.id) return;
            queryClient.setQueryData<MessagePages>(timelineKey, (old) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page) =>
                  page.map((message) => {
                    if (message.id === updatedMsg.id) {
                      return { ...message, ...updatedMsg, isEdited: true };
                    }
                    return message;
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
        (payload: ReactionRealtimePayload) => {
          // Manual cache update for reactions to avoid full refetch
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new;
            if (!newReaction.id || !newReaction.messageId || !newReaction.userId || !newReaction.emoji || !newReaction.createdAt) return;
            const reaction = {
              id: newReaction.id,
              messageId: newReaction.messageId,
              userId: newReaction.userId,
              emoji: newReaction.emoji,
              createdAt: newReaction.createdAt,
            };
            queryClient.setQueryData<MessagePages>(timelineKey, (old) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page) =>
                  page.map((message) => {
                    if (message.id === newReaction.messageId) {
                      // Prevent duplicates
                      if (
                        message.reactions?.some((reaction) => reaction.id === newReaction.id)
                      ) {
                        return message;
                      }
                      return {
                        ...message,
                        reactions: [...(message.reactions || []), reaction],
                      };
                    }
                    return message;
                  })
                ),
              };
            });
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old;
            if (!oldReaction.id) return;
            queryClient.setQueryData<MessagePages>(timelineKey, (old) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((page) =>
                  page.map((message) => {
                    if (
                      message.reactions?.some((reaction) => reaction.id === oldReaction.id)
                    ) {
                      return {
                        ...message,
                        reactions: message.reactions?.filter(
                          (reaction) => reaction.id !== oldReaction.id
                        ),
                      };
                    }
                    return message;
                  })
                ),
              };
            });
          }
        }
      )
      .subscribe((status) => {
        if (!effectIsActive) return;

        if (status === 'SUBSCRIBED') {
          if (connectionNeedsResync) {
            connectionNeedsResync = false;
            void queryClient.invalidateQueries({ queryKey: timelineKey });
          }
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          connectionNeedsResync = true;
        }
      });

    return () => {
      effectIsActive = false;
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient, timelineKey]);

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
      tabIndex={-1}
      onScroll={rememberCurrentViewport}
      onFocusCapture={rememberCurrentViewport}
      className="flex-1 overflow-y-auto px-4 relative"
      // overflow-anchor-auto helps maintain scroll position when content is added at top
      style={{ overflowAnchor: 'auto' }}
    >
      <div className="py-4 min-h-full flex flex-col justify-end">
        {(isLoadingContext || contextUnavailable || contextLoadFailed || contextTargetMessageId) && (
          <div className="sticky top-0 z-10 flex min-h-11 items-center justify-between gap-3 border-b bg-background/95 px-2 py-1">
            <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
              {isLoadingContext
                ? 'Loading selected message context…'
                : contextLoadFailed
                  ? 'Could not load message context. You can retry.'
                  : contextUnavailable
                  ? 'This message is no longer available. Showing recent messages.'
                  : 'Showing messages around the selected result.'}
            </p>
            {contextLoadFailed && (
              <button
                type="button"
                onClick={() => setContextRetryAttempt((attempt) => attempt + 1)}
                className="min-h-11 shrink-0 rounded-md px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Retry context
              </button>
            )}
            {contextTargetMessageId && (
            <button
              type="button"
              onClick={() => returnToLatest()}
                className="min-h-11 shrink-0 rounded-md px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Return to latest
              </button>
            )}
          </div>
        )}

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
            <div key={message.id} id={`message-${message.id}`} data-message-viewport tabIndex={-1}>
              {isFirstUnread && (
                <div className="relative py-2 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-unread" />
                  </div>
                  <div className="relative bg-background px-2 text-xs font-bold text-unread">
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
                onForward={onForward}
                showThreadIndicator={true}
                isHighlighted={highlightedMessageId === message.id}
                currentUserId={currentUserId}
                userRole={userRole}
                isArchived={isArchived}
                workspaceId={workspaceId}
              />
            </div>
          );
        })}
        {messages?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        )}

      </div>
    </div>
  );
}
