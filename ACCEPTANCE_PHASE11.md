# Phase 11 acceptance — weekly planner

| ID | Step | Expected |
|----|------|----------|
| P11-01 | Apply `supabase/sql-editor/10_phase11_week_plan.sql` in Supabase SQL Editor | `week_plan` table + RLS exist |
| P11-02 | Open `/plan` on Sunday (or any day) | Seven day chips; past days disabled |
| P11-03 | Tap 3 free days → Confirm | Redirect Today; week strip shows planned days |
| P11-04 | Tap >3 free days | Copy mentions best 3 spread out |
| P11-05 | Tap <3 free days | Plans that many sessions |
| P11-06 | Skip this week | Today shows skipped + re-plan CTA |
| P11-07 | Start Next session from Today | Opens logger; plan day gets session_id |
| P11-08 | Finish session | Plan day status `done`; next template continues rotation |
| P11-09 | Abandon/discard session | Rotation / done status does not advance |
| P11-10 | Miss a planned day (date passes) → Reschedule | Moves remaining onto free days or marks missed |
| P11-11 | Start off-plan template from Today list | Still works; may append done day on finish |
| P11-12 | Airplane mode: open Today with cached plan | Strip visible from IDB after prior online save |
| P11-13 | Offline: Confirm plan on `/plan` | Queued; Sync now / reconnect flushes |
| P11-14 | Settings → About → Download Sunday .ics | File opens in Calendar; weekly SU + VALARM |
| P11-15 | Export JSON | Includes `tables.week_plan` |
| P11-16 | Soft-nav tabs after plan save | No `frame.join` / `enqueueModel` overlay |

## Phone notes

- Hard-refresh or reinstall PWA after deploy so SW/cache pick up `/plan`.
- Calendar .ics is a reminder, not a Jacked push notification.
