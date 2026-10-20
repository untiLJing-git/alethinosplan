[简体中文](README.md) · **English**

# Database schema and access policies

Keep `schema.sql` in version control. It defines the task table, constraints, indexes, triggers, and row-level security (RLS), and contains no user data or credentials. Creating the database does not make these definitions disposable: they remain the baseline for setting up new environments, reviewing access policies, and planning future migrations.

- For a new, empty project, review and apply `schema.sql` as described in the [development guide (中文)](../docs/development.md).
- Do not rerun the schema with every frontend deployment. For an existing database, write, review, and version incremental SQL migrations. `CREATE TABLE IF NOT EXISTS` does not update an existing table.
- Never include connection passwords, server-side keys, production data exports, or user email addresses in versioned SQL.
- Store local backups in `backups/` or `dumps/`, which are excluded by `.gitignore`. Do not commit temporary CLI state either.

Reference: [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations).
