# MEMORY.md

Repo-owned session memory. Keep short. Update after meaningful milestones.

## Active phase & goal

- **Phase:** PoultryTrack spec upgrade (MVP scope). Done: S1 Postgres, S2 Breed + Flock, S8 KPI engine, S10 Portfolio, S11 Compare, S12 Shed drilldown, **Owner period filter (from/to)**.
- **Goal:** S3 Daily entry v2 (see TODO-LIST "PoultryTrack spec upgrade").
- **Analytics:** `backend/kpis.py` + `/api/analytics/*` and `/api/dashboard` take inclusive `from`/`to` (max 366d). UI: `AnalyticsPeriodBar` presets + Custom calendar; URL `?preset=&from=&to=`. Analytics end-cap = yesterday; Monitor = today.
- **Flock model:** birds live on active `Flock` (not Shed). Seed flocks ages 28–85 weeks, eggs follow W-80 curve × per-shed factor.
- **DB:** Postgres via `docker compose up -d --wait` (Docker Desktop must run). Schema change = `docker compose down -v` + `python seed.py`.
- **Blocked on:** Nothing.
- **Active specs:**
  - [docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md](docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md)
  - [docs/superpowers/specs/2026-10-02-owner-period-filter-design.md](docs/superpowers/specs/2026-10-02-owner-period-filter-design.md)
  - [specs/015-owner-period-filter.md](specs/015-owner-period-filter.md) (done)
  - [specs/002-auth-tenancy.md](specs/002-auth-tenancy.md) through [specs/014-kpi-analytics.md](specs/014-kpi-analytics.md)
- **Tracking:** [TODO-LIST.md](TODO-LIST.md)
- **UI rule:** `.cursor/rules/kumo-ui.mdc` + [kumo-ui.com/charts](https://kumo-ui.com/charts/) + [Sidebar](https://kumo-ui.com/components/sidebar/) + taste-skill

## Recent decisions

- See [docs/decisions.md](docs/decisions.md).
- Owner period: unified `from`/`to` (supersedes `range=` + rolling `days=`).

## Demo logins (local seed)

- Owner: `owner@demo.local` / `owner-pass`
- Manager: `manager@demo.local` / `manager-pass` (sees **farm-1** only)
- `python seed.py` also loads ~365 days logs/feed/rates for all 3 farms (`--force-ops` to rebuild)

## Deploy

- Linux host: `deploy/docker-compose.yml` (Postgres + API + Caddy). Copy `deploy/.env.example` → `.env`. See README “Deploy”.

## Next small slice

1. S3 Daily entry v2.

## Do not duplicate

Code layout, git history, and full PRD — use those sources; only put here what sessions need for continuity.
