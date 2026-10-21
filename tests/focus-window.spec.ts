import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const firstTitle = '写好作品集的开场';
const secondTitle = '读一章书，记下一个想法';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T04:00:00Z') });
});
async function openWorkspace(page: Page) {
  // Let lazy modules commit before freezing the scheduler used by Suspense.
  await page.clock.resume();
  await page.goto('/?demo=1');
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
}
async function mockWindow(page: Page) {
  await page.addInitScript(() => Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
    requestWindow: () => Promise.resolve(window.open('about:blank', '_blank', 'popup,width=380,height=560')),
  } }));
}
async function openMini(page: Page, dock = false) {
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: dock ? '在小窗中继续计时' : '置顶小窗', exact: true }).click();
  const mini = await opened;
  await mini.setViewportSize({ width: 380, height: 560 });
  await expect(mini.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  return mini;
}
async function expectTime(page: Page, label: string) {
  await expect(page.locator('.focus-clock')).toHaveAttribute('aria-label', label);
}

test('mini can start, pause, resume and complete the same timer shown on the main page', async ({ page }) => {
  await mockWindow(page); await openWorkspace(page);
  const mini = await openMini(page);
  await mini.getByRole('button', { name: '开始计时：' + firstTitle, exact: true }).click();
  await expect(mini.getByRole('region', { name: '小窗专注计时' })).toBeVisible();
  await expect(page.locator('.focus-dialog')).toHaveCount(0);
  await page.clock.runFor(2500);
  await expectTime(mini, '已专注 0 分 2 秒');
  await expectTime(page, '已专注 0 分 2 秒');
  await mini.getByRole('button', { name: '暂停', exact: true }).click();
  await page.clock.runFor(5000);
  await expectTime(mini, '已专注 0 分 2 秒');
  await page.getByRole('button', { name: '继续计时', exact: true }).click();
  await page.clock.runFor(1500);
  await expectTime(mini, '已专注 0 分 4 秒');
  await expectTime(page, '已专注 0 分 4 秒');
  await mini.screenshot({ path: 'test-results/desktop-focus-running.png' });
  await mini.getByRole('button', { name: '完成任务', exact: true }).click();
  await expect(page.locator('.completed-row')).toContainText(firstTitle);
  await expect(mini.locator('.desktop-focus-card')).toHaveCount(0);
  await expect(page.locator('.active-focus-bar')).toHaveCount(0);
  await mini.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await expect(mini.locator('.desktop-focus-card')).toHaveCount(0);
});

test('docking from main and closing or reopening mini does not reset elapsed time', async ({ page }) => {
  await mockWindow(page); await openWorkspace(page);
  await page.getByTestId('sticky-task').first().getByRole('button', { name: '开始', exact: true }).click();
  await page.clock.runFor(5000);
  await expectTime(page, '已专注 0 分 5 秒');
  const mini = await openMini(page, true);
  await expect(page.locator('.focus-dialog')).toHaveCount(0);
  await expectTime(mini, '已专注 0 分 5 秒');
  await page.getByRole('button', { name: '暂停计时', exact: true }).click();
  await mini.close();
  await page.clock.runFor(5000);
  await expectTime(page, '已专注 0 分 5 秒');
  await page.getByRole('button', { name: '继续计时', exact: true }).click();
  await page.clock.runFor(2000);
  const reopened = await openMini(page);
  await expectTime(reopened, '已专注 0 分 7 秒');
  await reopened.getByRole('button', { name: '回到主页面', exact: true }).click();
  await expect.poll(() => reopened.isClosed()).toBe(true);
  await page.getByRole('button', { name: '展开专注', exact: true }).click();
  await expectTime(page, '已专注 0 分 7 秒');
  await page.getByRole('button', { name: '离开专注' }).click();
  await expect(page.locator('.focus-clock')).toHaveCount(0);
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
});

