# 002 — Auth & tenancy

Design: [docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md](../docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md)

Plan: [docs/superpowers/plans/2026-10-01-auth-tenancy.md](../docs/superpowers/plans/2026-10-01-auth-tenancy.md)

## Slice

- SQLite Customer + User (Owner / Farm Manager)
- HTTP-only session cookie login / logout / me
- Seed demo Owner + Manager
- Protect `/api/farms` + `/api/dashboard` (mock bodies unchanged)
- Frontend login gate; Owner → dashboard; Manager → placeholder
