import { describe, expect, it } from 'vitest';
import { getSafeReturnPath } from '@/lib/auth-return-path';

describe('safe authentication return paths', () => {
  it('preserves a relative destination and its query', () => {
    expect(getSafeReturnPath('/workspace/channel?thread=reply-1')).toBe('/workspace/channel?thread=reply-1');
  });

  it('preserves an invitation destination through sign-in', () => {
    expect(getSafeReturnPath('/invite/invite-token')).toBe('/invite/invite-token');
  });

  it('rejects absolute and protocol-relative external destinations', () => {
    expect(getSafeReturnPath('https://attacker.example/steal')).toBe('/');
    expect(getSafeReturnPath('//attacker.example/steal')).toBe('/');
  });

  it('rejects path separators that URL parsers can normalize into an external host', () => {
    expect(getSafeReturnPath('/\\attacker.example/steal')).toBe('/');
  });

  it('uses the default route for missing, repeated, or empty destinations', () => {
    expect(getSafeReturnPath(undefined)).toBe('/');
    expect(getSafeReturnPath(['/workspace', '/other'])).toBe('/');
    expect(getSafeReturnPath('')).toBe('/');
  });
});
