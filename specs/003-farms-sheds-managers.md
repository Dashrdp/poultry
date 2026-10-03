# 003 — Farms / sheds CRUD + Manager↔Farm assignment

Design: [docs/superpowers/specs/2026-10-02-farms-sheds-managers-design.md](../docs/superpowers/specs/2026-10-02-farms-sheds-managers-design.md)

Plan: [docs/superpowers/plans/2026-10-02-farms-sheds-managers.md](../docs/superpowers/plans/2026-10-02-farms-sheds-managers.md)

## Slice

Owner configures farms and sheds (CRUD), creates Farm Managers, and assigns them to farms; Managers see read-only assigned farms/sheds only. SQLite `Farm`, `Shed`, and `ManagerFarmAssignment` back real `GET /api/farms` (role-scoped) and Owner nav (Dashboard | Farms | Managers); dashboard KPIs/chart remain mock keyed by farm id. Demo seed assigns Manager to `farm-1` only.
