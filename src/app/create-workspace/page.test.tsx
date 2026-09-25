import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import CreateWorkspacePage from './page';

const fixture = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/actions/workspace', () => ({ createWorkspace: fixture.createWorkspace }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: fixture.push, refresh: fixture.refresh }),
}));
vi.mock('sonner', () => ({ toast: { error: fixture.error, success: fixture.success } }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.createWorkspace.mockResolvedValue({ success: true, workspaceId: 'workspace-1', slug: 'acme' });
});

it('refreshes the workspace shell after creating and opening a workspace', async () => {
  const user = userEvent.setup();
  render(<CreateWorkspacePage />);

  await user.type(screen.getByLabelText('Workspace Name'), 'Acme');
  await user.click(screen.getByRole('button', { name: 'Create Workspace' }));

  expect(fixture.createWorkspace).toHaveBeenCalledOnce();
  expect(fixture.push).toHaveBeenCalledWith('/acme');
  expect(fixture.refresh).toHaveBeenCalledOnce();
});
