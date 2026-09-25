'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { PRIVATE_ATTACHMENT_BUCKET } from '@/lib/attachment-storage';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const UPLOAD_INTENT_LIFETIME_MS = 2 * 60 * 60 * 1000;
const uploadInputSchema = z.object({
  channelId: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  type: z.string().min(1).max(127),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
}).strict();
const ALLOWED_FILE_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'image/tiff', 'image/x-icon',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain',
]);

function isAllowedFileType(type: string) {
  return ALLOWED_FILE_TYPES.has(type);
}

function hasSupportedFileSignature(type: string, bytes: Uint8Array) {
  const startsWith = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  switch (type) {
    case 'image/png': return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/jpeg': return startsWith(0xff, 0xd8, 0xff);
    case 'image/gif': return startsWith(0x47, 0x49, 0x46, 0x38) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
    case 'image/webp': return startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    case 'image/avif': return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
      ((bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) ||
        (bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x73));
    case 'image/bmp': return startsWith(0x42, 0x4d);
    case 'image/tiff': return startsWith(0x49, 0x49, 0x2a, 0x00) || startsWith(0x4d, 0x4d, 0x00, 0x2a);
    case 'image/x-icon': return startsWith(0x00, 0x00, 0x01, 0x00);
    case 'video/mp4': return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
      ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(String.fromCharCode(...bytes.slice(8, 12)));
    case 'video/quicktime': return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 && String.fromCharCode(...bytes.slice(8, 10)) === 'qt';
    case 'video/webm': return startsWith(0x1a, 0x45, 0xdf, 0xa3);
    case 'audio/mpeg': return startsWith(0x49, 0x44, 0x33) || (bytes[0] === 0xff && [0xfb, 0xf3, 0xf2].includes(bytes[1]));
    case 'audio/wav':
    case 'audio/x-wav': return startsWith(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === 'WAVE';
    case 'audio/ogg': return startsWith(0x4f, 0x67, 0x67, 0x53);
    case 'audio/flac': return startsWith(0x66, 0x4c, 0x61, 0x43);
    case 'application/pdf': return startsWith(0x25, 0x50, 0x44, 0x46, 0x2d);
    default: return false;
  }
}

async function readFilePrefix(url: string) {
  const response = await fetch(url, {
    headers: { Range: 'bytes=0-11' },
    cache: 'no-store',
  });
  if (!response.ok || !response.body) throw new Error('Could not verify uploaded file');

  const reader = response.body.getReader();
  const bytes = new Uint8Array(12);
  let offset = 0;
  try {
    while (offset < bytes.length) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = value.subarray(0, bytes.length - offset);
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return bytes.subarray(0, offset);
}

function intentResult(intentId: string, name: string, type: string, size: number) {
  return { uploadIntentId: intentId, name, type, size };
}

export async function createUploadIntent(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const parsed = uploadInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid file' };
  const { channelId, name, type, size } = parsed.data;
  if (!isAllowedFileType(type)) return { error: 'File type is not supported' };

  const member = await prisma.channelMember.findFirst({
    where: {
      channelId,
      userId: session.user.id,
      channel: { workspace: { members: { some: { userId: session.user.id } } } },
    },
    select: { id: true },
  });
  if (!member) return { error: 'Not a member of this channel' };

  const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const storagePath = `${channelId}/${session.user.id}/${randomUUID()}.${extension || 'bin'}`;
  const expiresAt = new Date(Date.now() + UPLOAD_INTENT_LIFETIME_MS);
  const intent = await prisma.uploadIntent.create({
    data: {
      userId: session.user.id,
      channelId,
      storageBucket: PRIVATE_ATTACHMENT_BUCKET,
      storagePath,
      name,
      type,
      size,
      expiresAt,
    },
    select: { id: true },
  });

  try {
    const { data, error } = await createAdminClient()
      .storage.from(PRIVATE_ATTACHMENT_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data?.token) throw new Error('Could not create upload grant');
    return { ...intentResult(intent.id, name, type, size), storageBucket: PRIVATE_ATTACHMENT_BUCKET, storagePath, token: data.token };
  } catch {
    await prisma.uploadIntent.delete({ where: { id: intent.id } }).catch(() => undefined);
    return { error: 'File upload is unavailable' };
  }
}

export async function renewUploadIntent(uploadIntentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  if (!z.string().uuid().safeParse(uploadIntentId).success) return { error: 'Uploaded file is unavailable' };

  const intent = await prisma.uploadIntent.findFirst({
    where: {
      id: uploadIntentId,
      userId: session.user.id,
      storageBucket: PRIVATE_ATTACHMENT_BUCKET,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
      channel: {
        members: { some: { userId: session.user.id } },
        workspace: { members: { some: { userId: session.user.id } } },
      },
    },
    select: { id: true, name: true, type: true, size: true, storageBucket: true, storagePath: true },
  });
  if (!intent) return { error: 'Uploaded file is unavailable' };

  try {
    const { data, error } = await createAdminClient()
      .storage.from(PRIVATE_ATTACHMENT_BUCKET)
      .createSignedUploadUrl(intent.storagePath, { upsert: false });
    if (error || !data?.token) throw new Error('Could not create upload grant');
    return { ...intentResult(intent.id, intent.name, intent.type, intent.size), storageBucket: intent.storageBucket, storagePath: intent.storagePath, token: data.token };
  } catch {
    return { error: 'File upload is unavailable' };
  }
}

export async function finalizeUploadIntent(uploadIntentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  if (!z.string().uuid().safeParse(uploadIntentId).success) return { error: 'Uploaded file is unavailable' };

  const intent = await prisma.uploadIntent.findFirst({
    where: {
      id: uploadIntentId,
      userId: session.user.id,
      storageBucket: PRIVATE_ATTACHMENT_BUCKET,
      channel: { members: { some: { userId: session.user.id } } },
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      channelId: true,
      storagePath: true,
      storageBucket: true,
      name: true,
      type: true,
      size: true,
      status: true,
    },
  });
  if (!intent) return { error: 'Uploaded file is unavailable' };
  if (intent.status === 'UPLOADED') return intentResult(intent.id, intent.name, intent.type, intent.size);

  const bucket = createAdminClient().storage.from(PRIVATE_ATTACHMENT_BUCKET);
  const parentPath = intent.storagePath.slice(0, intent.storagePath.lastIndexOf('/'));
  const fileName = intent.storagePath.slice(intent.storagePath.lastIndexOf('/') + 1);
  const { data: objects, error: listError } = await bucket.list(parentPath, { limit: 10, search: fileName });
  if (listError) return { error: 'Could not verify uploaded file. Try again.' };
  const object = objects?.find(({ name }) => name === fileName);
  if (!object) return { error: 'Uploaded file is unavailable' };
  const actualType = typeof object.metadata?.mimetype === 'string' ? object.metadata.mimetype : null;
  if (Number(object.metadata?.size) !== intent.size || (actualType && actualType.toLowerCase() !== intent.type.toLowerCase())) {
    const removed = await bucket.remove([intent.storagePath]);
    if (!removed.error) await prisma.uploadIntent.delete({ where: { id: intent.id } });
    return { error: 'Uploaded file is unavailable' };
  }

  const requiresSignature = intent.type.startsWith('image/') || intent.type.startsWith('video/') ||
    intent.type.startsWith('audio/') || intent.type === 'application/pdf';
  if (requiresSignature) {
    const { data, error } = await bucket.createSignedUrl(intent.storagePath, 60);
    if (error || !data?.signedUrl) return { error: 'Could not verify uploaded file. Try again.' };
    try {
      const prefix = await readFilePrefix(data.signedUrl);
      if (!hasSupportedFileSignature(intent.type, prefix)) {
        const removed = await bucket.remove([intent.storagePath]);
        if (!removed.error) await prisma.uploadIntent.delete({ where: { id: intent.id } });
        return { error: 'File content does not match its declared type' };
      }
    } catch {
      return { error: 'Could not verify uploaded file. Try again.' };
    }
  }

  const updated = await prisma.uploadIntent.updateMany({
    where: { id: intent.id, status: 'PENDING', expiresAt: { gt: new Date() } },
    data: { status: 'UPLOADED' },
  });
  if (updated.count !== 1) {
    const current = await prisma.uploadIntent.findUnique({ where: { id: intent.id }, select: { status: true } });
    if (current?.status !== 'UPLOADED') return { error: 'Uploaded file is unavailable' };
  }
  return intentResult(intent.id, intent.name, intent.type, intent.size);
}
