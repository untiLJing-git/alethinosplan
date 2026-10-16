import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const localChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(localChrome) ? localChrome : undefined);

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/workers.spec.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 6_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5175',
    browserName: 'chromium',
    launchOptions: { executablePath },
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
    timezoneId: 'Asia/Shanghai',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npm run dev -- --port 5175', url: 'http://127.0.0.1:5175', reuseExistingServer: false, timeout: 30_000, env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' } },
    { command: 'npm run dev -- --port 5176', url: 'http://127.0.0.1:5176', reuseExistingServer: false, timeout: 30_000, env: { VITE_SUPABASE_URL: 'https://alethinos-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_for_mocked_requests_only' } },
    { command: 'node node_modules/vite/bin/vite.js build --outDir .test-build && node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5177 --strictPort --outDir .test-build', url: 'http://127.0.0.1:5177', reuseExistingServer: false, timeout: 30_000, env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' } },
  ],
});
