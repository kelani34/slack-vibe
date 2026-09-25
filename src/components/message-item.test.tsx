import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { MessageItem } from './message-item';
import { bookmarkMessage, pinMessage } from '@/actions/message-actions';
import { toast } from 'sonner';

const attachmentDownload = vi.hoisted(() => ({ getAttachmentAccessUrls: vi.fn() }));
vi.mock('@/actions/message-actions', () => ({
  toggleReaction: vi.fn(),
  bookmarkMessage: vi.fn(),
  unbookmarkMessage: vi.fn(),
  pinMessage: vi.fn(),
  unpinMessage: vi.fn(),
}));
vi.mock('@/actions/message', () => ({ editMessage: vi.fn(), deleteMessage: vi.fn() }));
vi.mock('@/actions/attachment', () => attachmentDownload);
vi.mock('@/components/emoji-picker', () => ({ EmojiPicker: ({ trigger }: { trigger: React.ReactNode }) => trigger }));
vi.mock('@/components/rich-text-editor', () => ({ RichTextEditor: () => null }));
vi.mock('@/components/file-preview-modal', () => ({
  FilePreviewModal: ({ url, downloadUrl }: { url: string | null; downloadUrl?: string }) =>
    url ? <div data-testid="file-preview-url" data-download-url={downloadUrl}>{url}</div> : null,
}));
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

it('uses an access-checked short-lived URL to preview private attachments', async () => {
  const user = userEvent.setup();
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  let resolveGrant!: (value: { previewUrl: string; downloadUrl: string }) => void;
  attachmentDownload.getAttachmentAccessUrls.mockReturnValue(new Promise((resolve) => {
    resolveGrant = resolve;
  }));

  render(
    <MessageItem
      workspaceId="workspace-1"
      message={{
        id: 'private-file-message',
        channelId: 'channel-1',
        userId: 'user-1',
        parentId: null,
        content: '<p>Private file</p>',
        type: 'REGULAR',
        createdAt: new Date('2026-09-24T10:00:00Z'),
        updatedAt: new Date('2026-09-24T10:00:00Z'),
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        user: { id: 'user-1', name: 'Alex', avatarUrl: null },
        attachments: [{
          id: 'attachment-1',
          messageId: 'private-file-message',
          url: 'https://files.example.test/public-legacy-url',
          storageBucket: 'workspace-files-private',
          storagePath: 'channel-1/object.png',
          name: 'private.png',
          type: 'image/png',
          size: 12,
        }],
        reactions: [],
        replies: [],
        _count: { replies: 0 },
      }}
    />,
    { wrapper },
  );

  const openButton = screen.getByRole('button', { name: 'Open private.png' });
  expect(openButton).toHaveClass('focus-visible:ring-[3px]', 'focus-visible:border-ring');
  expect(screen.queryByRole('img', { name: 'private.png' })).not.toBeInTheDocument();
  await user.click(openButton);

  expect(attachmentDownload.getAttachmentAccessUrls).toHaveBeenCalledWith('attachment-1');
  expect(screen.getByRole('button', { name: 'Opening private.png' })).toBeDisabled();
  expect(screen.getByText('Opening file…')).toBeInTheDocument();

  resolveGrant({
    previewUrl: 'https://files.example.test/signed-preview',
    downloadUrl: 'https://files.example.test/signed-download',
  });
  expect(await screen.findByTestId('file-preview-url')).toHaveTextContent('https://files.example.test/signed-preview');
  expect(screen.getByTestId('file-preview-url')).toHaveAttribute('data-download-url', 'https://files.example.test/signed-download');
  expect(screen.getByTestId('file-preview-url')).not.toHaveTextContent('public-legacy-url');
});

it('keeps legacy attachments readable during the staged storage migration', async () => {
  const user = userEvent.setup();
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  render(
    <MessageItem
      workspaceId="workspace-1"
      message={{
        id: 'legacy-file-message',
        channelId: 'channel-1',
        userId: 'user-1',
        parentId: null,
        content: '<p>Legacy file</p>',
        type: 'REGULAR',
        createdAt: new Date('2026-09-24T10:00:00Z'),
        updatedAt: new Date('2026-09-24T10:00:00Z'),
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        user: { id: 'user-1', name: 'Alex', avatarUrl: null },
        attachments: [{
          id: 'legacy-attachment',
          messageId: 'legacy-file-message',
          url: 'https://files.example.test/legacy.png',
          name: 'legacy.png',
          type: 'image/png',
          size: 12,
        }],
        reactions: [],
        replies: [],
        _count: { replies: 0 },
      }}
    />,
    { wrapper },
  );

  await user.click(screen.getByRole('button', { name: 'Open legacy.png' }));

  expect(screen.getByTestId('file-preview-url')).toHaveTextContent('https://files.example.test/legacy.png');
  expect(attachmentDownload.getAttachmentAccessUrls).not.toHaveBeenCalled();
});

