import { globSync, readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function stringAttribute(opening: ts.JsxOpeningLikeElement, name: string) {
  const attribute = opening.attributes.properties.find(property =>
    ts.isJsxAttribute(property) && property.name.getText() === name,
  );
  return attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isStringLiteral(attribute.initializer)
    ? attribute.initializer.text
    : null;
}

function hasAttribute(opening: ts.JsxOpeningLikeElement, name: string) {
  return opening.attributes.properties.some(property =>
    ts.isJsxAttribute(property) && property.name.getText() === name,
  );
}

function hasAccessibleName(node: ts.JsxElement) {
  if (hasAttribute(node.openingElement, 'aria-label')) return true;

  return node.children.some(child =>
    (ts.isJsxText(child) && child.text.trim().length > 0)
    || (ts.isJsxElement(child)
      && stringAttribute(child.openingElement, 'className')?.split(/\s+/).includes('sr-only')
      && child.children.some(grandchild => ts.isJsxText(grandchild) && grandchild.text.trim().length > 0)),
  );
}

function hasRenderedName(nodes: ts.NodeArray<ts.JsxChild>): boolean {
  return nodes.some(child => {
    if (ts.isJsxText(child)) return child.text.trim().length > 0;
    if (ts.isJsxExpression(child)) return Boolean(child.expression);
    if (!ts.isJsxElement(child)) return false;
    if (hasAttribute(child.openingElement, 'alt')) return true;
    if (stringAttribute(child.openingElement, 'className')?.split(/\s+/).includes('sr-only')) return true;
    return hasRenderedName(child.children);
  });
}

describe('icon controls', () => {
  it('gives every app-owned icon Button an explicit accessible name', () => {
    const violations: string[] = [];

    for (const path of globSync('src/**/*.{tsx,jsx}', { exclude: ['src/components/ui/**'] })) {
      const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node) => {
        if (ts.isJsxElement(node)
          && node.openingElement.tagName.getText() === 'Button'
          && stringAttribute(node.openingElement, 'size')?.startsWith('icon')
          && !hasAccessibleName(node)) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          violations.push(`${path}:${line + 1}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }

    expect(violations).toEqual([]);
  });

  it('keeps shared icon button targets at least 44px on compact layouts', () => {
    const button = readFileSync('src/components/ui/button.tsx', 'utf8');
    for (const size of ['icon', 'icon-sm', 'icon-lg']) {
      expect(button, size).toMatch(new RegExp(`${size === 'icon' ? 'icon' : `'${size}'`}:.*max-md:min-h-11.*max-md:min-w-11`));
    }

    expect(readFileSync('src/components/ui/toggle.tsx', 'utf8'))
      .toMatch(/sm:.*max-md:min-h-11.*max-md:min-w-11/);
  });

  it('gives native icon-only buttons an accessible name', () => {
    const violations: string[] = [];

    for (const path of globSync('src/**/*.{tsx,jsx}', {
      exclude: ['src/components/ui/**', 'src/**/*.test.{tsx,jsx}'],
    })) {
      const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node) => {
        if (ts.isJsxElement(node)
          && node.openingElement.tagName.getText() === 'button'
          && !hasAttribute(node.openingElement, 'aria-label')
          && !hasRenderedName(node.children)) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          violations.push(`${path}:${line + 1}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }

    expect(violations).toEqual([]);
  });
});
