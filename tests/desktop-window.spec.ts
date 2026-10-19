import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function mockWindow(page: Page, mode: 'normal' | 'delayed' | 'reject' = 'normal') {
  await page.addInitScript(mode => {
    Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
      requestWindow: () => {
        if (mode === 'reject') return Promise.reject(new DOMException('Denied', 'NotAllowedError'));
        const child = window.open('about:blank', '_blank', 'popup,width=380,height=560');
        if (!child) return Promise.reject(new Error('Popup blocked'));
        if (mode === 'delayed') return new Promise(resolve => Reflect.set(window, 'resolveTestPip', () => resolve(child)));
        return Promise.resolve(child);
      },
    } });
  }, mode);
}
async function openMini(page: Page) {
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: '置顶小窗', exact: true }).click();
  const mini = await popup;
  await mini.setViewportSize({ width: 380, height: 560 });
  await expect(mini.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  return mini;
}

test('mini window shares add, complete and undo state with the main page', async ({ page, context }) => {
  await mockWindow(page);
  await page.goto('/?demo=1');
  const mini = await openMini(page);
  await expect(mini.locator('.desktop-tasks-list li')).toHaveCount(3);
  await page.getByRole('button', { name: '小窗已开启' }).click();
  expect(context.pages()).toHaveLength(2);
  await mini.getByRole('textbox', { name: '添加今日任务', exact: true }).fill('小窗中的新计划');
  await mini.getByRole('button', { name: '添加今日任务', exact: true }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(4);
  await expect(mini.locator('.desktop-tasks-list li')).toHaveCount(4);
  await mini.getByRole('button', { name: '完成：小窗中的新计划', exact: true }).click();
  await expect(page.locator('.completed-row')).toContainText('小窗中的新计划');
  await expect(mini.locator('.desktop-tasks-list li')).toHaveCount(3);
  await mini.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(4);
  await expect(mini.locator('.desktop-tasks-list li')).toHaveCount(4);
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(mini.locator('.desktop-tasks-list li')).toHaveCount(3);
  await mini.screenshot({ path: 'test-results/desktop-window.png' });
  expect(await mini.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '规划日历', exact: true }).click();
  await mini.getByRole('button', { name: '回到主页面' }).click();
  await expect.poll(() => mini.isClosed()).toBe(true);
  await expect(page.getByRole('heading', { name: '我的一天.' })).toBeVisible();
});

test('closing and reopening works and logout closes the mini window', async ({ page }) => {
  await mockWindow(page);
  await page.goto('/?demo=1');
  const mini = await openMini(page);
  await mini.close();
  await expect(page.getByRole('button', { name: '置顶小窗', exact: true })).toBeVisible();
  const reopened = await openMini(page);
  await page.getByLabel('账号菜单').click();
  await page.getByRole('button', { name: '退出演示 / 登录' }).click();
  await expect.poll(() => reopened.isClosed()).toBe(true);
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
});

test('a pending window request cannot expose tasks after logout', async ({ page }) => {
  await mockWindow(page, 'delayed');
  await page.goto('/?demo=1');
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: '置顶小窗', exact: true }).click();
  const mini = await popup;
  await page.getByLabel('账号菜单').click();
  await page.getByRole('button', { name: '退出演示 / 登录' }).click();
  await page.evaluate(() => (Reflect.get(window, 'resolveTestPip') as () => void)());
  await expect.poll(() => mini.isClosed()).toBe(true);
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
});

