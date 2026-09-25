import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { StarButton } from './star-button';

const fixture = vi.hoisted(() => ({
  toggle: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/actions/star', () => ({ toggleStarChannel: fixture.toggle }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: fixture.refresh }) }));
vi.mock('sonner', () => ({ toast: { error: fixture.error } }));

beforeEach(() => vi.clearAllMocks());

it('refreshes the current route after a successful star toggle', async () => {
  fixture.toggle.mockResolvedValue({ success: true, starred: true });
  render(<StarButton channelId="channel-1" initialStarred={false} />);

  fireEvent.click(screen.getByTitle('Star channel'));

  await waitFor(() => expect(fixture.toggle).toHaveBeenCalledWith('channel-1'));
  await waitFor(() => expect(fixture.refresh).toHaveBeenCalledTimes(1));
});
