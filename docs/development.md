# 开发与自托管

## 本地运行

使用 Node.js 24.12.0（仓库已提供 .node-version），或兼容的 Node.js 22.12+。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5173 。只有开发环境支持 `http://127.0.0.1:5173/?demo=1`，示例数据仅保存在当前浏览器。正式构建不会启用这个入口，也不自动导入示例数据到真实账号。

## 开启真实邮箱账号与云端保存

1. 创建一个 Supabase 项目，在 SQL Editor 执行 `supabase/schema.sql`。该脚本创建任务表、约束、索引以及每个用户只能访问自己任务的 RLS 策略。
2. 将 `.env.example` 复制为 `.env.local`，填写项目 URL 和 **publishable key**。不要填写 `secret` 或 `service_role` 密钥。`.env.local` 已被 Git 忽略。
3. 在 Supabase Authentication 中启用 Email provider，开启 Confirm email；将最小密码长度配置为至少 8。
4. 设置 Site URL，并将实际开发/部署地址加入 Redirect URLs。开发时加入 `http://127.0.0.1:5173/**` 和实际使用的 localhost 地址；生产环境使用自己的 HTTPS 域名。密码重置返回 `/?auth=recovery`。
5. 面向真实用户发送验证/重置邮件时，配置自有 SMTP。Supabase 默认邮件服务有收件人及发送限制，不应作为生产邮件服务。SMTP 密码只填写在服务端控制台，不要放入前端环境变量。
6. 重启 `npm run dev`。注册真实邮箱并完成验证，然后确认登录、退出、密码重置和跨设备读取任务均正常。

注册和密码重置使用 PKCE：应在发起操作的同一浏览器打开邮件链接。生产环境还需要根据实际部署配置发送域名、邮件投递、限流、验证码和备份策略。

自动化账号测试使用受控的 HTTP 模拟响应，不代表真实邮件投递或云端配置已经验证。上线前务必使用两个不同账号验证数据隔离，且在未登录状态下不能读取任务。

官方参考：
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/database/postgres/row-level-security


## 数据库文件的版本管理

`supabase/schema.sql` 是可审查、可重建的结构与 RLS 策略，不含用户数据或密钥，应继续提交到 Git。远程数据库已建好时无需每次部署重新运行它；对已有表的后续结构修改应使用经过审查的增量迁移，而不是依赖 create table if not exists 自动修改已有表。

本地数据库备份／导出请放在 `supabase/backups/` 或 `supabase/dumps/`。这些目录以及 Supabase CLI 临时状态、.dump 和 .sql.gz 文件已被忽略。不要全局忽略 *.sql，否则未来迁移也会丢失版本管理。

## 验证

```sh
npm run check
npm test
npm run test:e2e
npm run build:pages
npm run test:pages
```

浏览器测试优先使用 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH，Windows 会尝试本机 Chrome；其他环境可运行 `npx playwright install chromium`。小窗测试包含 API 模拟契约测试和真实 Document Picture-in-Picture 测试；仅在浏览器没有该原生 API 时跳过原生用例。画中画 API 能否打开，与操作系统实际置顶效果是不同层次的验证。

发布使用 Cloudflare Pages，详见 [部署指南](cloudflare-pages.md)。认证回跳地址是网站域名；VITE_SUPABASE_URL 仍应指向 Supabase 项目 API，不能替换成网站域名。

## 构建体积与按需加载

- Vite 的 Rolldown 配置将 React 与 Supabase 分别提取为独立依赖包，保留默认的 500 kB 单包警告，不通过提高阈值隐藏问题。依赖分包主要改善缓存复用，并不等于减少首次访问的总下载量。
- 登录页与工作区通过 React.lazy 分开加载；工作区默认显示我的一天，日历在首次打开时再请求。弹窗与桌面小窗仍随工作区加载，避免过度碎片化与首次操作延迟。
- 懒加载有本地化的加载提示与错误边界；资源失败后由用户点击刷新重试，不自动刷新或无限重试。
- 浏览器测试中的认证服务（5176 端口）使用生产构建及模拟 Supabase 请求；未配置认证的生产入口仍在 5177 端口验证。测试不访问真实账号数据。
- tests/bundle.spec.ts 检查登录页不会提前请求工作区或日历，验证慢加载和失败恢复，并记录初始 JS 的解压后字节数；预算为初始 JS 小于 490 kB、初始单包小于 500 kB。本地页面就绪观测时间仅用于诊断，不代表公网或真机性能。

## 更新 README 演示

```sh
npm run docs:capture
python scripts/render-demo.py

# 英文素材（不会覆盖中文版）
npm run docs:capture -- --locale=en
python scripts/render-demo.py --locale=en
```

录制需要桌面 Chrome 或支持 Document Picture-in-Picture 的 Chromium；GIF 渲染需要 Python 和 Pillow（`python -m pip install Pillow`）。录制脚本自行启动 127.0.0.1:5181 的开发服务，使用全新的浏览器环境和固定演示日期，并阻断外网请求；不会读取真实账号或任务。

默认输出 docs/assets/demo.gif、overview.png、desktop-window.png 和 desktop-focus.png；英文模式输出对应的 .en.gif / .en.png 文件。中间帧分别放在被忽略的 .test-readme-frames 和 .test-readme-frames.en 目录。发布前应检查每张截图与动画，勿用真实用户数据录制素材。

## 代码导览

- src/pages：今日任务、规划日历、随手记与认证。
- src/components：便利贴、任务编辑器、专注计时、桌面小窗。
- src/hooks：认证、任务状态、日期与画中画窗口生命周期。
- src/lib：日期校验、任务规则、演示／云端仓库及 Supabase 配置。
- supabase：数据库结构和隔离策略。
- tests：交互、认证、生产托管与小窗回归。

## 功能边界

- 日期按照浏览器本地时区显示，完成时间使用 UTC 存储。
- 云端保存需要网络；项目不承诺完整离线模式，也没有后台原生桌面守护进程。
- 自动化测试使用模拟认证及本地示例，不代表已验证真实邮件投递、生产 RLS 或所有地区的网络可达性。
- 动效只是一种操作反馈，不承诺特定的效率或行为科学效果。
