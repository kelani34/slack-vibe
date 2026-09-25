import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import { AboutTab } from './about-tab';

const fixture = vi.hoisted(() => ({
  leaveChannel: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/actions/channel', () => ({ leaveChannel: fixture.leaveChannel }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: fixture.push, refresh: fixture.refresh }),
}));
vi.mock('sonner', () => ({
  toast: { error: fixture.error, success: fixture.success },
}));
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('./topic-editor-dialog', () => ({ TopicEditorDialog: () => null }));
vi.mock('./description-editor-dialog', () => ({ DescriptionEditorDialog: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.leaveChannel.mockResolvedValue({ success: true });
});

it('refreshes the workspace shell after leaving a channel', async () => {
  const user = userEvent.setup();
  render(
    <AboutTab
      workspaceId="workspace"
      channel={{
        id: 'channel-1',
        topics: [],
        description: null,
        isArchived: false,
        workspace: { slug: 'team' },
        creator: null,
      }}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Leave Channel' }));

  expect(fixture.leaveChannel).toHaveBeenCalledWith('channel-1');
  expect(fixture.push).toHaveBeenCalledWith('/team');
  expect(fixture.refresh).toHaveBeenCalledOnce();
});
