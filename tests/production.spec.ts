import { expect, test } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:5177' });

test('production ignores the old demo URL and exposes only the account flow', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /先体验/ })).toHaveCount(0);
  await expect(page.locator('.auth-submit')).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('alethinosplan.demo.v1'))).toBeNull();
});
