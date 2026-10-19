import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: '**/pages.spec.ts',
  testIgnore: [],
  use: { ...base.use, baseURL: 'http://127.0.0.1:8789' },
  webServer: {
    command: 'node scripts/check-deploy-env.mjs && node node_modules/vite/bin/vite.js build --outDir .test-pages && node node_modules/wrangler/bin/wrangler.js pages dev .test-pages --ip 127.0.0.1 --port 8789',
    url: 'http://127.0.0.1:8789',
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_SUPABASE_URL: 'https://alethinos-test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_for_mocked_requests_only',
      WRANGLER_SEND_METRICS: 'false',
    },
  },
});
