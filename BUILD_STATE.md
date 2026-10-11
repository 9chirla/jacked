# BUILD_STATE

Updated: 2026-10-11 — Phase 10 gate passed. Deployment in progress.

## Completed phases

### Phase 0–10 — complete

App through polish/handover; SQL Editor archive `01`–`09` under `supabase/sql-editor/` (`01`–`04` are copies of phase 2–5 migrations, not verified against remote schema). Acceptance matrix in prior BUILD_STATE revision; deferred: Lighthouse + Android install on HTTPS (post-deploy).

## Current work

**Deployed on Vercel** (CLI).

- GitHub (private): https://github.com/9chirla/jacked  
- Production: https://jacked-gold.vercel.app  
- Env: Supabase URL/anon/service role + `ENABLE_DEMO_SEED=false` + `NEXT_PUBLIC_APP_URL`

## Exact next actions

1. Supabase Auth → Site URL = `https://jacked-gold.vercel.app`  
   Redirect URLs += `https://jacked-gold.vercel.app/auth/confirm`
2. If the site asks you to log in with Vercel first: Project → Settings → Deployment Protection → turn off Standard Protection for Production (SSO was `all_except_custom_domains`).
3. Verify magic link + Android install.

## SQL Editor archive

`01`–`09` under `supabase/sql-editor/`. `01`–`04` reconstructed from `supabase/migrations/` (phases 2–5); header on each file notes they are not verified against remote schema. Prefer `supabase/migrations/` as canonical.

## Known / deferred

- Next 16.3.8 + React 19.2.3; soft `Link` (`AppLink`) for primary/section nav is **UNDER TEST** — revert commit `7f59b6c` if `frame.join` / `enqueueModel` returns. Some CTAs remain plain `<a>`.
- LLM off. Post-deploy: A18/A19/A32.
