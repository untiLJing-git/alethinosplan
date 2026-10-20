import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-15T04:00:00Z') });
});

test('public auth has no demo entry and development demo is explicit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.locator('.auth-submit')).toBeDisabled();
  await expect(page.getByText('邮箱服务尚未配置。', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /先体验/ })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/auth-desktop.png', fullPage: true });
  await page.goto('/?demo=1');
  await expect(page.getByRole('heading', { name: '我的一天', exact: true })).toBeVisible();
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
});

test('account menu closes outside without swallowing navigation or internal actions', async ({ page }) => {
  await page.goto('/?demo=1');
  const trigger = page.getByLabel('账号菜单');
  const popover = page.locator('.account-popover');
  await trigger.click();
  await expect(popover).toBeVisible();
  await page.locator('.account-email').click();
  await expect(popover).toBeVisible();
  await page.getByRole('heading', { name: '我的一天', exact: true }).click();
  await expect(popover).toBeHidden();
  await trigger.click();
  await page.getByRole('button', { name: '规划日历', exact: true }).click();
  await expect(popover).toBeHidden();
  await expect(page.getByRole('heading', { name: '规划日历', exact: true })).toBeVisible();
  await trigger.click();
  await expect(popover).toBeVisible();
  await trigger.click();
  await expect(popover).toBeHidden();
  await trigger.click();
  await page.getByRole('button', { name: '退出演示 / 登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
});

test('account menu supports Escape and closes when keyboard focus leaves', async ({ page }) => {
  await page.goto('/?demo=1');
  const trigger = page.getByLabel('账号菜单');
  const popover = page.locator('.account-popover');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(popover).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '退出演示 / 登录', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(popover).toBeHidden();
  await expect(page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: /我的一天/ })).toBeFocused();
});

test.describe('account menu on touch screens', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('tapping outside dismisses the account popover', async ({ page }) => {
    await page.goto('/?demo=1');
    await page.getByLabel('账号菜单').tap();
    await expect(page.locator('.account-popover')).toBeVisible();
    await page.locator('.account-email').tap();
    await expect(page.locator('.account-popover')).toBeVisible();
    await page.getByRole('heading', { name: '我的一天', exact: true }).tap();
    await expect(page.locator('.account-popover')).toBeHidden();
  });
});

test('sticky task tears, persists, and can be undone', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=1');
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await page.screenshot({ path: 'test-results/today-desktop.png', fullPage: true });
  await page.evaluate(() => {
    document.addEventListener('animationend', event => {
      if (event.animationName === 'tear-away') Reflect.set(window, 'tearEnd', { elapsed: event.elapsedTime, connected: (event.target as Element).isConnected });
    }, { capture: true });
  });
  const first = page.getByTestId('sticky-task').first();
  await first.getByRole('button', { name: /^完成：/ }).click();
  await expect(page.locator('.is-tearing')).toHaveCount(1);
  await expect(page.locator('.is-tearing .paper-sheet')).toHaveCSS('animation-name', 'tear-away');
  await expect(page.locator('.is-tearing .paper-sheet')).toHaveCSS('animation-duration', '0.8s');
  await expect(page.getByTestId('sticky-task')).toHaveCount(2);
  const end = await page.evaluate(() => Reflect.get(window, 'tearEnd') as { elapsed: number; connected: boolean });
  expect(end.elapsed).toBeCloseTo(0.8, 3);
  expect(end.connected).toBe(true);
  await expect(page.locator('.completed-row')).toHaveCount(1);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await page.reload();
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
});

