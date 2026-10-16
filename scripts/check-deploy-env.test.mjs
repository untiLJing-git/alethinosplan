import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDeploymentEnv } from './check-deploy-env.mjs';

const valid = { VITE_SUPABASE_URL: 'https://alethinos-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key' };
const jwt = role => 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.test-signature';

test('accepts a public build configuration and surrounding whitespace', () => {
  assert.doesNotThrow(() => validateDeploymentEnv(valid));
  assert.doesNotThrow(() => validateDeploymentEnv({ VITE_SUPABASE_URL: ' ' + valid.VITE_SUPABASE_URL + '/ ', VITE_SUPABASE_PUBLISHABLE_KEY: ' ' + valid.VITE_SUPABASE_PUBLISHABLE_KEY + ' ' }));
});
test('accepts the legacy anon key', () => {
  assert.doesNotThrow(() => validateDeploymentEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }));
});
for (const [name, values] of [
  ['missing values', {}],
  ['empty key', { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: '' }],
  ['placeholder URL', { ...valid, VITE_SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co' }],
  ['placeholder key', { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'YOUR_PUBLISHABLE_KEY' }],
  ['HTTP URL', { ...valid, VITE_SUPABASE_URL: 'http://alethinos-test.supabase.co' }],
  ['URL credentials', { ...valid, VITE_SUPABASE_URL: 'https://user:password@alethinos-test.supabase.co' }],
  ['URL path', { ...valid, VITE_SUPABASE_URL: 'https://alethinos-test.supabase.co/dashboard' }],
  ['malformed URL', { ...valid, VITE_SUPABASE_URL: 'not-a-url' }],
  ['server secret', { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_do_not_expose' }],
  ['service role JWT', { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('service_role') }],
  ['malformed JWT', { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJ.invalid.signature' }],
  ['unknown key', { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'not-a-key' }],
]) {
  test('rejects ' + name + ' without echoing the provided key', () => {
    assert.throws(() => validateDeploymentEnv(values), error => {
      if (values.VITE_SUPABASE_PUBLISHABLE_KEY && !values.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_')) {
        assert.ok(!error.message.includes(values.VITE_SUPABASE_PUBLISHABLE_KEY));
      }
      return true;
    });
  });
}
