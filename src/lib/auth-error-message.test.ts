import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from '@/lib/auth-error-message';

describe('safe authentication error messages', () => {
  it('explains access denial without exposing provider details', () => {
    expect(getAuthErrorMessage('AccessDenied')).toBe('GitHub access was denied. You can try signing in again.');
  });

  it('explains an expired required session', () => {
    expect(getAuthErrorMessage('SessionRequired')).toBe('Your session expired. Sign in again to continue.');
  });

  it('uses a generic message for unknown and repeated error values', () => {
    expect(getAuthErrorMessage('provider-secret-value')).toBe('Sign-in could not be completed. Please try again.');
    expect(getAuthErrorMessage(['AccessDenied', 'OAuthCallbackError'])).toBe('Sign-in could not be completed. Please try again.');
  });

  it('shows no alert when no error was returned', () => {
    expect(getAuthErrorMessage(undefined)).toBeNull();
  });
});
