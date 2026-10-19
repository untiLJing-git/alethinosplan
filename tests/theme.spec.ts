import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

function themeButton(page: Page) {
  return page.getByRole('button', { name: /^切换主题：/ });
}
async function chooseTheme(page: Page, label: string) {
  const desired = { '浅色': 'light', '深色': 'dark', '跟随系统': 'system' }[label];
  if (!desired) throw new Error('Unknown theme');
  const button = themeButton(page);
  for (let count = 0; count < 3 && await button.getAttribute('data-theme-mode') !== desired; count += 1) await button.click();
  await expect(button).toHaveAttribute('data-theme-mode', desired);
}
async function miniWindow(page: Page) {
  await page.addInitScript(() => Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
    requestWindow: () => Promise.resolve(window.open('about:blank', '_blank', 'popup,width=380,height=560')),
  } }));
  await page.goto('/?demo=1');
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: '置顶小窗', exact: true }).click();
  const mini = await popup;
  await mini.setViewportSize({ width: 380, height: 560 });
  await expect(mini.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  return mini;
}

test('manual light and dark preferences persist and system mode remains reactive', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/?demo=1');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await chooseTheme(page, '浅色');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('alethinosplan.theme.v1'))).toBe('light');
  await chooseTheme(page, '深色');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'test-results/theme-toggle-dark.png' });
  await chooseTheme(page, '跟随系统');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await chooseTheme(page, '浅色');
  await page.screenshot({ path: 'test-results/theme-toggle-light.png' });
  await expect(themeButton(page)).toBeFocused();
  await expect(page.locator('.theme-panel')).toHaveCount(0);
  await page.getByLabel('账号菜单').click();
  await page.getByRole('button', { name: '退出演示 / 登录' }).click();
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('theme storage changes synchronize across tabs and storage failures do not block switching', async ({ page, context }) => {
  await page.goto('/?demo=1');
  const other = await context.newPage();
  await other.goto('/?demo=1');
  await chooseTheme(page, '深色');
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
  await chooseTheme(other, '浅色');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Storage blocked'); }; });
  await chooseTheme(page, '深色');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.theme-save-note')).toContainText('未允许保存');
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
});

