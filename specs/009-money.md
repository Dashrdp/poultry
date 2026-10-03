# 009 — Money (rough margin)

Design: [docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md](../docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md)

## Slice

Owner sets per-farm rates (`egg_price`, `feed_cost_per_kg`) via `PUT /api/farms/{id}/rates`.

Dashboard `money` for the selected period:

- `revenue` = eggs × egg_price
- `feed_cost` = feed **out** kg × feed_cost_per_kg
- `margin` = revenue − feed_cost

`money` is `null` when rates are unset. Shown on Owner dashboard; rates form on farm detail.

## Out of this slice

Currency localization, historical rate changes, labor/other costs, Manager write access to rates.
