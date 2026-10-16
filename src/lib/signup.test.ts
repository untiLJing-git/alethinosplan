import { describe, expect, it } from 'vitest';
import { getSignupOutcome } from './signup';

describe('signup response handling', () => {
  it('treats a real session as signed in', () => {
    expect(getSignupOutcome({ user: { identities: [] }, session: { access_token: 'test' } })).toBe('signed-in');
  });
  it('recognizes the sanitized existing-account response', () => {
    expect(getSignupOutcome({ user: { identities: [] }, session: null })).toBe('existing-account');
  });
  it('directs a new or unconfirmed account to email verification', () => {
    expect(getSignupOutcome({ user: { identities: [{ provider: 'email' }] }, session: null })).toBe('verify-email');
  });
  it('does not assume missing user data means success or a duplicate', () => {
    expect(getSignupOutcome({ user: null, session: null })).toBe('unknown');
    expect(getSignupOutcome({ user: {}, session: null })).toBe('unknown');
  });
});