it('shows a retryable error when private attachment access is denied', async () => {
  const user = userEvent.setup();
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  attachmentDownload.getAttachmentAccessUrls
    .mockResolvedValueOnce({ error: 'File not found' })
    .mockResolvedValueOnce({ previewUrl: 'https://files.example.test/retry-preview', downloadUrl: 'https://files.example.test/retry-download' });

  render(
    <MessageItem
      workspaceId="workspace-1"
      message={{
        id: 'denied-private-file-message',
        channelId: 'channel-1',
        userId: 'user-1',
        parentId: null,
        content: '<p>Private file</p>',
        type: 'REGULAR',
        createdAt: new Date('2026-09-24T10:00:00Z'),
        updatedAt: new Date('2026-09-24T10:00:00Z'),
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        user: { id: 'user-1', name: 'Alex', avatarUrl: null },
        attachments: [{
          id: 'denied-attachment',
          messageId: 'denied-private-file-message',
          url: 'https://files.example.test/public-legacy-url',
          storageBucket: 'workspace-files-private',
          storagePath: 'channel-1/object.png',
          name: 'denied.png',
          type: 'image/png',
          size: 12,
        }],
        reactions: [],
        replies: [],
        _count: { replies: 0 },
      }}
    />,
    { wrapper },
  );

  await user.click(screen.getByRole('button', { name: 'Open denied.png' }));

  expect(toast.error).toHaveBeenCalledWith('File not found');
  expect(screen.queryByTestId('file-preview-url')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Open denied.png' }));
  expect(await screen.findByTestId('file-preview-url')).toHaveTextContent('https://files.example.test/retry-preview');
});

it('scrolls to and briefly highlights a linked message', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { container } = render(
    <MessageItem
      workspaceId="workspace-1"
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
      workspaceId="workspace-1"
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
      workspaceId="workspace-1"
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

it('keeps message actions discoverable for keyboard and touch users', async () => {
  const user = userEvent.setup();
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  render(
    <MessageItem
      workspaceId="workspace-1"
      message={{
        id: 'accessible-actions',
        channelId: 'channel-1',
        userId: 'user-1',
        parentId: null,
        content: '<p>Actionable</p>',
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
      onThreadSelect={vi.fn()}
      onForward={vi.fn()}
    />,
    { wrapper },
  );

  const toolbar = screen.getByRole('toolbar', { name: 'Message actions' });
  expect(toolbar).toHaveClass('group-focus-within:opacity-100', 'max-md:opacity-100');
  expect(screen.getByRole('button', { name: 'Reply in thread' })).toHaveClass('max-md:hidden');
  expect(screen.getByRole('button', { name: 'Add reaction' })).toHaveClass('max-md:hidden');
  expect(screen.getByRole('button', { name: 'More actions' })).toHaveClass(
    'h-11',
    'w-11',
    'md:h-7',
    'md:w-7',
  );

  await user.click(screen.getByRole('button', { name: 'More actions' }));
  expect(await screen.findByRole('menuitem', { name: 'Add reaction' })).toHaveClass('md:hidden');
});

it('invalidates only this actor and workspace after pinning a message', async () => {
  const user = userEvent.setup();
  vi.mocked(pinMessage).mockResolvedValue({ success: true });
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  render(
    <MessageItem
      workspaceId="workspace-1"
      currentUserId="user-1"
      message={{
        id: 'scoped-pin',
        channelId: 'channel-1',
        userId: 'user-1',
        parentId: null,
        content: '<p>Scoped</p>',
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

  await user.click(screen.getByRole('button', { name: 'Pin to channel' }));

  await waitFor(() => {
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['messages', 'user-1', 'workspace-1'],
    });
  });
  expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['messages'] });
  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['pinned-messages', 'user-1', 'workspace-1', 'channel-1'],
  });
});

it('invalidates only this actor workspace channel bookmark after saving a message', async () => {
  const user = userEvent.setup();
  vi.mocked(bookmarkMessage).mockResolvedValue({ success: true });
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  render(
    <MessageItem
      workspaceId="workspace-1"
      currentUserId="user-1"
      message={{
        id: 'scoped-bookmark',
        channelId: 'channel-1',
        userId: 'user-1',
        parentId: null,
        content: '<p>Saved</p>',
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

  await user.click(screen.getByRole('button', { name: 'Bookmark message' }));

  await waitFor(() => {
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['bookmarked-messages', 'user-1', 'workspace-1', 'channel-1'],
    });
  });
  expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['bookmarked-messages'] });
});
