import { chromium, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const baseURL = 'http://127.0.0.1:5181';
const locale = process.argv.find(arg => arg.startsWith('--locale='))?.split('=')[1] || 'zh-CN';
if (!['zh-CN', 'en'].includes(locale)) throw new Error('Supported locales: zh-CN, en');
const english = locale === 'en';
const suffix = english ? '.en' : '';
const framesDir = '.test-readme-frames' + suffix;
const asset = name => `docs/assets/${name}${suffix}.png`;
const copy = (zh, en) => english ? en : zh;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5181', '--strictPort'], {
  windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
});
let output = '';
server.stdout.on('data', data => { output += data; });
server.stderr.on('data', data => { output += data; });
let browser;
try {
  for (let tries = 0; ; tries += 1) {
    if (server.exitCode !== null || tries > 80) throw new Error('Capture server did not start: ' + output);
    if (output.includes('Local:')) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await mkdir(framesDir, { recursive: true });
  await mkdir('docs/assets', { recursive: true });
  const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(chrome) ? chrome : undefined) });
  const context = await browser.newContext({ viewport: { width: 1200, height: 760 }, colorScheme: 'light', reducedMotion: 'no-preference', timezoneId: 'Asia/Shanghai' });
  // All recordings use a fresh local demo; no account or remote data is accessed.
  await context.route('https://**', route => route.abort());
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-20T04:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-20T04:00:01Z'));
  await context.addInitScript(locale => localStorage.setItem('alethinosplan.locale.v1', locale), locale);
  await page.goto(baseURL + '/?demo=1');
  await page.getByTestId('sticky-task').first().waitFor();
  const frames = [];
  async function capture(duration = 1300) {
    const path = framesDir + '/frame-' + String(frames.length).padStart(3, '0') + '.png';
    await page.screenshot({ path });
    frames.push({ path, duration });
    await page.clock.runFor(duration);
  }
  await page.screenshot({ path: asset('overview') });
  await capture(1600);
  await page.getByTestId('sticky-task').first().getByRole('button', { name: english ? /^Complete:/ : /^完成：/ }).click();
  // CSS tear animations use real time even when the application clock is controlled.
  for (let index = 0; index < 9; index += 1) {
    await capture(100);
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.completed-row')).toHaveCount(1);
  await capture(1300);
  await page.getByRole('button', { name: copy('撤销', 'Undo'), exact: true }).click();
  await expect(page.getByTestId('sticky-task')).toHaveCount(3);
  await capture(1200);
  await page.getByRole('navigation', { name: copy('主要导航', 'Main navigation') }).getByRole('button', { name: copy('规划日历', 'Calendar'), exact: true }).click();
  await capture(1700);
  await page.getByRole('button', { name: copy('周', 'Week'), exact: true }).click();
  await capture(1500);
  await page.getByRole('navigation', { name: copy('主要导航', 'Main navigation') }).getByRole('button', { name: english ? /^Notes/ : /随手记/ }).click();
  await capture(1300);
  await page.getByRole('button', { name: copy('记一件事', 'Add a note'), exact: true }).click();
  await page.getByLabel(copy('记下什么？', "What's on your mind?")).fill(copy('给下周留一点阅读时间', 'Make time for reading next week'));
  await page.waitForTimeout(200);
  await capture(1100);
  await page.getByRole('button', { name: copy('记下', 'Save note'), exact: true }).click();
  await capture(1300);
  await page.getByRole('navigation', { name: copy('主要导航', 'Main navigation') }).getByRole('button', { name: english ? /^My Day/ : /我的一天/ }).click();
  await page.getByTestId('sticky-task').first().getByRole('button', { name: copy('开始', 'Start'), exact: true }).click();
  await page.waitForTimeout(200);
  for (let index = 0; index < 4; index += 1) await capture(1000);
  await page.getByRole('button', { name: copy('暂停', 'Pause'), exact: true }).click();
  await capture(1000);
  await page.getByRole('button', { name: copy('继续', 'Resume'), exact: true }).click();
  await capture(1000);
  await page.getByRole('button', { name: copy('离开专注', 'Leave focus mode') }).click();
  await capture(1200);
  if (await page.evaluate(() => 'documentPictureInPicture' in window)) {
    const opened = context.waitForEvent('page');
    await page.getByRole('button', { name: copy('置顶小窗', 'Mini window'), exact: true }).click();
    const mini = await opened;
    await mini.setViewportSize({ width: 380, height: 560 });
    await mini.getByRole('heading', { name: copy('我的一天', 'My Day'), exact: true }).waitFor();
    await expect(mini.locator('html')).toHaveAttribute('lang', locale);
    await mini.locator('.desktop-tasks').screenshot({ path: asset('desktop-window') });
    await mini.getByRole('button', { name: english ? /^Start timer:/ : /^开始计时：/ }).first().click();
    await expect(mini.getByRole('timer')).toBeVisible();
    await page.clock.runFor(65000);
    await mini.getByRole('button', { name: copy('暂停', 'Pause'), exact: true }).click();
    await mini.mouse.move(2, 2);
    await expect(mini.getByRole('timer')).toContainText('01');
    await mini.locator('.desktop-tasks').screenshot({ path: asset('desktop-focus') });
    await mini.close();
  } else {
    throw new Error('This browser cannot capture the native desktop window.');
  }
  await writeFile(framesDir + '/manifest.json', JSON.stringify(frames, null, 2));
  console.log('Captured ' + frames.length + ' demo frames and screenshots. Run python scripts/render-demo.py --locale=' + locale + ' to render the GIF.');
} finally {
  await browser?.close();
  server.kill();
}
