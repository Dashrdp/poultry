# Product requirements (build-facing)

Derived from [../docs/PRD-poultry-farm-MVP.md](../docs/PRD-poultry-farm-MVP.md). Use this when implementing; if conflict, PRD wins.

## Hierarchy

Customer → Farms[] → Sheds[] → DailyShedLog[]  
Farm → Godown (feed stock)

## Roles

| Role | Can |
|------|-----|
| Owner | Monitor farms/sheds; analytics current month, previous month, year |
| Farm Manager | Log daily birds/eggs per shed; update godown feed |

## Feature checklist

- [ ] Auth (Owner / Farm Manager) + customer scoping
- [ ] Farm CRUD
- [ ] Shed CRUD
- [ ] Daily shed log upsert (date, bird_count, eggs)
- [ ] Godown feed stock read/update
- [ ] Owner analytics: current_month / previous_month / year
- [ ] Owner monitoring views (latest status)

## Explicit non-goals (v1)

Extra roles, IoT, billing, native mobile, public API, platform super-admin.
