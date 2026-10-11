-- Phase 3: exercise library, templates, minimal session start path

create table public.exercise (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  name text not null,
  slug text not null,
  category text not null
    check (category in ('barbell','dumbbell','machine','bodyweight','band','cardio','isometric','cable')),
  primary_pattern text
    check (primary_pattern is null or primary_pattern in ('push','pull','squat','hinge','carry','core','cardio','other')),
  muscle_groups text[] not null default '{}',
  equipment_required text[] not null default '{}',
  metric text not null default 'reps_load'
    check (metric in ('reps_load','reps_bodyweight','duration','distance','duration_load')),
  is_bodyweight boolean not null default false,
  is_custom boolean not null default false,
  rep_range_low integer,
  rep_range_high integer,
  default_rest_seconds integer not null default 90,
  progression_increment numeric(6,2),
  contraindications text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.workout_template (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  name text not null,
  day_label text,
  planned_weekday integer check (planned_weekday is null or planned_weekday between 0 and 6),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.template_item (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_template(id) on delete cascade,
  exercise_id uuid not null references public.exercise(id) on delete restrict,
  sort_order integer not null default 0,
  target_sets integer not null default 3,
  target_reps_low integer,
  target_reps_high integer,
  target_load numeric(7,2),
  target_rpe numeric(3,1),
  rest_seconds integer,
  note text,
  unique (template_id, sort_order)
);

-- Minimal session tables so a template can be "started" (full set logging in Phase 4)
create table public.workout_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile(id) on delete cascade,
  template_id uuid references public.workout_template(id) on delete set null,
  status text not null default 'planned'
    check (status in ('planned','in_progress','paused','completed','abandoned')),
  started_at timestamptz,
  completed_at timestamptz,
  scheduled_for date,
  duration_seconds integer,
  total_volume numeric(12,2) not null default 0,
  total_reps integer not null default 0,
  total_working_sets integer not null default 0,
  session_rpe numeric(3,1),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_uuid uuid,
  unique (user_id, client_uuid)
);

create table public.session_exercise (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_session(id) on delete cascade,
  exercise_id uuid not null references public.exercise(id) on delete restrict,
  sort_order integer not null default 0,
  is_substitute boolean not null default false,
  substituted_for uuid references public.session_exercise(id),
  target_note text,
  unique (session_id, sort_order)
);

create index exercise_user_id_idx on public.exercise (user_id);
create index exercise_user_archived_idx on public.exercise (user_id, archived_at);
create index workout_template_user_id_idx on public.workout_template (user_id);
create index template_item_template_id_idx on public.template_item (template_id);
create index template_item_exercise_id_idx on public.template_item (exercise_id);
create index workout_session_user_started_idx on public.workout_session (user_id, started_at desc);
create index workout_session_user_status_idx on public.workout_session (user_id, status);
create index session_exercise_session_id_idx on public.session_exercise (session_id);
create index session_exercise_exercise_id_idx on public.session_exercise (exercise_id);

create trigger workout_session_set_updated_at
before update on public.workout_session
for each row execute function public.set_updated_at();

-- Seed commercial-gym library + Full Body A/B for a user (idempotent).
-- Only the owning user (or trigger/backfill with no JWT) may seed.
create or replace function public.seed_commercial_gym_library(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing int;
  ex record;
  template_a uuid;
  template_b uuid;
  sort_i int;
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  select count(*)::int into existing from public.exercise where user_id = p_user_id;
  if existing > 0 then
    return;
  end if;

  insert into public.exercise (
    user_id, name, slug, category, primary_pattern, muscle_groups, equipment_required,
    metric, is_bodyweight, is_custom, rep_range_low, rep_range_high, default_rest_seconds, progression_increment
  ) values
    (p_user_id, 'Back Squat', 'back-squat', 'barbell', 'squat', array['quads','glutes','core'], array['barbell','rack'], 'reps_load', false, false, 6, 12, 180, 5),
    (p_user_id, 'Romanian Deadlift', 'romanian-deadlift', 'barbell', 'hinge', array['hamstrings','glutes','back'], array['barbell'], 'reps_load', false, false, 6, 12, 150, 5),
    (p_user_id, 'Bench Press', 'bench-press', 'barbell', 'push', array['chest','triceps','shoulders'], array['barbell','bench'], 'reps_load', false, false, 6, 12, 150, 2.5),
    (p_user_id, 'Overhead Press', 'overhead-press', 'barbell', 'push', array['shoulders','triceps','core'], array['barbell'], 'reps_load', false, false, 6, 12, 150, 2.5),
    (p_user_id, 'Barbell Row', 'barbell-row', 'barbell', 'pull', array['back','biceps'], array['barbell'], 'reps_load', false, false, 6, 12, 120, 2.5),
    (p_user_id, 'Lat Pulldown', 'lat-pulldown', 'cable', 'pull', array['back','biceps'], array['cable'], 'reps_load', false, false, 8, 12, 90, 2.5),
    (p_user_id, 'Seated Cable Row', 'seated-cable-row', 'cable', 'pull', array['back','biceps'], array['cable'], 'reps_load', false, false, 8, 12, 90, 2.5),
    (p_user_id, 'Leg Press', 'leg-press', 'machine', 'squat', array['quads','glutes'], array['machine'], 'reps_load', false, false, 8, 12, 120, 5),
    (p_user_id, 'Leg Curl', 'leg-curl', 'machine', 'hinge', array['hamstrings'], array['machine'], 'reps_load', false, false, 10, 15, 90, 2.5),
    (p_user_id, 'Leg Extension', 'leg-extension', 'machine', 'squat', array['quads'], array['machine'], 'reps_load', false, false, 10, 15, 90, 2.5),
    (p_user_id, 'Dumbbell Lateral Raise', 'db-lateral-raise', 'dumbbell', 'push', array['shoulders'], array['dumbbell'], 'reps_load', false, false, 10, 15, 75, 2),
    (p_user_id, 'Dumbbell Curl', 'db-curl', 'dumbbell', 'pull', array['biceps'], array['dumbbell'], 'reps_load', false, false, 10, 15, 75, 2),
    (p_user_id, 'Triceps Pushdown', 'triceps-pushdown', 'cable', 'push', array['triceps'], array['cable'], 'reps_load', false, false, 10, 15, 75, 2.5),
    (p_user_id, 'Cable Face Pull', 'cable-face-pull', 'cable', 'pull', array['shoulders','upper_back'], array['cable'], 'reps_load', false, false, 12, 15, 75, 2.5),
    (p_user_id, 'Plank', 'plank', 'bodyweight', 'core', array['core'], array['bodyweight'], 'duration', true, false, null, null, 60, null),
    (p_user_id, 'Walking Lunge', 'walking-lunge', 'dumbbell', 'squat', array['quads','glutes'], array['dumbbell'], 'reps_load', false, false, 8, 12, 90, 2),
    (p_user_id, 'Hip Thrust', 'hip-thrust', 'barbell', 'hinge', array['glutes','hamstrings'], array['barbell','bench'], 'reps_load', false, false, 6, 12, 120, 5),
    (p_user_id, 'Pull-Up', 'pull-up', 'bodyweight', 'pull', array['back','biceps'], array['pullup_bar'], 'reps_bodyweight', true, false, 4, 10, 150, 2.5),
    (p_user_id, 'Incline Treadmill Walk', 'incline-treadmill-walk', 'cardio', 'cardio', array['cardio'], array['treadmill'], 'duration', false, false, null, null, 0, null),
    (p_user_id, 'Bike Erg', 'bike-erg', 'cardio', 'cardio', array['cardio'], array['bike'], 'duration', false, false, null, null, 0, null);

  insert into public.workout_template (user_id, name, day_label, sort_order)
  values (p_user_id, 'Full Body A', 'A', 0)
  returning id into template_a;

  insert into public.workout_template (user_id, name, day_label, sort_order)
  values (p_user_id, 'Full Body B', 'B', 1)
  returning id into template_b;

  sort_i := 0;
  for ex in
    select id, slug from public.exercise
    where user_id = p_user_id
      and slug in ('back-squat','bench-press','barbell-row','romanian-deadlift','lat-pulldown','db-lateral-raise','plank')
    order by array_position(
      array['back-squat','bench-press','barbell-row','romanian-deadlift','lat-pulldown','db-lateral-raise','plank'],
      slug
    )
  loop
    insert into public.template_item (template_id, exercise_id, sort_order, target_sets, target_reps_low, target_reps_high, rest_seconds)
    values (
      template_a, ex.id, sort_i, 3,
      case when ex.slug = 'plank' then null else 8 end,
      case when ex.slug = 'plank' then null else 12 end,
      case when ex.slug in ('back-squat','bench-press') then 150 else 90 end
    );
    sort_i := sort_i + 1;
  end loop;

  sort_i := 0;
  for ex in
    select id, slug from public.exercise
    where user_id = p_user_id
      and slug in ('romanian-deadlift','overhead-press','seated-cable-row','leg-press','pull-up','triceps-pushdown','cable-face-pull')
    order by array_position(
      array['romanian-deadlift','overhead-press','seated-cable-row','leg-press','pull-up','triceps-pushdown','cable-face-pull'],
      slug
    )
  loop
    insert into public.template_item (template_id, exercise_id, sort_order, target_sets, target_reps_low, target_reps_high, rest_seconds)
    values (template_b, ex.id, sort_i, 3, 6, 12, 120);
    sort_i := sort_i + 1;
  end loop;
end;
$$;

revoke all on function public.seed_commercial_gym_library(uuid) from public;
grant execute on function public.seed_commercial_gym_library(uuid) to authenticated;

-- Break RLS recursion for child tables
create or replace function public.owns_template(p_template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_template t
    where t.id = p_template_id and t.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_session s
    where s.id = p_session_id and s.user_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_template(uuid) from public;
revoke all on function public.owns_session(uuid) from public;
grant execute on function public.owns_template(uuid) to authenticated;
grant execute on function public.owns_session(uuid) to authenticated;

-- Call seed after profile insert for commercial gym users
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
  perform public.seed_commercial_gym_library(new.id);
  return new;
end;
$$;

-- Backfill existing users who have no exercises yet
do $$
declare
  r record;
begin
  for r in select id from public.profile loop
    perform public.seed_commercial_gym_library(r.id);
  end loop;
end $$;

-- RLS
alter table public.exercise enable row level security;
alter table public.workout_template enable row level security;
alter table public.template_item enable row level security;
alter table public.workout_session enable row level security;
alter table public.session_exercise enable row level security;

revoke all on table public.exercise from anon, authenticated;
revoke all on table public.workout_template from anon, authenticated;
revoke all on table public.template_item from anon, authenticated;
revoke all on table public.workout_session from anon, authenticated;
revoke all on table public.session_exercise from anon, authenticated;

grant select, insert, update, delete on table public.exercise to authenticated;
grant select, insert, update, delete on table public.workout_template to authenticated;
grant select, insert, update, delete on table public.template_item to authenticated;
grant select, insert, update, delete on table public.workout_session to authenticated;
grant select, insert, update, delete on table public.session_exercise to authenticated;

-- exercise policies
create policy exercise_select_own on public.exercise for select to authenticated
  using ((select auth.uid()) = user_id);
create policy exercise_insert_own on public.exercise for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy exercise_update_own on public.exercise for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy exercise_delete_own on public.exercise for delete to authenticated
  using ((select auth.uid()) = user_id);

-- workout_template
create policy workout_template_select_own on public.workout_template for select to authenticated
  using ((select auth.uid()) = user_id);
create policy workout_template_insert_own on public.workout_template for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy workout_template_update_own on public.workout_template for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy workout_template_delete_own on public.workout_template for delete to authenticated
  using ((select auth.uid()) = user_id);

-- template_item via owning template (security-definer helper avoids RLS recursion)
create policy template_item_select_own on public.template_item for select to authenticated
  using (public.owns_template(template_id));
create policy template_item_insert_own on public.template_item for insert to authenticated
  with check (public.owns_template(template_id));
create policy template_item_update_own on public.template_item for update to authenticated
  using (public.owns_template(template_id))
  with check (public.owns_template(template_id));
create policy template_item_delete_own on public.template_item for delete to authenticated
  using (public.owns_template(template_id));

-- workout_session
create policy workout_session_select_own on public.workout_session for select to authenticated
  using ((select auth.uid()) = user_id);
create policy workout_session_insert_own on public.workout_session for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy workout_session_update_own on public.workout_session for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy workout_session_delete_own on public.workout_session for delete to authenticated
  using ((select auth.uid()) = user_id);

-- session_exercise via owning session
create policy session_exercise_select_own on public.session_exercise for select to authenticated
  using (public.owns_session(session_id));
create policy session_exercise_insert_own on public.session_exercise for insert to authenticated
  with check (public.owns_session(session_id));
create policy session_exercise_update_own on public.session_exercise for update to authenticated
  using (public.owns_session(session_id))
  with check (public.owns_session(session_id));
create policy session_exercise_delete_own on public.session_exercise for delete to authenticated
  using (public.owns_session(session_id));
