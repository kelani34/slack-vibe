import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { userInfo } from 'node:os';
import { Pool } from 'pg';
import type { TestProject } from 'vitest/node';

export default async function setup(project: TestProject) {
  const adminUrl = new URL(
    process.env.TEST_DATABASE_ADMIN_URL ??
      `postgresql://${userInfo().username}@127.0.0.1:5432/postgres`,
  );
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(adminUrl.hostname) ||
      adminUrl.pathname !== '/postgres') {
    throw new Error('Integration tests require a local PostgreSQL admin database.');
  }

  const database = `slack_vibe_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: adminUrl.toString() });
  await admin.query(`CREATE DATABASE "${database}"`);
  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${database}`;

  const dispose = async () => {
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.end();
  };

  try {
    execFileSync('node_modules/.bin/prisma', ['migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: testUrl.toString(), DIRECT_URL: testUrl.toString() },
      stdio: 'pipe',
    });
    project.provide('databaseUrl', testUrl.toString());
    return dispose;
  } catch {
    await dispose();
    throw new Error('Test database migration failed. No application database was modified.');
  }
}
