'use client';

import {
  toggleReaction,
  bookmarkMessage,
  unbookmarkMessage,
  pinMessage,
  unpinMessage,
} from '@/actions/message-actions';
import { editMessage, deleteMessage } from '@/actions/message';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmojiPicker } from '@/components/emoji-picker';
import { RichTextEditor } from '@/components/rich-text-editor';
import { format, differenceInMinutes } from 'date-fns';
import {
  MessageSquare,
  Smile,
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  Pin,
  PinOff,
  Forward,
  Link2,
  Copy,
  Pencil,
  Trash2,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { useSendMessage } from '@/hooks/use-send-message';
import parse, { domToReact, type Element } from 'html-react-parser';

import { UserHoverCard } from '@/components/user-hover-card';

interface MessageItemProps {
  message: any;
  showAvatar?: boolean;
  onThreadSelect?: (messageId: string) => void;
  onProfileSelect?: (userId: string) => void;
  onForward?: (messageId: string) => void;
  showThreadIndicator?: boolean;
  compact?: boolean;
  isBookmarked?: boolean;
  channelId?: string;
  isHighlighted?: boolean;
  currentUserId?: string;
  userRole?: string;
  isArchived?: boolean;
  workspaceId?: string;
}

export function MessageItem({
  message,
  showAvatar = true,
  onThreadSelect,
  onProfileSelect,
  onForward,
  showThreadIndicator = true,
  compact = false,
  isBookmarked = false,
  channelId,
  isHighlighted = false,
  currentUserId,
  userRole,
  isArchived = false,
  workspaceId,
}: MessageItemProps) {

  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [showHighlight, setShowHighlight] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  const { mutate: retrySendMessage } = useSendMessage({
    channelId: channelId || message.channelId,
    parentId: message.parentId || undefined,
    currentUser: {
      id: currentUserId || '',
      name: message.user?.name || '',
      image: message.user?.avatarUrl,
    },
  });

  const handleRetry = () => {
    const files =
      message.attachments
        ?.map((a: any) => a.fileObject)
        .filter((f: any) => f instanceof File) || [];

    retrySendMessage({ html: message.content, files });

    // Remove the failed message from cache
    const qKey = message.parentId
      ? ['messages', message.channelId, message.parentId]
      : ['messages', message.channelId];

    queryClient.setQueryData(qKey, (old: any) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.filter((m: any) => m.id !== message.id);
      }
      if (old.pages) {
        return {
          ...old,
          pages: old.pages.map((p: any[]) =>
            p.filter((m: any) => m.id !== message.id)
          ),
        };
      }
      return old;
    });

    toast.info('Retrying...');
  };



  // Handle highlight animation
  useEffect(() => {
    if (isHighlighted) {
      setShowHighlight(true);
      messageRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      const timer = setTimeout(() => setShowHighlight(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  // Get unique reply authors for avatar preview
  const replyAuthors =
    message.replies
      ?.reduce((acc: any[], reply: any) => {
        if (!acc.find((a) => a.id === reply.user.id)) {
          acc.push(reply.user);
        }
        return acc;
      }, [])
      .slice(0, 3) || [];

  const lastReply = message.replies?.[message.replies.length - 1];

  const handleReaction = async (emoji: string) => {
    if (isArchived) return;
    const result = await toggleReaction(message.id, emoji);
    if (result.error) {
      toast.error(result.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  };

  const handleBookmark = async () => {
    if (isArchived) return;
    if (bookmarked) {
      const result = await unbookmarkMessage(message.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        setBookmarked(false);
        queryClient.invalidateQueries({ queryKey: ['bookmarked-messages'] });
        toast.success('Bookmark removed');
      }
    } else {
      const result = await bookmarkMessage(message.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        setBookmarked(true);
        queryClient.invalidateQueries({ queryKey: ['bookmarked-messages'] });
        toast.success('Message bookmarked');
      }
    }
  };

  const handlePin = async () => {
    if (isArchived) return;
    const cId = channelId || message.channelId;
    if (!cId) return;

    if (message.isPinned) {
      const result = await unpinMessage(message.id, cId);
      if (result.error) {
        toast.error(result.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['pinned-messages', cId] });
        toast.success('Message unpinned');
      }
    } else {
      const result = await pinMessage(message.id, cId);
      if (result.error) {
        toast.error(result.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['pinned-messages', cId] });
        toast.success('Message pinned to channel');
      }
    }
  };

  const handleCopyLink = async () => {
    let url = `${window.location.origin}${pathname}?message=${message.id}`;
    // If message is in a thread, include thread param
    if (message.parentId) {
      url = `${window.location.origin}${pathname}?thread=${message.parentId}&message=${message.id}`;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Message link copied');
  };

  const handleCopyText = async () => {
    // Strip HTML and copy plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = message.content;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    await navigator.clipboard.writeText(text);
    toast.success('Message copied');
  };

  const handleForward = () => {
    if (isArchived) return;
    if (onForward) {
      onForward(message.id);
    } else {
      toast.info('Forward feature coming soon');
    }
  };

  // Group reactions by emoji
  const reactionGroups =
    message.reactions?.reduce((acc: Record<string, any[]>, reaction: any) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {}) || {};

  // Handle SYSTEM messages
  if (message.type === 'SYSTEM') {
    return (
      <div
        className={`flex items-center gap-3 px-2 py-1 rounded-lg ${
          compact ? 'mt-0.5' : 'mt-2'
        } ${bookmarked ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
      >
        <div className={`flex-shrink-0 ${compact ? 'w-7' : 'w-8'}`}>
          {/* Placeholder for alignment or small icon if desired, otherwise just empty or specific system icon */}
        </div>
        <div className="flex-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5">
            <AvatarImage src={message.user?.avatarUrl || ''} />
            <AvatarFallback>{message.user?.name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1">
            <span className="font-medium">{message.user?.name}</span>
            <span dangerouslySetInnerHTML={{ __html: message.content }} />
            <span className="text-[10px] opacity-70 ml-1">
              {format(new Date(message.createdAt), 'h:mm a')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messageRef}
      data-message-id={message.id}
      className={`group relative flex gap-3 hover:bg-muted/50 px-2 py-0.5 rounded-lg transition-all duration-300 ${
        showAvatar ? 'mt-3' : 'mt-0.5'
      } ${
        message.isPinned
          ? 'bg-amber-50/50 dark:bg-amber-950/10'
          : bookmarked
          ? 'bg-blue-50 dark:bg-blue-950/20'
          : ''
      } ${
        showHighlight ? 'bg-orange-100 dark:bg-orange-900/30 animate-pulse' : ''
      }`}
    >
      {/* Floating action bar on hover */}
      {!message.isPending && (
        <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="flex items-center gap-0.5 bg-background border rounded-md shadow-sm p-0.5">
            {onThreadSelect && !compact && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onThreadSelect(message.id)}
                title="Reply in thread"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            {!isArchived && (
              <>
                <EmojiPicker
                  onSelect={handleReaction}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Add reaction"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleBookmark}
                  title={bookmarked ? 'Remove bookmark' : 'Bookmark message'}
                >
                  {bookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePin}
                  title={
                    message.isPinned ? 'Unpin from channel' : 'Pin to channel'
                  }
                >
                  {message.isPinned ? (
                    <PinOff className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleForward}
                  title="Forward message"
                >
                  <Forward className="h-4 w-4" />
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyText}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy text
                </DropdownMenuItem>
                {/* Edit and Delete action */}
                {(currentUserId === message.userId ||
                  ['OWNER', 'ADMIN'].includes(userRole || '')) &&
                  !message.isDeleted &&
                  !isArchived && (
                    <>
                      <DropdownMenuSeparator />
                      {/* Edit only for own messages within 30 mins */}
                      {currentUserId === message.userId &&
                        differenceInMinutes(
                          new Date(),
                          new Date(message.createdAt)
                        ) <= 30 && (
                          <DropdownMenuItem onClick={() => setIsEditing(true)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit message
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuItem
                        onClick={async () => {
                          const result = await deleteMessage(message.id);
                          if (result.error) {
                            toast.error(result.error);
                          } else {
                            queryClient.invalidateQueries({
                              queryKey: ['messages'],
                            });
                            toast.success('Message deleted');
                          }
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete message
                      </DropdownMenuItem>
                    </>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Avatar column */}
      <div className={`flex-shrink-0 ${compact ? 'w-7' : 'w-8'}`}>
        {showAvatar && (
          <UserHoverCard userId={message.userId} workspaceId={workspaceId || message.channel?.workspaceId || ''}>
            <button
              onClick={() => onProfileSelect?.(message.userId)}
              className="hover:opacity-80 transition-opacity"
            >
              <Avatar className={compact ? 'size-7' : 'size-8'}>
                <AvatarImage src={message.user?.avatarUrl || ''} />
                <AvatarFallback className={compact ? 'text-xs' : ''}>
                  {message.user?.name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            </button>
          </UserHoverCard>
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-center gap-2">
            <UserHoverCard userId={message.userId} workspaceId={workspaceId || message.channel?.workspaceId || ''}>
              <button
                onClick={() => onProfileSelect?.(message.userId)}
                className="font-semibold text-sm hover:underline"
              >
                {message.user?.name || 'Unknown'}
              </button>
            </UserHoverCard>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.createdAt), 'h:mm a')}
            </span>
            {message.isPinned && (
              <span
                className="text-xs text-orange-500 flex items-center gap-0.5"
                title="Pinned"
              >
                <Pin className="h-3 w-3" />
              </span>
            )}
          </div>
        )}

        {/* Message content or edit mode */}
        {isEditing ? (
          <div className="space-y-2">
            <RichTextEditor
              initialContent={message.content}
              variant="edit"
              onCancel={() => setIsEditing(false)}
              onSubmit={async (html) => {
                const result = await editMessage(message.id, html);
                if (result.error) {
                  toast.error(result.error);
                } else {
                  queryClient.invalidateQueries({ queryKey: ['messages'] });
                  setIsEditing(false);
                  toast.success('Message updated');
                }
              }}
              compact
              channelId={channelId || message.channelId}
            />
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <div
              className={`text-sm prose prose-sm dark:prose-invert max-w-none [&>p]:my-0 ${
                message.isPending ? 'opacity-70' : ''
              } ${message.isError ? 'text-destructive' : ''}`}
            >
              {parse(message.content || '', {
                replace: (domNode) => {
                  if (
                    domNode.type === 'tag' &&
                    domNode.name === 'span' &&
                    (domNode.attribs?.['data-type'] === 'mention' ||
                     domNode.attribs?.['class']?.includes('mention'))
                  ) {
                    const userId = domNode.attribs['data-id'];
                    const isMe = userId === currentUserId;
                    
                    // Add mention-me class if needed
                    const className = domNode.attribs['class'] || '';
                    const finalClassName = isMe && !className.includes('mention-me') 
                      ? `${className} mention-me` 
                      : className;

                    const { class: _, ...restAttribs } = domNode.attribs;

                    return (
                      <UserHoverCard
                        userId={userId}
                        workspaceId={workspaceId || message.channel?.workspaceId || ''}
                      >
                        <span
                          {...restAttribs}
                          className={`${finalClassName} cursor-pointer hover:underline`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (userId) onProfileSelect?.(userId);
                          }}
                        >
                          {domToReact((domNode as Element).children as any)}
                        </span>
                      </UserHoverCard>
                    );
                  }
                },
              })}
            </div>
            {message.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
            {message.isError && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 px-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleRetry}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div
            className={`grid gap-2 mt-2 ${
              compact ? 'grid-cols-2' : 'grid-cols-3'
            }`}
          >
            {message.attachments.map((att: any) => (
              <div
                key={att.id}
                className="block border rounded-lg overflow-hidden hover:border-primary transition-colors cursor-pointer group/attachment"
                onClick={() =>
                  setPreviewFile({
                    url: att.url,
                    name: att.name,
                    type: att.type,
                  })
                }
              >
                {att.type.startsWith('image/') ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className={`w-full object-cover bg-muted ${
                      compact ? 'h-16' : 'h-32'
                    }`}
                  />
                ) : (
                  <div
                    className={`p-3 bg-muted/50 flex flex-col items-center justify-center gap-2 ${
                      compact ? 'h-16' : 'h-24'
                    }`}
                  >
                    <div className="p-2 bg-background rounded-full shadow-sm">
                      <FileText className="size-4 text-primary" />
                    </div>
                    <span className="text-xs truncate w-full text-center px-1 font-medium">
                      {att.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(reactionGroups).map(([emoji, reactions]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs hover:bg-muted/80 transition-colors"
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">
                  {(reactions as any[]).length}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {showThreadIndicator && message._count?.replies > 0 && (
          <button
            onClick={() => onThreadSelect?.(message.id)}
            className="mt-2 flex items-center gap-2 text-xs text-blue-500 hover:underline"
          >
            <div className="flex -space-x-2">
              {replyAuthors.map((author: any) => (
                <Avatar
                  key={author.id}
                  className="h-5 w-5 border-2 border-background"
                >
                  <AvatarImage src={author.avatarUrl || ''} />
                  <AvatarFallback className="text-[8px]">
                    {author.name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span>
              {message._count.replies}{' '}
              {message._count.replies === 1 ? 'reply' : 'replies'}
            </span>
            {lastReply && (
              <span className="text-muted-foreground">
                Last reply{' '}
                {format(new Date(lastReply.createdAt), "MMM d 'at' h:mm a")}
              </span>
            )}
          </button>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          name={previewFile.name}
          type={previewFile.type}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
