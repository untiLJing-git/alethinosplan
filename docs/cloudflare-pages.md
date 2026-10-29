# Cloudflare Pages 部署

项目由 React + TypeScript + Vite 静态前端和一个轻量的 Pages Function 组成。静态产物位于 dist；仓库根目录的 `functions/api/locale.ts` 由 Pages/Wrangler 单独构建部署，用于按 IP 地区选择初始语言。不迁移 Supabase 数据。

## 配置与命令

- `wrangler.jsonc` 是唯一的部署配置，使用 `pages_build_output_dir: "./dist"`，`name` 必须与实际 Pages 项目名一致。
- `npm run build:pages` 依次检查公开客户端配置、安全清理 dist、执行类型检查和生产构建。
- `public/_headers` 设置静态资源的安全响应头及哈希资源的长期缓存；HTML 不设置长期不可变缓存。
- `public/_routes.json` 仅将 `/api/locale` 交给 Pages Function，其他请求继续走静态托管及 SPA 回退。Function 自行设置响应头和 `private, no-store`，不依赖静态 `_headers`。不要对语言接口添加强制缓存规则。
- 没有顶层 `404.html`，依赖 Pages 的 SPA 回退。新增自定义 404 前需要重新验证深链接刷新，不需要额外的全站重定向。
- `npm run test:pages` 启动 Pages 本地服务，验证生产入口、SPA 刷新、认证查询参数、响应头和缓存。
- 保留固定版本的 Wrangler，因为 Pages 本地预览和手动发布也使用此工具。

## 推荐：连接 Git 仓库

在 Cloudflare 控制台创建 **Pages** 项目，连接 `untiLJing-git/alethinosplan`。

| 项目 | 填写值 |
| --- | --- |
| 项目名称 | `alethinosplan`（以名称可用且平台实际分配为准；变化时同步修改 wrangler.jsonc） |
| 生产分支 | `main` |
| Framework preset | `None`，手动填写下面的构建命令 |
| Root directory | 仓库根目录；留空或保留界面默认根路径 |
| Build command | `npm run build:pages` |
| Build output directory | `dist` |
| Node 版本 | `24.12.0` |

Pages Git 集成在构建成功后自动发布产物，无需额外部署命令。推送生产分支可能触发自动发布；请先填好构建变量。

在 Production 构建环境配置 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`。开启分支预览时也要确认 Preview 环境的构建变量。仓库已有 `.node-version`，也可显式设置 `NODE_VERSION=24.12.0`。

Vite 在构建时将 `VITE_*` 写入前端 JS。这些值是公开客户端配置，不能填入 service_role、secret key、SMTP 密码或 Cloudflare API token。修改变量后需要重新构建。

## 本地验证与手动发布

```sh
npm run check
npm test
npm run build:pages
npm run test:e2e
npm run test:pages
npm run preview:pages
```

本地预览地址为 `http://127.0.0.1:8789`。自动化测试使用假 Supabase 配置并拦截请求，不操作真实任务；手动预览使用本机构建配置，实际登录会连接所配置的 Supabase。

如需手动发布，在确认账号权限和 wrangler.jsonc 中的项目名后执行：

```sh
npx wrangler login
npm run deploy:pages
```

此命令重新构建并上传 dist，同时编译仓库根目录 `functions/` 中的 Pages Function；不上传其他根目录文件。Wrangler 根据当前 Git 分支判断生产或预览发布；请确认 Pages 的生产分支设置。这里不提供伪装成发布预检的 dry-run；发布前使用本地构建和浏览器验收。

## IP 地区语言接口

首次访问且没有手动语言偏好时，前端调用 `/api/locale`。Function 从 Cloudflare 可信的 `request.cf.country` 判断地区，`CN` 返回 `zh-CN`，其他地区及未知值返回 `en`。接口不需要 API key、额外环境变量或定位权限。普通静态托管和 Vite dev 不执行 Pages Functions，此时自动回退英文。

请使用 Pages Git 集成或从仓库根目录执行 Wrangler 发布，确保 Function 与 dist 一并部署；不要只通过控制台拖拽上传 dist。发布后在无语言偏好的新浏览器环境中检查接口返回 JSON，并分别验证大陆和非大陆网络；已有手动偏好会跳过地区查询。不要仅通过伪造 `CF-IPCountry` 请求头验收，服务端不会信任它。

## Supabase 认证地址

使用 Pages 实际分配的正式域名，不要假设某个名称已归你所有。如果地址是 `https://alethinosplan.pages.dev`：

- Authentication → URL Configuration → Site URL 设为 `https://alethinosplan.pages.dev/`。
- Redirect URLs 加入 `https://alethinosplan.pages.dev`、`https://alethinosplan.pages.dev/` 和 `https://alethinosplan.pages.dev/?auth=recovery`。
- 移除不再使用的旧站点回跳地址；需要本地开发时保留对应 localhost／127.0.0.1 地址，不要开放所有 pages.dev 站点的通配白名单。
- 不修改 `VITE_SUPABASE_URL` 和客户端公钥，不重建账号、任务表或 RLS。
- 新站点需要重新登录。使用新发出的验证／重置邮件，在发起操作的同一浏览器完成 PKCE 回跳。

## 上线验收

检查实际 Pages 域名的首页、深链接刷新、注册邮件、密码重置、登录／退出和账号任务隔离。本地自动化测试不能替代实际邮件、域名白名单、RLS 或目标网络连通性验证。

## 官方参考

- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- https://developers.cloudflare.com/pages/configuration/serving-pages/
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://supabase.com/docs/guides/auth/redirect-urls
