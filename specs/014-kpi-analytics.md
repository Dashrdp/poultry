# 014 — KPI engine + Portfolio / Compare / Shed drilldown

Source: PoultryTrack spec §5 (KPI formulas), §6 (Portfolio, Compare, Shed drilldown screens). Slices S8, S10, S11, S12.

## Goal

Owner sees every farm and shed against its breed standard at the same age, with KPIs computed the spec's way: bird-days, not period-end birds; group values summed, never averaged.

## KPI engine (`backend/kpis.py`)

- One `FlockDay` per logged flock-day. Opening birds = birds placed − earlier deaths + earlier live-count corrections.
- HDEP = eggs ÷ bird-days × 100. Standard HDEP = expected eggs (birds × standard % for that day's age week) ÷ bird-days.
- Gap = actual − standard, over days that have a standard only. Status: ≥ −3 pts good, −3 to −5 watch, < −5 bad.
- Mortality % = deaths ÷ opening birds of the window. Livability = live ÷ placed. HHE = lifetime eggs ÷ birds placed.
- Feed g/bird and feed per 10 eggs: farm godown "out" movements split by bird-days across the farm's flocks (estimate until S3 records per-shed feed). Pass every active flock on a farm to `flock_days`.
- Occupancy = live ÷ shed capacity (null when capacity unset).
- Projected HHE at week 80 = HHE now + remaining standard curve × (28-day actual ÷ standard) × livability.
- Saleable % waits for egg grades (S3).

## API (Owner only, tenant-scoped, window ends yesterday)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/analytics/portfolio?days=28\|90` | KPI strip yesterday vs prior 7 days, farm cards (7-day KPIs, status, 8 weekly HDEP vs standard points, completeness), daily eggs by farm + expected eggs |
| GET | `/api/analytics/compare?level=shed\|farm&days=7\|28\|90` | ranking rows, per-flock weekly HDEP by age, breed curves |
| GET | `/api/analytics/sheds/{shed_id}?days=7\|28\|90` | flock summary, daily rows, lifetime summary |

`days` outside 7 / 28 / 90 → 400. Other tenant's shed → 404. Manager → 403.

## UI

Owner nav **Analytics** group: Portfolio (`/analytics/portfolio`), Compare (`/analytics/compare`), Trends (`/analytics/trends`, the previous analytics page). `/analytics` redirects to Portfolio. Shed drilldown at `/analytics/sheds/:shedId`, linked from the Compare table.

Charts use Kumo `Chart` / `TimeseriesChart`: breed standard = semantic `Disabled` dashed; eggs/HDEP = `Neutral`; deaths = `Attention`; gap status = `Success` / `Warning` / `Attention`; farms and flocks = categorical.

## Out of scope (later slices)

Alerts on Portfolio (S9 Alerts v2), grade mix and temperature charts (need S3 fields), depleted-flock history (S5).
