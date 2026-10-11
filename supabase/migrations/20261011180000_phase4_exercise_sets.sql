-- Phase 4: set logging, session totals recompute, previous-performance helpers

alter table public.workout_session
  add column if not exists fatigue_before integer check (fatigue_before is null or fatigue_before between 1 and 5),
  add column if not exists soreness_after integer check (soreness_after is null or soreness_after between 1 and 5),
  add column if not exists mood_after integer check (mood_after is null or mood_after between 1 and 5);

create table public.exercise_set (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercise(id) on delete cascade,
  user_id uuid not null references public.profile(id) on delete cascade,
  set_number integer not null check (set_number >= 1),
  load numeric(7,2),
  reps integer check (reps is null or (reps >= 0 and reps <= 1000)),
  rpe numeric(3,1) check (rpe is null or (rpe between 1 and 10)),
  rir integer check (rir is null or (rir between 0 and 10)),
  tempo text,
  duration_seconds integer,
  distance_m numeric(9,2),
  rest_seconds integer,
  note text,
  kind text not null default 'working'
    check (kind in ('warmup','working','drop','failure','isometric','amrap')),
  is_pr boolean not null default false,
  completed_at timestamptz,
  source text not null default 'manual'
    check (source in ('manual','prefill','import','demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_exercise_id, set_number)
);

create index exercise_set_user_completed_idx on public.exercise_set (user_id, completed_at desc);
create index exercise_set_session_exercise_idx on public.exercise_set (session_exercise_id);

create trigger exercise_set_set_updated_at
before update on public.exercise_set
for each row execute function public.set_updated_at();

-- Recompute session totals from working sets only
create or replace function public.recompute_session_totals(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_volume numeric(12,2);
  v_reps integer;
  v_sets integer;
begin
  select
    coalesce(sum(case when s.kind = 'working' and s.load is not null and s.reps is not null
      then s.load * s.reps else 0 end), 0),
    coalesce(sum(case when s.kind = 'working' and s.reps is not null then s.reps else 0 end), 0),
    coalesce(sum(case when s.kind = 'working' and s.completed_at is not null then 1 else 0 end), 0)
  into v_volume, v_reps, v_sets
  from public.exercise_set s
  join public.session_exercise se on se.id = s.session_exercise_id
  where se.session_id = p_session_id;

  update public.workout_session
  set
    total_volume = v_volume,
    total_reps = v_reps,
    total_working_sets = v_sets,
    updated_at = now()
  where id = p_session_id;
end;
$$;

create or replace function public.exercise_set_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid uuid;
begin
  if tg_op = 'DELETE' then
    select session_id into sid from public.session_exercise where id = old.session_exercise_id;
  else
    select session_id into sid from public.session_exercise where id = new.session_exercise_id;
  end if;
  if sid is not null then
    perform public.recompute_session_totals(sid);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger exercise_set_recompute
after insert or update or delete on public.exercise_set
for each row execute function public.exercise_set_after_change();

-- Renumber sets after delete (keeps 1..n contiguous)
create or replace function public.renumber_sets(p_session_exercise_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  with ordered as (
    select id, row_number() over (order by set_number, created_at) as new_num
    from public.exercise_set
    where session_exercise_id = p_session_exercise_id
  )
  update public.exercise_set s
  set set_number = ordered.new_num
  from ordered
  where s.id = ordered.id
    and s.set_number is distinct from ordered.new_num;
end;
$$;

revoke all on function public.recompute_session_totals(uuid) from public;
revoke all on function public.renumber_sets(uuid) from public;
grant execute on function public.recompute_session_totals(uuid) to authenticated;
grant execute on function public.renumber_sets(uuid) to authenticated;

-- RLS: own row AND own parent session (via session_exercise)
create or replace function public.owns_session_exercise(p_session_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.session_exercise se
    join public.workout_session ws on ws.id = se.session_id
    where se.id = p_session_exercise_id
      and ws.user_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_session_exercise(uuid) from public;
grant execute on function public.owns_session_exercise(uuid) to authenticated;

alter table public.exercise_set enable row level security;
revoke all on table public.exercise_set from anon, authenticated;
grant select, insert, update, delete on table public.exercise_set to authenticated;

create policy exercise_set_select_own on public.exercise_set for select to authenticated
  using (
    (select auth.uid()) = user_id
    and public.owns_session_exercise(session_exercise_id)
  );
create policy exercise_set_insert_own on public.exercise_set for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.owns_session_exercise(session_exercise_id)
  );
create policy exercise_set_update_own on public.exercise_set for update to authenticated
  using (
    (select auth.uid()) = user_id
    and public.owns_session_exercise(session_exercise_id)
  )
  with check (
    (select auth.uid()) = user_id
    and public.owns_session_exercise(session_exercise_id)
  );
create policy exercise_set_delete_own on public.exercise_set for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and public.owns_session_exercise(session_exercise_id)
  );
