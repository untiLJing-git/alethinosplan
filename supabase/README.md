# 数据库结构与访问策略

schema.sql 保留在 Git 中：它记录任务表、约束、索引、触发器和行级访问控制（RLS），不包含用户数据或凭据。数据库已创建，不等于这些定义可以删除；它们用于新环境搭建、权限审查与后续迁移的基线。

- 新建空项目时，按开发文档审查并应用 schema.sql。
- 已有数据库不需要随每次前端部署重新执行。结构变化应编写、审查并版本管理增量 SQL 迁移；不要假设 create table if not exists 会更新已有表。
- 不把连接密码、服务端密钥、生产数据导出或用户邮箱写入版本化 SQL。
- 本地备份放在 backups/ 或 dumps/，已被 .gitignore 排除；CLI 临时状态也不提交。

参考：https://supabase.com/docs/guides/deployment/database-migrations
