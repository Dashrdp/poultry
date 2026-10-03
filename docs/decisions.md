# Decisions (ADR log)

Append-only. Newest at the bottom. Do not rewrite history; supersede with a new entry.

---

## 2026-04-01 — Stack: FastAPI + Vite/React/Kumo

**Status:** accepted

**Context:** Need a simple full-stack web app for poultry farm ops with a modern UI kit.

**Decision:** Backend FastAPI (Python); frontend Vite + React + TypeScript + Cloudflare Kumo UI + Tailwind.

**Consequences:** Two-process local dev (ports 8000 / 5173). Agents must run and document both. UI should prefer Kumo primitives over ad-hoc components.

---

## 2026-04-01 — Roles: Owner + Farm Manager

**Status:** accepted

**Context:** Owners need analytics and monitoring; daily entry should be done by on-farm staff.

**Decision:** v1 roles are **Owner** (analytics + monitor) and **Farm Manager** (daily shed logs + godown feed). No other roles in MVP.

**Consequences:** Analytics routes Owner-only. Permission matrix lives in [architecture.md](architecture.md). Worker/accountant roles deferred.

---

## 2026-04-01 — Domain: Customer → Farm → Shed + Farm Godown

**Status:** accepted

**Context:** Customers operate multiple farms; each farm has multiple sheds; feed is stored at farm godown level.

**Decision:** Tenant is **Customer**. Farms belong to customer. Sheds belong to farm. **Godown feed stock** is per farm (not per shed). Daily logs (birds, eggs) are per shed per date.

**Consequences:** Analytics roll up shed logs to farm/customer; feed analytics attach to farm godown. Schema must enforce `(shed_id, date)` uniqueness.

---

## 2026-10-01 — Owner egg chart: custom SVG

**Status:** superseded by 2026-10-01 Kumo TimeseriesChart

**Context:** Kumo `TimeseriesChart` requires bundling ECharts. Owner dashboard needs a simple egg trend for mock + later real series.

**Decision:** Use a lightweight custom SVG line/area chart for the Owner dashboard.

**Consequences:** No `echarts` dependency for this slice. Can swap to Kumo TimeseriesChart later if product needs richer interaction.

---

## 2026-10-01 — UI: Kumo Cloudflare theme + TimeseriesChart

**Status:** accepted

**Context:** Owner UI must match Cloudflare dashboard (black/white semantic chrome) with light/dark switch; charts must come from Kumo.

