import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const localeKey = 'alethinosplan.locale.v1';
const demoKey = 'alethinosplan.demo.v1';
async function englishDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await page.goto('/?demo=1');
  await expect(page.getByRole('heading', { name: 'My Day', exact: true })).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('language switches without losing auth input, persists, and stays keyboard accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.getByLabel('邮箱', { exact: true }).fill('reader@example.com');
  await page.getByPlaceholder('输入密码').fill('not-a-real-password');
  const english = page.getByRole('button', { name: 'Switch to English', exact: true });
  await english.focus();
  await page.keyboard.press('Enter');
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await expect(english).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('reader@example.com');
  await expect(page.getByPlaceholder('Enter your password')).toHaveValue('not-a-real-password');
  await expect(page.getByRole('status')).toContainText('Email authentication is not configured yet.');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Capture ideas/);
  await page.getByRole('group', { name: 'Account actions' }).getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.reload();
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.screenshot({ path: 'test-results/i18n-auth-desktop.png', fullPage: true });
});

test('English supports task creation, focus, completion, undo, calendar, and notes', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-20T04:00:00Z') });
  await englishDemo(page);
  await expect(page.getByTestId('sticky-task').first()).toContainText('Write the introduction to my portfolio');
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByLabel('What would you like to do?').fill('写一页 / Write one page');
  await page.getByLabel('Estimate (minutes)').fill('1');
  await page.screenshot({ path: 'test-results/i18n-editor.png', fullPage: true });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const task = page.getByTestId('sticky-task').filter({ hasText: '写一页 / Write one page' });
  await expect(task).toContainText('1 min');
  await task.getByRole('button', { name: 'Start', exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.getByRole('timer')).toContainText('02');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.focus-state')).toHaveText('Paused');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.clock.runFor(100);
  await expect(page.locator('.completed-row')).toContainText('写一页 / Write one page');
  await page.getByRole('button', { name: '切换到中文', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('已完成');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(task).toBeVisible();
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('Undone');
  await page.getByRole('navigation').getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.locator('.calendar-period h2')).toHaveText('October 2026');
  await expect(page.locator('.weekdays')).toHaveText('MonTueWedThuFriSatSun');
  await page.screenshot({ path: 'test-results/i18n-calendar.png', fullPage: true });
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(page.locator('.week-grid')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: /^Notes/ }).click();
  await page.getByRole('button', { name: 'Add a note', exact: true }).click();
  await page.getByLabel("What's on your mind?").fill('One idea to come back to');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.locator('.capture-note').filter({ hasText: 'One idea to come back to' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: /^My Day/ }).click();
  await page.screenshot({ path: 'test-results/i18n-today-desktop.png', fullPage: true });
});

test('language changes preserve stored content and drafts across tabs', async ({ page, context }) => {
  await page.goto('/?demo=1');
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  const saved = await page.evaluate(key => localStorage.getItem(key), demoKey);
  const other = await context.newPage();
  await other.goto('/?demo=1');
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByLabel('准备做什么？').fill('未提交的输入 / Unsaved draft');
  await page.getByLabel('预计分钟').fill('25');
  await other.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('New task');
  await expect(page.getByLabel('What would you like to do?')).toHaveValue('未提交的输入 / Unsaved draft');
  await expect(page.getByLabel('Estimate (minutes)')).toHaveValue('25');
  expect(await page.evaluate(key => localStorage.getItem(key), demoKey)).toBe(saved);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('sticky-task').first()).toContainText('写好作品集的开场');
  await page.getByRole('navigation').getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  const month = await page.locator('.calendar-period h2').textContent();
  await other.getByRole('button', { name: '切换到中文', exact: true }).click();
  await expect(page.getByRole('heading', { name: '规划日历', exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await expect(page.locator('.calendar-period h2')).toHaveText(month!);
});

test('blocked preference storage still allows switching with an accessible notice', async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'alethinosplan.locale.v1') throw new DOMException('Blocked', 'SecurityError');
      return set.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('.language-save-note')).toContainText("your preference couldn't be saved");
  await page.getByRole('button', { name: '切换到中文', exact: true }).click();
  await expect(page.locator('.language-save-note')).toHaveText('语言偏好未保存，本次切换仍然有效。');
});

