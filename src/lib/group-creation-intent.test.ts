// @vitest-environment jsdom

import { beforeEach, expect, it } from 'vitest';

import {
  clearGroupCreationIntent,
  getOrCreateGroupCreationIntent,
} from './group-creation-intent';

beforeEach(() => window.localStorage.clear());

it('reuses a matching intent after a component or page reload', () => {
  const request = JSON.stringify({ workspaceId: 'workspace-1', participantIds: ['alex', 'sam'], displayName: null });
  const first = getOrCreateGroupCreationIntent('user-1', 'workspace-1', request);

  expect(getOrCreateGroupCreationIntent('user-1', 'workspace-1', request)).toEqual(first);
});

it('separates actors, workspaces and changed requests', () => {
  const request = JSON.stringify({ participantIds: ['alex', 'sam'] });
  const first = getOrCreateGroupCreationIntent('user-1', 'workspace-1', request);

  expect(getOrCreateGroupCreationIntent('user-2', 'workspace-1', request)?.clientMutationId).not.toBe(first?.clientMutationId);
  expect(getOrCreateGroupCreationIntent('user-1', 'workspace-2', request)?.clientMutationId).not.toBe(first?.clientMutationId);
  expect(getOrCreateGroupCreationIntent('user-1', 'workspace-1', `${request} `)?.clientMutationId).not.toBe(first?.clientMutationId);
});

it('clears only the successfully completed intent and keeps a newer pending one', () => {
  const first = getOrCreateGroupCreationIntent('user-1', 'workspace-1', 'first request');
  const second = getOrCreateGroupCreationIntent('user-1', 'workspace-1', 'second request');
  if (!first || !second) throw new Error('Expected browser storage to preserve both intents');

  clearGroupCreationIntent('user-1', 'workspace-1', first.clientMutationId);

  expect(getOrCreateGroupCreationIntent('user-1', 'workspace-1', 'second request')).toEqual(second);
});

it('does not send a new group intent when actor-scoped storage is unavailable', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get: () => { throw new DOMException('Storage unavailable', 'SecurityError'); },
  });

  try {
    expect(getOrCreateGroupCreationIntent('user-1', 'workspace-1', 'request')).toBeNull();
  } finally {
    if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
    else Reflect.deleteProperty(window, 'localStorage');
  }
});
