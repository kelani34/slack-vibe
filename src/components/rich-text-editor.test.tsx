import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { RichTextEditor } from './rich-text-editor';

vi.mock('@/actions/channel-member', () => ({ getChannelMembers: vi.fn(async () => []) }));

beforeEach(() => window.localStorage.clear());

it('restores a per-user draft when the composer remounts', async () => {
  const draftKey = 'slack-vibe:draft:user-1:channel-1:root';
  window.localStorage.setItem(draftKey, '<p>Keep this draft</p>');
  render(<RichTextEditor onSubmit={vi.fn()} draftKey={draftKey} />);
  const editor = await waitFor(() => {
    const element = document.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!element) throw new Error('Editor not mounted');
    return element;
  });
  await waitFor(() => expect(editor).toHaveTextContent('Keep this draft'));
});

it('clears the stored draft after a successful send', async () => {
  const onSubmit = vi.fn();
  const draftKey = 'slack-vibe:draft:user-1:channel-1:root';
  window.localStorage.setItem(draftKey, '<p>Send me</p>');
  render(<RichTextEditor onSubmit={onSubmit} draftKey={draftKey} />);
  await waitFor(() => {
    const element = document.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!element) throw new Error('Editor not mounted');
    expect(element).toHaveTextContent('Send me');
  });
  const sendButton = document.querySelector<HTMLButtonElement>('button.bg-primary');
  if (!sendButton) throw new Error('Send button not mounted');
  fireEvent.click(sendButton);

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith('<p>Send me</p>', 'Send me', undefined);
    expect(window.localStorage.getItem(draftKey)).toBeNull();
  });
});
