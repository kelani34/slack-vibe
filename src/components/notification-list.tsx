'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, MessageSquare, UserPlus, Info, Trash2, Archive, Hash } from 'lucide-react';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useNotificationStore } from '@/stores/notification-store';
import { useRouter } from 'next/navigation';
import { NotificationType } from '@prisma/client';
import { cn } from '@/lib/utils';
import { NotificationWithActor } from '@/stores/notification-store';

interface NotificationListProps {
  onItemClick?: () => void;
}

import { useParams } from 'next/navigation';

// ...

export function NotificationList({ onItemClick }: NotificationListProps) {
  const router = useRouter();
  const params = useParams(); // Get current workspace slug
  const { notifications, isLoading, markAsRead, setIsOpen } = useNotificationStore();

  const handleClick = async (notification: NotificationWithActor) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Dock the sidebar if we are entering specific view
    // Actually, if we are navigating, we might generally want to show the content.
    // The user requested: "replace the sidebar with the notifications. and then it should show the message on the main side."
    // So distinct actions:
    // 1. Open Notification Sidebar (dock it) -> setIsOpen(true)
    // 2. Navigate main content to message.
    
    setIsOpen(true);
    onItemClick?.(); // Close popover

    console.log('Notification Click:', { notification, params });
    const workspaceSlug = params?.slug as string;
    console.log('Computed Slug:', workspaceSlug);
    
    if (notification.channelId && workspaceSlug) {
      if (notification.resourceType === 'message' || ['MENTION', 'REPLY', 'REACTION', 'PIN'].includes(notification.type)) {
         // Navigate to channel and specific message
         router.push(`/${workspaceSlug}/channel/${notification.channelId}?messageId=${notification.resourceId}`);
      } else if (notification.resourceType === 'channel' || ['CHANNEL_ADD', 'CHANNEL_REMOVE'].includes(notification.type)) {
         // Navigate to channel
         router.push(`/${workspaceSlug}/channel/${notification.channelId}`);
      }
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

  const getText = (n: NotificationWithActor) => {
    const actorName = n.actor?.name || 'Someone';
    switch (n.type) {
      case 'MENTION': return `${actorName} mentioned you`;
      case 'REPLY': return `${actorName} replied to you`;
      case 'REACTION': return `${actorName} reacted to your message`;
      case 'CHANNEL_ADD': return `${actorName} added you to a channel`;
      case 'CHANNEL_REMOVE': return `${actorName} removed you from a channel`;
      case 'CHANNEL_ARCHIVE': return `Channel was archived`;
      case 'CHANNEL_DELETE': return `Channel was deleted`;
      case 'PIN': return `${actorName} pinned a message`;
      default: return 'New notification';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-500">Loading notifications...</div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">No notifications</div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={cn(
              "flex w-full items-start gap-2 rounded-md p-2 text-sm text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              n.isRead ? "opacity-60" : "font-medium bg-sidebar-accent/10"
            )}
          >
           <div className="mt-0.5 shrink-0">
             {getIcon(n.type)}
           </div>
           <div className="flex flex-col gap-1 overflow-hidden">
              <span className="truncate leading-tight">{getText(n)}</span>
              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
           </div>
           {!n.isRead && <div className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
          </button>
        ))}
    </div>
  );
}
