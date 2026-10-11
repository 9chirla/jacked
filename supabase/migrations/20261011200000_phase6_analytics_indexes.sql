-- Phase 6: analytics query indexes (no schema shape change)

create index if not exists exercise_set_user_pr_idx
  on public.exercise_set (user_id, completed_at desc)
  where is_pr = true;

create index if not exists exercise_set_user_kind_completed_idx
  on public.exercise_set (user_id, kind, completed_at desc)
  where completed_at is not null;

create index if not exists workout_session_user_completed_at_idx
  on public.workout_session (user_id, completed_at desc)
  where status = 'completed';
