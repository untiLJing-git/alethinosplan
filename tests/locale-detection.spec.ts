import { expect, test } from '@playwright/test';
import { onRequest } from '../functions/api/locale';

test.use({ baseURL: 'http://127.0.0.1:5177', storageState: { cookies: [], origins: [] } });

for (const country of ['CN', 'US', 'HK', 'MO', 'TW']) {
  test(`first visit from ${country} chooses the region language before showing the form`, async ({ page }) => {
    let release!: () => void;
    await page.route('**/api/locale', async route => {
      await new Promise<void>(resolve => { release = resolve; });
      const response = onRequest({ request: Object.assign(new Request(route.request().url()), { cf: { country } }) });
      await route.fulfill({ status: 200, headers: Object.fromEntries(response.headers), body: await response.text() });
    });
    const pending = page.waitForRequest('**/api/locale');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await pending;
    await expect(page.locator('.auth-page')).toHaveCount(0);
    await expect(page.locator('.boot-state')).toBeVisible();
    await expect.poll(() => Boolean(release)).toBe(true);
    release();
    await expect(page.locator('.auth-page')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', country === 'CN' ? 'zh-CN' : 'en');
    expect(await page.evaluate(() => localStorage.getItem('alethinosplan.locale.v1'))).toBeNull();
    await expect(page.locator('.language-toggle button').nth(country === 'CN' ? 0 : 1)).toHaveAttribute('aria-pressed', 'true');
  });
}

test('a manual choice survives reload and bypasses the IP lookup', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/locale', route => { requests++; return route.fulfill({ json: { locale: 'en' } }); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.locator('.language-toggle button').first().click();
  await page.reload();
  await expect(page.locator('.auth-page')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  expect(requests).toBe(1);
});

test('automatic detection runs again on a later visit instead of saving a stale region', async ({ page }) => {
  let locale = 'zh-CN';
  await page.route('**/api/locale', route => route.fulfill({ json: { locale } }));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  locale = 'en';
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('alethinosplan.locale.v1'))).toBeNull();
});

for (const failure of ['network', 'html', 'timeout']) {
  test(`English remains usable after a ${failure} lookup failure`, async ({ page }) => {
    await page.route('**/api/locale', async route => {
      if (failure === 'network') return route.abort();
      if (failure === 'html') return route.fulfill({ contentType: 'text/html', body: '<html></html>' });
      // Leave the request pending; startup must not wait for the server forever.
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 4000 });
    await page.locator('.language-toggle button').first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  });
}

test('blocked storage still uses the IP region and allows a session-only switch', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.route('**/api/locale', route => route.fulfill({ json: { locale: 'zh-CN' } }));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.locator('.language-toggle button').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('.language-save-note')).toBeVisible();
});

for (const locale of ['zh-CN', 'en']) {
  test(`fresh local demo content uses the detected ${locale} language`, async ({ page }) => {
    await page.route('**/api/locale', route => route.fulfill({ json: { locale } }));
    await page.goto('http://127.0.0.1:5175/?demo=1');
    const first = page.getByTestId('sticky-task').first();
    await expect(first).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(first).toContainText(locale === 'en' ? 'Write the introduction to my portfolio' : '\u5199\u597d\u4f5c\u54c1\u96c6\u7684\u5f00\u573a');
    expect(await page.evaluate(() => localStorage.getItem('alethinosplan.locale.v1'))).toBeNull();
  });
}
