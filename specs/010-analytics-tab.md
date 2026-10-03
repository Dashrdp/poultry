# 010 — Analytics tab

Design lock: Owner `/analytics` = deep charts + ranked compare; Dashboard `/` = ops monitor only.

## Slice

- Owner nav: **Analytics** → `/analytics` (Manager: no Analytics).
- Reuse `GET /api/dashboard?farm_id=&range=`.
- Rank toggle: **Hen-day %** | **Eggs** | **Margin** (default hen-day).
  - Sheds: hen-day | eggs only (margin N/A — feed is farm-level).
  - Farms: all three; `compare_farms[].margin` from rates (`null` → sort last, show "—").
- Charts (Kumo only):
  - Selected-farm egg trend → `TimeseriesChart` + semantic palette.
  - Shed/farm rank bars → `Chart` + `ChartPalette.categorical(i % 5, isDark)`.
- Winner callout: best shed + best farm for active metric.
- Dashboard drops egg chart + compare tables; keeps alerts, shed map, KPIs, money.

## Acceptance

- Owner opens Analytics, changes rank metric → tables/bars reorder.
- Dashboard has no production chart / compare tables.
- Manager never sees Analytics nav or route.
- Chart colors follow `.cursor/rules/kumo-ui.mdc` palette rules.

## Out of this slice

Multi-farm timeseries overlay, historical bird hen-day, new `/api/analytics`, Maps/Sankey/sequential.
