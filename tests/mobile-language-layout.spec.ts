import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function setEnglish(page: Page, english: boolean) {
  await page.locator('.language-toggle button').nth(english ? 1 : 0).tap();
  await expect(page.locator('html')).toHaveAttribute('lang', english ? 'en' : 'zh-CN');
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`mobile language layout in ${colorScheme}`, () => {
    test.use({ hasTouch: true, isMobile: true, colorScheme });
    for (const width of [320, 360, 390, 430, 760]) {
      test(`balanced auth and compact home controls at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/');
        await page.locator('input[name="email"]').fill('reader@example.com');
        for (const mode of ['login', 'signup', 'reset']) {
          if (mode === 'signup') await page.locator('.auth-switch button').nth(1).tap();
          if (mode === 'reset') {
            await page.locator('.auth-switch button').first().tap();
            await page.locator('.auth-forgot button').tap();
          }
          let fieldTop: number | undefined;
          let previewHeight: number | undefined;
          for (const english of [false, true, false]) {
            await setEnglish(page, english);
            await expect(page.locator('input[name="email"]')).toHaveValue('reader@example.com');
            const brand = (await page.locator('.auth-story .brand').boundingBox())!;
            const toggle = (await page.locator('.auth-language').boundingBox())!;
            const form = (await page.locator('.auth-form-wrap').boundingBox())!;
            expect(Math.abs(brand.y + brand.height / 2 - toggle.y - toggle.height / 2)).toBeLessThan(1);
            expect(toggle.x - brand.x - brand.width).toBeGreaterThanOrEqual(12);
            expect(brand.x).toBeCloseTo(form.x, 0);
            expect(toggle.x + toggle.width).toBeCloseTo(form.x + form.width, 0);
            expect(form.x + form.width / 2).toBeCloseTo(width / 2, 0);
            await expect(page.locator('.auth-form-wrap h2')).toHaveCSS('text-align', 'center');
            await expect(page.locator('.auth-subtitle')).toHaveCSS('text-align', 'center');
            const field = (await page.locator('input[name="email"]').boundingBox())!;
            const preview = (await page.locator('.preview-note .paper-sheet').boundingBox())!;
            if (fieldTop !== undefined) expect(field.y).toBeCloseTo(fieldTop, 0);
            if (previewHeight !== undefined) expect(preview.height).toBeCloseTo(previewHeight, 0);
            fieldTop = field.y;
            previewHeight = preview.height;
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
            if (width === 320 || width === 390) {
              await page.screenshot({ path: `test-results/mobile-auth-${width}-${colorScheme}-${mode}-${english ? 'en' : 'zh'}.png`, fullPage: true });
            }
          }
        }
        await page.goto('/?demo=1');
        for (const english of [true, false]) {
          // Tap outside the painted pill, but inside the actual touch target.
          const target = page.locator('.language-toggle button').nth(english ? 1 : 0);
          const box = (await target.boundingBox())!;
          await page.touchscreen.tap(box.x + box.width / 2, box.y + 2);
          await expect(page.locator('html')).toHaveAttribute('lang', english ? 'en' : 'zh-CN');
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
          const label = (await target.locator('span').boundingBox())!;
          expect(label.height).toBe(26);
          expect(label.width).toBe(36);
          const group = (await page.locator('.language-toggle').boundingBox())!;
          expect(group.width).toBe(88);
          const paintHeight = await page.locator('.language-toggle').evaluate(el => getComputedStyle(el, '::before').height);
          expect(paintHeight).toBe('32px');
          const brand = (await page.locator('.app-topbar .brand').boundingBox())!;
          const account = (await page.locator('.account-menu summary').boundingBox())!;
          expect(group.x - brand.x - brand.width).toBeGreaterThanOrEqual(10);
          expect(group.x + group.width).toBeLessThan(account.x);
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
          await page.locator('.account-menu summary').tap();
          await expect(page.locator('.account-popover')).toBeVisible();
          await page.locator('.account-menu summary').tap();
          if (width === 320 || width === 390) {
            await page.screenshot({ path: `test-results/mobile-home-${width}-${colorScheme}-${english ? 'en' : 'zh'}.png` });
          }
        }
      });
    }

    test('the relocated language control keeps storage feedback within the screen', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.addInitScript(() => {
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (key === 'alethinosplan.locale.v1') throw new DOMException('Blocked', 'SecurityError');
          return setItem.call(this, key, value);
        };
      });
      await page.goto('/');
      await setEnglish(page, true);
      const notice = page.locator('.language-save-note');
      await expect(notice).toBeVisible();
      const box = (await notice.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      await setEnglish(page, false);
      await expect(page.locator('.auth-form-wrap h2')).toBeVisible();
    });
  });
}
