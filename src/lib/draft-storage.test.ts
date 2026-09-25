// @vitest-environment jsdom

import { beforeEach, expect, it } from 'vitest';

import { clearDraftsForUser } from './draft-storage';

beforeEach(() => window.localStorage.clear());

it('removes all drafts for one user while preserving other local data', () => {
  window.localStorage.setItem('slack-vibe:draft:user-1:channel-1:root', '<p>First</p>');
  window.localStorage.setItem('slack-vibe:draft:user-1:channel-2:thread-1', '<p>Second</p>');
  window.localStorage.setItem('slack-vibe:draft:user-1:group-create:workspace-1', '{"clientMutationId":"pending"}');
  window.localStorage.setItem('slack-vibe:draft:user-10:channel-1:root', '<p>Other account</p>');
  window.localStorage.setItem('unrelated-preference', 'dark');

  clearDraftsForUser('user-1');

  expect(window.localStorage.getItem('slack-vibe:draft:user-1:channel-1:root')).toBeNull();
  expect(window.localStorage.getItem('slack-vibe:draft:user-1:channel-2:thread-1')).toBeNull();
  expect(window.localStorage.getItem('slack-vibe:draft:user-1:group-create:workspace-1')).toBeNull();
  expect(window.localStorage.getItem('slack-vibe:draft:user-10:channel-1:root')).toBe('<p>Other account</p>');
  expect(window.localStorage.getItem('unrelated-preference')).toBe('dark');
});

it('does not block logout when browser storage is unavailable', () => {
  const localStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get: () => { throw new DOMException('Storage unavailable', 'SecurityError'); },
  });

  try {
    expect(() => clearDraftsForUser('user-1')).not.toThrow();
  } finally {
    if (localStorage) Object.defineProperty(window, 'localStorage', localStorage);
    else Reflect.deleteProperty(window, 'localStorage');
  }
});