test('only one task can be timed and task context menu controls the existing session', async ({ page }) => {
  await mockWindow(page); await openWorkspace(page);
  const mini = await openMini(page);
  await mini.locator('.desktop-tasks-list li').first().click({ button: 'right' });
  await mini.getByRole('menuitem', { name: '开始计时', exact: true }).click();
  await expect(mini.getByRole('button', { name: '开始计时：' + secondTitle, exact: true })).toBeDisabled();
  await page.getByTestId('sticky-task').nth(1).getByRole('button', { name: '开始', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('请先结束当前计时');
  await expect(mini.locator('.desktop-focus-card h2')).toHaveText(firstTitle);
  await page.clock.runFor(3000);
  await mini.locator('.desktop-tasks-list li').first().click({ button: 'right' });
  await mini.getByRole('menuitem', { name: '暂停计时', exact: true }).click();
  await page.clock.runFor(4000);
  await expectTime(mini, '已专注 0 分 3 秒');
  await mini.getByRole('button', { name: '结束计时', exact: true }).click();
  await expect(mini.locator('.desktop-focus-card')).toHaveCount(0);
  await mini.getByRole('button', { name: '开始计时：' + secondTitle, exact: true }).click();
  await expectTime(mini, '已专注 0 分 0 秒');
  await expect(mini.locator('.desktop-focus-card h2')).toHaveText(secondTitle);
  await expect(page.locator('.completed-row')).toHaveCount(0);
});

test('failed completion keeps elapsed time paused and allows a safe retry', async ({ page }) => {
  await mockWindow(page); await openWorkspace(page);
  const mini = await openMini(page);
  await mini.getByRole('button', { name: '开始计时：' + firstTitle, exact: true }).click();
  await page.clock.runFor(3500);
  await page.evaluate(() => {
    Reflect.set(window, 'savedStorageSetter', Storage.prototype.setItem);
    Storage.prototype.setItem = () => { throw new Error('Write failed'); };
  });
  await mini.getByRole('button', { name: '完成任务', exact: true }).click();
  await expect(mini.getByRole('alert')).toBeVisible();
  await expect(mini.locator('.desktop-focus-caption')).toContainText('已暂停');
  await page.clock.runFor(5000);
  await expectTime(mini, '已专注 0 分 3 秒');
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await page.evaluate(() => { Storage.prototype.setItem = Reflect.get(window, 'savedStorageSetter'); });
  await mini.getByRole('button', { name: '完成任务', exact: true }).click();
  await expect(mini.locator('.desktop-focus-card')).toHaveCount(0);
  await expect(page.locator('.completed-row')).toHaveCount(1);
});

test('completing or deleting the active task from main also clears mini focus', async ({ page }) => {
  await mockWindow(page); await openWorkspace(page);
  const mini = await openMini(page);
  await mini.getByRole('button', { name: '开始计时：' + firstTitle, exact: true }).click();
  await page.getByRole('button', { name: '完成：' + firstTitle, exact: true }).click();
  await expect(mini.locator('.desktop-focus-card')).toHaveCount(0);
  await mini.getByRole('button', { name: '开始计时：' + secondTitle, exact: true }).click();
  await page.getByRole('button', { name: secondTitle, exact: true }).click();
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确定删除', exact: true }).click();
  await expect(mini.locator('.desktop-focus-card')).toHaveCount(0);
  await expect(page.locator('.active-focus-bar')).toHaveCount(0);
});

test('logout closes the timed mini and a new workspace has no old timer', async ({ page }) => {
  await mockWindow(page); await openWorkspace(page);
  const mini = await openMini(page);
  await mini.getByRole('button', { name: '开始计时：' + firstTitle, exact: true }).click();
  await page.clock.runFor(2000);
  await page.getByLabel('账号菜单').click();
  await page.getByRole('button', { name: '退出演示 / 登录' }).click();
  await expect.poll(() => mini.isClosed()).toBe(true);
  await openWorkspace(page);
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await expect(page.locator('.active-focus-bar')).toHaveCount(0);
});

test('native PiP timer catches up after a large clock jump and fits narrow windows', async ({ page, context }) => {
  await openWorkspace(page);
  test.skip(!await page.evaluate(() => 'documentPictureInPicture' in window), 'Native Document PiP unavailable.');
  await page.getByRole('button', { name: '完成：' + secondTitle, exact: true }).click();
  await expect(page.locator('.completed-row')).toHaveCount(1);
  const opened = context.waitForEvent('page');
  await page.getByRole('button', { name: '置顶小窗', exact: true }).click();
  const mini = await opened;
  await mini.setViewportSize({ width: 320, height: 480 });
  await mini.getByRole('button', { name: '开始计时：' + firstTitle, exact: true }).click();
  await page.clock.fastForward(62500);
  await expectTime(mini, '已专注 1 分 2 秒');
  await mini.getByRole('button', { name: '暂停', exact: true }).click();
  await page.clock.runFor(5000);
  await expectTime(mini, '已专注 1 分 2 秒');
  expect(await mini.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const card = (await mini.locator('.desktop-focus-card').boundingBox())!;
  const panel = (await mini.getByRole('tabpanel').boundingBox())!;
  expect(card.y + card.height).toBeLessThanOrEqual(panel.y + panel.height + 1);
  await mini.screenshot({ path: 'test-results/desktop-focus-native.png' });
  await mini.getByRole('button', { name: '结束计时', exact: true }).click();
  await expect(mini.locator('.desktop-focus-card')).toHaveCount(0);
});


test('a rejected dock request keeps the main timer and dialog usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
    requestWindow: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
  } }));
  await openWorkspace(page);
  await page.getByTestId('sticky-task').first().getByRole('button', { name: '开始', exact: true }).click();
  await page.clock.runFor(3000);
  await page.getByRole('button', { name: '在小窗中继续计时' }).click();
  await expect(page.locator('.focus-dialog[open]')).toBeVisible();
  await expect(page.locator('.focus-dialog').getByRole('alert')).toContainText('未能打开置顶小窗');
  await page.clock.runFor(2000);
  await expectTime(page, '已专注 0 分 5 秒');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.clock.runFor(2000);
  await expectTime(page, '已专注 0 分 5 秒');
});
