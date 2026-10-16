import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://alethinos-test.supabase.co/**', route => route.abort());
});

test('Workers serves the built app and keeps development demo disabled', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/?demo=1');
  expect(response!.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.locator('.auth-submit')).toBeEnabled();
  await expect(page.locator('.app-shell')).toHaveCount(0);
  await expect(page.locator('.product-preview button')).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/workers-auth.png', fullPage: true });
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

test('Workers applies security headers and immutable caching only to fingerprinted assets', async ({ request }) => {
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
