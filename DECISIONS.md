# Decisions

## Stack (seeded from master prompt §§4–5)

| Choice | Decision | Rejected alternative | Why |
|--------|----------|----------------------|-----|
| Framework | Next.js 16 App Router + TypeScript strict | SPA-only Vite | RSC/route handlers keep auth & aggregates off-device; one codebase for browser + PWA |
| Styling | Tailwind CSS v4 + CSS custom properties | CSS Modules only | Fast mobile iteration; tokens for light/dark clinical theme |
| Database (Phase 2+) | Supabase Postgres + RLS | Firebase; local-only IDB | Relational sets + SQL analytics; free tier; remote backup path |
| Auth (Phase 2+) | Supabase Auth (magic link preferred) | OAuth sprawl | Minimal accounts; one identity |
| ORM (Phase 2+) | Drizzle preferred, one access path | Mixed Supabase client + raw SQL ad hoc | Typed schema, portable SQL |
| Charts | Hand-rolled SVG/bar first; Recharts only if needed | Chart.js + random samples | Every point must bind to a row |
| Offline | IndexedDB (`idb`) + outbox (Phase 9) | Local-only sole store | Gym signal is poor; phone wipe must not erase years |
| Hosting | Vercel / Netlify / Cloudflare Pages | Self-host initially | Free HTTPS required for SW/install |
| Validation | Zod shared client/server (Phase 2+) | Ad hoc checks | One validity definition |
| Testing | Vitest + Playwright + pgTAP | Jest-only | Calculations, journeys, RLS are the failure modes |

## Phase 2 runtime

| Choice | Decision | Why |
|--------|----------|-----|
| Cache Components | Off (`cacheComponents: false`) | Auth layouts + `@supabase/ssr` hit `Date.now()` during prerender; Next 16.4 then throws blocking-route errors and a broken `frame.join` overlay. Classic cookie-dynamic rendering is reliable for this app. |
| Next version | `16.3.8` (pinned from 16.4.0) | 16.4.0 + React 19.3 Flight overlay repeatedly threw `frame.join` / `.stack` on soft navigations and after server actions. |
| React | `19.2.3` (not 19.3.0) | 19.3.0 + Next 16.3 Flight soft-nav threw `chunk.reason.enqueueModel is not a function` after Progress hydration mismatches. |
| Logger clock | `now` state starts `null`, set in `useEffect` | `useState(() => Date.now())` SSR/client mismatch → hydration → Flight `enqueueModel` |
| error.tsx | No `useRouter`; plain `<a href>` | Router recovery in the error boundary worsened bad Flight error chunks |
| Dev bundler | Webpack (`next dev --webpack`) | Safer than Turbopack for this app on 16.3/16.4. PostCSS Tailwind for webpack; `npm run dev:turbo` optional. |
| After server actions | No `router.refresh()` | `revalidatePath` already returns a fresh RSC payload; a second refresh double-fetches Flight. |
| error.tsx | Minimal, no effect/logging | Logging or auto-`retry()` on Flight error proxies makes the Next overlay read `.stack` on undefined. |

## Phase 10 polish

| Choice | Decision | Why |
|--------|----------|-----|
| Photos | Private `progress-photos` bucket + signed URLs | Spec: no public objects; path prefixed with `auth.uid()` |
| Secret audit | Grep `.next/static` after build | A15 — service role must never ship to client |
| Nav | Full document loads (`<a>`) | Avoid Flight `enqueueModel` / `frame.join` on 16.3.8 |

## Phase 9 offline / PWA

| Choice | Decision | Why |
|--------|----------|-----|
| Write path | IDB draft + outbox enqueue, then network | Spec §5 — UI never blocks on network; failed save ≠ success |
| Backoff | Exponential + jitter, 15m cap | Replay without thundering herd |
| Conflicts | `sync_conflict` + choose local/server | No LWW on completed workouts |
| SW register | Secure contexts incl. localhost | Needed to verify install/offline before deploy |
| Update banner | Hidden on `/log/[sessionId]` | Never interrupt an in-progress session |
| Primary + section nav | Plain `<a>` (not Next `Link`) | Soft-nav Flight crashes (`frame.join` / `enqueueModel`) on 16.3.8 |

## Phase 8 data ownership

| Choice | Decision | Why |
|--------|----------|-----|
| Export schema | `jacked.export.v1` constant | Import hard-rejects unknown versions |
| CSV packaging | Uncompressed STORE zip, one file/table | No zip dependency; spreadsheet-friendly |
| Account delete | Service-role `deleteUser` | Profile references `auth.users` ON DELETE CASCADE |
| Import | Upsert by id; force `user_id`; profile = UPDATE only | Profile has no INSERT grant (trigger-owned); skips `export_log` |

## Phase 6 analytics

| Choice | Decision | Why |
|--------|----------|-----|
| PR write path | Update `is_pr` on set save/delete | Spec §10.4 — detection on save, not on render |
| Estimated 1RM | Epley, computed for display, never stored as measured PR | Keeps measured vs estimated lists separated |
| Streaks | ISO weeks with ≥1 completion; informational copy only | Spec §10.8 — no streak-shaming |
| Charts | Hand-rolled SVG/bars + table toggle | Every point must bind to a stored row |
| Chart mount | Client-only after `useEffect` | SVG/aria hydration mismatches on Next 16 Flight cascade into `enqueueModel` / `frame.join` overlay crashes |
| Form dates | Server-passed `defaultDate` YYYY-MM-DD | Avoid `new Date()` in client `useState` init |
| `.motion-settle` | Opacity-only animation | `transform` + `animation-fill-mode: both` trapped `position:fixed` keypad off-screen |
| Logger overlays | `createPortal(..., document.body)` | Keypad/finish sheet must escape page layout |
| Server actions to client | Pass as props from RSC | Avoids stale action IDs after `.next` wipe / HMR |

## Phase 7 coach

| Choice | Decision | Why |
|--------|----------|-----|
| Coach engine | Pure `buildCoachReport` over aggregates | Every sentence must be falsifiable; empty account proves no fabrication |
| Provenance | Show `source=` under each claim | Spec: every sentence traceable to a stored aggregate |
| Check-in | `daily_check_in` one row/day | Feeds recovery copy + progression modulation |
| Discomfort text | Verbatim only; keyword → one safety line | No diagnosis / classification |
| LLM narration | Off by default; no client key | App fully functional without it |
| Deferred metrics | Photos / steps / nutrition = empty states | Selected in onboarding but no data source yet |

## Phase 1 product choices

| Choice | Decision | Why |
|--------|----------|-----|
| Product name | Jacked | Matches workspace; short_name ≤ 12 chars |
| Manifest location | `public/manifest.webmanifest` | Spec §13.1; linked via `metadata.manifest` |
| Service worker | Hand-written `public/sw.js` stub | Chrome installability needs a fetch handler; full offline in Phase 9 |
| Theme storage | `localStorage` key `jacked.theme` | Works before auth/profile exists |
| Nav IA | Today · History · Log · Progress · Coach; Settings in header | ≤5 bottom items; Settings is real but secondary |
| Fonts | Bricolage Grotesque / IBM Plex Sans / IBM Plex Mono via `next/font` | Self-hosted at build; clinical + tabular numerals |

## Cost triggers (disclose)

- Supabase free: ~500 MB DB, project pause after 7 days of **no database activity**
- Moving to Pro (~$25/mo) if storage exceeds free tier or automated daily backups are required
- Optional LLM narration: user-provided key; expect ≪ $1/mo at personal volume when enabled
