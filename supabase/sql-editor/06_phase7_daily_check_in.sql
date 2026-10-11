-- 06 Phase 7 daily check-in
-- Paste into Supabase SQL Editor if CLI migrate is unavailable.

create table if not exists public.daily_check_in (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  logged_date date not null,
  fatigue integer not null check (fatigue between 1 and 5),
  soreness integer not null check (soreness between 1 and 5),
  sleep integer check (sleep is null or sleep between 1 and 5),
  discomfort_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

create index if not exists daily_check_in_user_date_idx
  on public.daily_check_in (user_id, logged_date desc);

drop trigger if exists daily_check_in_set_updated_at on public.daily_check_in;
create trigger daily_check_in_set_updated_at
before update on public.daily_check_in
for each row execute function public.set_updated_at();

alter table public.daily_check_in enable row level security;
revoke all on table public.daily_check_in from anon, authenticated;
grant select, insert, update, delete on table public.daily_check_in to authenticated;

drop policy if exists daily_check_in_select_own on public.daily_check_in;
drop policy if exists daily_check_in_insert_own on public.daily_check_in;
drop policy if exists daily_check_in_update_own on public.daily_check_in;
drop policy if exists daily_check_in_delete_own on public.daily_check_in;

create policy daily_check_in_select_own on public.daily_check_in for select to authenticated
  using ((select auth.uid()) = user_id);
create policy daily_check_in_insert_own on public.daily_check_in for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy daily_check_in_update_own on public.daily_check_in for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy daily_check_in_delete_own on public.daily_check_in for delete to authenticated
  using ((select auth.uid()) = user_id);
