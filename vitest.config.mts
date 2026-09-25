import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    passWithNoTests: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/generated/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tests/contracts/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          setupFiles: ['tests/support/component.ts'],
          include: ['src/**/*.test.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          globalSetup: ['tests/support/database-setup.ts'],
          setupFiles: ['tests/support/database-env.ts'],
          include: ['tests/integration/**/*.test.ts'],
          fileParallelism: false,
        },
      },
      ...(process.env.RUN_SEARCH_BENCHMARK === '1'
        ? [{
            extends: true,
            test: {
              name: 'performance',
              environment: 'node',
              globalSetup: ['tests/support/database-setup.ts'],
              setupFiles: ['tests/support/database-env.ts'],
              include: ['tests/performance/**/*.test.ts'],
              fileParallelism: false,
            },
          }]
        : []),
    ],
  },
});
