import { beforeEach, expect, it, vi } from 'vitest';
import { uploadPrivateFile } from './private-file-upload';

const mockRuntime = vi.hoisted(() => ({
  Upload: vi.fn(),
  instance: null as null | {
    options: Record<string, unknown>;
    findPreviousUploads: ReturnType<typeof vi.fn>;
    resumeFromPreviousUpload: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    abort: ReturnType<typeof vi.fn>;
  },
  previous: [] as Array<{ metadata: Record<string, string>; uploadUrl: string | null }>,
}));

vi.mock('tus-js-client', () => ({
  Upload: class {
    constructor(file: File, options: Record<string, unknown>) {
      return mockRuntime.Upload(file, options);
    }
  },
}));

const file = new File(['message attachment'], 'roadmap.pdf', {
  type: 'application/pdf',
  lastModified: 123,
});

function beginUpload(signal?: AbortSignal) {
  return uploadPrivateFile({
    supabaseUrl: 'https://project-ref.supabase.co',
    bucket: 'workspace-files-private',
    path: 'channel/user/upload.roadmap.pdf',
    token: 'signed-upload-token',
    uploadIntentId: 'intent-123',
    file,
    signal,
    onProgress: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRuntime.previous = [];
  mockRuntime.instance = {
    options: {},
    findPreviousUploads: vi.fn(async () => mockRuntime.previous),
    resumeFromPreviousUpload: vi.fn(),
    start: vi.fn(),
    abort: vi.fn(async () => undefined),
  };
  mockRuntime.Upload.mockImplementation((_file, options) => {
    if (!mockRuntime.instance) throw new Error('Missing tus upload fixture');
    mockRuntime.instance.options = options;
    return mockRuntime.instance;
  });
});

it('uses the direct storage host and signed token with scoped object metadata', async () => {
  const promise = beginUpload();
  await vi.waitFor(() => expect(mockRuntime.instance?.start).toHaveBeenCalledOnce());
  const options = mockRuntime.instance?.options;

  expect(options).toMatchObject({
    endpoint: 'https://project-ref.storage.supabase.co/storage/v1/upload/resumable',
    headers: { 'x-signature': 'signed-upload-token' },
    metadata: {
      bucketName: 'workspace-files-private',
      objectName: 'channel/user/upload.roadmap.pdf',
      contentType: 'application/pdf',
    },
    retryDelays: [0, 3000, 5000, 10000, 20000],
    chunkSize: 6 * 1024 * 1024,
  });
  expect(mockRuntime.instance?.findPreviousUploads).toHaveBeenCalledOnce();

  const success = options?.onSuccess as (() => void) | undefined;
  success?.();
  await expect(promise).resolves.toBeUndefined();
});

it('resumes only an existing TUS upload for the same bucket and exact storage path', async () => {
  const resumable = { metadata: { bucketName: 'workspace-files-private', objectName: 'channel/user/upload.roadmap.pdf' }, uploadUrl: 'https://tus.example/upload/1' };
  mockRuntime.previous = [
    { ...resumable, metadata: { ...resumable.metadata, objectName: 'other/path.pdf' } },
    resumable,
  ];

  const promise = beginUpload();
  await vi.waitFor(() => expect(mockRuntime.instance?.resumeFromPreviousUpload).toHaveBeenCalledOnce());
  expect(mockRuntime.instance?.resumeFromPreviousUpload).toHaveBeenCalledWith(resumable);
  expect(mockRuntime.instance?.start).toHaveBeenCalledOnce();

  const success = mockRuntime.instance?.options.onSuccess as (() => void) | undefined;
  success?.();
  await expect(promise).resolves.toBeUndefined();
});

it('reports byte progress and aborts a paused upload when the caller cancels', async () => {
  const controller = new AbortController();
  const progress = vi.fn();
  const promise = uploadPrivateFile({
    supabaseUrl: 'http://127.0.0.1:54321',
    bucket: 'workspace-files-private',
    path: 'channel/user/upload.roadmap.pdf',
    token: 'signed-upload-token',
    uploadIntentId: 'intent-123',
    file,
    signal: controller.signal,
    onProgress: progress,
  });
  await vi.waitFor(() => expect(mockRuntime.instance?.start).toHaveBeenCalledOnce());
  const onProgress = mockRuntime.instance?.options.onProgress as ((sent: number, total: number) => void) | undefined;
  onProgress?.(90, 180);
  expect(progress).toHaveBeenCalledWith(50);

  controller.abort();
  await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  expect(mockRuntime.instance?.abort).toHaveBeenCalledWith(false);
  expect(mockRuntime.instance?.options.endpoint).toBe('http://127.0.0.1:54321/storage/v1/upload/resumable');
});

it('rejects when TUS exhausts its retry policy', async () => {
  const promise = beginUpload();
  await vi.waitFor(() => expect(mockRuntime.instance?.start).toHaveBeenCalledOnce());
  const onError = mockRuntime.instance?.options.onError as ((error: Error) => void) | undefined;
  const failure = new Error('network unavailable');
  onError?.(failure);
  await expect(promise).rejects.toBe(failure);
});
