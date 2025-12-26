'use client';

import { getThreadMessages, getMessageById } from '@/actions/message';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageInput } from '@/components/message-input';
import { MessageItem } from '@/components/message-item';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInMinutes } from 'date-fns';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useProfileStore } from '@/stores/profile-store';

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
        () => {
          queryClient.invalidateQueries({
            queryKey: ['messages', channelId, parentMessageId],
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
    <div className="flex h-full w-80 flex-col border-l bg-background">
      {/* Header - fixed */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <h3 className="font-semibold">Thread</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
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
              <div className="text-sm text-muted-foreground">Loading...</div>
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
