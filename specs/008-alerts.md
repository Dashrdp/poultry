# 008 — Alerts

Design: [docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md](../docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md)

## Slice

Dashboard returns computed `alerts[]` for the selected farm:

- `missing_log` — shed with live birds > 0 and no log today
- `low_feed` — godown stock &lt; 1 quintal
- `egg_drop` — today’s farm eggs &lt; 80% of yesterday’s farm eggs (when yesterday &gt; 0)

Shown on Owner dashboard above the shed map. No alert config UI in this slice.

## Out of this slice

Configurable thresholds, push notifications, Manager-facing alert inbox.
