# Testing

| Layer | Command | Notes |
|-------|---------|-------|
| Unit | `npm test` | Volume, e1RM, progression, units, coach, export, outbox |
| Types | `npm run typecheck` | |
| Lint | `npm run lint` | |
| E2E offline | `npm run test:e2e` | Playwright 360×800; `/offline` smoke |
| Secret leak | `npm run build && npm run audit:secrets` | Greps `.next/static` |
| Deps | `npm run audit:deps` | |
| RLS | `supabase test db` (local) or SQL Editor allow/deny | Phase 2+ tables |
| Headers | `curl -sI http://localhost:3000` | CSP, nosniff, Referrer-Policy |

## Manual gate notes

- Offline: Settings → Offline → Simulate offline → log set/weigh-in → turn off → Sync now.
- Install: Chrome Android on HTTPS deploy → Install / Add to Home Screen → standalone.
- Logging interaction budget: 5 exercises × 3 sets, one-handed, 360×800, target &lt; 90s.