test('quick capture has one navigation entry and no repeated page actions', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.getByRole('button', { name: /随手记/ })).toHaveCount(1);
  await page.getByRole('button', { name: '规划日历', exact: true }).click();
  await expect(page.getByRole('button', { name: /随手记/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: '记一件事', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /随手记/ }).click();
  await page.getByRole('button', { name: '记一件事', exact: true }).click();
  await page.getByLabel('记下什么？').fill('一个临时想法 <script>safe</script>');
  await page.getByRole('button', { name: '记下', exact: true }).click();
  const note = page.locator('.capture-note').filter({ hasText: '一个临时想法 <script>safe</script>' });
  await expect(note).toBeVisible();
  await expect(page.locator('.capture-note')).toHaveCount(3);
  await note.getByRole('button', { name: '安排日期' }).click();
  await page.getByLabel('计划日期').fill('2026-10-16');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('.capture-note')).toHaveCount(2);
  await page.getByRole('button', { name: '规划日历', exact: true }).click();
  await page.getByRole('button', { name: /^2026-10-16，/ }).click();
  await expect(page.locator('.day-detail')).toContainText('一个临时想法 <script>safe</script>');
});

test('calendar month/week, create, reschedule, undo and deletion', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.getByRole('button', { name: '规划日历', exact: true }).click();
  await expect(page.locator('.month-grid .calendar-day')).toHaveCount(35);
  await page.getByRole('button', { name: '周', exact: true }).click();
  await expect(page.locator('.week-grid .calendar-day')).toHaveCount(7);
  await page.getByRole('button', { name: '月', exact: true }).click();
  await page.locator('.calendar-event').filter({ hasText: '写好作品集的开场' }).dragTo(page.locator('[data-calendar-date="2026-10-16"]'));
  await expect(page.locator('[data-calendar-date="2026-10-16"]')).toContainText('写好作品集的开场');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.locator('[data-calendar-date="2026-10-15"]')).toContainText('写好作品集的开场');
  await page.getByRole('button', { name: /^2026-10-20，/ }).click();
  await page.locator('.page-heading').getByRole('button', { name: '添加计划' }).click();
  await expect(page.getByLabel('计划日期')).toHaveValue('2026-10-20');
  await page.getByLabel('准备做什么？').fill('检查作品集');
  await page.getByLabel('预计分钟').fill('45');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('.day-detail')).toContainText('检查作品集');
  await page.locator('.day-detail-task').filter({ hasText: '检查作品集' }).click();
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确定删除', exact: true }).click();
  await expect(page.locator('.day-detail')).not.toContainText('检查作品集');
  await page.screenshot({ path: 'test-results/calendar-desktop.png', fullPage: true });
});

test('focus can pause, resume and finish', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.getByTestId('sticky-task').first().getByRole('button', { name: '开始', exact: true }).click();
  await page.clock.runFor(2500);
  await expect(page.locator('.focus-clock')).toHaveAttribute('aria-label', '已专注 0 分 2 秒');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.clock.runFor(1500);
  await expect(page.locator('.focus-clock')).toHaveAttribute('aria-label', '已专注 0 分 2 秒');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('.completed-row')).toHaveCount(1);
});

test('focus closes before the sticky tear begins', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=1');
  await page.getByTestId('sticky-task').first().getByRole('button', { name: '开始', exact: true }).click();
  await expect(page.locator('.focus-dialog[open]')).toBeVisible();
  await page.evaluate(() => {
    const state = { boardPaintedBeforeTear: false, dialogAtTearStart: null as boolean | null };
    Reflect.set(window, 'focusTransition', state);
    const sample = () => {
      if (!document.querySelector('.focus-dialog[open]') && !document.querySelector('.is-tearing')) state.boardPaintedBeforeTear = true;
      if (state.dialogAtTearStart === null) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    document.addEventListener('animationstart', event => {
      if (event.animationName === 'tear-away') state.dialogAtTearStart = Boolean(document.querySelector('.focus-dialog[open]'));
    });
  });
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await expect(page.locator('.focus-dialog[open]')).toHaveCount(0);
  await page.waitForFunction(() => Reflect.get(window, 'focusTransition').dialogAtTearStart !== null);
  const transition = await page.evaluate(() => Reflect.get(window, 'focusTransition') as { boardPaintedBeforeTear: boolean; dialogAtTearStart: boolean });
  expect(transition.boardPaintedBeforeTear).toBe(true);
  expect(transition.dialogAtTearStart).toBe(false);
  await expect(page.getByTestId('sticky-task')).toHaveCount(2);
  await expect(page.locator('.completed-row')).toHaveCount(1);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
});

