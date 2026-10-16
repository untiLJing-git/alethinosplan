import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

export function validateDeploymentEnv(env) {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key || /YOUR_PROJECT/i.test(url) || /YOUR_PUBLISHABLE/i.test(key)) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before building for Workers.');
  }
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('VITE_SUPABASE_URL must be an HTTPS origin without credentials, a path, query, or fragment.');
  }
  if (key.startsWith('sb_secret_')) throw new Error('Never expose a Supabase secret or service_role key in a frontend build.');
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return;
  if (key.startsWith('eyJ') && key.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      if (payload.role === 'anon') return;
    } catch { /* Invalid or privileged legacy JWTs must not reach the frontend bundle. */ }
  }
  throw new Error('Use a Supabase publishable key or a legacy anon JWT, never a service_role key.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    // Match Vite production mode, including .env.local and existing process variables.
    validateDeploymentEnv(loadEnv('production', process.cwd(), 'VITE_'));
    console.log('Workers build environment is valid. No credentials were printed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
