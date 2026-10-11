-- Copy of supabase/migrations/20261011160000_phase2_profile_equipment_goal.sql; not verified against remote schema.
-- Paste into Supabase SQL Editor if CLI migrate is unavailable.

-- Phase 2: profile, equipment, goal + RLS (least privilege)
-- Canonical units: kg / cm. Display preferences live on profile.

create extension if not exists pgcrypto;

create table public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  mass_unit text not null default 'kg' check (mass_unit in ('kg', 'lb')),
  length_unit text not null default 'cm' check (length_unit in ('cm', 'in')),
  primary_goal text not null default 'muscle',
  goals text[] not null default array['muscle','fat_loss','strength','endurance','general','mobility']::text[],
  experience_level text not null default 'intermediate',
  sessions_per_week integer not null default 3 check (sessions_per_week between 1 and 7),
  session_minutes integer not null default 60 check (session_minutes between 15 and 180),
  preferred_days text[],
  training_location text,
  equipment_kind text not null default 'commercial_gym',
  current_routine text,
  limitations text,
  height_cm numeric(6,2),
  target_weight_kg numeric(6,2),
  weight_change_rate_kg_per_week numeric(4,2) default 0.65,
  progression_model text not null default 'double_progression',
  progression_config jsonb not null default '{}'::jsonb,
  coaching_tone text not null default 'analytical',
  coaching_config jsonb not null default '{}'::jsonb,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  logging_detail text not null default 'minimal' check (logging_detail in ('minimal', 'standard', 'detailed')),
  photos_enabled boolean not null default true,
  e1rm_formula text not null default 'epley' check (e1rm_formula in ('epley', 'brzycki')),
  rest_timer_enabled boolean not null default true,
  checkin_enabled boolean not null default true,
  cardio_separate boolean not null default true,
  prefill_last boolean not null default true,
  timeframe_months integer not null default 3,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  kind text not null,
  detail text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.goal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  kind text not null,
  exercise_id uuid,
  site text,
  target_value numeric(10,2),
  target_unit text,
  baseline_value numeric(10,2),
  target_date date,
  status text not null default 'active' check (status in ('active', 'achieved', 'archived')),
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);

-- One active body-weight goal per user (onboarding + settings)
create unique index goal_one_active_body_weight_idx
  on public.goal (user_id)
  where kind = 'body_weight' and status = 'active';

create index profile_updated_at_idx on public.profile (updated_at desc);
create index equipment_user_id_idx on public.equipment (user_id);
create index goal_user_id_idx on public.goal (user_id);
create index goal_user_status_idx on public.goal (user_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profile_set_updated_at
before update on public.profile
for each row execute function public.set_updated_at();

-- Create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  insert into public.equipment (user_id, kind, detail, is_active)
  values (new.id, 'commercial_gym', 'Full commercial gym', true);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profile enable row level security;
alter table public.equipment enable row level security;
alter table public.goal enable row level security;

revoke all on table public.profile from anon, authenticated;
revoke all on table public.equipment from anon, authenticated;
revoke all on table public.goal from anon, authenticated;

grant select, update on table public.profile to authenticated;
grant select, insert, update, delete on table public.equipment to authenticated;
grant select, insert, update, delete on table public.goal to authenticated;

-- profile policies (no insert for authenticated — created by trigger)
create policy profile_select_own
  on public.profile for select to authenticated
  using ((select auth.uid()) = id);

create policy profile_update_own
  on public.profile for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy profile_no_delete
  on public.profile for delete to authenticated
  using (false);

-- equipment
create policy equipment_select_own
  on public.equipment for select to authenticated
  using ((select auth.uid()) = user_id);

create policy equipment_insert_own
  on public.equipment for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy equipment_update_own
  on public.equipment for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy equipment_delete_own
  on public.equipment for delete to authenticated
  using ((select auth.uid()) = user_id);

-- goal
create policy goal_select_own
  on public.goal for select to authenticated
  using ((select auth.uid()) = user_id);

create policy goal_insert_own
  on public.goal for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy goal_update_own
  on public.goal for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy goal_delete_own
  on public.goal for delete to authenticated
  using ((select auth.uid()) = user_id);
