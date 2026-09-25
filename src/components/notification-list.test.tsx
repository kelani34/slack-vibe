import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { NotificationList } from './notification-list';

const fixture = vi.hoisted(() => ({
  markAllAsRead: vi.fn(),
  markAsRead: vi.fn(),
  markAsUnread: vi.fn(),
  setIsOpen: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/stores/notification-store', () => ({
  useNotificationStore: () => ({
    notifications: [{
      id: 'notification-1',
      userId: 'member',
      actorId: 'actor',
      type: 'MENTION',
      resourceId: 'message-1',
      resourceType: 'message',
      isRead: false,
      createdAt: new Date().toISOString(),
      actor: { id: 'actor', name: 'Alex', avatarUrl: null, email: 'alex@example.test' },
      channelId: 'channel-1',
      resourceContent: 'Please <strong>review</strong> this <img src=x onerror="run()"><script>secret()</script>',
    }],
    unreadCount: 1,
    isLoading: false,
    markAllAsRead: fixture.markAllAsRead,
    markAsRead: fixture.markAsRead,
    markAsUnread: fixture.markAsUnread,
    setIsOpen: fixture.setIsOpen,
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: fixture.push }),
  useParams: () => ({ workspaceSlug: 'workspace' }),
}));

beforeEach(() => vi.clearAllMocks());

it('offers a reliable mark-all-read action for unread activity', () => {
  render(<NotificationList />);
  fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));
  expect(fixture.markAllAsRead).toHaveBeenCalledOnce();
});

it('renders a safe plain-text preview for legacy message HTML', () => {
  render(<NotificationList />);

  const preview = screen.getByRole('button', { name: /Please review this/i });
  expect(preview.querySelector('img, script')).toBeNull();
  expect(preview).not.toHaveTextContent('secret');
});
