import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockAuth } from './helpers/auth';

test.use({ baseURL: 'http://127.0.0.1:5176' });

async function submitLogin(page: Page) {
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
  await page.locator('.auth-submit').click();
}

test('production loads only the account branch initially and stays within JS budgets', async ({ page }) => {
  await mockAuth(page);
  const requests: string[] = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  expect(requests.some(path => path.includes('/AuthPage-'))).toBe(true);
  expect(requests.some(path => path.includes('/Workspace-') || path.includes('/CalendarPage-'))).toBe(false);
  const initial = await page.evaluate(() => ({
    scripts: performance.getEntriesByType('resource')
      .map(entry => entry as PerformanceResourceTiming)
      .filter(entry => new URL(entry.name).pathname.startsWith('/assets/') && new URL(entry.name).pathname.endsWith('.js'))
      .map(entry => ({ file: new URL(entry.name).pathname, bytes: entry.decodedBodySize })),
    observedReadyMs: performance.now(),
  }));
  const initialBytes = initial.scripts.reduce((sum, script) => sum + script.bytes, 0);
  expect(initialBytes).toBeGreaterThan(0);
  expect(initialBytes).toBeLessThan(490_000);
  for (const script of initial.scripts) {
    expect(script.bytes).toBeGreaterThan(0);
    expect(script.bytes).toBeLessThan(500_000);
  }
  await test.info().attach('initial-js-budget', { body: JSON.stringify({ ...initial, initialBytes }, null, 2), contentType: 'application/json' });
  await submitLogin(page);
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  expect(requests.some(path => path.includes('/Workspace-'))).toBe(true);
  expect(requests.some(path => path.includes('/CalendarPage-'))).toBe(false);
  await page.locator('.nav-item').nth(1).click();
  await expect(page.locator('.calendar-toolbar')).toBeVisible();
  expect(requests.filter(path => path.includes('/CalendarPage-'))).toHaveLength(1);
  await page.locator('.nav-item').first().click();
  await page.locator('.nav-item').nth(1).click();
  await expect(page.locator('.calendar-toolbar')).toBeVisible();
  expect(requests.filter(path => path.includes('/CalendarPage-'))).toHaveLength(1);
});

test('slow workspace and calendar chunks show loading feedback without losing navigation', async ({ page }) => {
  await mockAuth(page);
  let releaseWorkspace!: () => void;
  let releaseCalendar!: () => void;
  const workspace = new Promise<void>(resolve => { releaseWorkspace = resolve; });
  const calendar = new Promise<void>(resolve => { releaseCalendar = resolve; });
  await page.route('**/assets/Workspace-*.js', async route => { await workspace; await route.continue(); });
  await page.route('**/assets/CalendarPage-*.js', async route => { await calendar; await route.continue(); });
  try {
    await page.goto('/');
    await submitLogin(page);
    await expect(page.locator('.boot-state[role="status"]')).toBeVisible();
    releaseWorkspace();
    await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
    await page.locator('.nav-item').nth(1).click();
    await expect(page.locator('.app-workspace [role="status"]')).toContainText('正在打开计划');
    await expect(page.getByRole('navigation', { name: '主要导航' })).toBeVisible();
    releaseCalendar();
    await expect(page.locator('.calendar-toolbar')).toBeVisible();
  } finally { releaseWorkspace(); releaseCalendar(); }
});

test('a missing account chunk offers a user-controlled refresh and recovers', async ({ page }) => {
  await mockAuth(page);
  await page.route('**/assets/AuthPage-*.js', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('页面加载失败，请刷新后重试。');
  await page.unroute('**/assets/AuthPage-*.js');
  await page.getByRole('button', { name: '刷新页面' }).click();
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
});

test('a missing calendar chunk leaves other pages usable and recovers after refresh', async ({ page }) => {
  await mockAuth(page);
  await page.goto('/');
  await submitLogin(page);
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  await page.route('**/assets/CalendarPage-*.js', route => route.abort());
  await page.locator('.nav-item').nth(1).click();
  await expect(page.locator('.app-workspace [role="alert"]')).toContainText('页面加载失败，请刷新后重试。');
  await page.locator('.nav-item').nth(2).click();
  await expect(page.getByRole('heading', { name: '随手记', exact: true })).toBeVisible();
  await page.locator('.nav-item').nth(1).click();
  await page.unroute('**/assets/CalendarPage-*.js');
  await page.getByRole('button', { name: '刷新页面' }).click();
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  await page.locator('.nav-item').nth(1).click();
  await expect(page.locator('.calendar-toolbar')).toBeVisible();
});
