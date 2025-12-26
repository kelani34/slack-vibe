import { create } from 'zustand';

interface HighlightedMessageState {
  highlightedMessageId: string | null;
  setHighlightedMessage: (messageId: string | null) => void;
  scrollToMessage: string | null;
  setScrollToMessage: (messageId: string | null) => void;
}

export const useHighlightedMessageStore = create<HighlightedMessageState>(
  (set) => ({
    highlightedMessageId: null,
    setHighlightedMessage: (messageId) =>
      set({ highlightedMessageId: messageId }),
    scrollToMessage: null,
    setScrollToMessage: (messageId) => set({ scrollToMessage: messageId }),
  })
);
