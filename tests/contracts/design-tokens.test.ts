import { readFileSync } from 'node:fs';
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

describe('message state design tokens', () => {
  it.each([':root', '.dark'] as const)('keeps saved and pinned pairs readable in %s', selector => {
    const variables = readThemeVariables(selector);

    for (const role of ['saved', 'pinned'] as const) {
      const foreground = variables.get(role);
      const surface = variables.get(`${role}-surface`);
      expect(foreground, `${selector} --${role}`).toBeDefined();
      expect(surface, `${selector} --${role}-surface`).toBeDefined();
      expect(contrast(foreground!, surface!)).toBeGreaterThanOrEqual(4.5);
    }
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
});