**Decision:**
- Use `@cloudflare/kumo` components and semantic tokens only ([kumo-ui.com](https://kumo-ui.com/)).
- Light/dark via `data-mode` on `<html>` (no Tailwind `dark:`).
- Egg production chart = Kumo `TimeseriesChart` + `echarts` peer dependency.
- Agents follow `.cursor/rules/kumo-ui.mdc`.

**Consequences:** Custom farm green/straw palette and custom SVG chart removed. `echarts` required in frontend.

---

## 2026-10-01 — Persistence: SQLite first

**Status:** accepted

**Context:** Multi-tenant SaaS needs real persistence before auth and daily logs. Postgres is the likely long-term host, but local MVP speed matters.

**Decision:** Use **SQLite** for the first persistence layer. Migrate to Postgres when multi-tenant load or ops needs require it (tracked as TODO slice 10).

**Consequences:** Keep SQLAlchemy (or equivalent) patterns portable. Avoid SQLite-only features that block migration. Seed scripts write into SQLite for local demos.

---

## 2026-10-01 — Auth: HTTP-only session cookie

**Status:** accepted

**Context:** Need login for Owner and Farm Manager on Vite + FastAPI without overbuilding.

**Decision:** Prefer **HTTP-only session cookies** over JWT in `localStorage` for the web app (safer XSS default). CORS already allows credentials for `localhost:5173`.

**Consequences:** Frontend must use `credentials: 'include'`. Same-site / CSRF strategy required when deploying cross-origin. Document cookie name and session store (server-side or signed cookie) in the Auth slice plan.

---

## 2026-10-01 — SaaS provisioning: operator creates Owners

**Status:** accepted

**Context:** Product is multi-tenant SaaS, but there is no self-serve Owner signup. “Customer” remains the internal tenant name.

**Decision:** SaaS operator provisions Owner access (seed / manual first; internal admin UI later). Owner then creates Managers and assigns them to farms. No platform “customer” persona in the product UI.

**Consequences:** Phase 1 seeds Owner accounts. Manager↔Farm assignment is required before Managers see data. Admin UI is TODO slice 9, not Phase 1.

---

## 2026-10-01 — Birds: deaths subtract live; override allowed

**Status:** accepted

**Context:** Owners need live chicken counts; Managers report deaths per shed.

**Decision:** Set starting flock on shed. Daily **deaths** auto-subtract from live count. Manager may **override** live count (adjustment, not mortality). Reject deaths that would drive live below zero. Eggs logged as integer count per shed/day.

**Consequences:** `DailyShedLog` includes `deaths` and `eggs_collected`. Live count is stored on shed (or derived + persisted). Bird adjustments audited separately from deaths.

---

## 2026-10-01 — Feed: movements compute stock

**Status:** accepted

**Context:** Godown tracking needs history for later efficiency/alerts, not only a overwritten snapshot.

**Decision:** Manager logs feed **in/out** movements. Stock = sum(in) − sum(out). Store **kg**; default UI unit **quintal** (100 kg). Reject outbound that exceeds stock.

**Consequences:** Prefer `FeedMovement` over snapshot-only `GodownStock` for writes. Snapshot field optional as cache. Analytics/alerts can use movement history.

---

## 2026-10-02 — Daily log death delta on stored live count

**Status:** accepted

**Context:** Live birds are stored on the shed. A same-day log edit must not subtract deaths twice, and a live-count correction must stay separate from mortality.

**Decision:** Upsert of `DailyShedLog` changes `shed.live_bird_count` by `new_deaths - previous_deaths` for that date. `PUT /api/sheds/{id}/live-count` sets an absolute count and writes `BirdAdjustment`. Deaths that would make live count negative are rejected and leave the shed unchanged.

**Consequences:** Editing an older log still adjusts the current stored count by the death delta. It does not rebuild live count from full history.

---

## 2026-10-02 — Dashboard feed KPI and series birds

**Status:** accepted

**Context:** Owner dashboard needs real KPIs once logs and godown exist. Feed stock is not period-scoped. Historical live-bird time series is not stored.

**Decision:** Dashboard feed KPI is **current** godown stock in **quintal**. Chart series `birds` repeats the **current** farm live total on each point. Eggs and deaths are summed from `DailyShedLog` in the selected range. Mortality shows as `deaths_period`.

**Consequences:** Changing range does not change the feed KPI. Bird trend line is flat at today’s live count until a historical bird series exists.

---

## 2026-10-02 — Hen-day % uses current live × days

**Status:** accepted

**Context:** Classic hen-day needs birds present each day. App stores only current live count on the shed.

**Decision:** `hen_day_pct = 100 × eggs_period ÷ (current_live_birds × days_in_range)`. Null when live birds are 0. Same formula for shed and farm compare rows.

**Consequences:** Hen-day is approximate until historical bird counts exist. Range length changes the denominator.

---

## 2026-10-02 — Alert thresholds (v1 fixed)

**Status:** accepted

**Context:** Owners need egg-drop, low-feed, and missing-log signals without a settings UI yet.

**Decision:** Fixed rules on dashboard: missing log for sheds with live birds > 0 and no today’s log; low feed when stock &lt; 1 quintal; egg drop when today’s farm eggs &lt; 80% of yesterday’s (yesterday &gt; 0).

**Consequences:** Thresholds are code constants until a settings slice. Alerts are computed on read, not stored.

---

## 2026-10-02 — Persistence: Postgres (replaces SQLite)

**Status:** accepted (supersedes "Persistence: SQLite first")

**Context:** PoultryTrack feature spec upgrade adds flocks, breed standards, egg grades, stock items, audit log. User asked to move off SQLite before building it.

**Decision:** Postgres 16 via `docker-compose.yml` (`poultry` dev DB, `poultry_test` test DB). SQLAlchemy + `psycopg` 3 driver; URL from `DATABASE_URL` (tests: `TEST_DATABASE_URL`). Schema still created by `create_all`; schema changes during the upgrade = drop volume / reseed (demo data only). No Alembic yet.

**Consequences:** Docker Desktop must run for API and tests. Foreign keys are now enforced. SQL must stay portable (no `strftime`; use `extract`). Add Alembic before any real customer data exists.

---

## 2026-10-02 — Flock owns live birds

**Status:** accepted

**Context:** Spec models birds as Flock (batch) inside a Shed, with age derived from hatch date and KPIs compared to breed standard by age week.

**Decision:** Remove `Shed.live_bird_count`. Live birds live on the active `Flock` (one per shed, partial unique index on `depleted_on IS NULL`). Logs and corrections require an active flock and store `flock_id`. Age week = completed weeks since hatch; stage thresholds from Hy-Line W-80 guide (growing 6, pre-lay 16, laying 18). System breed Hy-Line W-80 seeded from `backend/data/breeds/hyline_w80.csv` (Aviary/Barn NA guide midpoints; the cage edition was not reachable). Owners can upload custom breeds by CSV.

**Consequences:** Shed API keeps `live_bird_count` (from the active flock) plus a `flock` object. New sheds need "Place flock" before daily logs. Spec: [specs/013-breed-flock.md](../specs/013-breed-flock.md).

---

## 2026-10-02 — KPIs on bird-days, rolling windows

**Status:** accepted (supersedes "Hen-day %" approximation for the new analytics screens)

**Context:** PoultryTrack spec §5 requires bird-day denominators, gap to breed standard at the same age, and group KPIs that sum numerators and denominators. Spec screens use rolling 7 / 28 / 90-day windows rather than calendar month / previous month / year.

**Decision:** New `backend/kpis.py` recomputes KPIs from raw daily logs on read (no stored aggregates). New Owner-only `/api/analytics/*` endpoints use rolling windows of 7, 28 or 90 days ending yesterday. Shed feed is estimated by splitting farm godown issues by bird-days until S3 records feed per shed. The existing dashboard and Trends page keep month / previous month / year.

**Consequences:** Two window systems coexist (calendar on Dashboard/Trends, rolling on Portfolio/Compare/Shed). Per-request recompute is fine at demo scale; add caching or materialised daily stats if farms grow large. Spec: [specs/014-kpi-analytics.md](../specs/014-kpi-analytics.md).

---

## 2026-10-02 — Unified Owner period filter (from/to)

**Status:** accepted (supersedes dual `range=` / `days=` window systems for Owner screens)

**Context:** Owners needed day / week / month / custom filtering across Monitor and Analytics. PoultryTrack §6 asks for a date picker; rolling 7/28/90 and calendar month enums diverged.

**Decision:** One period model: inclusive ISO `from` + `to` on dashboard, PDF export, and `/api/analytics/*`. UI presets (Yesterday, This week Mon–Sun, This month, Last month, Year) plus Custom via Kumo `DatePicker` range. Period syncs in URL (`preset`, `from`, `to`). Analytics caps `to` at yesterday; Monitor at today. Prior/baseline = equal-length window before `from`. Max span 366 days.

**Consequences:** Client and tests pass `from`/`to` instead of `range` or `days`. Bird-day KPI math unchanged. Spec: [specs/015-owner-period-filter.md](../specs/015-owner-period-filter.md); design: [superpowers/specs/2026-10-02-owner-period-filter-design.md](superpowers/specs/2026-10-02-owner-period-filter-design.md).
