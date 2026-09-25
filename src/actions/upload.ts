'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function isAllowedFileType(type: string) {
  if (type === 'image/svg+xml') return false;
  return type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/') || [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ].includes(type);
}

async function hasSupportedFileSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  switch (file.type) {
    case 'image/png':
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/jpeg':
      return startsWith(0xff, 0xd8, 0xff);
    case 'image/gif':
      return startsWith(0x47, 0x49, 0x46, 0x38) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
    case 'image/webp':
      return startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    case 'image/avif':
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
        ((bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) ||
          (bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x73));
    case 'image/bmp':
      return startsWith(0x42, 0x4d);
    case 'image/tiff':
      return startsWith(0x49, 0x49, 0x2a, 0x00) || startsWith(0x4d, 0x4d, 0x00, 0x2a);
    case 'image/x-icon':
      return startsWith(0x00, 0x00, 0x01, 0x00);
    case 'video/mp4':
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
        ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(String.fromCharCode(...bytes.slice(8, 12)));
    case 'video/quicktime':
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
        String.fromCharCode(...bytes.slice(8, 10)) === 'qt';
    case 'video/webm':
      return startsWith(0x1a, 0x45, 0xdf, 0xa3);
    case 'audio/mpeg':
      return startsWith(0x49, 0x44, 0x33) ||
        (bytes[0] === 0xff && [0xfb, 0xf3, 0xf2].includes(bytes[1]));
    case 'audio/wav':
    case 'audio/x-wav':
      return startsWith(0x52, 0x49, 0x46, 0x46) &&
        String.fromCharCode(...bytes.slice(8, 12)) === 'WAVE';
    case 'audio/ogg':
      return startsWith(0x4f, 0x67, 0x67, 0x53);
    case 'audio/flac':
      return startsWith(0x66, 0x4c, 0x61, 0x43);
    case 'application/pdf':
      return startsWith(0x25, 0x50, 0x44, 0x46, 0x2d);
    default:
      return false;
  }
}

export async function uploadFile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const file = formData.get('file') as File;
  const channelId = formData.get('channelId');
  if (!file) {
    return { error: 'No file provided' };
  }
  if (typeof channelId !== 'string' || !channelId) {
    return { error: 'Channel is required' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: 'File is too large' };
  }
  if (!isAllowedFileType(file.type)) {
    return { error: 'File type is not supported' };
  }
  const hasCheckedSignature = file.type.startsWith('image/') || file.type.startsWith('video/') ||
    file.type.startsWith('audio/') || file.type === 'application/pdf';
  if (hasCheckedSignature && !(await hasSupportedFileSignature(file))) {
    return { error: 'File content does not match its declared type' };
  }

  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId: session.user.id } },
    select: { id: true },
  });
  if (!member) {
    return { error: 'Not a member of this channel' };
  }

  const supabase = createAdminClient();
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const fileName = `${channelId}/${randomUUID()}.${fileExt}`;

  // Convert File to ArrayBuffer for Supabase upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from('workspace-files')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return { error: 'Upload failed' };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('workspace-files').getPublicUrl(fileName);

  return { url: publicUrl, name: file.name, type: file.type, size: file.size };
}
