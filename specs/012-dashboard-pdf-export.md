# 012 — Dashboard PDF export

Design: [docs/superpowers/specs/2026-10-02-dashboard-pdf-export-design.md](../docs/superpowers/specs/2026-10-02-dashboard-pdf-export-design.md)

## Slice

Owner downloads `GET /api/dashboard/export.pdf?farm_id=&range=` — dashboard snapshot PDF (KPIs, alerts, money, egg timeseries, eggs-by-shed pie, compare tables). Button on Owner dashboard.

## Out of this slice

Manager export, day-by-day ops dump, branded templates, Kumo-matching chart styling.
