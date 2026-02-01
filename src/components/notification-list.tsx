'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, MessageSquare, UserPlus, Info, Trash2, Archive, Hash, Loader2, MoreHorizontal, Check, Reply, Link as LinkIcon } from 'lucide-react';
import { useNotificationStore, NotificationWithActor } from '@/stores/notification-store';
import { useRouter, useParams } from 'next/navigation';
import { NotificationType } from '@prisma/client';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationListProps {
  onItemClick?: () => void;
}

export function NotificationList({ onItemClick }: NotificationListProps) {
  const router = useRouter();
  const params = useParams();
  const { notifications, isLoading, markAsRead, markAsUnread, setIsOpen } = useNotificationStore();
  const [navigatingId, setNavigatingId] = React.useState<string | null>(null);

  const handleNavigate = async (notification: NotificationWithActor) => {
    if (navigatingId) return;
    setNavigatingId(notification.id);

    try {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }

      setIsOpen(true);
      onItemClick?.(); // Close popover

      const workspaceSlug = params?.workspaceSlug as string;
      
      if (notification.channelId && workspaceSlug) {
        if (notification.resourceType === 'message' || ['MENTION', 'REPLY', 'REACTION', 'PIN'].includes(notification.type)) {
           router.push(`/${workspaceSlug}/${notification.channelId}?messageId=${notification.resourceId}`);
        } else if (notification.resourceType === 'channel' || ['CHANNEL_ADD', 'CHANNEL_REMOVE'].includes(notification.type)) {
           router.push(`/${workspaceSlug}/${notification.channelId}`);
        }
      }
    } finally {
       setNavigatingId(null);
    }
  };

  const handleMarkRead = async (e: React.MouseEvent, notification: NotificationWithActor) => {
    e.stopPropagation();
    if (notification.isRead) {
      await markAsUnread(notification.id);
    } else {
      await markAsRead(notification.id);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'MENTION': return <Bell className="h-4 w-4 text-yellow-500" />;
      case 'REPLY': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'REACTION': return <Info className="h-4 w-4 text-pink-500" />;
      case 'CHANNEL_ADD': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'CHANNEL_REMOVE': return <UserPlus className="h-4 w-4 text-red-500" />;
      case 'CHANNEL_ARCHIVE': return <Archive className="h-4 w-4 text-gray-500" />;
      case 'CHANNEL_DELETE': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'PIN': return <Hash className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTitle = (n: NotificationWithActor) => {
    const actorName = n.actor?.name || 'Someone';
    switch (n.type) {
      case 'MENTION': 
        return (
          <span>
            <span className="font-semibold text-foreground">{actorName}</span> mentioned you
          </span>
        );
      case 'REPLY': 
        return (
          <span>
            <span className="font-semibold text-foreground">{actorName}</span> replied to you
          </span>
        );
      case 'REACTION': 
        return (
           <span>
            <span className="font-semibold text-foreground">{actorName}</span> reacted to your message
          </span>
        );
      case 'CHANNEL_ADD': 
        return (
           <span>
            <span className="font-semibold text-foreground">{actorName}</span> added you to a channel
          </span>
        );
      case 'CHANNEL_REMOVE': 
        return (
           <span>
            <span className="font-semibold text-foreground">{actorName}</span> removed you from a channel
          </span>
        );
      case 'PIN': 
        return (
           <span>
            <span className="font-semibold text-foreground">{actorName}</span> pinned a message
          </span>
        );
      default: return 'New notification';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="p-8 text-sm text-muted-foreground text-center">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No new notifications
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn(
              "relative flex gap-3 p-4 text-sm transition-colors hover:bg-muted/50 group",
              !n.isRead && "bg-muted/30"
            )}
          >
            {/* Icon Column */}
           <div className="mt-1 shrink-0">
             {navigatingId === n.id ? (
               <Loader2 className="h-5 w-5 animate-spin text-primary" />
             ) : (
               <div className="bg-background p-1.5 rounded-full border shadow-sm">
                 {getIcon(n.type)}
               </div>
             )}
           </div>

           {/* Content Column */}
           <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-8">
              <div className="flex items-start justify-between gap-2">
                 <div className="text-muted-foreground leading-snug">
                   {getTitle(n)}
                   <span className="ml-2 text-xs opacity-70 whitespace-nowrap">
                     {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                   </span>
                 </div>
              </div>

              {/* Message Content Preview - Clickable */}
              {n.resourceContent && (
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNavigate(n)}
                  className={cn(
                    "mt-1 rounded-md border p-3 bg-card text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:shadow-md cursor-pointer",
                    navigatingId === n.id && "opacity-70 pointer-events-none"
                  )}
                >
                   <div 
                     className="line-clamp-3 text-sm"
                     dangerouslySetInnerHTML={{ __html: n.resourceContent.replace(/<[^>]*>/g, '').substring(0, 300) }}
                   />
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center gap-2 mt-1">
                 <Button 
                   variant="secondary" 
                   size="sm" 
                   className="h-7 px-3 text-xs"
                   onClick={() => handleNavigate(n)}
                   disabled={!!navigatingId}
                 >
                   <Reply className="mr-1.5 h-3 w-3" />
                   Reply
                 </Button>
              </div>
           </div>

           {/* Floating Actions Menu */}
           <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => handleMarkRead(e, n)}>
                     <Check className="mr-2 h-4 w-4" />
                     {n.isRead ? 'Mark as unread' : 'Mark as read'}
                  </DropdownMenuItem>
                   {n.channelId && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Construct link and copy
                        const url = `${window.location.origin}/${params?.workspaceSlug}/${n.channelId}?messageId=${n.resourceId}`;
                        navigator.clipboard.writeText(url).catch(console.error);
                      }}
                    >
                       <LinkIcon className="mr-2 h-4 w-4" />
                       Copy Link
                    </DropdownMenuItem>
                   )}
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
          </div>
        ))}
    </div>
  );
}