test('invalid saved preferences safely fall back to English without a region endpoint', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, 'invalid'), localeKey);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Switch to English', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('mini window follows language changes without restarting the timer', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
      requestWindow: () => Promise.resolve(window.open('about:blank', '_blank', 'popup,width=380,height=560')),
    } });
  });
  await englishDemo(page);
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Mini window', exact: true }).click();
  const mini = await opened;
  await mini.setViewportSize({ width: 380, height: 560 });
  await expect(mini.locator('html')).toHaveAttribute('lang', 'en');
  await expect(mini).toHaveTitle("Today's plans · alēthinósplan");
  await mini.screenshot({ path: 'test-results/i18n-mini-tasks.png' });
  await mini.locator('.desktop-task-start').first().click();
  await expect(mini.getByRole('timer')).toBeVisible();
  await mini.getByRole('button', { name: 'Pause', exact: true }).click();
  const elapsed = await mini.getByRole('timer').textContent();
  await page.getByRole('button', { name: '切换到中文', exact: true }).click();
  await expect(mini.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(mini).toHaveTitle('今日计划 · alēthinósplan');
  await expect(mini.getByRole('button', { name: '继续', exact: true })).toBeVisible();
  await expect(mini.getByRole('timer')).toHaveText(elapsed!);
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await mini.locator('.desktop-tasks-heading h1').click({ button: 'right' });
  await expect(mini.getByRole('menu', { name: 'Mini window actions' })).toBeVisible();
  await expect(mini.getByRole('menuitem', { name: 'View completed tasks' })).toBeVisible();
  await mini.keyboard.press('Escape');
  await noOverflow(mini);
  await mini.screenshot({ path: 'test-results/i18n-mini-window.png' });
  await mini.setViewportSize({ width: 260, height: 560 });
  await noOverflow(mini);
});

for (const width of [320, 390, 768, 1440]) {
  test(`English layout fits at ${width}px in light and dark themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await englishDemo(page);
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await noOverflow(page);
      await page.getByRole('button', { name: 'New task', exact: true }).click();
      await expect(page.getByLabel('What would you like to do?')).toBeVisible();
      await noOverflow(page);
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('navigation').getByRole('button', { name: 'Calendar', exact: true }).click();
      await noOverflow(page);
      await page.getByRole('button', { name: 'Week', exact: true }).click();
      await noOverflow(page);
      await page.getByRole('navigation').getByRole('button', { name: /^Notes/ }).click();
      await noOverflow(page);
      await page.getByRole('navigation').getByRole('button', { name: /^My Day/ }).click();
      await page.screenshot({ path: `test-results/i18n-today-${width}-${theme}.png`, fullPage: true });
    }
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: `test-results/i18n-auth-${width}.png`, fullPage: true });
  });
}

test('auth errors and reset confirmations switch while already visible', async ({ page }) => {
  await page.route('https://alethinos-test.supabase.co/**', async route => {
    const request = route.request();
    const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5176', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (new URL(request.url()).pathname.endsWith('/token')) return route.fulfill({ status: 400, headers, json: { msg: 'Invalid login credentials' } });
    return route.fulfill({ headers, json: {} });
  });
  await page.goto('http://127.0.0.1:5176/');
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByPlaceholder('输入密码').fill('invalid-test-password');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('alert')).toContainText('邮箱或密码不正确');
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Incorrect email address or password.');
  await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await page.getByRole('button', { name: 'Send reset email', exact: true }).click();
  await expect(page.locator('.form-success')).toContainText("you'll receive a password reset email");
  await page.getByRole('button', { name: '切换到中文', exact: true }).click();
  await expect(page.locator('.form-success')).toContainText('如果该邮箱已注册');
});


test.describe('language control on touch screens', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 740 } });
  test('fits the header and provides touch-sized targets', async ({ page }) => {
    await page.goto('/?demo=1');
    const english = page.getByRole('button', { name: 'Switch to English', exact: true });
    await english.tap();
    await expect(page.getByRole('heading', { name: 'My Day', exact: true })).toBeVisible();
    const box = (await english.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    const account = (await page.getByLabel('Account menu').boundingBox())!;
    expect(box.x + box.width).toBeLessThan(account.x);
    expect(account.x + account.width).toBeLessThanOrEqual(320);
    await noOverflow(page);
    await page.getByLabel('Account menu').tap();
    await expect(page.getByRole('button', { name: 'Exit demo / Sign in', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Exit demo / Sign in', exact: true }).tap();
    await expect(english).toBeVisible();
    await noOverflow(page);
  });
});
