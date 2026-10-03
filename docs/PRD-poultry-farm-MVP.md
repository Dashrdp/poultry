# PRD — Poultry Farm MVP

## Problem

Farm owners need one place to track birds, daily egg production, and godown feed across multiple farms and sheds. Daily numbers are entered by farm managers; owners need reliable analytics without doing data entry.

## Goal

Ship a web app where:

- A **customer account** owns multiple **farms**; each farm has multiple **sheds** and one **godown**.
- A **Farm Manager** logs daily shed data and feed stock quickly.
- An **Owner** monitors operations and views analytics for selectable periods (yesterday, week, month, year, or custom calendar range).

## Personas

| Role | Primary job |
|------|-------------|
| **Owner** | Monitor all farms; view analytics for presets (yesterday / week / month / year) or a custom from–to range. Does not need to enter daily logs. |
| **Farm Manager** | Enter daily operational data (bird counts, eggs, godown feed). No ownership of full analytics control. |

Both roles belong to the same **customer** tenant. All data is isolated per customer.

## Domain hierarchy

```
Customer (tenant)
├── Users (Owner, Farm Manager)
└── Farms[]
    ├── Sheds[]
    │   └── DailyShedLog[] (date → birds, eggs)
    └── Godown (feed stock on hand)
```

## MVP features (in scope)

1. **Auth & tenancy** — Login; role is Owner or Farm Manager; all queries scoped to customer.
2. **Farm & shed management** — CRUD farms and sheds under the customer.
3. **Daily shed logging (Manager)** — Per shed, per day: chicken/bird count, egg production.
4. **Godown feed (Manager)** — Record / update feed quantity on hand for the farm godown.
5. **Owner analytics** — Dashboards filtered by period:
   - Presets: yesterday, this week (Mon–Sun), this month, last month, year
   - Custom: single day or from–to calendar range (max 366 days)
   Aggregations from daily logs and feed (birds, eggs, feed trends as available from logged data).
6. **Owner monitoring** — Farm/shed overview of latest counts and production without editing as primary path.

## Out of scope (v1)

- Roles beyond Owner and Farm Manager (e.g. generic workers, accountants)
- IoT / sensors / auto-weighing
- Billing / subscriptions
- Native mobile apps
- Multi-currency or complex accounting
- Public / partner API
- Multi-customer admin (platform superuser)

## User stories

### Owner

- As an Owner, I can see all my farms and sheds and latest bird/egg/feed status.
- As an Owner, I can open analytics for yesterday, this week, this/last month, year, or a custom date range.
- As an Owner, I cannot be blocked from monitoring if managers are offline that day (I still see last logged data).

### Farm Manager

- As a Farm Manager, I can select a farm and shed and log today’s bird count and eggs in under two minutes.
- As a Farm Manager, I can update godown feed stock for a farm.
- As a Farm Manager, I only see data for my customer’s farms (not other customers).

## Success metrics

- Manager can complete a daily shed log in **under 2 minutes**.
- Owner can open **year** analytics and see charts/tables backed by logged daily data.
- No cross-customer data leakage (tenant isolation).

## Non-goals for this document

Implementation details live in [architecture.md](architecture.md). Phase order lives in [roadmap.md](roadmap.md).
