# 005 — Godown feed movements

Design: [docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md](../docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md)

## Slice

Manager or Owner with farm access records feed **in** / **out** movements on a farm godown. Stock on hand = sum(in) − sum(out) in **kg**. UI enters and shows **quintal** (1 quintal = 100 kg). Outbound that would drive stock below zero returns 400. Create + list only; no edit/delete. Route: `/farms/:farmId/godown`.

## Out of this slice

Owner dashboard KPI wiring, alerts, kg display toggle, movement edit/delete.
