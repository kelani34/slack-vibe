import { afterAll, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';

afterAll(() => prisma.$disconnect());

it('indexes upload-intent expiry for bounded cleanup scans', async () => {
  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'upload_intents'
  `;

  expect(indexes.map(({ indexname }) => indexname)).toContain('upload_intents_expiry_idx');
});
