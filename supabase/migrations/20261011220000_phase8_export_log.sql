-- Phase 8: export audit log

create table public.export_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  format text not null check (format in ('json', 'csv')),
  row_count integer not null check (row_count >= 0),
  created_at timestamptz not null default now()
);

create index export_log_user_created_idx
  on public.export_log (user_id, created_at desc);

alter table public.export_log enable row level security;
revoke all on table public.export_log from anon, authenticated;
grant select, insert on table public.export_log to authenticated;

create policy export_log_select_own on public.export_log for select to authenticated
  using ((select auth.uid()) = user_id);
create policy export_log_insert_own on public.export_log for insert to authenticated
  with check ((select auth.uid()) = user_id);
