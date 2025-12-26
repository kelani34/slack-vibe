'use client';

import {
  getPinnedMessages,
  getBookmarkedMessages,
} from '@/actions/message-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { Pin, Bookmark, MessageSquare } from 'lucide-react';

interface PinnedBookmarkedPanelProps {
  channelId: string;
  onMessageClick: (messageId: string, parentId?: string | null) => void;
}

export function PinnedBookmarkedPanel({
  channelId,
  onMessageClick,
}: PinnedBookmarkedPanelProps) {
  const { data: pinnedMessages } = useQuery({
    queryKey: ['pinned-messages', channelId],
    queryFn: () => getPinnedMessages(channelId),
  });

  const { data: bookmarkedMessages } = useQuery({
    queryKey: ['bookmarked-messages', channelId],
    queryFn: async () => {
      const all = await getBookmarkedMessages();
      return all.filter((b: any) => b.message.channelId === channelId);
    },
  });

  const pinnedCount = pinnedMessages?.length || 0;
  const bookmarkedCount = bookmarkedMessages?.length || 0;
  const totalCount = pinnedCount + bookmarkedCount;

  if (totalCount === 0) return null;

  const latestPinned = pinnedMessages?.[0]?.message;

  const getTextPreview = (content: string) => {
    if (typeof document === 'undefined') return content;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    return (tempDiv.textContent || tempDiv.innerText || '').slice(0, 60);
  };

  return (
    <div className="border-b bg-muted/30 shrink-0">
      <div className="flex items-center gap-2 px-3 py-1.5">
        {/* Pin icon with popover */}
        {pinnedCount > 0 && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                    <Pin className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs">{pinnedCount}</span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Pinned messages</TooltipContent>
            </Tooltip>
            <PopoverContent
              align="start"
              className="w-80 p-2 max-h-48 overflow-y-auto"
            >
              <div className="space-y-0.5">
                {pinnedMessages?.map((pinned: any) => (
                  <MessagePreview
                    key={pinned.id}
                    message={pinned.message}
                    onClick={() =>
                      onMessageClick(pinned.message.id, pinned.message.parentId)
                    }
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Bookmark icon with popover */}
        {bookmarkedCount > 0 && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                    <Bookmark className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs">{bookmarkedCount}</span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Your bookmarks</TooltipContent>
            </Tooltip>
            <PopoverContent
              align="start"
              className="w-80 p-2 max-h-48 overflow-y-auto"
            >
              <div className="space-y-0.5">
                {bookmarkedMessages?.map((bookmark: any) => (
                  <MessagePreview
                    key={bookmark.id}
                    message={bookmark.message}
                    onClick={() =>
                      onMessageClick(
                        bookmark.message.id,
                        bookmark.message.parentId
                      )
                    }
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Latest pinned preview */}
        {latestPinned && (
          <button
            onClick={() =>
              onMessageClick(latestPinned.id, latestPinned.parentId)
            }
            className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-muted/50 rounded px-2 py-0.5 transition-colors"
          >
            <Avatar className="h-4 w-4 shrink-0">
              <AvatarImage src={latestPinned.user?.avatarUrl || ''} />
              <AvatarFallback className="text-[6px]">
                {latestPinned.user?.name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {getTextPreview(latestPinned.content)}
            </span>
            {latestPinned.parentId && (
              <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function MessagePreview({
  message,
  onClick,
}: {
  message: any;
  onClick: () => void;
}) {
  const getTextPreview = (content: string) => {
    if (typeof document === 'undefined') return content;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    return (tempDiv.textContent || tempDiv.innerText || '').slice(0, 80);
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors text-left"
    >
      <Avatar className="h-5 w-5 shrink-0">
        <AvatarImage src={message.user?.avatarUrl || ''} />
        <AvatarFallback className="text-[8px]">
          {message.user?.name?.[0] || '?'}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium text-xs truncate max-w-[60px]">
        {message.user?.name}
      </span>
      <span className="text-xs text-muted-foreground truncate flex-1">
        {getTextPreview(message.content)}
      </span>
      {message.parentId && (
        <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}