test('failed completion keeps the sticky task after closing focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=1');
  await page.getByTestId('sticky-task').first().getByRole('button', { name: '开始', exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'alethinosplan.demo.v1') throw new DOMException('localStorage unavailable', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await expect(page.locator('.focus-dialog[open]')).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('未保存');
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await expect(page.locator('.is-tearing')).toHaveCount(0);
  await expect(page.locator('.completed-row')).toHaveCount(0);
});

test('mobile layouts remain within 320 and 390 pixels', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?demo=1');
    await expect(page.getByTestId('sticky-task')).toHaveCount(3);
    for (const name of ['我的一天', '规划日历', '随手记']) {
      await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: new RegExp(name) }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole('button', { name: /我的一天/ }).click();
    if (width === 390) await page.screenshot({ path: 'test-results/today-mobile.png', fullPage: true });
    await page.getByRole('button', { name: '新建任务', exact: true }).click();
    const modal = page.locator('dialog[open]');
    await expect(modal).toBeVisible();
    expect(await modal.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    if (width === 390) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
      await expect(page.locator('.is-tearing')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByTestId('sticky-task')).toHaveCount(2);
    }
  }
});

test('dark appearance and reduced-motion support', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/?demo=1');
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await expect(page.locator('.paper-sheet').first()).toHaveCSS('animation-name', 'none');
  await page.screenshot({ path: 'test-results/today-dark.png', fullPage: true });
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(2, { timeout: 1200 });
});

test('removal follows the animation end instead of an elapsed timer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=1');
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await page.locator('.is-tearing .paper-sheet').evaluate(element => {
    const animation = element.getAnimations()[0];
    animation.pause(); animation.currentTime = 180;
    Reflect.set(window, 'pausedTear', animation);
  });
  await page.clock.runFor(1000);
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await expect(page.locator('.completed-row')).toHaveCount(0);
  await page.locator('.sticky-board').screenshot({ path: 'test-results/tear-lift.png', animations: 'allow' });
  await page.evaluate(() => { Reflect.get(window, 'pausedTear').currentTime = 336; });
  await page.locator('.sticky-board').screenshot({ path: 'test-results/tear-peel.png', animations: 'allow' });
  await page.evaluate(() => { Reflect.get(window, 'pausedTear').currentTime = 520; });
  await page.locator('.sticky-board').screenshot({ path: 'test-results/tear-detached.png', animations: 'allow' });
  await page.evaluate(() => Reflect.get(window, 'pausedTear').finish());
  await expect(page.getByTestId('sticky-task')).toHaveCount(2);
});

test('disabled animations do not leave completion waiting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=1');
  await page.addStyleTag({ content: '.is-tearing .paper-sheet { animation: none !important; }' });
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(2, { timeout: 1200 });
});

test('changing reduced motion mid-tear releases the animation wait', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=1');
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(page.locator('.is-tearing')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByTestId('sticky-task')).toHaveCount(2, { timeout: 1200 });
});

test('leaving the task board during a tear still completes the saved task', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=1');
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(page.locator('.is-tearing')).toHaveCount(1);
  await page.getByRole('button', { name: '规划日历', exact: true }).click();
  await expect(page.locator('.calendar-event.is-done')).toHaveCount(1, { timeout: 1200 });
  await page.getByRole('button', { name: /我的一天/ }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(2);
});

test('missing animation events have a bounded fallback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?demo=1');
  await page.addStyleTag({ content: '.is-tearing .paper-sheet { animation-play-state: paused !important; }' });
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  await expect(page.locator('.is-tearing')).toHaveCount(1);
  await page.clock.runFor(3100);
  await expect(page.getByTestId('sticky-task')).toHaveCount(2);
  await expect(page.locator('.completed-row')).toHaveCount(1);
});
