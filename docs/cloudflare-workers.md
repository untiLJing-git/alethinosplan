# Cloudflare Workers 部署

本项目使用 Workers Static Assets 托管 Vite 生成的静态文件，不需要 Worker 服务端入口、KV、D1 或 R2。账号、任务与权限继续由现有 Supabase 提供。

## 已包含的配置

- `wrangler.jsonc`：Worker 名称 `alethinosplan`，静态目录 `dist`，SPA 回退。
- `public/_headers`：禁止嵌入、关闭 MIME 嗅探、限制敏感设备权限，以及带内容哈希资源的一年不可变缓存。HTML 不设置长期缓存，继续使用平台默认再验证策略。
- 当前 CSP 只约束 base URI、嵌入对象和页面嵌入，不是一份完整的脚本／连接源白名单。确定正式 Supabase 域名及第三方资源后可进一步收紧。
- 固定 Wrangler 版本和依赖锁文件；`.node-version` 指定已验证的 Node.js 24.12.0。
- 部署专用构建先检查 Supabase URL 和公钥，阻止空值、占位值、非 HTTPS 地址及服务端密钥进入部署流程；随后安全清理本仓库 dist，避免夹带旧构建产物。
- `npm run test:workers` 在本地 workerd/Workers 静态资源服务上验证 SPA、生产入口、响应头与资源缓存。使用测试配置并拦截测试 Supabase 请求，不操作真实任务。

## 方式一：Cloudflare 控制台连接 Git 仓库

在 Workers & Pages 中创建 Worker 并连接当前 GitHub 仓库，不要创建 Pages 项目。选择需要部署的分支（当前为 `main`），设置：

| 项目 | 值 |
| --- | --- |
| Worker 名称 | `alethinosplan`，必须与 `wrangler.jsonc` 一致 |
| Root directory | 仓库根目录 |
| Build command | `npm run build:workers` |
| Deploy command | `npx wrangler deploy` |
| Node 版本 | `24.12.0`（也可设置构建变量 `NODE_VERSION`） |

Wrangler 配置已经指定静态文件目录，不需要 Pages 的 build output directory 配置。不要把 deploy command 写成 `npm run deploy`，否则会重复构建。首次连接时在开始构建前填好下列变量；若首次因缺失变量失败，配置后重新运行构建。

### 构建变量

在 Worker 的 **Settings → Build → Variables and secrets** 中配置：

- `VITE_SUPABASE_URL`：真实项目的 HTTPS origin，例如 `https://YOUR_PROJECT.supabase.co`（示例必须替换）。
- `VITE_SUPABASE_PUBLISHABLE_KEY`：真实 publishable key；兼容旧的 anon JWT。

Vite 在构建时把这两个值写入 JS，它们是公开客户端配置，不是服务端秘密。不能填 Supabase secret/service_role key、数据库密码或 SMTP 密码。Worker 的运行时 Variables/Secrets 不会自动注入已生成的前端文件；修改构建变量后必须重新构建、部署。

生产和预览构建应分别确认所用 Supabase 项目。构建账号令牌由 Cloudflare 集成管理；不把令牌提交到仓库。如果当前分支已连接自动部署，后续推送可能自动触发发布。

## 方式二：本地命令部署

`npm ci` 后，在被 Git 忽略的 `.env.local` 中设置真实公开客户端配置。检查和本地预览：

```sh
npm run check
npm test
npm run test:e2e
npm run test:workers
npm run deploy:dry-run
npm run preview:workers
```

本地预览地址为 `http://127.0.0.1:8787`。`deploy:dry-run` 只构建和检查，不发布。确认无误后，由有部署权限的操作者执行：

```sh
npx wrangler login
npm run deploy
```

非交互式 CI 可使用最小权限的 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`；只放在 CI/平台密钥存储，不写进源码、Wrangler 配置或任何 `VITE_*` 变量。

## Supabase 与域名：上线前手动确认

1. 确认已执行 `supabase/schema.sql`、开启 Email provider、邮箱确认及所需 SMTP，并检查 RLS；不要为了部署重复初始化或覆盖现有数据库。
2. 先使用 Cloudflare 返回的 HTTPS workers.dev 地址，或在 Worker Settings → Domains & Routes 中绑定正式域名。
3. 将最终用户访问的正式 origin 设置为 Supabase Auth 的 Site URL；Redirect URLs 加入实际使用的 `https://你的域名/` 与 `https://你的域名/?auth=recovery`。如果同时使用 workers.dev 地址，也显式加入对应回跳地址。
4. 注册确认和重置密码采用 PKCE，应从同一浏览器打开邮件。用自己的测试账号验证真实邮件、登录／退出、密码重置以及刷新后会话恢复。
5. 用两个不同账号确认任务隔离；静态托管和模拟浏览器测试不能替代 RLS、真实邮件或线上域名配置验证。
6. 生产环境 `?demo=1` 不开启开发演示；所有预览内容保持固定示例，不读写真实任务。

## 更新与回滚

修改代码后重新构建再发布；不要只上传源码或修改 Worker 运行时变量。静态资源名含内容哈希，旧资源缓存不应覆盖新的 HTML 引用。需要回滚时使用 Cloudflare 部署历史选择已验证版本；数据库迁移及 Supabase 配置不随 Worker 回滚。

## 官方参考

- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
- https://developers.cloudflare.com/workers/static-assets/headers/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://vite.dev/guide/env-and-mode
- https://supabase.com/docs/guides/auth/redirect-urls
