-- Phase 11: weekly training plan (Sunday-start week, A/B rotation)

create table public.week_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  week_start date not null,
  timezone text not null default 'UTC',
  available_days smallint[] not null default '{}',
  planned_days jsonb not null default '[]'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  unique (user_id, week_start),
  constraint week_plan_available_days_valid check (
    available_days <@ array[0,1,2,3,4,5,6]::smallint[]
  )
);

comment on column public.week_plan.week_start is
  'Local Sunday (YYYY-MM-DD) for the planned week in week_plan.timezone.';
comment on column public.week_plan.available_days is
  '0=Sunday .. 6=Saturday (JS getDay).';
comment on column public.week_plan.planned_days is
  'JSON array of {date, template_id, status, session_id?}';

create index week_plan_user_week_start_idx
  on public.week_plan (user_id, week_start desc);

create trigger week_plan_set_updated_at
before update on public.week_plan
for each row execute function public.set_updated_at();

alter table public.week_plan enable row level security;
revoke all on table public.week_plan from anon, authenticated;
grant select, insert, update, delete on table public.week_plan to authenticated;

create policy week_plan_select_own on public.week_plan for select to authenticated
  using ((select auth.uid()) = user_id);
create policy week_plan_insert_own on public.week_plan for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy week_plan_update_own on public.week_plan for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy week_plan_delete_own on public.week_plan for delete to authenticated
  using ((select auth.uid()) = user_id);
