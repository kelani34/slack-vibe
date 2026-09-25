import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MentionList, type MentionListRef } from './mention-list';

const item = (id: string, name: string) => ({ id, name });

describe('MentionList', () => {
  it('selects the first result when the suggestion results change', () => {
    const ref = createRef<MentionListRef>();
    const command = () => {};
    const { rerender } = render(
      <MentionList ref={ref} items={[item('alice', 'Alice'), item('bob', 'Bob')]} command={command} />
    );

    act(() => {
      ref.current?.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) });
    });
    expect(screen.getByRole('button', { name: /bob/i })).toHaveClass('bg-accent');

    rerender(
      <MentionList ref={ref} items={[item('cara', 'Cara'), item('drew', 'Drew')]} command={command} />
    );

    expect(screen.getByRole('button', { name: /cara/i })).toHaveClass('bg-accent');
    expect(screen.getByRole('button', { name: /drew/i })).not.toHaveClass('bg-accent');
  });
});
