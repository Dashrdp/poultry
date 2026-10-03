# Roadmap — Poultry Farm

Track phases here. Update checkboxes and dates when a phase completes. Active work: [../MEMORY.md](../MEMORY.md). Living checklist: [../TODO-LIST.md](../TODO-LIST.md). Product design: [superpowers/specs/2026-10-01-poultry-saas-product-design.md](superpowers/specs/2026-10-01-poultry-saas-product-design.md).

## Phase 0 — Scaffold (done)

- [x] Vite React + TypeScript + Kumo frontend
- [x] FastAPI backend with CORS, `/health`, `/api/hello`
- [x] Root README setup/run docs
- [x] Vibe-coding docs stack (PRD, architecture, AGENTS, etc.)
- [x] Owner dashboard UI + mock `/api/farms` + `/api/dashboard` (hybrid)
- [x] Product design lock + root TODO-LIST (2026-10-01)

## Phase 1 — Auth & tenancy (done)

- [x] Customer + User model (Owner, Farm Manager) in SQLite
- [x] HTTP-only cookie login + protected API
- [x] Frontend login + role-aware navigation
- [x] Customer-scoped access on all farm routes (session user; mock farms still shared seed)
- [x] Seed Owner accounts (SaaS operator provisions; admin UI later)

**Exit:** Owner and Manager can log in; unauthorized / cross-tenant access blocked. Dashboard may still use mocks until Phase 2–3 wire data.


## Phase 2 — Daily ops

- [x] Farm and shed CRUD (Owner)
- [x] Manager↔Farm assignment (Owner assigns; Manager scoped)
- [x] Daily shed log: eggs + deaths → live auto-subtract; live override
- [x] Godown feed in/out movements; computed stock (kg; UI quintal)
- [ ] Farm/shed overview for monitoring

**Exit:** Manager logs today’s shed + feed on tablet; Owner sees latest status.

## Phase 3 — Analytics

- [x] Wire Owner dashboard to real aggregates (period from/to) + mortality
- [x] Hen-day % + shed/farm compare
- [x] Alerts: egg drop, low feed, missing today’s log
- [x] Owner Analytics tab (`/analytics`): rank toggle + Kumo bars/timeseries; Dashboard slimmed to monitor
- [x] Cloudflare-like nested Owner sidebar + Analytics KPI strip / 2×2 chart grid
- [x] Unified Owner period filter (presets + calendar; `from`/`to` APIs)
- [ ] Smoke verification against sample year of logs

**Exit:** Owner reviews trends from logged data; mocks retired for dashboard.

## Phase 4+ (later)

- [x] Money: manual egg price / feed cost → rough margin
- [ ] SaaS admin UI to create Owners (replace seed-only)
- [ ] Postgres migrate
- [x] Export / reports — dashboard PDF snapshot (`GET /api/dashboard/export.pdf`; Owner only)
- [ ] Export / reports hardening (templates, scheduling, etc.)
- [ ] Hardening (tests suite, deployments)
- [ ] Native apps / IoT / billing / extra roles (out of v1 path)

## Update rhythm

After each meaningful milestone:

1. Tick items above and in [TODO-LIST.md](../TODO-LIST.md).
2. Set active phase in `MEMORY.md`.
3. Append ADR to [decisions.md](decisions.md) when a non-obvious choice lands.
4. Add feature specs under `specs/` when starting a slice.
