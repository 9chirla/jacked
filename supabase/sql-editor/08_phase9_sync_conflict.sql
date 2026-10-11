-- 08 Phase 9 sync conflict
-- Paste into Supabase SQL Editor if CLI migrate is unavailable.

create table if not exists public.sync_conflict (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  entity text not null,
  client_payload jsonb not null default '{}'::jsonb,
  server_payload jsonb not null default '{}'::jsonb,
  outbox_id text,
  resolution text check (
    resolution is null
    or resolution in ('keep_local', 'keep_server', 'merge', 'dismissed')
  ),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sync_conflict_user_created_idx
  on public.sync_conflict (user_id, created_at desc);

alter table public.sync_conflict enable row level security;
revoke all on table public.sync_conflict from anon, authenticated;
grant select, insert, update on table public.sync_conflict to authenticated;

drop policy if exists sync_conflict_select_own on public.sync_conflict;
drop policy if exists sync_conflict_insert_own on public.sync_conflict;
drop policy if exists sync_conflict_update_own on public.sync_conflict;

create policy sync_conflict_select_own on public.sync_conflict
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy sync_conflict_insert_own on public.sync_conflict
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy sync_conflict_update_own on public.sync_conflict
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
