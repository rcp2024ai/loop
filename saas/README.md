# LOOP SaaS — Phase 2 (planned)

FastAPI backend + pattern-analytics dashboard. **Not started by design** — the spec
defers this until the extension has survived 5+ days of real daily use.

Planned per `docs/LOOP_handover_specification.md` §7.2:

- `POST /api/v1/dump` · `/triage/confirm` · `/checkin` · `/close`
- `GET /api/v1/patterns` · `/weekly-review` · `/analytics`
- `POST /api/v1/sync` (extension → cloud)
- PostgreSQL + Redis on the existing Hostinger VPS, Clerk or Supabase auth
