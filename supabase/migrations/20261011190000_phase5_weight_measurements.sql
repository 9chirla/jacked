-- Phase 5: body weight, measurements, progression overrides

create table public.body_weight_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  logged_at timestamptz not null default now(),
  logged_date date not null,
  weight_kg numeric(6,2) not null check (weight_kg between 20 and 400),
  context text check (context is null or context in ('fasted','post_workout','evening')),
  note text,
  source text not null default 'manual'
    check (source in ('manual','import','demo','onboarding')),
  created_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

create index body_weight_entry_user_date_idx
  on public.body_weight_entry (user_id, logged_date desc);

create table public.body_measurement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  logged_date date not null,
  site text not null,
  value_cm numeric(6,2) not null check (value_cm between 5 and 300),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, logged_date, site)
);

create index body_measurement_user_date_idx
  on public.body_measurement (user_id, logged_date desc);

create table public.progression_override (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  exercise_id uuid not null references public.exercise(id) on delete cascade,
  load numeric(7,2),
  target_reps_low integer,
  target_reps_high integer,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

alter table public.body_weight_entry enable row level security;
alter table public.body_measurement enable row level security;
alter table public.progression_override enable row level security;

revoke all on table public.body_weight_entry from anon, authenticated;
revoke all on table public.body_measurement from anon, authenticated;
revoke all on table public.progression_override from anon, authenticated;

grant select, insert, update, delete on table public.body_weight_entry to authenticated;
grant select, insert, update, delete on table public.body_measurement to authenticated;
grant select, insert, update, delete on table public.progression_override to authenticated;

create policy body_weight_entry_select_own on public.body_weight_entry for select to authenticated
  using ((select auth.uid()) = user_id);
create policy body_weight_entry_insert_own on public.body_weight_entry for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy body_weight_entry_update_own on public.body_weight_entry for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy body_weight_entry_delete_own on public.body_weight_entry for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy body_measurement_select_own on public.body_measurement for select to authenticated
  using ((select auth.uid()) = user_id);
create policy body_measurement_insert_own on public.body_measurement for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy body_measurement_update_own on public.body_measurement for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy body_measurement_delete_own on public.body_measurement for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy progression_override_select_own on public.progression_override for select to authenticated
  using ((select auth.uid()) = user_id);
create policy progression_override_insert_own on public.progression_override for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy progression_override_update_own on public.progression_override for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy progression_override_delete_own on public.progression_override for delete to authenticated
  using ((select auth.uid()) = user_id);
