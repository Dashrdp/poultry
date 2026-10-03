# 013 — Breed library + Flock

Source: PoultryTrack spec §2 (Flock, Breed standard), §4 (Setup breed library, Flock place).

## Goal

Birds belong to a **flock** placed in a shed, not to the shed itself. Flock age in weeks and lifecycle stage are derived from hatch date, never typed. Every flock links to a breed whose week-by-week standard is stored for later gap-to-standard KPIs.

## Decisions

- `Shed.live_bird_count` is removed. Live birds live on the **active flock** (`depleted_on IS NULL`). At most one active flock per shed (Postgres partial unique index).
- Shed API keeps the `live_bird_count` key (0 when no active flock) and adds `flock` summary.
- Daily logs and live-count corrections require an active flock (400 otherwise). Each log row stores `flock_id`.
- Age week = completed weeks since hatch (`days // 7`).
- Stage by age week (Hy-Line W-80 guide): brooding 0–5, growing 6–15, pre-lay 16–17, laying 18+; `depleted` once `depleted_on` is set (S5).
- Breed library: system breed **Hy-Line W-80** seeded from `backend/data/breeds/hyline_w80.csv` (Aviary/Barn NA guide, weeks 1–90, midpoints). Owners upload custom breeds by CSV with the same columns.

## API

| Method | Path | Who |
|--------|------|-----|
| GET | `/api/breeds` | any user (system + own customer breeds) |
| GET | `/api/breeds/{breed_id}/standards` | any user |
| POST | `/api/breeds` (multipart: `name`, `file` CSV) | Owner |
| GET | `/api/sheds/{shed_id}/flocks` | users with farm access |
| POST | `/api/sheds/{shed_id}/flocks` | users with farm access |

Place flock body: `breed_id`, `hatch_date`, `placed_date`, `birds_placed`, `source?`, `chick_cost?`. Rules: hatch ≤ placed ≤ today, birds_placed > 0, birds_placed ≤ shed capacity (when set), 409 when shed already has an active flock.

## UI

- Shed log page: flock line under shed name (breed, age week, stage). No active flock: "Place flock" form replaces the log and live-count cards.
- Owner farm detail shed table: show flock age / stage column.

## Out of scope (later slices)

Transfers and depletion (S5), gap to standard (S8).
