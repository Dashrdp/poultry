# Spec 015 — Owner period filter (from/to)

## Goal

One period control for Owner Monitor + Analytics. Backend filters all period metrics by `from`/`to`.

## API

| Endpoint | Params |
|----------|--------|
| `GET /api/dashboard` | `farm_id`, `from`, `to` (optional pair → this month through today) |
| `GET /api/dashboard/export.pdf` | same |
| `GET /api/analytics/portfolio` | `from`, `to` (optional → this month through yesterday) |
| `GET /api/analytics/compare` | `level`, `from`, `to` |
| `GET /api/analytics/sheds/{id}` | `from`, `to` |

Validation: both required if one set; `from ≤ to`; `to ≤ end_cap`; span ≤ 366.

Response echoes `from` / `to` (dashboard no longer returns `range`).

## UI

`AnalyticsPeriodBar` on Monitor, Portfolio, Compare, Shed, Trends. Presets + Custom popover (`DatePicker` mode=range). Period synced in URL.

## Tests

`test_period.py`, updated dashboard / analytics / export / alerts / money tests.

## Non-goals

Flock-to-date, weekly/monthly PDF report templates, Excel export.
