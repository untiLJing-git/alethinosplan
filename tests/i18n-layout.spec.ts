import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

async function fits(page: Page, selectors: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const element of await page.locator(selectors).all()) {
    if (!await element.isVisible()) continue;
    const result = await element.evaluate(el => {
      const box = el.getBoundingClientRect();
      return { label: el.className, left: box.left, right: box.right, viewport: innerWidth,
        scroll: el.scrollWidth, client: el.clientWidth };
    });
    expect(result.left, String(result.label)).toBeGreaterThanOrEqual(-1);
    expect(result.right, String(result.label)).toBeLessThanOrEqual(result.viewport + 1);
    // Page-level overflow alone misses content clipped inside a panel or dialog.
    expect(result.scroll, String(result.label)).toBeLessThanOrEqual(result.client + 1);
  }
}

async function separate(first: Locator, second: Locator) {
  const a = (await first.boundingBox())!;
  const b = (await second.boundingBox())!;
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  expect(overlapX <= 1 || overlapY <= 1, 'Controls must not overlap').toBe(true);
}

async function language(page: Page, en: boolean) {
  await page.getByRole('button', { name: en ? 'Switch to English' : '\u5207\u6362\u5230\u4e2d\u6587', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', en ? 'en' : 'zh-CN');
}

for (const width of [320, 390, 760, 768, 1024, 1440]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`live language switching preserves layouts at ${width}px in ${scheme}`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.clock.setFixedTime(new Date('2026-09-30T04:00:00Z'));
      await page.goto('/?demo=1');
      for (const en of [true, false, true]) {
        await language(page, en);
        await fits(page, '.app-topbar, .account-area, .app-sidebar nav, .nav-item, .page-heading, .today-actions, .board-caption, .sticky-bottom');
        await separate(page.locator('.brand'), page.locator('.account-area'));
        await separate(page.locator('.page-heading > div').first(), page.locator('.today-actions'));
        await page.locator('.account-menu summary').click();
        await fits(page, '.account-popover, .account-popover button');
        await page.locator('.account-menu summary').click();
        await page.locator('.nav-item').nth(1).click();
        await fits(page, '.page-heading, .calendar-toolbar, .calendar-period, .day-detail-heading, .day-detail-add');
        await page.locator('.segmented button').nth(1).click();
        await fits(page, '.calendar-board, .calendar-period, .week-grid .day-number, .week-add');
        await page.locator('.segmented button').first().click();
        await page.locator('.nav-item').nth(2).click();
        await fits(page, '.page-heading, .capture-note, .capture-note-body, .capture-note-body .text-button');
        await page.locator('.nav-item').first().click();
      }
      // A second tab changes language while the first has a modal open.
      const peer = await context.newPage();
      await peer.goto('/?demo=1');
      await page.locator('.sticky-title').first().click();
      const draft = await page.locator('textarea').inputValue();
      await page.locator('.dialog-secondary .danger').click();
      for (const en of [false, true]) {
        await language(peer, en);
        await expect(page.locator('html')).toHaveAttribute('lang', en ? 'en' : 'zh-CN');
        await expect(page.locator('textarea')).toHaveValue(draft);
        await fits(page, '.task-dialog, .dialog-heading, .form-grid, .dialog-footer, .dialog-secondary, .delete-confirm, .delete-confirm button');
      }
      await page.screenshot({ path: `test-results/i18n-layout-dialog-${width}-${scheme}.png`, fullPage: true });
      await page.locator('.dialog-heading .icon-button').click();
      await page.locator('.sticky-start').first().click();
      for (const en of [false, true]) {
        await language(peer, en);
        await expect(page.locator('html')).toHaveAttribute('lang', en ? 'en' : 'zh-CN');
        await fits(page, '.focus-dialog, .focus-controls, .focus-controls button');
      }
      await page.screenshot({ path: `test-results/i18n-layout-focus-${width}-${scheme}.png`, fullPage: true });
    });
  }
}

for (const viewport of [{ width: 320, height: 568 }, { width: 760, height: 480 }, { width: 768, height: 540 }, { width: 1440, height: 900 }]) {
  test(`auth language control avoids form overlap at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    for (const en of [true, false, true]) {
      await language(page, en);
      for (const index of [1, 0]) {
        await page.locator('.auth-switch button').nth(index).click();
        await fits(page, '.auth-panel, .auth-form-wrap, .auth-switch, .auth-subtitle, .auth-language');
        await separate(page.locator('.auth-language'), page.locator('.auth-form-wrap'));
      }
      await page.locator('.auth-forgot button').click();
      await fits(page, '.auth-panel, .auth-form-wrap, .auth-language, .auth-submit');
      await separate(page.locator('.auth-language'), page.locator('.auth-form-wrap'));
      await page.locator('.auth-back').click();
    }
    await page.screenshot({ path: `test-results/i18n-layout-auth-${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}

test('narrow mini window fits both languages with timer, help, and an open context menu', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
      requestWindow: () => Promise.resolve(window.open('about:blank', '_blank', 'popup,width=380,height=560')),
    } });
  });
  await page.goto('/?demo=1');
  await language(page, true);
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Mini window', exact: true }).click();
  const mini = await opened;
  await mini.locator('.desktop-task-start').first().click();
  for (const width of [260, 380]) {
    await mini.setViewportSize({ width, height: 560 });
    for (const en of [false, true]) {
      await language(page, en);
      await expect(mini.locator('html')).toHaveAttribute('lang', en ? 'en' : 'zh-CN');
      await fits(mini, '.desktop-tasks, .desktop-tasks-heading, .desktop-tasks-tabs, .desktop-tasks-tabs button, .desktop-focus-card, .desktop-focus-controls, .desktop-footer-bar');
      await mini.locator('.desktop-help-button').click();
      await fits(mini, '.desktop-help');
      await mini.locator('.desktop-help-button').click();
    }
    await language(page, false);
    await mini.locator('.desktop-tasks-heading h1').click({ button: 'right' });
    await language(page, true);
    await expect(mini.getByRole('menu')).toBeVisible();
    await fits(mini, '.desktop-context-menu, .desktop-context-menu button');
    const menu = (await mini.getByRole('menu').boundingBox())!;
    expect(menu.y + menu.height).toBeLessThanOrEqual(560);
    await mini.keyboard.press('Escape');
    await mini.screenshot({ path: `test-results/i18n-layout-mini-${width}.png` });
  }
});
