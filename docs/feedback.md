# 反馈入口

## 位置

- 桌面工作区：左侧栏底部，主题切换按钮上方，属于辅助功能区，不占任务主导航。
- 移动端：账号菜单底部，不再增加常驻悬浮按钮。
- 登录／注册页面：底部品牌旁，未登录时也能反馈账号访问问题。

入口直接在新标签页打开 GitHub 的 Issue 创建页，不在应用内叠加表单或弹窗。仓库地址集中定义在 src/components/FeedbackLink.tsx；分叉项目若需要接收自己的反馈，应更新这个地址及 README 链接。

## 隐私与操作边界

链接固定指向 https://github.com/untiLJing-git/alethinosplan/issues/new/choose ，不自动附加账号、任务内容、页面查询参数或浏览器日志。使用 noopener、noreferrer 和 no-referrer 防止新页面访问 opener 或收到原页面来源地址。

提交需要用户在 GitHub 页面上主动完成，可能需要登录 GitHub；应用不会自动创建 Issue。公开反馈中不要放入密码、访问令牌、私人任务或未打码截图。

## Issue 表单

.github/ISSUE_TEMPLATE 包含「问题反馈」「功能建议」两种表单，并保留空白 Issue 入口。表单文件推送到仓库默认分支后才由 GitHub 启用；本地校验不能代替线上表单验收。

参考辅助入口与社区反馈方式：
- https://code.visualstudio.com/docs/supporting/FAQ
- https://github.com/AppFlowy-IO/AppFlowy-Docs/blob/main/essential-documentation/start-here/welcome-to-appflowy.md
- https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository
