import { create } from 'zustand';

interface ProfileState {
  activeProfileUserId: string | null;
  previousView: 'thread' | 'channel' | null;
  setActiveProfile: (
    userId: string | null,
    fromView?: 'thread' | 'channel'
  ) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  activeProfileUserId: null,
  previousView: null,
  setActiveProfile: (userId, fromView = 'channel') =>
    set({ activeProfileUserId: userId, previousView: fromView }),
  clearProfile: () => set({ activeProfileUserId: null, previousView: null }),
}));
