import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { auditDocumentation } from '../../scripts/check-docs.mjs';

async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'slack-vibe-docs-'));

  for (const [path, content] of Object.entries(files)) {
    const absolutePath = join(root, path);
    await mkdir(join(absolutePath, '..'), { recursive: true });
    await writeFile(absolutePath, content);
  }

  return root;
}

describe('documentation contract', () => {
  it('reports documents omitted from the index and broken local Markdown links', async () => {
    const root = await fixture({
      'README.md': '[Documentation](docs/README.md)',
      'docs/README.md': '# Index\n\n[Design](design.md)\n',
      'docs/design.md': '# Design\n\n[Index](README.md)\n\n[Missing](missing.md)\n',
      'docs/testing.md': '# Testing\n',
    });

    expect(auditDocumentation(root)).toEqual([
      'docs/testing.md is not linked from docs/README.md',
      'docs/testing.md does not link back to docs/README.md',
      'docs/design.md links to missing file docs/missing.md',
    ]);
  });

  it('accepts an indexed, connected documentation set', async () => {
    const root = await fixture({
      'README.md': '[Documentation](docs/README.md)',
      'docs/README.md': '# Index\n\n[Design](design.md)\n',
      'docs/design.md': '# Design\n\n[Index](README.md)\n',
    });

    expect(auditDocumentation(root)).toEqual([]);
  });
});
