# 006 — Wire Owner dashboard to real data

Design: [docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md](../docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md)

## Slice

`GET /api/dashboard` builds sheds, KPIs, mortality, and chart series from `DailyShedLog`, `Shed.live_bird_count`, and current godown stock. Ranges: current month (daily), previous month (daily), year (monthly). Feed KPI is current stock in quintal. Series `birds` uses the current farm live total on each point.

## Out of this slice

Hen-day %, shed/farm compare, alerts.
