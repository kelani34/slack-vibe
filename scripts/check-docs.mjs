import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function markdownTargets(markdown) {
  return [...markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim())
    .map((target) => target.startsWith('<') && target.endsWith('>') ? target.slice(1, -1) : target)
    .filter((target) => !target.startsWith('#') && !/^[a-z][a-z\d+.-]*:/i.test(target))
    .map((target) => decodeURIComponent(target.split('#')[0].split('?')[0]))
    .filter((target) => target.endsWith('.md'));
}

export function auditDocumentation(root) {
  const docsDirectory = resolve(root, 'docs');
  const indexPath = resolve(docsDirectory, 'README.md');
  const documents = readdirSync(docsDirectory)
    .filter((name) => name.endsWith('.md'))
    .sort();
  const indexedTargets = new Set(markdownTargets(readFileSync(indexPath, 'utf8')));
  const errors = [];

  for (const document of documents) {
    if (document === 'README.md') continue;
    if (!indexedTargets.has(document)) {
      errors.push('docs/' + document + ' is not linked from docs/README.md');
    }
  }

  for (const document of documents) {
    if (document === 'README.md') continue;
    const path = resolve(docsDirectory, document);
    if (!markdownTargets(readFileSync(path, 'utf8')).includes('README.md')) {
      errors.push('docs/' + document + ' does not link back to docs/README.md');
    }
  }

  const markdownFiles = [
    ...['README.md', 'CONTRIBUTING.md']
      .map((name) => resolve(root, name))
      .filter(existsSync),
    ...documents.map((name) => resolve(docsDirectory, name)),
  ];

  for (const sourcePath of markdownFiles) {
    for (const target of markdownTargets(readFileSync(sourcePath, 'utf8'))) {
      const targetPath = resolve(sourcePath, '..', target);
      if (!existsSync(targetPath)) {
        errors.push(
          relative(root, sourcePath) + ' links to missing file ' + relative(root, targetPath),
        );
      }
    }
  }

  return [...new Set(errors)];
}

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (scriptPath === fileURLToPath(import.meta.url)) {
  const errors = auditDocumentation(process.cwd());
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Documentation contract passed.');
  }
}
