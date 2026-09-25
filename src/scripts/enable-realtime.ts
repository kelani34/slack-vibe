import { prisma } from '../lib/prisma';

async function main() {
  try {
    const rlsStatus = await prisma.$queryRaw<
      { relname: string; relrowsecurity: boolean }[]
    >`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE relname = 'messages' 
      AND nspname = 'public';
    `;

    const policies = await prisma.$queryRaw<
      { polname: string; polcmd: string; polroles: string[] }[]
    >`
      SELECT polname, polcmd, polroles 
      FROM pg_policies 
      WHERE tablename = 'messages';
    `;

    console.log('Message RLS enabled:', rlsStatus[0]?.relrowsecurity ?? false);
    console.log('Message policies:', policies.map(({ polname }) => polname));
  } catch (e) {
    console.error(e);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
