import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:5176' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-16T04:00:00Z') });
  await page.route('https://alethinos-test.supabase.co/**', route => route.abort());
});

async function expectFront(preview: Locator, panel: string) {
  await expect(preview).toHaveAttribute('data-active-panel', panel);
  await expect(preview.locator('.preview-panel[data-position="front"]')).toHaveCount(1);
  await expect(preview.locator(`.preview-panel[data-panel="${panel}"]`)).toHaveAttribute('data-position', 'front');
  await expect(preview.locator(`.preview-panel[data-panel="${panel}"]`)).toHaveCSS('z-index', '3');
}

test('three panels rotate in front without extra labels or task writes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const preview = page.locator('.product-preview');
  await expect(preview).toHaveAttribute('data-playing', 'true');
  await expectFront(preview, 'today');
  await expect(preview.getByText('操作示例', { exact: true })).toHaveCount(0);
  await expect(preview.locator('.preview-toolbar, .preview-steps')).toHaveCount(0);
  await expect(preview.locator('button')).toHaveCount(0);
  await page.clock.runFor(1750);
  await expect(preview).toHaveAttribute('data-today-stage', 'tear');
  await expect(preview.locator('.paper-sheet')).toHaveCSS('animation-duration', '0.8s');
  await page.clock.runFor(1950);
  await expectFront(preview, 'calendar');
  await page.clock.runFor(3200);
  await expectFront(preview, 'notes');
  await page.clock.runFor(3200);
  await expectFront(preview, 'today');
  await expect(preview).toHaveAttribute('data-playing', 'true');
  expect(await page.evaluate(() => localStorage.getItem('alethinosplan.demo.v1'))).toBeNull();
  await expect(page.getByRole('button', { name: /先体验/ })).toHaveCount(0);
});

for (const { elapsed, panel, field } of [
  { elapsed: 1750, panel: 'today', field: '密码' },
  { elapsed: 3700, panel: 'calendar', field: '邮箱' },
  { elapsed: 6900, panel: 'notes', field: '密码' },
]) {
  test(`form input stops the ${panel} panel without a playback button`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const preview = page.locator('.product-preview');
    await expect(preview).toHaveAttribute('data-playing', 'true');
    await page.clock.runFor(elapsed);
    await expectFront(preview, panel);
    await page.getByLabel(field, { exact: true }).fill(field === '邮箱' ? 'test@example.com' : 'test-password');
    await expect(preview).toHaveAttribute('data-playing', 'false');
    await expect(preview.locator('button')).toHaveCount(0);
    await page.getByRole('heading', { name: '欢迎回来' }).click();
    await page.clock.runFor(15_000);
    await expectFront(preview, panel);
    await expect(preview).toHaveAttribute('data-playing', 'false');
    expect(await preview.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
  });
}

test('focusing the form keeps the active panel in front and does not resume on blur', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const preview = page.locator('.product-preview');
  await expect(preview).toHaveAttribute('data-playing', 'true');
  await page.clock.runFor(3700);
  await expectFront(preview, 'calendar');
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await expect(preview).toHaveAttribute('data-playing', 'false');
  await expectFront(preview, 'calendar');
  await page.getByRole('heading', { name: '欢迎回来' }).click();
  await page.clock.runFor(12_000);
  await expectFront(preview, 'calendar');
  await expect(preview).toHaveAttribute('data-playing', 'false');
  await expect(page.getByLabel('邮箱', { exact: true })).toHaveValue('test@example.com');
});

test('reduced motion is static and preserves the foreground when changed', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.product-preview');
  await expectFront(preview, 'today');
  await expect(preview).toHaveAttribute('data-playing', 'false');
  await expect(preview.locator('.preview-control')).toHaveCount(0);
  expect(await preview.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect(preview).toHaveAttribute('data-playing', 'true');
  await page.clock.runFor(3700);
  await expectFront(preview, 'calendar');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(preview).toHaveAttribute('data-playing', 'false');
  await expectFront(preview, 'calendar');
});

