'use client';

import { getThreadMessages, getMessageById } from '@/actions/message';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageInput } from '@/components/message-input';
import { MessageItem } from '@/components/message-item';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInMinutes } from 'date-fns';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useProfileStore } from '@/stores/profile-store';

// Group messages from same user within 5 minutes
type ThreadMessageSummary = { userId: string; createdAt: Date | string };

function shouldShowAvatar(
  currentMessage: ThreadMessageSummary,
  previousMessage: ThreadMessageSummary | undefined
): boolean {
  if (!previousMessage) return true;
  if (currentMessage.userId !== previousMessage.userId) return true;

  const diff = differenceInMinutes(
    new Date(currentMessage.createdAt),
    new Date(previousMessage.createdAt)
  );
  return diff >= 5;
}

interface ThreadSidebarProps {
  parentMessageId: string;
  channelId: string;
  onClose: () => void;
  highlightedMessageId?: string | null;
  currentUserId?: string;
  userRole?: string;
  isArchived?: boolean;
  currentUser?: {
    id: string;
    name: string;
    image?: string | null;
  };
  onForward?: (messageId: string) => void;
}

export function ThreadSidebar({
  parentMessageId,
  channelId,
  onClose,
  highlightedMessageId,
  currentUserId,
  userRole,
  isArchived = false,
  currentUser,
  onForward,
}: ThreadSidebarProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const setActiveProfile = useProfileStore((state) => state.setActiveProfile);

  // Fetch parent message
  const { data: parentMessage } = useQuery({
    queryKey: ['message', parentMessageId],
    queryFn: () => getMessageById(parentMessageId),
  });

  // Fetch replies
  const { data: replies, isLoading } = useQuery({
    queryKey: ['messages', channelId, parentMessageId],
    queryFn: () => getThreadMessages(parentMessageId),
  });

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread:${parentMessageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parentId=eq.${parentMessageId}`,
        },
        (payload: {
          eventType: string;
          new: {
            id?: string;
            channelId?: string;
            parentId?: string | null;
            scheduledAt?: Date | string | null;
            isDeleted?: boolean;
          };
        }) => {
          const reply = payload.new;
          if (
            payload.eventType !== 'INSERT' ||
            reply.channelId !== channelId ||
            reply.parentId !== parentMessageId ||
            reply.scheduledAt != null ||
            reply.isDeleted
          ) return;

          queryClient.invalidateQueries({
            queryKey: ['messages', channelId, parentMessageId],
            exact: true,
          });
          queryClient.invalidateQueries({
            queryKey: ['messages', channelId],
            exact: true,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessageId, queryClient, channelId]);

  // Scroll to bottom when replies change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  const handleProfileSelect = (userId: string) => {
    setActiveProfile(userId, 'thread');
  };

  return (
    <div className="absolute inset-0 z-20 flex h-full w-full flex-col border-l bg-background sm:static sm:w-80">
      {/* Header - fixed */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <h3 className="font-semibold">Thread</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Close thread"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Parent Message */}
        {parentMessage && (
          <div className="p-4 border-b bg-muted/30">
            <MessageItem
              message={parentMessage}
              showAvatar={true}
              onProfileSelect={handleProfileSelect}
              onForward={onForward}
              showThreadIndicator={false}
              compact={true}
              channelId={channelId}
              currentUserId={currentUserId}
              userRole={userRole}
              isArchived={isArchived}
            />
          </div>
        )}

        {/* Replies */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-muted-foreground">
              {replies?.length || 0}{' '}
              {(replies?.length || 0) === 1 ? 'reply' : 'replies'}
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-1">
            {isLoading ? (
              <div role="status" aria-label="Loading replies" className="space-y-4 py-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} aria-hidden="true" className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              replies?.map((message, index) => {
                const previousMessage =
                  index > 0 ? replies[index - 1] : undefined;
                const showAvatar = shouldShowAvatar(message, previousMessage);

                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    showAvatar={showAvatar}
                    onProfileSelect={handleProfileSelect}
                    onForward={onForward}
                    showThreadIndicator={false}
                    compact={true}
                    channelId={channelId}
                    isHighlighted={highlightedMessageId === message.id}
                    currentUserId={currentUserId}
                    userRole={userRole}
                    isArchived={isArchived}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Message Input - fixed at bottom */}
      <MessageInput
        channelId={channelId}
        parentId={parentMessageId}
        compact
        placeholder="Reply..."
        isArchived={isArchived}
        currentUser={currentUser}
      />
    </div>
  );
}
