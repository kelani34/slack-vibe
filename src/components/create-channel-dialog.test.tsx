import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { CreateChannelDialog } from './create-channel-dialog';

const fixture = vi.hoisted(() => ({
  create: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/actions/channel', () => ({ createChannel: fixture.create }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: fixture.refresh }) }));
vi.mock('sonner', () => ({ toast: { error: fixture.error, success: fixture.success } }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.create.mockResolvedValue({ success: true });
});

it('refreshes the workspace shell after creating a channel', async () => {
  const user = userEvent.setup();
  render(
    <CreateChannelDialog workspaceId="workspace-1">
      <button type="button">Open channel form</button>
    </CreateChannelDialog>,
  );

  await user.click(screen.getByRole('button', { name: 'Open channel form' }));
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'research');
  await user.click(screen.getByRole('button', { name: 'Create Channel' }));

  await waitFor(() => expect(fixture.create).toHaveBeenCalled());
  await waitFor(() => expect(fixture.refresh).toHaveBeenCalledTimes(1));
});