test('unsupported browsers and denied requests show an explanation without disrupting tasks', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: undefined }));
  await page.goto('/?demo=1');
  await page.getByRole('button', { name: '置顶小窗', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('当前浏览器不支持');
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await mockWindow(page, 'reject');
  await page.reload();
  await page.getByRole('button', { name: '置顶小窗', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('未能打开置顶小窗');
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
});

test('failed storage writes keep the task and expose the error inside the mini window', async ({ page }) => {
  await mockWindow(page);
  await page.goto('/?demo=1');
  const mini = await openMini(page);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Write failed'); }; });
  await mini.getByRole('button', { name: /^完成：/ }).first().click();
  await expect(mini.getByRole('alert')).toBeVisible();
  await expect(mini.locator('.desktop-tasks-list li')).toHaveCount(3);
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
});

test('mobile does not offer the desktop-only control', async ({ page }) => {
  await mockWindow(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?demo=1');
  await expect(page.getByRole('button', { name: '置顶小窗', exact: true })).toBeHidden();
});

test('native Document Picture-in-Picture opens and closes when the browser supports it', async ({ page, context }) => {
  await page.goto('/?demo=1');
  test.skip(!await page.evaluate(() => 'documentPictureInPicture' in window), 'Native Document PiP unavailable in this browser.');
  const opened = context.waitForEvent('page');
  await page.getByRole('button', { name: '置顶小窗', exact: true }).click();
  const mini = await opened;
  await mini.setViewportSize({ width: 380, height: 560 });
  await expect(mini.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  await mini.emulateMedia({ colorScheme: 'dark' });
  await expectSamePalette(page, mini);
  await mini.locator('.desktop-tasks-heading h1').click({ button: 'right' });
  const menu = mini.getByRole('menu', { name: '小窗操作' });
  await expect(menu).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await menu.getByRole('menuitemradio', { name: '深色', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectSamePalette(page, mini);
  await mini.locator('.desktop-tasks-heading h1').click({ button: 'right' });
  await expect(menu).toHaveCSS('background-color', 'rgb(35, 42, 60)');
  await mini.screenshot({ path: 'test-results/desktop-window-native.png' });
  await mini.keyboard.press('Escape');
  await mini.getByRole('button', { name: '关闭置顶小窗' }).click();
  await expect.poll(() => mini.isClosed()).toBe(true);
});

async function expectSamePalette(page: Page, mini: Page) {
  const rootColors = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return ['--paper', '--ink', '--surface', '--blue'].map(name => styles.getPropertyValue(name).trim());
  });
  await expect.poll(() => mini.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return ['--paper', '--ink', '--surface', '--blue'].map(name => styles.getPropertyValue(name).trim());
  })).toEqual(rootColors);
  const colors = await page.locator('.sticky-note').first().evaluate(element => {
    const styles = getComputedStyle(element);
    return ['--note-bg', '--note-ink'].map(name => styles.getPropertyValue(name).trim());
  });
  await expect.poll(() => mini.locator('.desktop-tasks-list li').first().evaluate(element => {
    const styles = getComputedStyle(element);
    return ['--note-bg', '--note-ink'].map(name => styles.getPropertyValue(name).trim());
  })).toEqual(colors);
}

test('the mini palette follows the main page even when its own color preference differs', async ({ page }) => {
  await mockWindow(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/?demo=1');
  const mini = await openMini(page);
  await mini.emulateMedia({ colorScheme: 'dark' });
  await expectSamePalette(page, mini);
  await expect(mini.locator('html')).toHaveCSS('color-scheme', 'light');
  await mini.screenshot({ path: 'test-results/desktop-window-light.png' });
  await mini.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectSamePalette(page, mini);
  await expect(mini.locator('html')).toHaveCSS('color-scheme', 'dark');
  await mini.screenshot({ path: 'test-results/desktop-window-dark.png' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expectSamePalette(page, mini);
  await page.evaluate(() => document.documentElement.style.setProperty('--paper', '#faf8f1'));
  await expectSamePalette(page, mini);
});

test('tabs switch with mouse and keyboard and completed tasks can be restored', async ({ page }) => {
  await mockWindow(page);
  await page.goto('/?demo=1');
  const mini = await openMini(page);
  const completed = mini.getByRole('tab', { name: /^已完成/ });
  const planned = mini.getByRole('tab', { name: /^待完成/ });
  await completed.click();
  await expect(completed).toHaveAttribute('aria-selected', 'true');
  await expect(mini.getByRole('tabpanel')).toContainText('完成的小事，会留在这里。');
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(completed).toContainText('1');
  await expect(mini.getByRole('tabpanel').getByRole('button', { name: /^恢复：/ })).toHaveCount(1);
  await mini.screenshot({ path: 'test-results/desktop-window-done.png' });
  await mini.getByRole('tabpanel').getByRole('button', { name: /^恢复：/ }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await expect(completed).toContainText('0');
  await completed.focus();
  await mini.keyboard.press('ArrowLeft');
  await expect(planned).toBeFocused();
  await expect(planned).toHaveAttribute('aria-selected', 'true');
  await expect(mini.locator('.desktop-tasks-list li')).toHaveCount(3);
});

test('main-page completions provide a shared undo including after reopening the mini window', async ({ page }) => {
  await mockWindow(page);
  await page.goto('/?demo=1');
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(page.locator('.completed-row')).toHaveCount(1);
  const mini = await openMini(page);
  await expect(mini.locator('.desktop-tasks-undo')).toContainText('写好作品集的开场');
  await mini.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await expect(page.locator('.toast')).toContainText('已恢复到今天');
  await expect(mini.locator('.desktop-tasks-undo')).toHaveCount(0);
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(mini.locator('.desktop-tasks-undo')).toContainText('写好作品集的开场');
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(mini.locator('.desktop-tasks-undo')).toContainText('读一章书，记下一个想法');
  await mini.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.locator('.completed-row')).toHaveCount(1);
  await expect(mini.locator('.desktop-tasks-undo')).toContainText('写好作品集的开场');
  await page.getByRole('button', { name: '恢复：写好作品集的开场', exact: true }).click();
  await expect(mini.locator('.desktop-tasks-undo')).toHaveCount(0);
  await expect(mini.getByRole('tab', { name: /^已完成/ })).toContainText('0');
});

test('failed restore preserves the completed task and shared undo', async ({ page }) => {
  await mockWindow(page);
  await page.goto('/?demo=1');
  const mini = await openMini(page);
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(mini.locator('.desktop-tasks-undo')).toBeVisible();
  await mini.getByRole('tab', { name: /^已完成/ }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Write failed'); }; });
  await mini.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(mini.getByRole('alert')).toBeVisible();
  await expect(mini.locator('.desktop-tasks-list li')).toHaveCount(1);
  await expect(mini.locator('.desktop-tasks-undo')).toBeVisible();
  await expect(mini.locator('.desktop-sync-state')).toHaveText('更新未完成');
  await expect(page.locator('.completed-row')).toHaveCount(1);
});

test('compact footer explains the window lifetime on demand without narrow-screen overflow', async ({ page }) => {
  await mockWindow(page);
  await page.goto('/?demo=1');
  const mini = await openMini(page);
  await mini.setViewportSize({ width: 320, height: 480 });
  const help = mini.getByRole('button', { name: '小窗使用说明' });
  await expect(help).toHaveAttribute('aria-expanded', 'false');
  await expect(mini.locator('.desktop-help')).toHaveCount(0);
  await expect(mini.locator('.desktop-sync-state')).toHaveText('与主页面同步');
  const position = (await help.boundingBox())!;
  expect(position.y + position.height).toBeLessThanOrEqual(480);
  await help.click();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  await expect(mini.locator('.desktop-help')).toContainText('关闭主页面或退出账号后，小窗也会关闭');
  expect(await mini.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mini.screenshot({ path: 'test-results/desktop-window-help.png' });
  await mini.keyboard.press('Escape');
  await expect(help).toHaveAttribute('aria-expanded', 'false');
  await expect(help).toBeFocused();
});
