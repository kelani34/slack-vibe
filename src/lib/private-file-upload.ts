import { Upload } from 'tus-js-client';

const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

interface UploadInput {
  supabaseUrl: string;
  bucket: string;
  path: string;
  token: string;
  uploadIntentId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (percentage: number) => void;
}

function resumableEndpoint(supabaseUrl: string) {
  const url = new URL(supabaseUrl);
  if (url.hostname.endsWith('.supabase.co') && !url.hostname.endsWith('.storage.supabase.co')) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co');
  }
  url.pathname = '/storage/v1/upload/resumable';
  url.search = '';
  url.hash = '';
  return url.toString();
}

function abortError() {
  return new DOMException('Upload paused', 'AbortError');
}

export function uploadPrivateFile({
  supabaseUrl,
  bucket,
  path,
  token,
  uploadIntentId,
  file,
  signal,
  onProgress,
}: UploadInput) {
  const objectName = path;
  const upload = new Upload(file, {
    endpoint: resumableEndpoint(supabaseUrl),
    headers: { 'x-signature': token },
    metadata: { bucketName: bucket, objectName, contentType: file.type },
    fingerprint: async (input) => `slack-vibe:${uploadIntentId}:${input.name}:${input.size}:${input.lastModified}`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    chunkSize: TUS_CHUNK_SIZE,
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    onProgress: (bytesSent, bytesTotal) => {
      onProgress?.(bytesTotal > 0 ? Math.min(100, Math.round((bytesSent / bytesTotal) * 100)) : 0);
    },
  });

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      void upload.abort(false).finally(() => reject(abortError()));
    };

    upload.options.onSuccess = () => {
      if (settled) return;
      settled = true;
      cleanup();
      onProgress?.(100);
      resolve();
    };
    upload.options.onError = fail;

    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    void upload.findPreviousUploads().then((previousUploads) => {
      if (settled) return;
      const previous = previousUploads.find(({ metadata, uploadUrl }) =>
        uploadUrl && metadata.bucketName === bucket && metadata.objectName === objectName,
      );
      if (previous) upload.resumeFromPreviousUpload(previous);
      upload.start();
    }).catch(fail);
  });
}
