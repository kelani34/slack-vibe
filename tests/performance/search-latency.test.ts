import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { afterAll, expect, it, vi } from 'vitest';
import { searchMessages } from '@/actions/message';
import { prisma } from '@/lib/prisma';

const actor = vi.hoisted(() => ({ id: '' }));
vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: actor.id } })) }));

const MESSAGE_COUNT = 100_000;
const CHANNEL_COUNT = 50;
const MATCH_EVERY = 100;
const PAGE_SIZE = 20;
const SEARCH_TERM = 'perfsearchneedle';

type PlanNode = {
  'Node Type': string;
  'Total Cost': number;
  'Plan Rows': number;
  'Actual Rows': number;
  'Actual Total Time': number;
  'Shared Hit Blocks': number;
  'Shared Read Blocks': number;
  'Relation Name'?: string;
  'Index Name'?: string;
  Plans?: PlanNode[];
};

function collectPlanNodes(node: PlanNode): PlanNode[] {
  return [node, ...(node.Plans ?? []).flatMap(collectPlanNodes)];
}

function percentile(values: number[], fraction: number): number {
  return values[Math.ceil(values.length * fraction) - 1];
}

afterAll(() => prisma.$disconnect());

it('measures search plans on a fixed 100k-message authorized workspace', async () => {
  const userRows = Array.from({ length: 200 }, (_, index) => {
    const id = randomUUID();
    return { id, email: `search-benchmark-${id}@example.test`, name: `Benchmark user ${index}` };
  });
  actor.id = userRows[0].id;
  await prisma.user.createMany({ data: userRows });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Search performance fixture',
      slug: `search-performance-${randomUUID()}`,
      ownerId: actor.id,
    },
    select: { id: true, slug: true },
  });
  await prisma.workspaceMember.createMany({
    data: userRows.map((user, index) => ({
      workspaceId: workspace.id,
      userId: user.id,
      role: index === 0 ? 'OWNER' : 'MEMBER',
    })),
  });

  const channels = Array.from({ length: CHANNEL_COUNT }, (_, index) => ({
    id: randomUUID(),
    workspaceId: workspace.id,
    name: `benchmark-${index}`,
    type: 'PUBLIC' as const,
    creatorId: actor.id,
  }));
  await prisma.channel.createMany({ data: channels });
  await prisma.channelMember.createMany({
    data: channels.map(({ id }) => ({ channelId: id, userId: actor.id })),
  });

  const createdAt = Date.UTC(2026, 0, 1);
  for (let offset = 0; offset < MESSAGE_COUNT; offset += 2_500) {
    const rows = Array.from({ length: Math.min(2_500, MESSAGE_COUNT - offset) }, (_, batchIndex) => {
      const index = offset + batchIndex;
      const content = index % MATCH_EVERY === 0
        ? `<p>${SEARCH_TERM} fixture row ${index}</p>`
        : `<p>ordinary benchmark row ${index}</p>`;
      return {
        id: randomUUID(),
        channelId: channels[index % CHANNEL_COUNT].id,
        userId: userRows[index % userRows.length].id,
        content,
        createdAt: new Date(createdAt + index * 1_000),
      };
    });
    await prisma.message.createMany({ data: rows });
  }

  await prisma.$executeRaw`ANALYZE "messages"`;
  await prisma.$executeRaw`ANALYZE "channels"`;
  await prisma.$executeRaw`ANALYZE "channel_members"`;

  const databaseVersionRows = await prisma.$queryRaw<Array<{ server_version: string }>>`
    SELECT current_setting('server_version') AS server_version
  `;

  const scenarios: Array<{
    name: string;
    query: string;
    verify: (page: Awaited<ReturnType<typeof searchMessages>>) => void;
  }> = [
    {
      name: 'selective-term',
      query: SEARCH_TERM,
      verify: (page) => {
        expect(page.items).toHaveLength(PAGE_SIZE);
        expect(page.items.every(({ content }) => content.includes(SEARCH_TERM))).toBe(true);
      },
    },
    {
      name: 'short-term',
      query: 'be',
      verify: (page) => {
        expect(page.items).toHaveLength(PAGE_SIZE);
        expect(page.items.every(({ content }) => content.includes('be'))).toBe(true);
      },
    },
    {
      name: 'common-term',
      query: 'ordinary',
      verify: (page) => {
        expect(page.items).toHaveLength(PAGE_SIZE);
        expect(page.items.every(({ content }) => content.includes('ordinary'))).toBe(true);
      },
    },
    {
      name: 'channel-filter',
      query: `${SEARCH_TERM} in:benchmark-0`,
      verify: (page) => {
        expect(page.items.length).toBeGreaterThan(0);
        expect(page.items.every(({ content, channel }) =>
          content.includes(SEARCH_TERM) && channel.name === 'benchmark-0')).toBe(true);
      },
    },
    {
      name: 'author-filter',
      query: `${SEARCH_TERM} from:"Benchmark user 0"`,
      verify: (page) => {
        expect(page.items.length).toBeGreaterThan(0);
        expect(page.items.every(({ content, user }) =>
          content.includes(SEARCH_TERM) && user.name === 'Benchmark user 0')).toBe(true);
      },
    },
    {
      name: 'date-filter',
      query: `${SEARCH_TERM} after:2026-01-01 before:2026-01-01`,
      verify: (page) => {
        const start = new Date('2026-01-01T00:00:00.000Z');
        const end = new Date('2026-01-02T00:00:00.000Z');
        expect(page.items.length).toBeGreaterThan(0);
        expect(page.items.every(({ content, createdAt }) =>
          content.includes(SEARCH_TERM) && createdAt >= start && createdAt < end)).toBe(true);
      },
    },
  ];

  const scenarioResults = [];
  for (const scenario of scenarios) {
    const firstStartedAt = performance.now();
    const firstPage = await searchMessages(scenario.query, workspace.slug);
    const firstActionMs = performance.now() - firstStartedAt;
    scenario.verify(firstPage);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const warmupCount = 3;
    const sampleCount = scenario.name === 'selective-term' ? 30 : 10;
    const durations: number[] = [];
    for (let index = 0; index < warmupCount + sampleCount; index += 1) {
      const startedAt = performance.now();
      const page = await searchMessages(scenario.query, workspace.slug);
      const durationMs = performance.now() - startedAt;
      scenario.verify(page);
      expect(page.nextCursor).toEqual(expect.any(String));
      if (index >= warmupCount) durations.push(durationMs);
    }

    durations.sort((left, right) => left - right);
    scenarioResults.push({
      name: scenario.name,
      firstActionMs: Number(firstActionMs.toFixed(2)),
      pageRows: firstPage.items.length,
      measuredSamples: sampleCount,
      warmActionMs: {
        p50: Number(percentile(durations, 0.5).toFixed(2)),
        p95: Number(percentile(durations, 0.95).toFixed(2)),
        max: Number(durations[durations.length - 1].toFixed(2)),
      },
    });
  }

  const concurrentCount = 8;
  const concurrentStartedAt = performance.now();
  const concurrentPages = await Promise.all(
    Array.from({ length: concurrentCount }, () => searchMessages(SEARCH_TERM, workspace.slug)),
  );
  const concurrentWallMs = performance.now() - concurrentStartedAt;
  for (const page of concurrentPages) {
    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.items.every(({ content }) => content.includes(SEARCH_TERM))).toBe(true);
  }

  const pattern = `%${SEARCH_TERM}%`;
  const explainRows = await prisma.$queryRaw<Array<{ 'QUERY PLAN': Array<{ Plan: PlanNode }> }>>`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT m."id"
    FROM "messages" AS m
    JOIN "channels" AS c ON c."id" = m."channelId"
    JOIN "channel_members" AS cm ON cm."channelId" = c."id"
    WHERE c."workspaceId" = ${workspace.id}
      AND cm."userId" = ${actor.id}
      AND m."content" ILIKE ${pattern}
      AND m."isDeleted" = false
      AND m."scheduledAt" IS NULL
    ORDER BY m."createdAt" DESC, m."id" DESC
    LIMIT ${PAGE_SIZE + 1}
  `;
  const plan = explainRows[0]['QUERY PLAN'][0];
  expect(plan.Plan['Actual Rows']).toBeGreaterThan(0);
  const forcedPlanRows = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
    return tx.$queryRaw<Array<{ 'QUERY PLAN': Array<{ Plan: PlanNode }> }>>`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT m."id"
      FROM "messages" AS m
      JOIN "channels" AS c ON c."id" = m."channelId"
      JOIN "channel_members" AS cm ON cm."channelId" = c."id"
      WHERE c."workspaceId" = ${workspace.id}
        AND cm."userId" = ${actor.id}
        AND m."content" ILIKE ${pattern}
        AND m."isDeleted" = false
        AND m."scheduledAt" IS NULL
      ORDER BY m."createdAt" DESC, m."id" DESC
      LIMIT ${PAGE_SIZE + 1}
    `;
  });
  const forcedPlan = forcedPlanRows[0]['QUERY PLAN'][0];
  expect(forcedPlan.Plan['Actual Rows']).toBeGreaterThan(0);
  const rootPlanNodes = collectPlanNodes(plan.Plan);
  const forcedPlanNodes = collectPlanNodes(forcedPlan.Plan);
  const benchmark = {
    fixtureMessages: MESSAGE_COUNT,
    workspaceChannels: CHANNEL_COUNT,
    workspaceUsers: userRows.length,
    expectedMatches: MESSAGE_COUNT / MATCH_EVERY,
    scenarios: scenarioResults,
    concurrentSelectiveSearch: {
      clients: concurrentCount,
      wallMs: Number(concurrentWallMs.toFixed(2)),
      pages: concurrentPages.length,
    },
    explain: {
      totalMs: Number(plan.Plan['Actual Total Time'].toFixed(2)),
      sharedHitBlocks: plan.Plan['Shared Hit Blocks'],
      sharedReadBlocks: plan.Plan['Shared Read Blocks'],
      indexes: rootPlanNodes.flatMap(({ 'Index Name': indexName }) => indexName ? [indexName] : []),
      nodes: rootPlanNodes.map((node) => ({
        type: node['Node Type'],
        relation: node['Relation Name'] ?? null,
        estimatedCost: Number(node['Total Cost'].toFixed(2)),
        estimatedRows: node['Plan Rows'],
        actualRows: node['Actual Rows'],
      })),
    },
    forcedIndexExperiment: {
      totalMs: Number(forcedPlan.Plan['Actual Total Time'].toFixed(2)),
      sharedHitBlocks: forcedPlan.Plan['Shared Hit Blocks'],
      sharedReadBlocks: forcedPlan.Plan['Shared Read Blocks'],
      indexes: forcedPlanNodes.flatMap(({ 'Index Name': indexName }) => indexName ? [indexName] : []),
      nodes: forcedPlanNodes.map((node) => ({
        type: node['Node Type'],
        relation: node['Relation Name'] ?? null,
        estimatedCost: Number(node['Total Cost'].toFixed(2)),
        estimatedRows: node['Plan Rows'],
        actualRows: node['Actual Rows'],
      })),
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      postgres: databaseVersionRows[0].server_version,
    },
  };

  console.info(`SEARCH_BENCHMARK ${JSON.stringify(benchmark)}`);
});
