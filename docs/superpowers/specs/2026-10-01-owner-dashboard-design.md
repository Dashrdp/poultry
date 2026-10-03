# 2026-10-01 — Owner dashboard design

## Goal

Ship an **Owner** home dashboard: pick a farm (project-style selector), see a shed top-view with hover stats, KPIs, range toggle, and a production chart. Data comes from a **thin mock API** shaped for later real wiring (hybrid approach).

## Non-goals

- Auth / real DB / Farm Manager flows
- Full analytics deep pages beyond this home
- Shed click detail page (stub OK; hover is required)
- Billing, IoT, extra roles

## UX

### Shell

- Top bar: brand **Poultry Farm**; **farm selector** (Owner picks active farm, like “select project”).
- Light nav: Dashboard (active), Analytics (placeholder link optional), logout placeholder.

### Farm top view

- Active farm title (+ optional location).
- Sheds as numbered plan-style blocks (`Shed 1`, `Shed 2`, …).
- Hover shed → popover: bird count, today’s eggs, last log date.
- Click: optional stub; not required for v1 acceptance.

### Approach A remainder

- Range toggle: **This month | Last month | Year**.
- KPI row: total birds, eggs for period, godown feed on hand.
- Main chart: egg (and optionally bird) trend for selected farm + range.

## Visual

- Calm farm-ops palette: deep green + warm straw accent on soft sage/stone (avoid purple gradients and cream+terracotta cliché).
- Expressive fonts (non-default Inter/Roboto/Arial stacks): display for brand/headings, clear sans for numbers.
- Motion (2–3): shed hover lift + popover; KPI/chart refresh on farm or range change.
- Kumo for select/buttons; custom shed map + chart.

## API (mock)

### `GET /api/farms`

Returns farms for the selector:

```json
[{ "id": "farm-1", "name": "Green Valley", "location": "Nashik" }]
```

### `GET /api/dashboard?farm_id=&range=`

`range`: `current_month` | `previous_month` | `year`

```json
{
  "farm": { "id": "farm-1", "name": "Green Valley", "location": "Nashik" },
  "range": "current_month",
  "sheds": [
    {
      "id": "shed-1",
      "number": 1,
      "name": "Shed 1",
      "bird_count": 1200,
      "eggs_today": 980,
      "last_log_date": "2026-10-01"
    }
  ],
  "kpis": {
    "birds": 4800,
    "eggs_period": 28500,
    "feed_qty": 12.5,
    "feed_unit": "tons"
  },
  "series": [{ "label": "2026-10-01", "eggs": 980, "birds": 4800 }]
}
```

Seed **2–3 farms**, several sheds each.

## Frontend shape

- Replace scaffold hello page with Owner dashboard route/view.
- Fetch farms on load; select first farm by default.
- Refetch dashboard when `farm_id` or `range` changes.
- CORS already allows `http://localhost:5173`.

## Acceptance

1. Owner can switch farms from top selector; dashboard updates.
2. Shed top-view shows shed numbers; hover shows bird count, eggs today, last log date.
3. Range toggle updates KPIs + chart from mock API.
4. UI matches visual direction above; runs on desktop and mobile (usable, not broken).
5. No auth required for this slice.

## Tracking

After ship: update `MEMORY.md`, tick relevant roadmap notes, add `specs/001-owner-dashboard.md` pointer if useful; append ADR only if stack choice for charts is non-obvious.
