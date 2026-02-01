import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarGroupContent, SidebarGroupAction } from '@/components/ui/sidebar';
import { useNotificationStore } from '@/stores/notification-store';
import { NotificationList } from './notification-list';
import * as React from 'react';
import { X } from 'lucide-react';

export function NotificationSidebar() {
  const { fetchNotifications, setIsOpen } = useNotificationStore();

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between pr-2">
        <SidebarGroupLabel>Activity</SidebarGroupLabel>
        <SidebarGroupAction onClick={() => setIsOpen(false)} title="Close Activity">
          <X className="h-4 w-4" />
        </SidebarGroupAction>
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          <div className="px-2">
            <NotificationList />
          </div>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
