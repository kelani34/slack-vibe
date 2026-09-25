import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { MessageItem } from './message-item';

vi.mock('@/actions/message-actions', () => ({
  toggleReaction: vi.fn(),
  bookmarkMessage: vi.fn(),
  unbookmarkMessage: vi.fn(),
  pinMessage: vi.fn(),
  unpinMessage: vi.fn(),
}));
vi.mock('@/actions/message', () => ({ editMessage: vi.fn(), deleteMessage: vi.fn() }));
vi.mock('@/components/emoji-picker', () => ({ EmojiPicker: ({ trigger }: { trigger: React.ReactNode }) => trigger }));
vi.mock('@/components/rich-text-editor', () => ({ RichTextEditor: () => null }));
vi.mock('@/components/file-preview-modal', () => ({ FilePreviewModal: () => null }));
vi.mock('@/components/user-hover-card', () => ({ UserHoverCard: ({ children }: PropsWithChildren) => children }));
vi.mock('@/hooks/use-send-message', () => ({ useSendMessage: () => ({ mutate: vi.fn() }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/acme/channel' }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    value: vi.fn(),
    configurable: true,
  });
});

it('scrolls to and briefly highlights a linked message', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { container } = render(
    <MessageItem
      message={{
        id: 'message-1',
        channelId: 'channel-1',
        userId: 'user-1',
        parentId: null,
        content: '<p>Important</p>',
        type: 'REGULAR',
        createdAt: new Date('2026-09-24T10:00:00Z'),
        updatedAt: new Date('2026-09-24T10:00:00Z'),
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        user: { id: 'user-1', name: 'Alex', avatarUrl: null },
        attachments: [],
        reactions: [],
        replies: [],
        _count: { replies: 0 },
      }}
      isHighlighted
    />,
    { wrapper },
  );

  expect(container.querySelector('[data-message-id="message-1"]')).toHaveClass('message-highlight');
  expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
});

it('renders legacy rich-message HTML without executable nodes or attributes', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { container } = render(
    <MessageItem
      message={{
        id: 'unsafe-message',
        channelId: 'channel-1',
        userId: 'user-1',
        parentId: null,
        content: '<p>Safe text</p><img src="x" onerror="run()"><script>secret()</script>',
        type: 'REGULAR',
        createdAt: new Date('2026-09-24T10:00:00Z'),
        updatedAt: new Date('2026-09-24T10:00:00Z'),
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        user: { id: 'user-1', name: 'Alex', avatarUrl: null },
        attachments: [],
        reactions: [],
        replies: [],
        _count: { replies: 0 },
      }}
    />,
    { wrapper },
  );

  expect(container).toHaveTextContent('Safe text');
  expect(container.querySelector('img, script, [onerror]')).toBeNull();
  expect(container).not.toHaveTextContent('secret');
});

it('sanitizes system-message HTML before rendering legacy content', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { container } = render(
    <MessageItem
      message={{
        id: 'unsafe-system-message',
        channelId: 'channel-1',
        userId: 'user-1',
        parentId: null,
        content: '<strong>Safe notice</strong><img src="x" onerror="run()"><script>secret()</script>',
        type: 'SYSTEM',
        createdAt: new Date('2026-09-24T10:00:00Z'),
        updatedAt: new Date('2026-09-24T10:00:00Z'),
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        user: { id: 'user-1', name: 'Alex', avatarUrl: null },
        attachments: [],
        reactions: [],
        replies: [],
        _count: { replies: 0 },
      }}
    />,
    { wrapper },
  );

  expect(container).toHaveTextContent('Safe notice');
  expect(container.querySelector('img, script, [onerror]')).toBeNull();
  expect(container).not.toHaveTextContent('secret');
});
