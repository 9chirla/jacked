# Known issues

Living debt list. Do not “fix” crash-sensitive items without an explicit decision.

## Lint baseline (`eslint .`, 2026-10-11)

**7 problems (5 errors, 2 warnings)** — not blocking CI (no lint gate in GitHub Actions).

### Errors (`react-hooks/set-state-in-effect`)

| File | Line | Note |
|------|------|------|
| `src/components/workout/WorkoutLogger.tsx` | 103 | `setPortalReady(true)` / `setNow` in mount effect. Introduced in `9ed1426`. **Do not refactor** — flagged crash-sensitive (Flight / hydration). Unchanged by delete/perf commits. |
| `src/components/analytics/ExerciseHistoryChart.tsx` | 71 | Client-only mount `setReady(true)` (chart hydration guard). |
| `src/components/progress/WeightTrendChart.tsx` | 85 | Same pattern as exercise chart. |
| `src/components/pwa/InstallPrompt.tsx` | 20 | `setStandalone` from `matchMedia` in effect. |
| `src/components/pwa/SyncProvider.tsx` | 114 | `refreshOnline()` in boot effect. |

### Warnings

| File | Line | Note |
|------|------|------|
| `src/components/progress/ProgressPhotos.tsx` | 46 | Unused `eslint-disable` for `react-hooks/exhaustive-deps`. |
| `src/components/pwa/SyncProvider.tsx` | 48 | Unused `_value` in default context stub. |

## Schema / SQL archives

- `supabase/sql-editor/01`–`04` are **unverified copies** of phase 2–5 files under `supabase/migrations/` (headers say so). Prefer migrations as canonical.
- **Remote schema vs migrations not verified** (Supabase CLI was not linked / no schema dump at archive time).

## Soft navigation (UNDER TEST)

- Primary/section nav uses Next `Link` via `AppLink` (`prefetch` default false) on **Next 16.3.8 / React 19.2.3**.
- If `frame.join` / `enqueueModel` crashes return, revert soft-nav commit **`7f59b6c`** (`perf: restore soft navigation with Link and SW v4`).
- Nav pending bar: hash-only ignored; 8s safety clear (`c56a363`).

## Other

- Git ↔ Vercel auto-deploy: often CLI-only; confirm project Git connection before relying on push-to-deploy.
- Playwright coverage is largely offline-page smoke, not full auth/workout journeys.
