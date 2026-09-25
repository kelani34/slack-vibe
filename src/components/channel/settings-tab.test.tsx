import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import { SettingsTab } from './settings-tab';

const fixture = vi.hoisted(() => ({
  updateChannel: vi.fn(),
  deleteChannel: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/actions/channel', () => ({
  updateChannel: fixture.updateChannel,
  deleteChannel: fixture.deleteChannel,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: fixture.refresh, push: fixture.push }),
}));
vi.mock('sonner', () => ({
  toast: { error: fixture.error, success: fixture.success },
}));
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  fixture.updateChannel.mockResolvedValue({ success: true });
});

it('refreshes the active route after visibility and posting-permission changes', async () => {
  const user = userEvent.setup();
  render(
    <SettingsTab
      channel={{
        id: 'channel-1',
        creatorId: 'owner-1',
        isArchived: false,
        type: 'PUBLIC',
        postingPermission: 'EVERYONE',
        workspace: { slug: 'team' },
      }}
      currentUserId="owner-1"
      userRole="OWNER"
    />,
  );

  const selects = screen.getAllByRole('combobox');
  selects[0].focus();
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
  await waitFor(() => expect(fixture.updateChannel).toHaveBeenCalledWith('channel-1', { type: 'PRIVATE' }));
  await waitFor(() => expect(fixture.refresh).toHaveBeenCalledTimes(1));

  selects[1].focus();
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
  await waitFor(() => expect(fixture.updateChannel).toHaveBeenLastCalledWith('channel-1', { postingPermission: 'ADMIN_ONLY' }));
  await waitFor(() => expect(fixture.refresh).toHaveBeenCalledTimes(2));
});

it('refreshes the workspace shell after deleting a channel', async () => {
  const user = userEvent.setup();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  fixture.deleteChannel.mockResolvedValue({ success: true });
  render(
    <SettingsTab
      channel={{
        id: 'channel-1',
        creatorId: 'owner-1',
        isArchived: false,
        type: 'PUBLIC',
        postingPermission: 'EVERYONE',
        workspace: { slug: 'team' },
      }}
      currentUserId="owner-1"
      userRole="OWNER"
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Delete Channel' }));

  await waitFor(() => expect(fixture.deleteChannel).toHaveBeenCalledWith('channel-1'));
  expect(fixture.push).toHaveBeenCalledWith('/team');
  expect(fixture.refresh).toHaveBeenCalledOnce();
});
