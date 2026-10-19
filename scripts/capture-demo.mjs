import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const baseURL = 'http://127.0.0.1:5181';
const framesDir = '.test-readme-frames';
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
  await page.clock.setFixedTime(new Date('2026-10-19T04:00:00Z'));
  await page.goto(baseURL + '/?demo=1');
  await page.getByTestId('sticky-task').first().waitFor();
  const frames = [];
  async function capture(duration = 1300) {
    const path = framesDir + '/frame-' + String(frames.length).padStart(3, '0') + '.png';
    await page.screenshot({ path });
    frames.push({ path, duration });
  }
  await page.screenshot({ path: 'docs/assets/overview.png' });
  await capture(1600);
  await page.getByTestId('sticky-task').first().getByRole('button', { name: /^完成：/ }).click();
  for (let index = 0; index < 8; index += 1) { await capture(100); await page.waitForTimeout(70); }
  await capture(1300);
  await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: '规划日历', exact: true }).click();
  await capture(1700);
  await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: /随手记/ }).click();
  await capture(1300);
  await page.getByRole('button', { name: '记一件事', exact: true }).click();
  await page.getByLabel('记下什么？').fill('给下周留一点阅读时间');
  await capture(1100);
  await page.getByRole('button', { name: '记下', exact: true }).click();
  await capture(1300);
  await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: /我的一天/ }).click();
  await page.getByTestId('sticky-task').first().getByRole('button', { name: '开始', exact: true }).click();
  await capture(1600);
  await page.getByRole('button', { name: '离开专注' }).click();
  await capture(1200);
  if (await page.evaluate(() => 'documentPictureInPicture' in window)) {
    const opened = context.waitForEvent('page');
    await page.getByRole('button', { name: '置顶小窗', exact: true }).click();
    const mini = await opened;
    await mini.setViewportSize({ width: 380, height: 560 });
    await mini.getByRole('heading', { name: '我的一天', exact: true }).waitFor();
    await mini.screenshot({ path: 'docs/assets/desktop-window.png' });
    await mini.getByRole('button', { name: /^开始计时：/ }).first().click();
    await mini.waitForTimeout(1200);
    await mini.screenshot({ path: 'docs/assets/desktop-focus.png' });
    await mini.close();
  } else {
    throw new Error('This browser cannot capture the native desktop window.');
  }
  await writeFile(framesDir + '/manifest.json', JSON.stringify(frames, null, 2));
  console.log('Captured ' + frames.length + ' demo frames and screenshots. Run python scripts/render-demo.py to render the GIF.');
} finally {
  await browser?.close();
  server.kill();
}
