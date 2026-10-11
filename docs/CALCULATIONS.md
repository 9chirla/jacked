# Calculations

Implemented with Vitest coverage under `src/lib/calculations/` and `src/lib/analytics/`.

| Topic | Rule | Module |
|-------|------|--------|
| Session volume | Working sets only: `load × reps` | `volume.ts` |
| Working set count | Completed working sets | `volume.ts` |
| Estimated 1RM | Epley (default) / Brzycki; labelled estimated, never stored as measured PR | `prs.ts` / profile `e1rm_formula` |
| Measured PR | Best completed working set by load (same reps band rules on save) | `pr-detection` + `is_pr` |
| Warm-up | Excluded from volume, working count, PR | set `kind` |
| Double progression | Hit top of range → add load; else add reps | `progression.ts` |
| Body-weight average | 7-day centred rolling; **no** interpolation of missing days; labelled derived | `rolling-average.ts` |
| Units | `kg↔lb` 0.45359237; `cm↔in` 2.54; round-trip tests | `units.ts` |
| Streaks | ISO weeks with ≥1 completed session; informational only | `streaks.ts` |
| Weekly volume | ISO weeks, clipped before first session | `weekly-volume.ts` |

Coach claims must cite these aggregates only — empty account → empty claims (`build-coach.test.ts`).
