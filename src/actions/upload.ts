'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function isAllowedFileType(type: string) {
  return type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/') || [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ].includes(type);
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
