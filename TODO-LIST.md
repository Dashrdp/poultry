# TODO-LIST — Poultry Farm

Living checklist. Update after each slice. Product design: [docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md](docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md). Phase view: [docs/roadmap.md](docs/roadmap.md). Session: [MEMORY.md](MEMORY.md).

## Done

- [x] Vite React + TypeScript + Kumo frontend scaffold
- [x] FastAPI backend with CORS, `/health`, `/api/hello`
- [x] Root README + vibe-coding docs (PRD, architecture, AGENTS, etc.)
- [x] Owner dashboard UI (farm select, shed map, KPIs, range toggle, egg chart, light/dark)
- [x] Mock `GET /api/farms` + `GET /api/dashboard`
- [x] Product design lock + this TODO list (2026-10-01)
- [x] Auth + tenancy (SQLite, cookie session, seed Owner/Manager, login gate)
- [x] **Dashboard PDF export** — Owner snapshot download; spec: [specs/012-dashboard-pdf-export.md](specs/012-dashboard-pdf-export.md); plan: [docs/superpowers/plans/2026-10-02-dashboard-pdf-export.md](docs/superpowers/plans/2026-10-02-dashboard-pdf-export.md)

## Next (build in order — one slice at a time)

- [x] **1. Auth + tenancy** — SQLite Customer/User; HTTP-only cookie login; seed Owner; role-aware shell; tenant isolation on APIs — plan: [docs/superpowers/plans/2026-10-01-auth-tenancy.md](docs/superpowers/plans/2026-10-01-auth-tenancy.md)
- [x] **2. Farms / sheds CRUD + Manager↔Farm assignment** — Owner configures; Manager sees only assigned farms — spec: [specs/003-farms-sheds-managers.md](specs/003-farms-sheds-managers.md)
- [x] **3. Daily log** — eggs + deaths → live auto-subtract; live override; Manager tablet UI (&lt; 2 min) — spec: [specs/004-daily-log.md](specs/004-daily-log.md)
- [x] **4. Godown movements** — feed in/out; stock = sum(in)−sum(out); store kg; UI default quintal — spec: [specs/005-godown.md](specs/005-godown.md)
- [x] **5. Wire Owner dashboard** — real aggregates (month / prev / year) + mortality; retire mock for dashboard — spec: [specs/006-dashboard-real.md](specs/006-dashboard-real.md)
- [x] **6. Hen-day % + shed/farm compare** — spec: [specs/007-hen-day-compare.md](specs/007-hen-day-compare.md)
- [x] **7. Alerts** — egg drop, low feed, missing today’s log — spec: [specs/008-alerts.md](specs/008-alerts.md)
- [x] **8. Money** — manual egg price / feed cost → rough margin
- [ ] **9. SaaS admin UI** — you create Owners (replace seed-only ops)
- [x] **10. Postgres migrate** — Docker Compose Postgres 16, psycopg, tests on `poultry_test` (ADR 2026-10-02)

## PoultryTrack spec upgrade (active)

Source: [PoultryTrack — Feature & Analytics Spec.md](PoultryTrack%20—%20Feature%20&%20Analytics%20Spec.md). Scope: MVP rows only. Out: offline/Expo app, phone OTP, WhatsApp, multilingual, v2/v3. Stack and Kumo UI unchanged.

- [x] **S1. Postgres** (= item 10)
- [x] **S2. Breed library + Flock** — breed standard table (Hy-Line W-80 weekly), place flock, derived age week + lifecycle stage; flock replaces shed live count — spec: [specs/013-breed-flock.md](specs/013-breed-flock.md)
- [ ] **S3. Daily entry v2** — opening birds prefill, mortality + culls + cause, eggs trays + loose, grades, 2 shifts, feed kg issue posts godown movement, water/temp, submit summary
- [ ] **S4. Entry validation** — eggs > birds block, HDEP swing / mortality spike / feed g/bird warn, negative stock block
- [ ] **S5. Flock transfer + depletion**
- [ ] **S6. Godown v2** — stock items (feed/medicine/vaccine/packing), purchase/issue/transfer/adjustment, days-of-cover
- [ ] **S7. Egg store** — collected/sold/damaged/closing by grade
- [x] **S8. KPI engine** — bird-days HDEP, gap to standard, mortality, livability, HHE, feed g/bird, feed per 10 eggs, occupancy (saleable % waits for grades in S3) — spec: [specs/014-kpi-analytics.md](specs/014-kpi-analytics.md)
- [ ] **S9. Alerts v2** — production drop, mortality spike, feed anomaly, low days-of-cover, missing entry, data completeness
- [x] **S10. Portfolio screen** — KPI strip vs 7-day avg, farm cards + sparkline, egg trend vs standard (alerts move here in S9)
- [x] **S11. Compare screen** — ranking table by deviation, age-aligned HDEP overlay, gap vs feed scatter
- [x] **S12. Shed / flock drilldown** — HDEP / mortality / feed vs standard, lifetime summary (grade mix + temp after S3)
- [ ] **S13. Godown & eggs screen**
- [ ] **S14. Audit log + 48h lock + late-edit approval**
- [ ] **S15. Reports** — daily/weekly/monthly PDF + Excel
- [ ] **S16. Org settings** — egg unit (tray 30 / peti 210), alert thresholds

## Later

- [ ] Native mobile apps
- [ ] IoT / sensors
- [ ] Billing / subscriptions
- [ ] Extra roles (workers, accountants, etc.)
- [ ] Export / reports hardening
- [ ] Full test suite + production deployment playbook

## How to use

1. Work only the top unchecked **Next** item unless blocked.
2. When a slice exits, check it here and tick matching items in `docs/roadmap.md`.
3. Update `MEMORY.md` active phase / goal.
4. Append an ADR in `docs/decisions.md` when a non-obvious choice lands.
