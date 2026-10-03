# 004 — Daily shed log

Design: [docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md](../docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md)

## Slice

Manager or Owner logs eggs and deaths for one shed and date. Deaths subtract from the shed’s stored live count. Saving the same date again applies only the death delta. Live count can be set absolutely (starting flock or correction) and that write is a `BirdAdjustment`, not a death. Deaths that would drive live count below zero return 400. Manager tablet UI is `/farms/:farmId/sheds/:shedId`.

## Out of this slice

Godown feed, Owner dashboard aggregates, hen-day %, alerts.
