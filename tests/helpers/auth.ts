import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const userId = '11111111-2222-4333-8444-555555555555';
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', email_confirmed_at: new Date().toISOString(), created_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [{ identity_id: '22222222-2222-4333-8444-555555555555', id: userId, user_id: userId, provider: 'email', identity_data: { email: 'test@example.com' } }] };

type SignupReply = 'new' | 'user_already_exists' | 'email_exists' | 'obfuscated' | 'missing-identities' | 'rate-limit';
interface MockAuthOptions { invalidLogin?: boolean; signup?: SignupReply; waitForSignup?: Promise<void> }

export async function mockAuth(page: Page, options: MockAuthOptions = {}) {
  const requests: Array<{ path: string; body: Record<string, unknown> | null }> = [];
  await page.route('https://alethinos-test.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5176', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS' };
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
    const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : null;
    requests.push({ path: url.pathname, body });
    if (url.pathname === '/auth/v1/token') {
      if (options.invalidLogin) { await route.fulfill({ status: 400, headers, json: { error_code: 'invalid_credentials', msg: 'Invalid login credentials' } }); return; }
      const now = Math.floor(Date.now() / 1000);
      const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId, aud: 'authenticated', role: 'authenticated', exp: now + 3600, iat: now })).toString('base64url')}.test-signature`;
      await route.fulfill({ headers, json: { access_token: token, refresh_token: 'mock-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user } }); return;
    }
    if (url.pathname === '/auth/v1/signup') {
      await options.waitForSignup;
      if (options.signup === 'user_already_exists' || options.signup === 'email_exists') {
        await route.fulfill({ status: 422, headers, json: { error_code: options.signup, msg: 'Account unavailable' } }); return;
      }
      if (options.signup === 'rate-limit') {
        await route.fulfill({ status: 429, headers, json: { error_code: 'over_email_send_rate_limit', msg: 'Email rate limit exceeded' } }); return;
      }
      const response: Partial<typeof user> & { confirmation_sent_at: string } = { ...user, confirmation_sent_at: new Date().toISOString() };
      delete response.email_confirmed_at;
      if (options.signup === 'obfuscated') { response.id = '33333333-2222-4333-8444-555555555555'; response.identities = []; }
      if (options.signup === 'missing-identities') delete response.identities;
      await route.fulfill({ headers, json: response }); return;
    }
    if (url.pathname === '/auth/v1/recover' || url.pathname === '/auth/v1/logout') { await route.fulfill({ headers, json: {} }); return; }
    if (url.pathname === '/auth/v1/user') { await route.fulfill({ headers, json: user }); return; }
    if (url.pathname === '/rest/v1/alethinos_tasks') {
      expect(url.searchParams.get('user_id')).toBe(`eq.${userId}`);
      await route.fulfill({ headers, json: [] }); return;
    }
    await route.fulfill({ status: 404, headers, json: { message: 'Unexpected mocked endpoint' } });
  });
  return requests;
}
