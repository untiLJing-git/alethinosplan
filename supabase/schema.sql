begin;

create table if not exists public.alethinos_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  planned_date date,
  estimate_minutes integer check (estimate_minutes between 1 and 1440),
  tone text not null default 'lemon' check (tone in ('lemon', 'sky', 'rose', 'mint')),
  status text not null default 'note' check (status in ('planned', 'done', 'note')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint task_schedule_consistent check (
    (status = 'note' and planned_date is null and completed_at is null)
    or (status = 'planned' and planned_date is not null and completed_at is null)
    or (status = 'done' and planned_date is not null and completed_at is not null)
  ),
  constraint task_date_range check (planned_date between date '1900-01-01' and date '2100-12-31')
);

create index if not exists alethinos_tasks_owner_date on public.alethinos_tasks(user_id, planned_date);
alter table public.alethinos_tasks enable row level security;
revoke all on public.alethinos_tasks from anon;
grant select, insert, update, delete on public.alethinos_tasks to authenticated;

drop policy if exists "Read own tasks" on public.alethinos_tasks;
create policy "Read own tasks" on public.alethinos_tasks for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Create own tasks" on public.alethinos_tasks;
create policy "Create own tasks" on public.alethinos_tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Update own tasks" on public.alethinos_tasks;
create policy "Update own tasks" on public.alethinos_tasks for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own tasks" on public.alethinos_tasks;
create policy "Delete own tasks" on public.alethinos_tasks for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.alethinos_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists alethinos_tasks_updated_at on public.alethinos_tasks;
create trigger alethinos_tasks_updated_at before update on public.alethinos_tasks
  for each row execute function public.alethinos_touch_updated_at();

commit;
