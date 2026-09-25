import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { DirectMessageActions } from './direct-message-actions';

const fixture = vi.hoisted(() => ({
  leave: vi.fn(),
  rename: vi.fn(),
  createGroup: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/actions/channel', () => ({
  createGroupDirectMessage: fixture.createGroup,
  leaveDirectMessage: fixture.leave,
  renameGroupDirectMessage: fixture.rename,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: fixture.push, refresh: fixture.refresh }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.leave.mockResolvedValue({ success: true });
  fixture.rename.mockResolvedValue({ success: true });
  fixture.createGroup.mockResolvedValue({ success: true, channelId: 'group-2' });
});

function renderActions() {
  return render(
    <DirectMessageActions
      channelId="group-1"
      workspaceId="workspace"
      workspaceSlug="acme"
      currentUserId="current"
      initialName="Launch team"
      members={[
        { id: 'current', name: 'Current', displayName: null, avatarUrl: null, image: null },
        { id: 'alex', name: 'Alex', displayName: null, avatarUrl: null, image: null },
        { id: 'sam', name: 'Sam', displayName: null, avatarUrl: null, image: null },
        { id: 'taylor', name: 'Taylor', displayName: null, avatarUrl: null, image: null },
      ]}
      participantIds={['alex', 'sam']}
    />,
  );
}

it('renames a group from the conversation action menu', async () => {
  const user = userEvent.setup();
  renderActions();

  await user.click(screen.getByRole('button', { name: 'Group conversation actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Rename group' }));
  const input = screen.getByLabelText('Group name');
  await user.clear(input);
  await user.type(input, 'Core launch');
  await user.click(screen.getByRole('button', { name: 'Save name' }));

  expect(fixture.rename).toHaveBeenCalledWith('group-1', 'Core launch');
  expect(fixture.refresh).toHaveBeenCalledOnce();
});

it('requires an explicit confirmation before leaving a group', async () => {
  const user = userEvent.setup();
  renderActions();

  await user.click(screen.getByRole('button', { name: 'Group conversation actions' }));
  await user.click(screen.getByRole('menuitem', { name: 'Leave group' }));
  expect(screen.getByRole('heading', { name: 'Leave this group conversation?' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Leave group' }));

  expect(fixture.leave).toHaveBeenCalledWith('group-1');
  expect(fixture.push).toHaveBeenCalledWith('/acme/dms');
});

it('starts a new conversation generation when adding a member', async () => {
  const user = userEvent.setup();
  renderActions();

  await user.click(screen.getByRole('button', { name: 'Add people' }));
  expect(screen.getByRole('heading', { name: 'Create a new group conversation' })).toBeInTheDocument();
  expect(screen.getByText('Adding someone starts a new group conversation. They will not be able to read messages from this one.')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Message Alex' })).toBeChecked();
  await user.click(screen.getByRole('checkbox', { name: 'Message Taylor' }));
  await user.click(screen.getByRole('button', { name: 'Start group message' }));

  expect(fixture.createGroup).toHaveBeenCalledWith(
    'workspace',
    ['alex', 'sam', 'taylor'],
    expect.stringMatching(/^[0-9a-f-]{36}$/i),
    '',
  );
  expect(fixture.push).toHaveBeenCalledWith('/acme/group-2');
});
