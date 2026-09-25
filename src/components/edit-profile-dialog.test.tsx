import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import { EditProfileDialog } from './edit-profile-dialog';

const fixture = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  invalidateQueries: vi.fn(),
  refresh: vi.fn(),
  onOpenChange: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/actions/user', () => ({ updateProfile: fixture.updateProfile }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: fixture.invalidateQueries }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: fixture.refresh }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: fixture.error, success: fixture.success } }));
vi.mock('@/components/ui/dialog', () => {
  const wrapper = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return { Dialog: wrapper, DialogContent: wrapper, DialogHeader: wrapper, DialogTitle: wrapper };
});

beforeEach(() => {
  vi.clearAllMocks();
  fixture.updateProfile.mockResolvedValue({ success: true });
});

it('refreshes server-rendered profile surfaces after a successful profile edit', async () => {
  const user = userEvent.setup();
  render(
    <EditProfileDialog
      open
      onOpenChange={fixture.onOpenChange}
      user={{ id: 'current', name: 'Taiwo', avatarUrl: null }}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Save Changes' }));

  expect(fixture.updateProfile).toHaveBeenCalledOnce();
  expect(fixture.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['user-profile', 'current'] });
  expect(fixture.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['user-card', 'current'] });
  expect(fixture.refresh).toHaveBeenCalledOnce();
});
