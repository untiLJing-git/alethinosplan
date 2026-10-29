import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://alethinos-test.supabase.co/**', route => route.abort());
});

test('Pages serves the built app and keeps development demo disabled', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/?demo=1');
  expect(response!.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.locator('.auth-submit')).toBeEnabled();
  await expect(page.locator('.app-shell')).toHaveCount(0);
  await expect(page.locator('.product-preview button')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /反馈与建议/ })).toHaveAttribute('href', 'https://github.com/untiLJing-git/alethinosplan/issues/new/choose');
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/pages-auth.png', fullPage: true });
});

test('SPA navigation and authentication query parameters survive direct navigation and refresh', async ({ page }) => {
  for (const path of ['/calendar', '/?auth=recovery']) {
    const response = await page.goto(path);
    expect(response!.status()).toBe(200);
    await expect(page.locator('.auth-page')).toBeVisible();
    await page.reload();
    await expect(page.locator('.auth-page')).toBeVisible();
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(path);
  }
});

test('Pages applies security headers and immutable caching only to fingerprinted assets', async ({ request }) => {
  const root = await request.get('/');
  expect(root.status()).toBe(200);
  expect(root.headers()['x-content-type-options']).toBe('nosniff');
  expect(root.headers()['x-frame-options']).toBe('DENY');
  expect(root.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(root.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(root.headers()['cache-control']).not.toContain('immutable');
  const html = await root.text();
  const assets = [...html.matchAll(new RegExp('(?:src|href)="(/assets/[^"]+)"', 'g'))].map(match => match[1]);
  expect(assets.length).toBeGreaterThanOrEqual(2);
  for (const path of assets) {
    const asset = await request.get(path);
    expect(asset.status()).toBe(200);
    expect(asset.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(asset.headers()['content-type']).not.toContain('text/html');
  }
});


test('Pages serves the theme bootstrap and preserves a saved manual theme in production', async ({ page, request }) => {
  const script = await request.get('/theme-init.js');
  expect(script.status()).toBe(200);
  expect(script.headers()['content-type']).not.toContain('text/html');
  expect(await script.text()).toContain('alethinosplan.theme.v1');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('alethinosplan.theme.v1', 'dark'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('Pages serves a private, non-cacheable language endpoint instead of SPA HTML', async ({ request }) => {
  const response = await request.get('/api/locale');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['cache-control']).toBe('private, no-store');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  const body = await response.json();
  expect(Object.keys(body)).toEqual(['locale']);
  expect(['zh-CN', 'en']).toContain(body.locale);
});

test.describe('Pages first visit without a saved language', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('uses the actual Pages Function response on direct navigation', async ({ page }) => {
    const lookup = page.waitForResponse(response => new URL(response.url()).pathname === '/api/locale');
    await page.goto('/calendar');
    const response = await lookup;
    expect(response.status()).toBe(200);
    const { locale } = await response.json();
    await expect(page.locator('.auth-page')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    expect(await page.evaluate(() => localStorage.getItem('alethinosplan.locale.v1'))).toBeNull();
  });
});
