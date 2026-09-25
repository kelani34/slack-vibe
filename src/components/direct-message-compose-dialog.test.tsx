import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { DirectMessageComposeDialog } from './direct-message-compose-dialog';

const fixture = vi.hoisted(() => ({
  createGroup: vi.fn(),
  createDirect: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/actions/channel', () => ({
  createGroupDirectMessage: fixture.createGroup,
  getOrCreateDirectMessage: fixture.createDirect,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: fixture.push, refresh: fixture.refresh }),
}));

const members = [
  { id: 'current', name: 'Current', displayName: null, avatarUrl: null, image: null, email: 'current@example.test' },
  { id: 'alex', name: 'Alex', displayName: 'Alex Rivera', avatarUrl: null, image: null, email: 'alex@example.test' },
  { id: 'sam', name: 'Sam', displayName: null, avatarUrl: null, image: null, email: 'sam@example.test' },
];

beforeEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
  fixture.createDirect.mockResolvedValue({ success: true, channelId: 'direct-1' });
  fixture.createGroup.mockResolvedValue({ success: true, channelId: 'group-1' });
});

it('starts a one-to-one conversation from a selected member', async () => {
  const user = userEvent.setup();
  render(
    <DirectMessageComposeDialog
      workspaceId="workspace"
      workspaceSlug="acme"
      currentUserId="current"
      members={members}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'New message' }));
  await user.click(screen.getByRole('checkbox', { name: 'Message Alex Rivera' }));
  await user.click(screen.getByRole('button', { name: 'Start message' }));

  expect(fixture.createDirect).toHaveBeenCalledWith('workspace', 'alex');
  expect(fixture.push).toHaveBeenCalledWith('/acme/direct-1');
});

it('creates a group conversation when multiple members are selected', async () => {
  const user = userEvent.setup();
  render(
    <DirectMessageComposeDialog
      workspaceId="workspace"
      workspaceSlug="acme"
      currentUserId="current"
      members={members}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'New message' }));
  await user.click(screen.getByRole('checkbox', { name: 'Message Alex Rivera' }));
  await user.click(screen.getByRole('checkbox', { name: 'Message Sam' }));
  await user.type(screen.getByLabelText('Group name (optional)'), 'Launch team');
  await user.click(screen.getByRole('button', { name: 'Start group message' }));

  expect(fixture.createGroup).toHaveBeenCalledWith(
    'workspace',
    ['alex', 'sam'],
    expect.stringMatching(/^[0-9a-f-]{36}$/i),
    'Launch team',
  );
  expect(fixture.push).toHaveBeenCalledWith('/acme/group-1');
});

it('reuses the same creation intent when retrying after an uncertain result', async () => {
  const user = userEvent.setup();
  fixture.createGroup
    .mockRejectedValueOnce(new Error('The network response was lost.'))
    .mockResolvedValueOnce({ success: true, channelId: 'group-2' });
  render(
    <DirectMessageComposeDialog
      workspaceId="workspace"
      workspaceSlug="acme"
      currentUserId="current"
      members={members}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'New message' }));
  await user.click(screen.getByRole('checkbox', { name: 'Message Alex Rivera' }));
  await user.click(screen.getByRole('checkbox', { name: 'Message Sam' }));
  await user.click(screen.getByRole('button', { name: 'Start group message' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm this conversation. Retry to continue safely.');
  const retryButton = await screen.findByRole('button', { name: 'Start group message' });
  expect(retryButton).toBeEnabled();
  await user.click(retryButton);

  const firstKey = fixture.createGroup.mock.calls[0]?.[2];
  expect(firstKey).toMatch(/^[0-9a-f-]{36}$/i);
  expect(fixture.createGroup.mock.calls[1]?.[2]).toBe(firstKey);
  expect(fixture.push).toHaveBeenCalledWith('/acme/group-2');
});

it('recovers the same creation intent after the dialog is remounted', async () => {
  const user = userEvent.setup();
  fixture.createGroup
    .mockRejectedValueOnce(new Error('The network response was lost.'))
    .mockResolvedValueOnce({ success: true, channelId: 'group-recovered' });
  const firstView = render(
    <DirectMessageComposeDialog
      workspaceId="workspace"
      workspaceSlug="acme"
      currentUserId="current"
      members={members}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'New message' }));
  await user.click(screen.getByRole('checkbox', { name: 'Message Alex Rivera' }));
  await user.click(screen.getByRole('checkbox', { name: 'Message Sam' }));
  await user.click(screen.getByRole('button', { name: 'Start group message' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  const firstKey = fixture.createGroup.mock.calls[0]?.[2];
  firstView.unmount();

  render(
    <DirectMessageComposeDialog
      workspaceId="workspace"
      workspaceSlug="acme"
      currentUserId="current"
      members={members}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'New message' }));
  await user.click(screen.getByRole('checkbox', { name: 'Message Alex Rivera' }));
  await user.click(screen.getByRole('checkbox', { name: 'Message Sam' }));
  await user.click(screen.getByRole('button', { name: 'Start group message' }));

  expect(fixture.createGroup.mock.calls[1]?.[2]).toBe(firstKey);
  expect(fixture.push).toHaveBeenCalledWith('/acme/group-recovered');
});
