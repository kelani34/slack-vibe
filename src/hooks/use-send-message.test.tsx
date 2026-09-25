import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { useSendMessage } from './use-send-message';

const fixture = vi.hoisted(() => ({ sendMessage: vi.fn(), createUploadIntent: vi.fn(), finalizeUploadIntent: vi.fn(), uploadToSignedUrl: vi.fn() }));
const timelineKey = ['messages', 'user-1', 'workspace-1', 'channel-1'] as const;

vi.mock('@/actions/message', () => ({ sendMessage: fixture.sendMessage }));
vi.mock('@/actions/upload', () => ({ createUploadIntent: fixture.createUploadIntent, finalizeUploadIntent: fixture.finalizeUploadIntent }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: vi.fn(() => ({ uploadToSignedUrl: fixture.uploadToSignedUrl })) } }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

it('shows an optimistic message and replaces it after the server confirms delivery', async () => {
  let resolveSend!: (result: {
    success: true;
    message: { id: string; content: string; channelId: string; userId: string };
  }) => void;
  fixture.sendMessage.mockImplementation(
    () => new Promise((resolve) => { resolveSend = resolve; }),
  );

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  queryClient.setQueryData(timelineKey, {
    pages: [[]],
    pageParams: [undefined],
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useSendMessage({ channelId: 'channel-1', workspaceId: 'workspace-1', currentUserId: 'user-1', currentUser: { id: 'user-1', name: 'Alex' } }),
    { wrapper },
  );

  act(() => result.current.mutate({ html: '<p>Hello</p>' }));
  await waitFor(() => {
    const cache = queryClient.getQueryData<{ pages: Array<Array<{ id: string; isPending?: boolean }>> }>(timelineKey);
    expect(cache?.pages[0]?.[0]).toMatchObject({ content: '<p>Hello</p>', isPending: true });
  });

  await act(async () => {
    resolveSend({
      success: true,
      message: { id: 'message-1', content: '<p>Hello</p>', channelId: 'channel-1', userId: 'user-1' },
    });
  });

  await waitFor(() => {
    const cache = queryClient.getQueryData<{ pages: Array<Array<{ id: string }>> }>(timelineKey);
    expect(cache?.pages[0]).toEqual([
      expect.objectContaining({ id: 'message-1', content: '<p>Hello</p>' }),
    ]);
  });
});

it('removes the optimistic row if the realtime event arrived before the send acknowledgement', async () => {
  let resolveSend!: (result: {
    success: true;
    message: { id: string; content: string; channelId: string; userId: string };
  }) => void;
  fixture.sendMessage.mockImplementation(
    () => new Promise((resolve) => { resolveSend = resolve; }),
  );

  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  queryClient.setQueryData(timelineKey, { pages: [[]], pageParams: [undefined] });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useSendMessage({ channelId: 'channel-1', workspaceId: 'workspace-1', currentUser: { id: 'user-1', name: 'Alex' } }),
    { wrapper },
  );

  act(() => result.current.mutate({ html: '<p>Hello</p>' }));
  await waitFor(() => {
    const cache = queryClient.getQueryData<{ pages: Array<Array<{ id: string }>> }>(timelineKey);
    expect(cache?.pages[0]?.[0]?.id).toMatch(/^temp-/);
  });

  const canonicalMessage = {
    id: 'message-1',
    content: '<p>Hello</p>',
    channelId: 'channel-1',
    userId: 'user-1',
  };
  queryClient.setQueryData<{ pages: Array<Array<typeof canonicalMessage>> }>(
    timelineKey,
    (old) => old ? { ...old, pages: [[...old.pages[0], canonicalMessage]] } : old,
  );

  await act(async () => resolveSend({ success: true, message: canonicalMessage }));

  await waitFor(() => {
    const cache = queryClient.getQueryData<{ pages: Array<Array<{ id: string }>> }>(timelineKey);
    expect(cache?.pages[0]).toEqual([expect.objectContaining({ id: 'message-1' })]);
  });
});

it('reuses the send key and completed uploads when retrying an uncertain send', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:notes');
  const file = new File(['important'], 'notes.txt', { type: 'text/plain' });
  const upload = { uploadIntentId: '7a1d4f5f-3f38-4ec0-9723-ff379e5cbb69', name: file.name, type: file.type, size: file.size };
  fixture.createUploadIntent.mockResolvedValue({ ...upload, storageBucket: 'workspace-files-private', storagePath: 'channel-1/user-1/object.txt', token: 'signed-upload-token' });
  fixture.finalizeUploadIntent.mockResolvedValue(upload);
  fixture.uploadToSignedUrl.mockResolvedValue({ error: null });
  fixture.sendMessage
    .mockResolvedValueOnce({ error: 'The acknowledgement was lost' })
    .mockResolvedValueOnce({
      success: true,
      message: { id: 'message-1', content: '<p>Document</p>', channelId: 'channel-1', userId: 'user-1' },
    });

  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  queryClient.setQueryData(timelineKey, { pages: [[]], pageParams: [undefined] });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useSendMessage({ channelId: 'channel-1', workspaceId: 'workspace-1', currentUser: { id: 'user-1', name: 'Alex' } }),
    { wrapper },
  );

  await act(async () => {
    await result.current.mutateAsync({ html: '<p>Document</p>', files: [file] });
  });

  const failedMessage = queryClient.getQueryData<{
    pages: Array<Array<{
      clientMutationId?: string;
      attachments: Array<{ uploadIntentId?: string; name: string; type: string; size: number; isUploaded?: boolean }>;
    }>>;
  }>(timelineKey)?.pages[0]?.[0];
  expect(failedMessage?.clientMutationId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(failedMessage?.attachments[0]).toMatchObject({ ...upload, isUploaded: true });
  const clientMutationId = failedMessage?.clientMutationId;
  if (!clientMutationId) throw new Error('Expected a retry key on the failed message');

  await act(async () => {
    await result.current.mutateAsync({
      html: '<p>Document</p>',
      files: [file],
      clientMutationId,
      uploadedAttachments: [{ index: 0, ...upload }],
    });
  });

  expect(fixture.createUploadIntent).toHaveBeenCalledOnce();
  expect(fixture.uploadToSignedUrl).toHaveBeenCalledWith('channel-1/user-1/object.txt', 'signed-upload-token', file, { contentType: 'text/plain' });
  expect(fixture.finalizeUploadIntent).toHaveBeenCalledTimes(2);
  expect(fixture.sendMessage).toHaveBeenCalledTimes(2);
  for (const [formData] of fixture.sendMessage.mock.calls) {
    expect(formData.get('clientMutationId')).toBe(clientMutationId);
    expect(formData.get('attachments')).toBe(JSON.stringify([{ uploadIntentId: upload.uploadIntentId }]));
  }
});

