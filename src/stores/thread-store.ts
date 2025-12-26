import { create } from 'zustand';

interface ThreadState {
  // Map of channelId -> activeThreadId
  activeThreads: Record<string, string | null>;
  setActiveThread: (channelId: string, threadId: string | null) => void;
  getActiveThread: (channelId: string) => string | null;
}

export const useThreadStore = create<ThreadState>((set, get) => ({
  activeThreads: {},

  setActiveThread: (channelId, threadId) => {
    set((state) => ({
      activeThreads: {
        ...state.activeThreads,
        [channelId]: threadId,
      },
    }));
  },

  getActiveThread: (channelId) => {
    return get().activeThreads[channelId] || null;
  },
}));
