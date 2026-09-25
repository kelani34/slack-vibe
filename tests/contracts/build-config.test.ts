import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

 describe('Release configuration (A07/A22)', () => {
  it('does not hide TypeScript build errors', () => {
    expect(nextConfig.typescript?.ignoreBuildErrors).not.toBe(true);
  });

  it('assigns one page owner to each App Router URL', () => {
    const owners = new Map<string, string[]>();
    for (const path of globSync('src/app/**/page.tsx')) {
      const route = path.replace(/^src\/app/, '').replace(/\/\([^/]+\)/g, '').replace(/\/page\.tsx$/, '') || '/';
      owners.set(route, [...(owners.get(route) ?? []), path]);
    }
    expect([...owners].filter(([, paths]) => paths.length > 1)).toEqual([]);
  });

  it('uses GitHub actions backed by the current Node action runtime', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');

    expect(workflow).toContain('uses: actions/checkout@v7');
    expect(workflow).toContain('uses: actions/setup-node@v7');
    expect(workflow).not.toMatch(/uses: actions\/(?:checkout|setup-node)@v[1-6]\b/);
  });
});
