import { Notification, NotificationType } from '@prisma/client';
import { create } from 'zustand';
import { getNotifications, markAllNotificationsRead, markNotificationRead, markChannelNotificationsRead } from '@/actions/notification';

export type NotificationWithActor = Notification & {
  actor: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    email: string;
  };
};

interface NotificationState {
  notifications: NotificationWithActor[];
  unreadCount: number;
  isLoading: boolean;
  isOpen: boolean;
  
  // Actions
  setIsOpen: (isOpen: boolean) => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markChannelAsRead: (channelId: string) => Promise<void>;
  addNotification: (notification: NotificationWithActor) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isOpen: false,

  setIsOpen: (isOpen) => set({ isOpen }),

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await getNotifications();
      if ('error' in res) {
        console.error(res.error);
        set({ isLoading: false });
        return;
      }
      
      const { notifications, unreadCount } = res;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch notifications', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    // Optimistic update
    const { notifications, unreadCount } = get();
    const target = notifications.find(n => n.id === id);
    if (!target || target.isRead) return;

    set({
      notifications: notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, unreadCount - 1)
    });

    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error('Failed to mark notification read', error);
      // Revert if needed, but usually fine to ignore
    }
  },

  markAllAsRead: async () => {
    const { notifications } = get();
    set({
      notifications: notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    });

    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error('Failed to mark all read', error);
    }
  },

  markChannelAsRead: async (channelId) => {
    // Optimistic? Hard to know exactly which notifications correspond without complex logic.
    // So we'll trigger the server action and fetch fresh notifications?
    // Or just let realtime/next fetch handle it.
    // For now, simple call.
    try {
      await markChannelNotificationsRead(channelId);
      const res = await getNotifications();
      if ('error' in res) {
        console.error(res.error);
        return;
      }
      const { notifications, unreadCount } = res;
      set({ notifications, unreadCount });
    } catch (error) {
      console.error('Failed to mark channel read', error);
    }
  },

  addNotification: (notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  }
}));
