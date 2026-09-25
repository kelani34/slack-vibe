import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

import { useSendMessage } from './use-send-message';

const fixture = vi.hoisted(() => ({ sendMessage: vi.fn(), uploadFile: vi.fn() }));
const timelineKey = ['messages', 'user-1', 'workspace-1', 'channel-1'] as const;

vi.mock('@/actions/message', () => ({ sendMessage: fixture.sendMessage }));
vi.mock('@/actions/upload', () => ({ uploadFile: fixture.uploadFile }));
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
  const upload = { url: 'https://files.test/notes.txt', name: file.name, type: file.type, size: file.size };
  fixture.uploadFile.mockResolvedValue(upload);
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
      attachments: Array<{ url: string; name: string; type: string; size: number; isUploaded?: boolean }>;
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

  expect(fixture.uploadFile).toHaveBeenCalledOnce();
  expect(fixture.sendMessage).toHaveBeenCalledTimes(2);
  for (const [formData] of fixture.sendMessage.mock.calls) {
    expect(formData.get('clientMutationId')).toBe(clientMutationId);
    expect(formData.get('attachments')).toBe(JSON.stringify([upload]));
  }
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
