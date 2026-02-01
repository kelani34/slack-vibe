'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, MessageSquare, UserPlus, Info, Trash2, Archive, Hash } from 'lucide-react';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useNotificationStore } from '@/stores/notification-store';
import { useRouter } from 'next/navigation';
import { NotificationType } from '@prisma/client';

export function NotificationSidebar() {
  const router = useRouter();
  const { notifications, isLoading, markAsRead, fetchNotifications } = useNotificationStore();

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to resource
    if (notification.resourceType === 'message' || notification.type === 'MENTION' || notification.type === 'REPLY' || notification.type === 'REACTION') {
       // Ideally we need channelId here. 
       // If resourceId is messageId, we need to know the channel.
       // The notification data from server actions needs to include the relation to 'resource' or we fetch it.
       // But `getNotifications` action currently returns raw Prisma Notification.
       // We might need to update `getNotifications` to include `resource` details or at least channelId.
       // For now, assuming we might not have it, specific navigation might be tricky without extra data.
       // Let's assume we can't navigate easily without fetching more data.
       // Update server action? Yes.
    } else if (notification.type === 'CHANNEL_ADD' || notification.type === 'CHANNEL_REMOVE') {
       // resourceId is channelId
       router.push(``); // We need workspace slug too... complex.
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'MENTION': return <Bell className="h-4 w-4 text-yellow-500" />;
      case 'REPLY': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'REACTION': return <Info className="h-4 w-4 text-pink-500" />; // Smile?
      case 'CHANNEL_ADD': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'CHANNEL_REMOVE': return <UserPlus className="h-4 w-4 text-red-500" />;
      case 'CHANNEL_ARCHIVE': return <Archive className="h-4 w-4 text-gray-500" />;
      case 'CHANNEL_DELETE': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'PIN': return <Hash className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getText = (n: any) => {
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
    <SidebarGroup>
      <SidebarGroupLabel>Activity</SidebarGroupLabel>
      <SidebarMenu>
        {notifications.map((n) => (
          <SidebarMenuItem key={n.id}>
            <SidebarMenuButton 
              onClick={() => handleClick(n)}
              className={n.isRead ? 'opacity-60' : 'font-medium'}
            >
              {getIcon(n.type)}
              <div className="flex flex-col gap-1 items-start text-left leading-tight">
                 <span>{getText(n)}</span>
                 <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
              </div>
              {!n.isRead && <div className="ml-auto w-2 h-2 rounded-full bg-blue-500" />}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
