import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { DirectMessageAvatars } from './direct-message-avatars';

const participants = [
  { id: 'alex', name: 'Alex', displayName: 'Alex Rivera', avatarUrl: null, image: null },
  { id: 'sam', name: 'Sam', displayName: null, avatarUrl: null, image: null },
];

it('shows a stacked pair of avatars for a group DM', () => {
  const { container } = render(
    <DirectMessageAvatars
      participants={participants}
      isGroup
      fallbackName="Project Crew"
      size="header"
    />,
  );

  const stack = screen.getByRole('img', { name: '2 participants' });
  expect(stack).toHaveClass('-space-x-2');
  expect(stack).toHaveClass('dm-avatar-stack');
  expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);
  expect(container.querySelector('[data-avatar-stack-index="0"]')).toHaveStyle({ zIndex: '2' });
  expect(container.querySelector('[data-avatar-stack-index="1"]')).toHaveStyle({ zIndex: '1' });
});

it.each(['sidebar', 'header', 'inbox'] as const)(
  'keeps group participants visibly overlapped at the %s size',
  (size) => {
    const { container } = render(
      <DirectMessageAvatars
        participants={participants}
        isGroup
        fallbackName="Project Crew"
        size={size}
      />,
    );

    const stack = screen.getByRole('img', { name: '2 participants' });
    expect(stack).toHaveClass('isolate');
    expect(stack.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-avatar-stack-index]')).toHaveLength(2);
  },
);

it('keeps one-to-one DMs on a single peer avatar', () => {
  const { container } = render(
    <DirectMessageAvatars
      participants={participants.slice(0, 1)}
      isGroup={false}
      fallbackName="Alex Rivera"
      size="inbox"
    />,
  );

  expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(1);
  expect(screen.queryByRole('img', { name: /participants/ })).not.toBeInTheDocument();
});

it('keeps a group stack visible when only one active member remains', () => {
  const { container } = render(
    <DirectMessageAvatars
      participants={participants.slice(0, 1)}
      isGroup
      fallbackName="Launch team"
      size="header"
    />,
  );

  const stack = screen.getByRole('img', { name: 'Group conversation with 1 active participant' });
  expect(stack.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);
  expect(container.querySelectorAll('[data-avatar-stack-index]')).toHaveLength(2);
  expect(stack.querySelector('svg')).toBeInTheDocument();
});
