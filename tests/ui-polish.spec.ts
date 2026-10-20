import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { readable } from './helpers/contrast';

async function centered(button: Locator) {
  const frame = (await button.boundingBox())!;
  const icon = (await button.locator('svg').boundingBox())!;
  expect(Math.abs(frame.x + frame.width / 2 - icon.x - icon.width / 2)).toBeLessThan(1);
  expect(Math.abs(frame.y + frame.height / 2 - icon.y - icon.height / 2)).toBeLessThan(1);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test('primary page actions stay readable when hovered and focused', async ({ page }) => {
      await page.goto('/?demo=1');
      for (const [title, action] of [['我的一天', '新建任务'], ['规划日历', '添加计划'], ['随手记', '记一件事']]) {
        await page.getByRole('navigation').getByRole('button', { name: new RegExp(title) }).click();
        const button = page.locator('.page-heading').getByRole('button', { name: action, exact: true });
        await readable(button);
        await button.hover();
        await readable(button);
        await button.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        await expect(button).toBeFocused();
        await readable(button);
        await expect(button).toHaveCSS('outline-style', 'solid');
        await expect(page.locator('.page-heading h1')).toHaveText(title);
        await expect(page.locator('.title-period')).toHaveCount(0);
        if (action === '新建任务') await page.screenshot({ path: `test-results/primary-hover-${scheme}.png` });
        await page.keyboard.down('Space');
        await readable(button);
        await page.keyboard.up('Space');
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: '关闭', exact: true }).click();
      }
    });

    test('sticky check is centered before and after hover and still completes tasks', async ({ page }) => {
      await page.goto('/?demo=1');
      await expect(page.getByTestId('sticky-task')).toHaveCount(3);
      for (const button of await page.locator('.complete-button').all()) {
        await centered(button);
        await button.hover();
        await centered(button);
      }
      const first = page.locator('.complete-button').first();
      await first.focus();
      await page.keyboard.press('Space');
      await expect(page.getByTestId('sticky-task')).toHaveCount(2);
      await expect(page.locator('.completed-row')).toHaveCount(1);
      await page.getByRole('button', { name: '撤销', exact: true }).click();
      await expect(page.getByTestId('sticky-task')).toHaveCount(3);
    });

    test.describe('touch form', () => {
      test.use({ hasTouch: true, isMobile: true });
      test('date fields fit narrow screens, save correctly and remain usable with a short viewport', async ({ page }) => {
        for (const width of [320, 390, 600]) {
          await page.setViewportSize({ width, height: 844 });
          await page.goto('/?demo=1');
          const complete = page.locator('.complete-button').first();
          await centered(complete);
          expect((await complete.boundingBox())!.width).toBeGreaterThanOrEqual(44);
          await page.getByRole('button', { name: '新建任务', exact: true }).tap();
          const dialog = page.getByRole('dialog');
          const date = page.getByLabel('计划日期');
          const estimate = page.getByLabel('预计分钟');
          await expect(date).toHaveAttribute('type', 'date');
          await expect(date).toHaveAttribute('min', '1900-01-01');
          await expect(date).toHaveAttribute('max', '2100-12-31');
          const dateBox = (await date.boundingBox())!;
          const estimateBox = (await estimate.boundingBox())!;
          expect(dateBox.height).toBeGreaterThanOrEqual(44);
          expect(dateBox.x).toBeCloseTo(estimateBox.x, 1);
          expect(dateBox.width).toBeCloseTo(estimateBox.width, 1);
          expect(dateBox.y + dateBox.height).toBeLessThan(estimateBox.y);
          await expect(date).toHaveCSS('text-align', 'left');
          await expect(date).toHaveCSS('font-size', '16px');
          for (const element of await dialog.locator('input, textarea, .tone-picker, .dialog-footer').all()) {
            const bounds = (await element.boundingBox())!;
            expect(bounds.x).toBeGreaterThanOrEqual(0);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
          }
          expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
          const title = `Mobile ${scheme} ${width}`;
          await page.getByLabel('准备做什么？').fill(title);
          await date.fill('');
          expect(await date.evaluate(el => (el as HTMLInputElement).validity.valueMissing)).toBe(true);
          await date.fill('2026-11-08');
          await estimate.fill('35');
          await page.getByRole('button', { name: '浅绿', exact: true }).tap();
          if (width === 390) await page.screenshot({ path: `test-results/task-form-mobile-${scheme}.png` });
          await page.setViewportSize({ width, height: 420 });
          await page.getByRole('button', { name: '保存', exact: true }).tap();
          await expect(dialog).toHaveCount(0);
          const stored = await page.evaluate(title => JSON.parse(localStorage.getItem('alethinosplan.demo.v1')!).find((task: { title: string }) => task.title === title), title);
          expect(stored).toMatchObject({ title, plannedDate: '2026-11-08', estimate: 35, tone: 'mint' });
          await page.setViewportSize({ width, height: 844 });
          await page.getByRole('navigation').getByRole('button', { name: '规划日历' }).tap();
          await page.locator('.page-heading').getByRole('button', { name: '添加计划' }).tap();
          await expect(date).toBeVisible();
          await page.getByRole('button', { name: '关闭', exact: true }).tap();
          await page.getByRole('navigation').getByRole('button', { name: /随手记/ }).tap();
          await page.getByRole('button', { name: '记一件事', exact: true }).tap();
          await expect(date).toHaveCount(0);
          await page.getByLabel('记下什么？').fill(`Note ${width}`);
          await page.getByRole('button', { name: '记下', exact: true }).tap();
          await expect(page.locator('.capture-note-title').filter({ hasText: `Note ${width}` })).toBeVisible();
        }
      });
    });
  });
}
