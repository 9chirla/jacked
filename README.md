# Jacked

Personal fitness partner PWA for one trainee. Android-first (Pixel / Chrome), offline-capable logging, honest analytics from stored data only.

**Status:** Phases 0–10 on `main`. Phase 11 weekly planner on branch `phase-11-planner` (apply `supabase/sql-editor/10_phase11_week_plan.sql` before using `/plan`).

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16.3.8 (App Router) + React 19.2.3 + TypeScript strict |
| UI | Tailwind CSS v4 + Voltage Lime `#C9F24D` |
| Data | Supabase Postgres + Auth + RLS |
| Offline | IndexedDB (`idb`) drafts + outbox + shell SW cache |
| PWA | `public/manifest.webmanifest` + `public/sw.js` |

## Accounts required (minimised)

| Account | Why |
|---------|-----|
| Supabase | Auth + Postgres + private `progress-photos` bucket |
| Hosting (Vercel / Netlify / Cloudflare Pages) | HTTPS for SW & install |
| Optional LLM | Narrated coaching only if you enable it |

## Local development

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Apply SQL from `supabase/sql-editor/` in order (`01`…`10`) if the CLI is unavailable. Prefer `supabase/migrations/` as canonical; `01`–`04` are copies of phase 2–5 migrations and are not verified against a remote schema dump. `10` adds `week_plan` (Phase 11).

## Deploy (Vercel + Supabase)

1. **Repo** — push this project to GitHub (private recommended).
2. **Vercel** — Import the repo (Framework: Next.js). Set env vars (Production + Preview):

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `NEXT_PUBLIC_APP_URL` | Final `https://….vercel.app` (or custom domain), no trailing slash |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — account delete |
| `ENABLE_DEMO_SEED` | `false` |

3. **Supabase Auth** — Authentication → URL configuration:
   - Site URL = `NEXT_PUBLIC_APP_URL`
   - Redirect URLs include `{APP_URL}/auth/confirm`
4. **Redeploy** after setting `NEXT_PUBLIC_APP_URL` if the first deploy used a placeholder.
5. **Verify** — open HTTPS URL → magic link → Settings → Offline → install on Android Chrome.

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (webpack) |
| `npm run build` / `start` | Production |
| `npm run lint` / `typecheck` / `test` | Quality |
| `npm run test:e2e` | Playwright offline smoke |
| `npm run audit:secrets` | Client bundle secret grep (after build) |
| `npm run audit:deps` | `npm audit --omit=dev` |

### Health

`GET /api/health` → `{ ok, service, version, phase }`.

## Backup / restore

Settings → Data: Export JSON (`jacked.export.v1`), CSV zip, import (schema-version checked), account delete (typed `DELETE`, service role). Optional: `pg_dump` / `pg_restore`.

## Offline

Settings → Offline: matrix, simulate offline, sync queue, install button. See `docs/TESTING.md`.

## Documentation

| File | Contents |
|------|----------|
| `BUILD_STATE.md` | Phase progress + A01–A35 matrix |
| `DECISIONS.md` | Non-obvious choices |
| `docs/DATA_MODEL.md` | Schema |
| `docs/CALCULATIONS.md` | Formulas |
| `docs/TESTING.md` | Suites + manual gates |
| `ACCEPTANCE_PHASE11.md` | Phase 11 phone/checklist |
| `CHANGELOG.md` | User-visible changes |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Install prompt missing | SW fetch handler, HTTPS, manifest icons, wait after load |
| `enqueueModel` / `frame.join` | Hard refresh; clear `.next`. Soft `Link` nav is UNDER TEST — revert commit `7f59b6c` if crashes return after soft-nav |
| Export / delete fails | `export_log` SQL applied; `SUPABASE_SERVICE_ROLE_KEY` set |
| Photo upload fails | Paste `09_phase10_progress_photos.sql` |
