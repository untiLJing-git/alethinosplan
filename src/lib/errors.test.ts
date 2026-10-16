import { describe, expect, it } from 'vitest';
import { authErrorMessage, dataErrorMessage, isRegisteredEmailError, REGISTERED_EMAIL_MESSAGE } from './errors';

describe('safe user-facing errors', () => {
  it('does not reveal arbitrary auth error payloads', () => {
    expect(authErrorMessage(new Error('secret payload'))).not.toContain('secret');
    expect(authErrorMessage(new Error('Invalid login credentials'))).toBe('邮箱或密码不正确。');
  });
  it('distinguishes configuration, email verification and network failures', () => {
    expect(authErrorMessage(new Error('Email not confirmed'))).toContain('验证');
    expect(authErrorMessage(new Error('Failed to fetch'))).toContain('网络');
    expect(dataErrorMessage(new Error('Could not find alethinos_tasks in schema cache'))).toContain('初始化');
  });
  it('recognizes duplicate signup error codes even when messages change', () => {
    for (const code of ['user_already_exists', 'email_exists']) {
      const error = Object.assign(new Error('Account unavailable'), { code });
      expect(isRegisteredEmailError(error)).toBe(true);
      expect(authErrorMessage(error)).toBe(REGISTERED_EMAIL_MESSAGE);
    }
    expect(authErrorMessage({ code: 'user_already_exists' })).toBe(REGISTERED_EMAIL_MESSAGE);
  });
  it('supports legacy duplicate messages without confusing credential failures', () => {
    expect(authErrorMessage(new Error('User already registered'))).toBe(REGISTERED_EMAIL_MESSAGE);
    expect(isRegisteredEmailError(new Error('Invalid login credentials'))).toBe(false);
    expect(isRegisteredEmailError(new Error('User not found'))).toBe(false);
  });
});
