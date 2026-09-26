import { prisma } from '@/lib/prisma';
import { PRIVATE_ATTACHMENT_BUCKET } from '@/lib/attachment-storage';
import { createAdminClient } from '@/lib/supabase/admin';

const BATCH_SIZE = 100;
const EXPIRY_GRACE_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - EXPIRY_GRACE_MS);
  const expired = await prisma.uploadIntent.findMany({
    where: {
      storageBucket: PRIVATE_ATTACHMENT_BUCKET,
      expiresAt: { lt: cutoff },
      attachment: null,
    },
    orderBy: { expiresAt: 'asc' },
    take: BATCH_SIZE,
    select: { id: true, storagePath: true },
  });
  if (expired.length === 0) return Response.json({ examined: 0, deleted: 0 });

  const { error } = await createAdminClient()
    .storage.from(PRIVATE_ATTACHMENT_BUCKET)
    .remove(expired.map(({ storagePath }) => storagePath));
  if (error) return Response.json({ examined: expired.length, deleted: 0 }, { status: 503 });

  try {
    const removed = await prisma.uploadIntent.deleteMany({
      where: {
        id: { in: expired.map(({ id }) => id) },
        expiresAt: { lt: cutoff },
        attachment: null,
      },
    });
    return Response.json({ examined: expired.length, deleted: removed.count });
  } catch {
    return Response.json({ examined: expired.length, deleted: 0 }, { status: 503 });
  }
}
