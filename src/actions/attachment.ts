'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import { PRIVATE_ATTACHMENT_BUCKET } from '@/lib/attachment-storage';

const DOWNLOAD_GRANT_SECONDS = 300;

export async function getAttachmentAccessUrls(attachmentId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Unauthorized' };
  if (!attachmentId) return { error: 'File not found' };

  const attachment = await prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      message: {
        isDeleted: false,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
    },
    select: {
      storageBucket: true,
      storagePath: true,
      message: { select: { channelId: true } },
    },
  });
  if (!attachment) return { error: 'File not found' };

  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: attachment.message.channelId, userId } },
    select: { id: true },
  });
  if (!member) return { error: 'File not found' };

  if (
    attachment.storageBucket !== PRIVATE_ATTACHMENT_BUCKET ||
    !attachment.storagePath?.startsWith(`${attachment.message.channelId}/`)
  ) {
    return { error: 'Private file is unavailable' };
  }

  try {
    const bucket = createAdminClient().storage.from(PRIVATE_ATTACHMENT_BUCKET);
    const [preview, download] = await Promise.all([
      bucket.createSignedUrl(attachment.storagePath, DOWNLOAD_GRANT_SECONDS),
      bucket.createSignedUrl(attachment.storagePath, DOWNLOAD_GRANT_SECONDS, { download: true }),
    ]);

    if (preview.error || download.error || !preview.data?.signedUrl || !download.data?.signedUrl) {
      return { error: 'Could not create a download link' };
    }
    return { previewUrl: preview.data.signedUrl, downloadUrl: download.data.signedUrl };
  } catch {
    return { error: 'Could not create a download link' };
  }
}
