import { expect, test } from '@playwright/test';
import { mockAuth } from './helpers/auth';

test.use({ baseURL: 'http://127.0.0.1:5176' });

test('email registration sends credentials and awaits verification', async ({ page }) => {
  const requests = await mockAuth(page);
  await page.goto('/');
  await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
  await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('A-long-test-password-123');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('status')).toContainText('查收验证邮件');
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('A-long-test-password-123');
  await expect(page.getByLabel('密码', { exact: true })).toHaveAttribute('type', 'password');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('A-long-test-password-123');
  expect(requests.find(item => item.path === '/auth/v1/signup')?.body?.email).toBe('test@example.com');
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toHaveCount(0);
});

test('login restores session, queries owned tasks and can log out', async ({ page }) => {
  const requests = await mockAuth(page);
  await page.goto('/');
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  await expect(page.getByText('给今天留一件重要的事。')).toBeVisible();
  expect(requests.find(item => item.path === '/auth/v1/token')?.body?.email).toBe('test@example.com');
  await page.reload();
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  await page.getByLabel('账号菜单').click();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
});

test('invalid credentials stay on login and reset email is requested', async ({ page }) => {
  const requests = await mockAuth(page, { invalidLogin: true });
  await page.goto('/');
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByLabel('密码', { exact: true }).fill('incorrect-password');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('alert')).toContainText('邮箱或密码不正确');
  await page.getByRole('button', { name: '忘记密码？' }).click();
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('status')).toContainText('如果该邮箱已注册');
  expect(requests.find(item => item.path === '/auth/v1/recover')?.body?.email).toBe('test@example.com');
});

test('a recovered session can set a new password and leave recovery mode', async ({ page }) => {
  const requests = await mockAuth(page);
  await page.goto('/');
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  await page.goto('/?auth=recovery');
  await expect(page.getByRole('heading', { name: '设置新密码' })).toBeVisible();
  await page.getByLabel('新密码', { exact: true }).fill('A-different-password-456');
  await page.getByRole('button', { name: '保存新密码' }).click();
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  expect(requests.find(item => item.path === '/auth/v1/user' && item.body?.password)?.body?.password).toBe('A-different-password-456');
  expect(new URL(page.url()).searchParams.has('auth')).toBe(false);
});

for (const signup of ['user_already_exists', 'email_exists', 'obfuscated'] as const) {
  test(`duplicate signup (${signup}) keeps input and offers login`, async ({ page }) => {
    const requests = await mockAuth(page, { signup });
    await page.goto('/');
    await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
    await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
    await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
    await page.locator('.auth-submit').click();
    await expect(page.getByRole('alert')).toContainText('该邮箱已注册');
    await expect(page.locator('.form-success')).toHaveCount(0);
    await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue('test@example.com');
    await expect(page.getByLabel('密码', { exact: true })).toHaveValue('A-long-test-password-123');
    expect(requests.filter(item => item.path === '/auth/v1/signup')).toHaveLength(1);
    await page.getByRole('button', { name: '去登录', exact: true }).click();
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue('test@example.com');
  });
}

test('an existing account can request a reset without retyping its email', async ({ page }) => {
  const requests = await mockAuth(page, { signup: 'obfuscated' });
  await page.goto('/');
  await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
  await page.locator('.auth-submit').click();
  await page.getByRole('button', { name: '找回密码', exact: true }).click();
  await expect(page.getByRole('heading', { name: '找回密码' })).toBeVisible();
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue('test@example.com');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('status')).toContainText('如果该邮箱已注册');
  expect(requests.find(item => item.path === '/auth/v1/recover')?.body?.email).toBe('test@example.com');
});

test('changing the signup email clears the previous duplicate warning', async ({ page }) => {
  await mockAuth(page, { signup: 'obfuscated' });
  await page.goto('/');
  await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('alert')).toContainText('该邮箱已注册');
  await page.getByLabel('邮箱', { exact: true }).fill('another@example.com');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('group', { name: '已有账号操作' })).toHaveCount(0);
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('A-long-test-password-123');
});

test('incomplete signup responses do not claim an email was sent or an account exists', async ({ page }) => {
  await mockAuth(page, { signup: 'missing-identities' });
  await page.goto('/');
  await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('alert')).toContainText('暂时无法确认注册结果');
  await expect(page.getByRole('alert')).not.toContainText('该邮箱已注册');
  await expect(page.locator('.form-success')).toHaveCount(0);
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('A-long-test-password-123');
});

test('signup failures preserve the form for retry', async ({ page }) => {
  await mockAuth(page, { signup: 'rate-limit' });
  await page.goto('/');
  await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
  await page.locator('.auth-submit').click();
  await expect(page.getByRole('alert')).toContainText('操作有些频繁');
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue('test@example.com');
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('A-long-test-password-123');
  await expect(page.locator('.auth-submit')).toBeEnabled();
});

test('pending signup cannot submit twice or switch form modes', async ({ page }) => {
  let release!: () => void;
  const waitForSignup = new Promise<void>(resolve => { release = resolve; });
  const requests = await mockAuth(page, { waitForSignup });
  try {
    await page.goto('/');
    await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
    await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
    await page.getByLabel('密码', { exact: true }).fill('A-long-test-password-123');
    await page.locator('.auth-submit').click();
    await expect.poll(() => requests.filter(item => item.path === '/auth/v1/signup').length).toBe(1);
    await expect(page.locator('.auth-submit')).toBeDisabled();
    await expect(page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '登录', exact: true })).toBeDisabled();
    await expect(page.getByLabel('密码', { exact: true })).toHaveValue('A-long-test-password-123');
    await page.locator('form').dispatchEvent('submit');
  } finally { release(); }
  await expect(page.getByRole('status')).toContainText('查收验证邮件');
  await expect(page.locator('.auth-submit')).toBeEnabled();
  expect(requests.filter(item => item.path === '/auth/v1/signup')).toHaveLength(1);
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('A-long-test-password-123');
});