test('the single theme button stays at the lower left and cycles with mouse and keyboard', async ({ page }) => {
  await page.goto('/?demo=1');
  const button = themeButton(page);
  await expect(page.locator('.app-topbar').getByRole('button', { name: /^切换主题：/ })).toHaveCount(0);
  await expect(page.locator('.app-sidebar').getByRole('button', { name: /^切换主题：/ })).toHaveCount(1);
  const sidebar = (await page.locator('.app-sidebar').boundingBox())!;
  const bounds = (await button.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(sidebar.x);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(sidebar.x + sidebar.width);
  expect(bounds.y).toBeGreaterThan(880);
  await expect(button).toHaveAttribute('data-theme-mode', 'system');
  await button.click();
  await expect(button).toHaveAttribute('data-theme-mode', 'light');
  await page.keyboard.press('Space');
  await expect(button).toHaveAttribute('data-theme-mode', 'dark');
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('data-theme-mode', 'system');
  await expect(page.getByRole('radiogroup', { name: '主题模式' })).toHaveCount(0);
  await expect(page.locator('.theme-panel')).toHaveCount(0);
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?demo=1');
    const mobile = (await button.boundingBox())!;
    expect(mobile.x).toBeGreaterThanOrEqual(0);
    expect(mobile.x + mobile.width).toBeLessThanOrEqual(width / 2);
    expect(mobile.y).toBeGreaterThan(760);
    expect(mobile.y + mobile.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await chooseTheme(page, '浅色');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('data-theme-mode', 'dark');
    await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
    await expect(page.locator('.toast')).toBeVisible();
    const toast = (await page.locator('.toast').boundingBox())!;
    expect(toast.y + toast.height).toBeLessThanOrEqual(mobile.y);
    await button.click();
    await expect(button).toHaveAttribute('data-theme-mode', 'system');
    if (width === 390) await page.screenshot({ path: 'test-results/theme-toggle-mobile.png', fullPage: true });
  }
});

test('context menu follows the main theme and can change it for both windows', async ({ page }) => {
  const mini = await miniWindow(page);
  await chooseTheme(page, '浅色');
  await mini.emulateMedia({ colorScheme: 'dark' });
  await mini.locator('.desktop-tasks-heading h1').click({ button: 'right' });
  const menu = mini.getByRole('menu', { name: '小窗操作' });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await mini.screenshot({ path: 'test-results/desktop-context-light.png' });
  await menu.getByRole('menuitemradio', { name: '深色', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(mini.locator('html')).toHaveAttribute('data-theme', 'dark');
  await mini.emulateMedia({ colorScheme: 'light' });
  await mini.locator('.desktop-tasks-heading h1').click({ button: 'right' });
  await expect(menu).toHaveCSS('background-color', 'rgb(35, 42, 60)');
  await expect(menu.getByRole('menuitemradio', { name: '深色', exact: true })).toHaveAttribute('aria-checked', 'true');
  await mini.screenshot({ path: 'test-results/desktop-context-dark.png' });
  await menu.getByRole('menuitemradio', { name: '浅色', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('alethinosplan.theme.v1'))).toBe('light');
});

test('context task actions, view switching and add focus work without losing synchronization', async ({ page }) => {
  const mini = await miniWindow(page);
  const menu = mini.getByRole('menu', { name: '小窗操作' });
  await mini.locator('.desktop-tasks-list li').first().click({ button: 'right' });
  await menu.getByRole('menuitem', { name: '标记完成', exact: true }).click();
  await expect(page.locator('.completed-row')).toHaveCount(1);
  await mini.locator('.desktop-tasks-heading h1').click({ button: 'right' });
  await menu.getByRole('menuitem', { name: '查看已完成' }).click();
  await expect(mini.getByRole('tab', { name: /^已完成/ })).toHaveAttribute('aria-selected', 'true');
  await mini.locator('.desktop-tasks-list li').first().click({ button: 'right' });
  await menu.getByRole('menuitem', { name: '恢复到待完成' }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await mini.locator('.desktop-tasks-heading h1').click({ button: 'right' });
  await menu.getByRole('menuitem', { name: '添加今日任务', exact: true }).click();
  await expect(mini.getByRole('textbox', { name: '添加今日任务' })).toBeFocused();
  await expect(mini.getByRole('tab', { name: /^待完成/ })).toHaveAttribute('aria-selected', 'true');
});

test('context menu supports keyboard dismissal and stays within a small window', async ({ page }) => {
  const mini = await miniWindow(page);
  const tab = mini.getByRole('tab', { name: /^待完成/ });
  await tab.focus();
  await mini.keyboard.press('Shift+F10');
  const menu = mini.getByRole('menu', { name: '小窗操作' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await mini.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem').nth(1)).toBeFocused();
  await mini.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(tab).toBeFocused();
  await mini.setViewportSize({ width: 320, height: 480 });
  await mini.locator('.desktop-tasks').click({ button: 'right', position: { x: 310, y: 470 } });
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(box.y + box.height).toBeLessThanOrEqual(480);
  await mini.screenshot({ path: 'test-results/desktop-context-narrow.png' });
  await mini.locator('.desktop-tasks-heading h1').click();
  await expect(menu).toHaveCount(0);
});

test('editable fields, selected text and Shift-right-click preserve the native menu', async ({ page }) => {
  const mini = await miniWindow(page);
  await mini.evaluate(() => document.addEventListener('contextmenu', event => Reflect.set(window, 'testContextPrevented', event.defaultPrevented)));
  const field = mini.getByRole('textbox', { name: '添加今日任务' });
  await field.dispatchEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
  expect(await mini.evaluate(() => Reflect.get(window, 'testContextPrevented'))).toBe(false);
  await expect(mini.getByRole('menu', { name: '小窗操作' })).toHaveCount(0);
  await mini.locator('.desktop-tasks-heading h1').click({ button: 'right', modifiers: ['Shift'] });
  expect(await mini.evaluate(() => Reflect.get(window, 'testContextPrevented'))).toBe(false);
  const title = mini.locator('.desktop-tasks-list li > div > span').first();
  await title.evaluate(element => {
    const range = element.ownerDocument.createRange(); range.selectNodeContents(element);
    const selection = element.ownerDocument.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
  });
  await title.dispatchEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
  expect(await mini.evaluate(() => Reflect.get(window, 'testContextPrevented'))).toBe(false);
  await expect(mini.getByRole('menu', { name: '小窗操作' })).toHaveCount(0);
});
