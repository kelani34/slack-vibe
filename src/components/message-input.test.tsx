import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MessageInput } from './message-input';

const fixture = vi.hoisted(() => ({
  progress: {} as Record<number, number>,
  isPending: true,
  activeUploadIndex: 0 as number | null,
  mutateAsync: vi.fn(),
  cancelUpload: vi.fn(),
}));

vi.mock('@/hooks/use-send-message', () => ({
  useSendMessage: () => ({ mutateAsync: fixture.mutateAsync, isPending: fixture.isPending, uploadProgress: fixture.progress, activeUploadIndex: fixture.activeUploadIndex, cancelUpload: fixture.cancelUpload }),
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
  fixture.activeUploadIndex = 0;
  fixture.mutateAsync.mockReset();
  fixture.cancelUpload.mockReset();
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
  expect(screen.getByRole('button', { name: 'Cancel upload roadmap.pdf' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pause upload roadmap.pdf' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
});

it('keeps interrupted progress visible as a paused status after submission ends', async () => {
  fixture.progress = { 0: 63 };
  fixture.isPending = true;
  fixture.activeUploadIndex = 0;
  const { container, rerender } = render(<MessageInput channelId="channel-1" workspaceId="workspace-1" />);
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected the composer file input');
  fireEvent.change(input, { target: { files: [new File(['file bytes'], 'roadmap.pdf', { type: 'application/pdf' })] } });
  expect(screen.getByRole('status')).toHaveTextContent('Uploading roadmap.pdf: 63%');

  fixture.isPending = false;
  fixture.activeUploadIndex = null;
  rerender(<MessageInput channelId="channel-1" workspaceId="workspace-1" />);

  expect(screen.getByRole('status')).toHaveTextContent('Upload paused at 63%');
});

it('pauses without removing the attachment and cancels when the attachment is removed during upload', async () => {
  const user = userEvent.setup();
  fixture.cancelUpload.mockReturnValue(true);
  const { container, rerender } = render(<MessageInput channelId="channel-1" workspaceId="workspace-1" />);
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected the composer file input');
  await user.upload(input, new File(['file bytes'], 'roadmap.pdf', { type: 'application/pdf' }));

  await user.click(screen.getByRole('button', { name: 'Pause upload roadmap.pdf' }));
  expect(fixture.cancelUpload).toHaveBeenCalledOnce();
  expect(screen.getByText('roadmap.pdf')).toBeInTheDocument();

  fixture.isPending = false;
  fixture.activeUploadIndex = null;
  rerender(<MessageInput channelId="channel-1" workspaceId="workspace-1" />);
  await user.click(screen.getByRole('button', { name: 'Remove attachment roadmap.pdf' }));
  expect(screen.queryByText('roadmap.pdf')).not.toBeInTheDocument();

  fixture.isPending = true;
  fixture.activeUploadIndex = 0;
  const next = render(<MessageInput channelId="channel-1" workspaceId="workspace-1" />);
  const nextInput = next.container.querySelector('input[type="file"]');
  if (!(nextInput instanceof HTMLInputElement)) throw new Error('Expected the composer file input');
  await user.upload(nextInput, new File(['other bytes'], 'other.pdf', { type: 'application/pdf' }));
  await user.click(screen.getByRole('button', { name: 'Cancel upload other.pdf' }));
  expect(fixture.cancelUpload).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('other.pdf')).not.toBeInTheDocument();
});
