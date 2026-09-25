import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MessageInput } from './message-input';

const fixture = vi.hoisted(() => ({
  progress: {} as Record<number, number>,
  isPending: true,
  mutateAsync: vi.fn(),
}));

vi.mock('@/hooks/use-send-message', () => ({
  useSendMessage: () => ({ mutateAsync: fixture.mutateAsync, isPending: fixture.isPending, uploadProgress: fixture.progress }),
}));
vi.mock('@/hooks/use-typing-indicator', () => ({ useTypingIndicator: () => ({ broadcastTyping: vi.fn() }) }));
vi.mock('@/components/rich-text-editor', () => ({
  RichTextEditor: ({ onAttachClick, disabled }: { onAttachClick: () => void; disabled: boolean }) => (
    <div><button onClick={onAttachClick}>Attach a file</button><button disabled={disabled}>Send</button></div>
  ),
}));
vi.mock('@/components/scheduled-messages', () => ({ ScheduledMessages: () => null }));
vi.mock('@/components/file-preview-modal', () => ({ FilePreviewModal: () => null }));
vi.mock('@/components/typing-indicator', () => ({ TypingIndicator: () => null }));

beforeEach(() => {
  fixture.progress = { 0: 37 };
  fixture.isPending = true;
  fixture.mutateAsync.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:attachment');
});

it('announces accessible per-file upload progress in the composer', async () => {
  const user = userEvent.setup();
  const { container } = render(<MessageInput channelId="channel-1" workspaceId="workspace-1" />);
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected the composer file input');

  await user.upload(input, new File(['file bytes'], 'roadmap.pdf', { type: 'application/pdf' }));

  const progress = screen.getByRole('progressbar', { name: 'Upload progress for roadmap.pdf' });
  expect(progress).toHaveAttribute('aria-valuenow', '37');
  expect(screen.getByRole('status')).toHaveTextContent('Uploading roadmap.pdf: 37%');
  expect(screen.getByRole('button', { name: 'Remove attachment roadmap.pdf' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
});

it('keeps interrupted progress visible as a paused status after submission ends', async () => {
  fixture.progress = { 0: 63 };
  fixture.isPending = true;
  const { container, rerender } = render(<MessageInput channelId="channel-1" workspaceId="workspace-1" />);
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected the composer file input');
  fireEvent.change(input, { target: { files: [new File(['file bytes'], 'roadmap.pdf', { type: 'application/pdf' })] } });
  expect(screen.getByRole('status')).toHaveTextContent('Uploading roadmap.pdf: 63%');

  fixture.isPending = false;
  rerender(<MessageInput channelId="channel-1" workspaceId="workspace-1" />);

  expect(screen.getByRole('status')).toHaveTextContent('Upload paused at 63%');
});
