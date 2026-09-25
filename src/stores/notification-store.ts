import { Notification } from '@prisma/client';
import { create } from 'zustand';
import { getNotifications, markAllNotificationsRead, markNotificationRead, markNotificationUnread, markChannelNotificationsRead } from '@/actions/notification';

export type NotificationWithActor = Notification & {
  actor: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    email: string;
  };
  channelId?: string;
  resourceContent?: string;
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
  markAsUnread: (id: string) => Promise<void>;
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
      const result = await markNotificationRead(id);
      if ('error' in result) throw new Error(result.error);
    } catch (error) {
      console.error('Failed to mark notification read', error);
      set({ notifications, unreadCount });
    }
  },

  markAsUnread: async (id) => {
    const { notifications, unreadCount } = get();
    const target = notifications.find(n => n.id === id);
    if (!target || !target.isRead) return;

    set({
      notifications: notifications.map(n => 
        n.id === id ? { ...n, isRead: false } : n
      ),
      unreadCount: unreadCount + 1
    });

    try {
      const result = await markNotificationUnread(id);
      if ('error' in result) throw new Error(result.error);
    } catch (error) {
      console.error('Failed to mark notification unread', error);
      set({ notifications, unreadCount });
    }
  },

  markAllAsRead: async () => {
    const { notifications, unreadCount } = get();
    set({
      notifications: notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    });

    try {
      const result = await markAllNotificationsRead();
      if ('error' in result) throw new Error(result.error);
    } catch (error) {
      console.error('Failed to mark all read', error);
      set({ notifications, unreadCount });
    }
  },

  markChannelAsRead: async (channelId) => {
    try {
      const result = await markChannelNotificationsRead(channelId);
      if ('error' in result) throw new Error(result.error);
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
    set(state => {
      if (state.notifications.some(({ id }) => id === notification.id)) return state;
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
  }
}));
