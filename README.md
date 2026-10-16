# alēthinósplan

> A little plan. A real step.

个人计划网页应用。React + TypeScript + Vite；账号和云端数据使用 Supabase。

## 已实现

- 每日便利贴任务、完成撕纸动画、撤销、专注计时。
- 月 / 周日历、桌面拖动改期、日期编辑、任务新增和删除。
- 独立「随手记」入口：先记录，明确安排日期后才进入日历。
- 邮箱密码注册、验证邮件、登录、退出、密码重置与会话恢复。
- 移动端布局、键盘操作、减少动态效果、明暗外观。
- 登录 / 注册页提供固定示例的产品动效预览，不读取或写入真实任务。
- 开发环境保留本机演示；正式页面不提供体验入口，生产构建不接受 `?demo=1`。演示数据不会自动导入真实账号。

## 本地启动

使用 Node.js 22.12+ 或 24 LTS；本项目已在 Node.js 24 上验证。

```sh
npm ci
npm run dev
```

本地地址：`http://127.0.0.1:5173`。开发调试时可直接打开 `http://127.0.0.1:5173/?demo=1`，不配置服务也能验证任务流程。此参数仅在 Vite 开发环境有效，生产构建仍要求登录。

首页预览在桌面轮换展示「我的一天 → 规划日历 → 随手记」，当前界面始终位于叠层最前方。展示区与标题保持适度间距，不随高屏剩余空间过度下移，不显示示例标签或底部步骤文字；暂不显示播放／暂停按钮，保留自动轮播。开始填写表单、切走页面或启用减少动态效果时暂停并保留当前界面，移动端使用紧凑静态展示。设计依据与取舍见 `docs/product-preview.md`。

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

## 验证与构建

```sh
npm run check
npm test
npm run test:e2e
npm run build
```

浏览器测试优先使用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`，Windows 上也会寻找已安装的 Chrome；其他环境可以先运行 `npx playwright install chromium`。

`npm run build` 输出 `dist/`，可部署到支持静态站点的服务。环境变量在构建时注入，修改后需要重新构建。所有路由均在应用根路径内切换，邮件回跳使用查询参数。

## 部署到 Cloudflare Workers

已配置 Workers Static Assets，无需新增后端服务。部署指南见 [docs/cloudflare-workers.md](docs/cloudflare-workers.md)。

- 控制台构建命令：`npm run build:workers`；部署命令：`npx wrangler deploy`。
- 在构建变量中填写 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`；不要只设置 Worker 运行时变量。
- 本地预检：`npm run deploy:dry-run`；本地 Workers 验收：`npm run test:workers`。
- 本地预览：`npm run preview:workers`；确认账号权限后发布：`npm run deploy`。
- 部署前按实际 HTTPS 域名配置 Supabase Site URL 和邮件 Redirect URLs，不需要改动现有任务数据。

## 目录

- `src/components/`：便利贴、编辑弹窗、专注界面。
- `src/pages/`：今天、日历、随手记、账号页面。
- `src/lib/`：日期与任务规则、演示/云端存储、Supabase 配置。
- `supabase/schema.sql`：数据库与用户隔离策略。
- `tests/`：浏览器端交互与邮箱账号流程测试。

日历使用浏览器本地日期，完成时间使用 UTC 时间戳。动画只是状态反馈，不代表此界面已经获得行为科学有效性验证。
