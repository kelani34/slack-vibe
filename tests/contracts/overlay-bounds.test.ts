import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('overlay viewport bounds', () => {
  it('bounds shared dialogs and popovers to the dynamic viewport', () => {
    const dialog = readFileSync('src/components/ui/dialog.tsx', 'utf8');
    const popover = readFileSync('src/components/ui/popover.tsx', 'utf8');

    expect(dialog).toContain('max-h-[calc(100dvh-2rem)]');
    expect(dialog).toContain('overflow-y-auto');
    expect(popover).toContain('max-h-[calc(100dvh-2rem)]');
    expect(popover).toContain('max-w-[calc(100vw-2rem)]');
    expect(popover).toContain('overflow-auto');
  });

  it('keeps the large file preview inside dynamic viewport margins', () => {
    const preview = readFileSync('src/components/file-preview-modal.tsx', 'utf8');

    expect(preview).toContain('h-[calc(100dvh-2rem)]');
    expect(preview).toContain('w-[calc(100vw-2rem)]');
    expect(preview).not.toContain('h-[90vh]');
  });

  it('does not disable dialog overflow containment on compact layouts', () => {
    const topics = readFileSync('src/components/channel/topic-editor-dialog.tsx', 'utf8');

    expect(topics).toContain('sm:overflow-visible');
    expect(topics).not.toContain('sm:max-w-[425px] overflow-visible');
  });
});
