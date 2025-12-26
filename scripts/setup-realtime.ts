import { prisma } from '@/lib/prisma';

// Mock env if needed, but bun loads .env
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

async function main() {
  const tables = [
    'messages',
    'channels',
    'users',
    'reactions',
    'channel_members',
    'starred_channels',
    'attachments',
  ];

  console.log('Enabling replication for tables:', tables.join(', '));

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `alter publication supabase_realtime add table "${table}";`
      );
      console.log(`✅ Added ${table} to publication`);
    } catch (e: any) {
      if (
        e.message?.includes('already member of publication') ||
        e.code === '42710'
      ) {
        console.log(`ℹ️ ${table} already in publication`);
      } else {
        console.error(`❌ Failed to add ${table}:`, e.message);
      }
    }
  }
}

main();
