import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Oklch = [number, number, number];

function readThemeVariables(selector: ':root' | '.dark') {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const block = css.match(new RegExp(`\\${selector} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';

  return new Map(
    [...block.matchAll(/--([\w-]+):\s*oklch\(([^)]+)\);/g)].map(([, name, value]) => [
      name,
      value.split(/\s+/).slice(0, 3).map(Number) as Oklch,
    ]),
  );
}

function relativeLuminance([lightness, chroma, hue]: Oklch) {
  const radians = hue * Math.PI / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: Oklch, second: Oklch) {
  const values = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function themeVariable(variables: Map<string, Oklch>, name: string) {
  const value = variables.get(name);
  if (!value) throw new Error(`Missing theme variable --${name}`);
  return value;
}

describe('message state design tokens', () => {
  it.each([':root', '.dark'] as const)('keeps saved and pinned pairs readable in %s', selector => {
    const variables = readThemeVariables(selector);

    for (const role of ['saved', 'pinned'] as const) {
      expect(contrast(
        themeVariable(variables, role),
        themeVariable(variables, `${role}-surface`),
      )).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([':root', '.dark'] as const)('keeps shared application states readable in %s', selector => {
    const variables = readThemeVariables(selector);

    for (const role of ['success', 'warning'] as const) {
      expect(contrast(
        themeVariable(variables, role),
        themeVariable(variables, `${role}-surface`),
      )).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(themeVariable(variables, 'unread'), themeVariable(variables, 'background'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(themeVariable(variables, 'unread-foreground'), themeVariable(variables, 'unread'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(themeVariable(variables, 'warning-foreground'), themeVariable(variables, 'warning'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(themeVariable(variables, 'favorite'), themeVariable(variables, 'background'))).toBeGreaterThanOrEqual(3);
    themeVariable(variables, 'message-target');
  });

  it('routes saved, pinned and mention presentation through semantic roles', () => {
    const globals = readFileSync('src/app/globals.css', 'utf8');
    const message = readFileSync('src/components/message-item.tsx', 'utf8');
    const panel = readFileSync('src/components/pinned-bookmarked-panel.tsx', 'utf8');
    const editor = readFileSync('src/styles/editor.css', 'utf8');

    expect(globals).toContain('--color-saved: var(--saved);');
    expect(globals).toContain('--color-pinned: var(--pinned);');
    expect(message).toContain('bg-saved-surface');
    expect(message).toContain('bg-pinned-surface');
    expect(panel).toContain('text-saved');
    expect(panel).toContain('text-pinned');
    expect(editor).toContain('var(--saved)');
    expect(editor).toContain('var(--pinned)');

    expect(`${message}\n${panel}`).not.toMatch(/(?:bg|text)-(?:blue|amber|orange)-(?:\d+)(?:\/\d+)?/);
    expect(editor).not.toMatch(/#[0-9a-f]{6}|rgba?\(/i);
  });

  it('keeps app-owned state colors behind semantic roles', () => {
    const rawColor = /(?:text|bg|border|fill|ring)-(?:red|green|blue|yellow|orange|amber|emerald|lime|rose|purple|indigo|sky|cyan|teal|violet|pink|slate|gray|zinc|neutral|stone)-\d+(?:\/\d+)?|#[0-9a-f]{3,8}/i;
    const violations = globSync('src/**/*.{ts,tsx,css}', {
      exclude: ['src/components/ui/chart.tsx'],
    }).flatMap(path => {
      const matches = readFileSync(path, 'utf8').match(rawColor);
      return matches ? [`${path}: ${matches[0]}`] : [];
    });

    expect(violations).toEqual([]);
    expect(readFileSync('src/app/globals.css', 'utf8')).toContain('var(--message-target)');
  });
});
