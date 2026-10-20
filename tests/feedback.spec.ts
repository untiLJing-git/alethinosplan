import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const feedbackURL = 'https://github.com/untiLJing-git/alethinosplan/issues/new/choose';
async function expectSafeLink(link: Locator) {
  await expect(link).toHaveAttribute('href', feedbackURL);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
}

test('desktop feedback stays in the sidebar utility area above the theme control', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/?demo=1');
    const link = page.getByRole('link', { name: /反馈与建议/ });
    await expect(link).toHaveCount(1);
    await expectSafeLink(link);
    await expect(page.getByRole('navigation', { name: '主要导航' }).getByRole('link')).toHaveCount(0);
    const bounds = (await link.boundingBox())!;
    const theme = (await page.getByRole('button', { name: /^切换主题：/ }).boundingBox())!;
    expect(bounds.y).toBeGreaterThan(800);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(theme.y);
    expect(bounds.x).toBeCloseTo(theme.x, 1);
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS('outline-style', 'solid');
    await page.screenshot({ path: 'test-results/feedback-sidebar-' + scheme + '.png', fullPage: true });
  }
});

test('feedback remains available on login and registration without horizontal overflow', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const link = page.getByRole('link', { name: /反馈与建议/ });
    await expectSafeLink(link);
    await expect(link).toBeVisible();
    await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
    await expect(link).toBeVisible();
    const bounds = (await link.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path: 'test-results/feedback-auth-mobile.png', fullPage: true });
  }
});

test.describe('mobile feedback', () => {
  test.use({ hasTouch: true });
  test('the account menu exposes a touch-sized feedback link without adding another floating button', async ({ page }) => {
    for (const width of [320, 390, 760]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/?demo=1');
      await expect(page.locator('.sidebar-utilities > .feedback-link')).toBeHidden();
      await expect(page.getByRole('button', { name: /^切换主题：/ })).toHaveCount(0);
      await page.getByLabel('账号菜单').tap();
      await expect(page.getByRole('button', { name: /^切换主题：/ })).toBeVisible();
      const link = page.getByRole('link', { name: /反馈与建议/ });
      await expectSafeLink(link);
      await expect(link).toBeVisible();
      const bounds = (await link.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      if (width === 390) await page.screenshot({ path: 'test-results/feedback-account-mobile.png' });
    }
  });
});

test('opening feedback uses a new tab without leaking the opener, query string or referrer', async ({ page, context }) => {
  let referrer: string | undefined;
  await context.route('https://github.com/**', async route => {
    referrer = route.request().headers()['referer'];
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Feedback test</title><main>GitHub feedback destination</main>' });
  });
  await page.goto('/?demo=1&private=sensitive-query');
  const sourceURL = page.url();
  const opened = context.waitForEvent('page');
  await page.getByRole('link', { name: /反馈与建议/ }).click();
  const destination = await opened;
  await destination.waitForLoadState('domcontentloaded');
  expect(destination.url()).toBe(feedbackURL);
  expect(new URL(destination.url()).search).toBe('');
  expect(await destination.evaluate(() => window.opener)).toBeNull();
  expect(await destination.evaluate(() => document.referrer)).toBe('');
  expect(referrer).toBeUndefined();
  expect(page.url()).toBe(sourceURL);
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
});