it('re-uploads an expired intent on retry without changing the message send key', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:notes');
  const file = new File(['important'], 'notes.txt', { type: 'text/plain' });
  const firstIntent = { uploadIntentId: '7a1d4f5f-3f38-4ec0-9723-ff379e5cbb69', name: file.name, type: file.type, size: file.size };
  const freshIntent = { uploadIntentId: '8b2e5a60-4f49-4fd1-8734-0f48ea6dcb70', name: file.name, type: file.type, size: file.size };
  fixture.createUploadIntent.mockResolvedValueOnce({ ...firstIntent, storageBucket: 'workspace-files-private', storagePath: 'channel-1/user-1/old.txt', token: 'old-token' })
    .mockResolvedValueOnce({ ...freshIntent, storageBucket: 'workspace-files-private', storagePath: 'channel-1/user-1/new.txt', token: 'new-token' });
  fixture.finalizeUploadIntent.mockResolvedValueOnce(firstIntent).mockResolvedValueOnce(freshIntent);
  fixture.uploadToSignedUrl.mockResolvedValue({ error: null });
  fixture.sendMessage
    .mockResolvedValueOnce({ error: 'One or more uploaded files are unavailable' })
    .mockResolvedValueOnce({
      success: true,
      message: { id: 'message-1', content: '<p>Document</p>', channelId: 'channel-1', userId: 'user-1' },
    });

  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  queryClient.setQueryData(timelineKey, { pages: [[]], pageParams: [undefined] });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useSendMessage({ channelId: 'channel-1', workspaceId: 'workspace-1', currentUser: { id: 'user-1', name: 'Alex' } }),
    { wrapper },
  );

  await act(async () => result.current.mutateAsync({ html: '<p>Document</p>', files: [file] }));
  const failedMessage = queryClient.getQueryData<{
    pages: Array<Array<{ clientMutationId?: string; attachments: Array<{ uploadIntentId?: string; isUploaded?: boolean }> }>>;
  }>(timelineKey)?.pages[0]?.[0];
  expect(failedMessage?.attachments[0]).not.toHaveProperty('uploadIntentId');
  expect(failedMessage?.attachments[0]?.isUploaded).toBeUndefined();

  await act(async () => result.current.mutateAsync({
    html: '<p>Document</p>',
    files: [file],
    clientMutationId: failedMessage?.clientMutationId,
    uploadedAttachments: [],
  }));

  expect(fixture.createUploadIntent).toHaveBeenCalledTimes(2);
  expect(fixture.sendMessage.mock.calls[1][0].get('clientMutationId')).toBe(failedMessage?.clientMutationId);
  expect(fixture.sendMessage.mock.calls[1][0].get('attachments')).toBe(
    JSON.stringify([{ uploadIntentId: freshIntent.uploadIntentId }]),
  );
});

it('keeps a rejected optimistic message visible with a failed status', async () => {
  fixture.sendMessage.mockResolvedValue({ error: 'Posting is not allowed' });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  queryClient.setQueryData(timelineKey, {
    pages: [[]],
    pageParams: [undefined],
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useSendMessage({ channelId: 'channel-1', workspaceId: 'workspace-1', currentUser: { id: 'user-1', name: 'Alex' } }),
    { wrapper },
  );

  act(() => result.current.mutate({ html: '<p>Hello</p>' }));

  await waitFor(() => {
    const cache = queryClient.getQueryData<{
      pages: Array<Array<{ id: string; isPending?: boolean; isError?: boolean }>>;
    }>(timelineKey);
    expect(cache?.pages[0]?.[0]).toMatchObject({
      content: '<p>Hello</p>',
      isPending: false,
      isError: true,
    });
  });
});

it('invalidates only the conversation schedule query after a scheduled send', async () => {
  fixture.sendMessage.mockResolvedValue({
    success: true,
    scheduled: true,
    message: { id: 'scheduled-1' },
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useSendMessage({ channelId: 'channel-1', workspaceId: 'workspace-1', currentUser: { id: 'user-1', name: 'Alex' } }),
    { wrapper },
  );

  await act(async () => {
    await result.current.mutateAsync({ html: '<p>Later</p>', scheduledAt: new Date() });
  });

  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['scheduled-messages', 'channel-1'],
  });
});
