import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { TopicEditorDialog } from './topic-editor-dialog';

const fixture = vi.hoisted(() => ({
  getDistinctTopics: vi.fn(),
  updateChannel: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/actions/channel', () => ({
  getDistinctTopics: fixture.getDistinctTopics,
  updateChannel: fixture.updateChannel,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: fixture.refresh }),
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.getDistinctTopics.mockResolvedValue([]);
  fixture.updateChannel.mockResolvedValue({ success: true });
});

it('loads the latest channel topics each time the editor opens', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <TopicEditorDialog
      channel={{ id: 'channel-1', topics: ['Original'] }}
      workspaceId="workspace-1"
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Edit' }));
  expect(screen.getByText('Add, remove, and manage topics for this channel.')).toBeInTheDocument();
  expect(screen.getByText('Original')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  rerender(
    <TopicEditorDialog
      channel={{ id: 'channel-1', topics: ['Updated'] }}
      workspaceId="workspace-1"
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Edit' }));

  expect(screen.getByText('Updated')).toBeInTheDocument();
  expect(fixture.getDistinctTopics).toHaveBeenCalledTimes(2);
});