test.describe('mobile carousel', () => {
  test.use({ isMobile: true, hasTouch: true });
  for (const width of [320, 390, 760]) {
    for (const locale of ['zh-CN', 'en']) {
      test(`rotates all panels at ${width}px in ${locale}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript(value => localStorage.setItem('alethinosplan.locale.v1', value), locale);
        await page.goto('/');
        const preview = page.locator('.product-preview');
        await expect(preview).toHaveAttribute('data-playing', 'true');
        await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
        await expectFront(preview, 'today');
        await expect(preview.locator('.preview-cursor')).toBeVisible();
        await expect(preview.locator('.preview-cursor')).toHaveCSS('animation-name', 'preview-cursor-tap');
        const submit = (await page.locator('.auth-submit').boundingBox())!;
        expect(submit.y + submit.height).toBeLessThanOrEqual(844);
        await page.clock.runFor(1750);
        await expect(preview).toHaveAttribute('data-today-stage', 'tear');
        await expect(preview.locator('.paper-sheet')).toHaveCSS('animation-duration', '0.8s');
        await expect(preview).toHaveAttribute('data-today-stage', 'done');
        await page.clock.runFor(1950);
        await expectFront(preview, 'calendar');
        await expect(preview.locator('.preview-calendar-event')).toHaveCSS('animation-name', 'preview-schedule');
        await page.clock.runFor(3200);
        await expectFront(preview, 'notes');
        const newNote = preview.locator('.preview-note-new');
        await expect(newNote).toBeVisible();
        await expect(newNote).toHaveCSS('animation-name', 'preview-capture-row');
        await expect(preview.locator('[data-panel="notes"]')).toHaveCSS('overflow', 'hidden');
        await expect.poll(async () => {
          const panel = (await preview.locator('[data-panel="notes"]').boundingBox())!;
          const row = (await newNote.boundingBox())!;
          return row.y + row.height - panel.y - panel.height;
        }).toBeLessThanOrEqual(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect((await preview.boundingBox())!.height).toBeLessThanOrEqual(125);
        await expect(page.locator('.auth-story-note')).toBeHidden();
        expect((await page.locator('.auth-submit').boundingBox())!.y).toBeCloseTo(submit.y, 1);
        await expect.poll(() => preview.evaluate(element =>
          element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length,
        )).toBe(0);
        await expectFront(preview, 'notes');
        await page.screenshot({ path: `test-results/product-preview-mobile-${width}-${locale}.png`, fullPage: true });
        await page.clock.runFor(3200);
        await expectFront(preview, 'today');
        await page.locator('input[name="email"]').fill('test@example.com');
        await expect(preview).toHaveAttribute('data-playing', 'false');
        await page.locator('.auth-form-wrap h2').tap();
        await page.clock.runFor(12_000);
        await expectFront(preview, 'today');
        await expect(preview).toHaveAttribute('data-playing', 'false');
        await page.locator('.auth-switch button').nth(1).tap();
        const signup = (await page.locator('.auth-submit').boundingBox())!;
        expect(signup.y + signup.height).toBeLessThanOrEqual(844);
        expect(await page.evaluate(() => localStorage.getItem('alethinosplan.demo.v1'))).toBeNull();
      });
    }
  }

  test('reduced motion stays static on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const preview = page.locator('.product-preview');
    await expectFront(preview, 'today');
    await expect(preview).toHaveAttribute('data-playing', 'false');
    await page.clock.runFor(12_000);
    await expectFront(preview, 'today');
    expect(await preview.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  });
});

test('hidden pages pause, but resizing preserves playback and the front panel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const preview = page.locator('.product-preview');
  await expect(preview).toHaveAttribute('data-playing', 'true');
  await page.clock.runFor(3700);
  await expectFront(preview, 'calendar');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(preview).toHaveAttribute('data-playing', 'false');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(preview).toHaveAttribute('data-playing', 'false');
  await page.reload();
  await expect(preview).toHaveAttribute('data-playing', 'true');
  await page.clock.runFor(3700);
  await expectFront(preview, 'calendar');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(preview).toHaveAttribute('data-playing', 'true');
  await expectFront(preview, 'calendar');
  await page.clock.runFor(3200);
  await expectFront(preview, 'notes');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(preview).toHaveAttribute('data-playing', 'true');
  await expectFront(preview, 'notes');
});

test('the carousel does not use the previous one-shot session flag', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => sessionStorage.setItem('alethinosplan.preview.seen.v1', '1'));
  await page.goto('/');
  await expect(page.locator('.product-preview')).toHaveAttribute('data-playing', 'true');
});

test('preview works without session storage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get: () => { throw new DOMException('Storage blocked', 'SecurityError'); } });
  });
  await page.goto('/');
  await expect(page.locator('.product-preview')).toHaveAttribute('data-playing', 'true');
  await page.getByLabel('邮箱', { exact: true }).fill('test@example.com');
  await expect(page.locator('.product-preview')).toHaveAttribute('data-playing', 'false');
});

test('desktop scene stays near the headline and all three foregrounds remain readable', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.product-preview');
  const headline = await page.locator('.auth-story-copy').boundingBox();
  const front = await preview.locator('.preview-panel[data-position="front"]').boundingBox();
  const gap = front!.y - (headline!.y + headline!.height);
  expect(gap).toBeGreaterThanOrEqual(75);
  expect(gap).toBeLessThanOrEqual(125);
  expect(front!.y + front!.height).toBeLessThanOrEqual(800);
  await page.screenshot({ path: 'test-results/product-preview-desktop.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect(preview).toHaveAttribute('data-playing', 'true');
  await page.clock.runFor(3700);
  await page.getByLabel('邮箱', { exact: true }).focus();
  await expectFront(preview, 'calendar');
  await page.screenshot({ path: 'test-results/product-preview-calendar.png', fullPage: true });
  await page.reload();
  await expect(preview).toHaveAttribute('data-playing', 'true');
  await page.clock.runFor(6900);
  await page.getByLabel('邮箱', { exact: true }).focus();
  await expectFront(preview, 'notes');
  await page.screenshot({ path: 'test-results/product-preview-notes.png', fullPage: true });
});

test('desktop spacing is bounded on tall screens and the full stack fits short screens', async ({ page }) => {
  for (const { width, height } of [
    { width: 1600, height: 1200 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 1366, height: 650 },
    { width: 820, height: 650 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const preview = page.locator('.product-preview');
    const headline = (await page.locator('.auth-story-copy').boundingBox())!;
    const stage = (await preview.boundingBox())!;
    const gap = stage.y - (headline.y + headline.height);
    expect(gap).toBeGreaterThanOrEqual(24);
    expect(gap).toBeLessThanOrEqual(64);
    for (const panel of await preview.locator('.preview-panel').all()) {
      const bounds = (await panel.boundingBox())!;
      expect(bounds.y).toBeGreaterThan(headline.y + headline.height + 8);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(height - 24);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual((await page.locator('.auth-story').boundingBox())!.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
    expect((await preview.boundingBox())!.y).toBeCloseTo(stage.y, 1);
    const submit = (await page.locator('.auth-submit').boundingBox())!;
    expect(submit.y + submit.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `test-results/product-preview-${width}x${height}.png`, fullPage: true });
  }
});

test('the quiet brand note balances spacious desktops without pushing the preview or form', async ({ page }) => {
  for (const { width, height } of [
    { width: 2560, height: 1305 },
    { width: 1440, height: 1000 },
    { width: 1024, height: 960 },
    { width: 820, height: 960 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const note = page.locator('.auth-story-note');
    const preview = page.locator('.product-preview');
    const form = page.locator('.auth-form-wrap');
    await expect(note).toBeVisible();
    await expect(note).toContainText('不必填满每一天。');
    await expect(note.locator('button, a')).toHaveCount(0);
    const bounds = (await note.boundingBox())!;
    const stage = (await preview.boundingBox())!;
    const formBounds = (await form.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(stage.y + stage.height + 32);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height - 30);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/auth-brand-note-${width}x${height}.png`, fullPage: true });
    // The new copy must consume existing whitespace, not move the primary content.
    await note.evaluate(element => { element.style.display = 'none'; });
    expect((await preview.boundingBox())!.y).toBeCloseTo(stage.y, 1);
    expect((await form.boundingBox())!.y).toBeCloseTo(formBounds.y, 1);
    await note.evaluate(element => { element.style.removeProperty('display'); });
    await page.getByRole('group', { name: '账号操作' }).getByRole('button', { name: '注册', exact: true }).click();
    await expect(note).toBeVisible();
    expect((await note.boundingBox())!.y).toBeCloseTo(bounds.y, 1);
  }
  for (const viewport of [{ width: 1440, height: 959 }, { width: 1366, height: 650 }, { width: 390, height: 1100 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('.auth-story-note')).toBeHidden();
  }
});

test('dark appearance keeps the foreground readable', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expectFront(page.locator('.product-preview'), 'today');
  await page.screenshot({ path: 'test-results/product-preview-dark.png', fullPage: true });
});
