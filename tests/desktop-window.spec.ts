import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function mockWindow(page: Page, mode: 'normal' | 'delayed' | 'reject' = 'normal') {
  await page.addInitScript(mode => {
    Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
      requestWindow: () => {
        if (mode === 'reject') return Promise.reject(new DOMException('Denied', 'NotAllowedError'));
        const child = window.open('about:blank', '_blank', 'popup,width=380,height=520');
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
  await mini.setViewportSize({ width: 380, height: 520 });
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
  await mini.screenshot({ path: 'test-results/desktop-window-native.png' });
  await mini.getByRole('button', { name: '关闭置顶小窗' }).click();
  await expect.poll(() => mini.isClosed()).toBe(true);
});
