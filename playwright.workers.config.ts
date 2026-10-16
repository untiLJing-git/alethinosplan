import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: '**/workers.spec.ts',
  testIgnore: [],
  use: { ...base.use, baseURL: 'http://127.0.0.1:8788' },
  webServer: {
    command: 'node scripts/check-deploy-env.mjs && node node_modules/vite/bin/vite.js build --outDir .test-workers && node node_modules/wrangler/bin/wrangler.js dev --local --ip 127.0.0.1 --port 8788 --assets .test-workers',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_SUPABASE_URL: 'https://alethinos-test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_for_mocked_requests_only',
      WRANGLER_SEND_METRICS: 'false',
    },
  },
});
