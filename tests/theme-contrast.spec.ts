import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

import { readable } from './helpers/contrast';

async function readableAll(locator: Locator) {
  expect(await locator.count()).toBeGreaterThan(0);
  for (const element of await locator.all()) await readable(element);
}

test.use({ colorScheme: 'dark' });

test('dark workspace, all note tones, editor and focus text remain readable', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await readableAll(page.locator('.page-heading h1, .page-heading .eyebrow, .board-caption strong, .nav-item, .sidebar-label, .theme-toggle:visible, .feedback-link:visible'));
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByRole('textbox', { name: '准备做什么？' }).fill('Mint contrast test');
  await page.getByRole('button', { name: '浅绿', exact: true }).click();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(4);
  await readableAll(page.locator('.sticky-title, .sticky-kicker, .sticky-estimate, .sticky-start'));
  for (const start of await page.locator('.sticky-start').all()) {
    await start.hover();
    await readable(start);
  }
  await page.screenshot({ path: 'test-results/dark-readable-board.png', fullPage: true });
  await page.locator('.sticky-title').first().click();
  await readableAll(page.locator('.task-dialog h2, .task-dialog .field, .task-dialog input, .task-dialog textarea, .task-dialog .text-button, .task-dialog .primary'));
  await readable(page.locator('.task-dialog textarea'), { pseudo: '::placeholder' });
  await page.getByRole('button', { name: '删除', exact: true }).click();
  const remove = page.getByRole('button', { name: '确定删除', exact: true });
  await readable(remove);
  await remove.hover();
  await readable(remove);
  await page.screenshot({ path: 'test-results/dark-readable-editor.png' });
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  for (const start of await page.locator('.sticky-start').all()) {
    await start.click();
    for (const background of ['var(--paper)', 'color-mix(in srgb, var(--note-bg) 50%, var(--paper))']) {
      for (const element of await page.locator('.focus-dialog h2, .focus-dialog .focus-clock, .focus-dialog .focus-state, .focus-dialog .eyebrow').all()) await readable(element, { background });
    }
    await page.getByRole('button', { name: '离开专注' }).click();
  }
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await readableAll(page.locator('.completed-row > button, .toast, .toast button'));
});

test('dark calendar, notes and account text inherit the right foreground', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.getByRole('button', { name: '规划日历' }).click();
  await readableAll(page.locator('.page-heading h1, .calendar-period h2, .weekdays span, .day-number > span, .calendar-event, .day-detail-heading h2, .day-detail-heading > span, .day-detail-task small'));
  await page.getByRole('button', { name: '周', exact: true }).click();
  await readableAll(page.locator('.day-number small, .calendar-event'));
  await page.screenshot({ path: 'test-results/dark-readable-calendar.png', fullPage: true });
  await page.getByRole('button', { name: /随手记/ }).click();
  await readableAll(page.locator('.page-heading h1, .capture-note-title, .capture-note .text-button'));
  await page.getByLabel('账号菜单').click();
  await readableAll(page.locator('.account-email, .account-popover > button'));
});

test('dark login text and placeholders are readable on desktop and mobile', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await readableAll(page.locator('.auth-form-wrap h2, .auth-subtitle, .auth-switch button, .auth-panel .field, .auth-panel .text-button, .auth-config, .auth-footer'));
    for (const input of await page.locator('.auth-panel input').all()) await readable(input, { pseudo: '::placeholder' });
    await page.screenshot({ path: `test-results/dark-readable-auth-${width}.png`, fullPage: true });
  }
});

test('dark mini-window retains readable task, timer and context-menu text', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
    requestWindow: () => Promise.resolve(window.open('about:blank', '_blank', 'popup,width=380,height=560')),
  } }));
  await page.goto('/?demo=1');
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: '置顶小窗', exact: true }).click();
  const mini = await opened;
  await mini.setViewportSize({ width: 380, height: 560 });
  await expect(mini.locator('.desktop-tasks-list li')).toHaveCount(3);
  await readableAll(mini.locator('.desktop-tasks-heading h1, .desktop-tasks-heading p, .desktop-tasks-tabs button, .desktop-tasks-tabs button span, .desktop-tasks-list li > div > span, .desktop-task-meta small, .desktop-task-start, .desktop-tasks-label, .desktop-sync-state, .desktop-help-button'));
  await readable(mini.locator('.desktop-tasks-add input'), { pseudo: '::placeholder' });
  await mini.locator('.desktop-task-start').first().click();
  for (const background of ['var(--paper)', 'color-mix(in srgb, var(--note-bg) 40%, var(--paper))']) {
    for (const element of await mini.locator('.desktop-focus-caption span, .desktop-focus-card h2, .desktop-focus-card .focus-clock').all()) await readable(element, { background });
  }
  await readableAll(page.locator('.active-focus-title small, .active-focus-title strong, .active-focus-bar .focus-clock'));
  await mini.locator('.desktop-tasks-heading h1').click({ button: 'right' });
  await readableAll(mini.locator('.desktop-context-menu button, .desktop-menu-label, .desktop-menu-hint'));
  await mini.screenshot({ path: 'test-results/dark-readable-mini.png' });
});
