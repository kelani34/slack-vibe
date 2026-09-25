import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { ChannelDetailsDialog } from './channel-details-dialog';

vi.mock('./about-tab', () => ({ AboutTab: () => null }));
vi.mock('./members-tab', () => ({ MembersTab: () => null }));
vi.mock('./settings-tab', () => ({ SettingsTab: () => null }));

it('bounds channel details to the dynamic viewport', async () => {
  const user = userEvent.setup();
  render(
    <ChannelDetailsDialog
      channel={{
        id: 'channel-1',
        name: 'general',
        type: 'PUBLIC',
        isArchived: false,
        creatorId: 'owner',
        postingPermission: 'EVERYONE',
        topics: [],
        description: null,
        workspace: { slug: 'acme' },
        creator: null,
      }}
      currentUserId="viewer"
      workspaceId="workspace-1"
      userRole="MEMBER"
    >
      <button type="button">Open channel details</button>
    </ChannelDetailsDialog>,
  );

  await user.click(screen.getByRole('button', { name: 'Open channel details' }));

  expect(screen.getByRole('dialog')).toHaveClass(
    'w-[calc(100vw-2rem)]',
    'max-h-[calc(100dvh-2rem)]',
    'h-[min(600px,calc(100dvh-2rem))]',
  );
});
