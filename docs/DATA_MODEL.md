# Data model

Canonical storage units: **kg** and **cm**. Display units live on `profile`.

Migrations: `supabase/migrations/`. SQL Editor archive: `supabase/sql-editor/01`–`09`.

Every exposed table: RLS on, default grants revoked, policies for `authenticated` via `(select auth.uid())`.

## Tables (ownership)

| Table | Owner key | Notes |
|-------|-----------|-------|
| `profile` | `id` → `auth.users` | Trigger-created; UPDATE only for clients |
| `equipment` | `user_id` | |
| `goal` | `user_id` | |
| `exercise` | `user_id` | Archive via `archived_at` |
| `workout_template` | `user_id` | |
| `template_item` | via template | |
| `workout_session` | `user_id` | `client_uuid` for idempotency |
| `session_exercise` | via session | |
| `exercise_set` | `user_id` | Working sets drive volume/PRs |
| `body_weight_entry` | `user_id` | Unique per `logged_date` |
| `body_measurement` | `user_id` | |
| `progression_override` | `user_id` | |
| `daily_check_in` | `user_id` | Coach recovery |
| `export_log` | `user_id` | Insert/select only |
| `sync_conflict` | `user_id` | Offline conflict audit |
| `progress_photo` | `user_id` | Metadata; files in Storage |

## Storage

| Bucket | Public | Path |
|--------|--------|------|
| `progress-photos` | No | `{user_id}/{date}-{uuid}.ext` + signed URLs |

## Cascade

Deleting `auth.users` → `profile` ON DELETE CASCADE → all owned rows. Photo objects should be removed by app delete path; account delete removes metadata via cascade (storage objects cleaned when `deleteProgressPhoto` or account wipe scripts run).
