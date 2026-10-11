-- Tighten exercise_set RLS: must own the parent workout_session via session_exercise

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

drop policy if exists exercise_set_select_own on public.exercise_set;
drop policy if exists exercise_set_insert_own on public.exercise_set;
drop policy if exists exercise_set_update_own on public.exercise_set;
drop policy if exists exercise_set_delete_own on public.exercise_set;

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
