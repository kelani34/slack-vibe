import { prisma } from '../lib/prisma';

async function main() {
  try {
    const rlsStatus: any = await prisma.$queryRaw`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE relname = 'messages' 
      AND nspname = 'public';
    `;

    const policies: any = await prisma.$queryRaw`
      SELECT polname, polcmd, polroles 
      FROM pg_policies 
      WHERE tablename = 'messages';
    `;
  } catch (e) {
    console.error(e);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
