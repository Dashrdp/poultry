# 2026-10-01 — Poultry SaaS product design

Living product design from the Owner-dashboard brainstorm. Tracks **what** we build and **in what order**. Slice implementation plans live under `docs/superpowers/plans/`. Checklist: [TODO-LIST.md](../../../TODO-LIST.md).

Related: [PRD](../../PRD-poultry-farm-MVP.md), [architecture](../../architecture.md), [roadmap](../../roadmap.md), [Owner dashboard design](./2026-10-01-owner-dashboard-design.md).

## Goal

Ship a multi-tenant poultry ops web app for **India** (English-only UI) where:

- You (SaaS operator) provision **Owner** accounts.
- Owners manage farms, sheds, and **Managers** (assigned to specific farms).
- Managers enter daily eggs, deaths, and feed movements (tablet-first).
- Owners monitor and analyze production (desktop-first).
- Everything is fully responsive (phone / tablet / desktop).

## Non-goals (v1 product path)

- Self-serve public signup for Owners
- Roles beyond Owner and Farm Manager (no platform “customer” persona in the UI)
- Native mobile apps, IoT, billing, multi-currency accounting
- Public partner API

## Market & UX constraints

| Constraint | Choice |
|------------|--------|
| Geography | India first |
| Language | English only |
| Owner device | Desktop-first |
| Manager device | Tablet-first |
| Responsiveness | Full: mobile, tablet, desktop |
| UI kit | Kumo + Geist + `data-mode` light/dark |

## Roles & tenancy

| Actor | Product role? | Job |
|-------|---------------|-----|
| SaaS operator (you) | No | Create Owner accounts (seed script first; internal admin UI later) |
| Owner | Yes | All farms in tenant; assign managers; monitor + analytics |
| Farm Manager | Yes | Assigned farms only; daily eggs/deaths/live override; feed in/out |

**Tenant:** Internal entity still named **Customer** (`customer_id`). Owners never see “customer signup.” Every query is scoped by `customer_id`.

**Access flow:**

```
SaaS operator creates Owner
  → Owner creates farms / sheds
  → Owner creates Managers and assigns farm(s)
  → Manager logs daily data
  → Owner dashboard / analytics read live data
```

## Birds, deaths, daily log

### Live count rules

1. Owner or Manager sets **starting flock** on a shed (initial stock / restock).
2. Manager logs **deaths** for shed + date → system **auto-subtracts** from live count.
3. Manager may **override live count** anytime (correction). Override is an adjustment, not mortality.
4. Live count never goes below 0. If `deaths > live`, reject with a clear error.

### Daily shed log

One row per `(shed_id, date)`:

| Field | Required | Notes |
|-------|----------|--------|
| `eggs_collected` | yes | Integer egg count |
| `deaths` | yes | Integer; `0` allowed; subtracts from live |
| `live_count` | derived | After deaths / after override applied |
| `notes` | no | Short text |

## Feed (godown)

- Per **farm** godown.
- Manager logs **FeedMovement**: `in` or `out`, quantity, date, optional note.
- **Stock on hand** = sum(in) − sum(out). Reject `out` that would go negative.
- Store quantity as **kg** internally.
- Default UI unit: **quintal** (1 quintal = 100 kg); optional kg display later.

## Analytics phasing

**Must (with real logs):** live birds, deaths, eggs, feed stock; ranges current month / previous month / year; mortality visible on Owner views.

**Soon:** hen-day % (eggs ÷ live birds), shed/farm compare, alerts (egg drop, low feed, missing today’s log).

**Later:** manual egg price / feed cost → rough margin; SaaS admin UI polish; Postgres migration.

## Build approach

**Vertical slices** — ship thin end-to-end pieces in order. Keep the existing Owner Kumo dashboard; replace mocks as each slice lands. Track progress in root `TODO-LIST.md`.

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Vite + React + TypeScript + Kumo + Tailwind |
| Backend | FastAPI (port `8010`) |
| DB | SQLite first; Postgres when multi-tenant load requires it |
| Auth | HTTP-only session cookie; roles `owner` \| `farm_manager` |
| Isolation | `customer_id` on all tenant rows |

## Data model (logical additions vs PRD)

| Entity | Key fields / notes |
|--------|-------------------|
| Customer | id, name (tenant) |
| User | id, customer_id, email, role, password hash |
| ManagerFarmAssignment | user_id, farm_id (Manager sees only assigned farms) |
| Farm | id, customer_id, name, location optional |
| Shed | id, farm_id, name, `live_bird_count`, capacity optional |
| DailyShedLog | shed_id, date, eggs_collected, deaths, recorded_by |
| BirdAdjustment | shed_id, at, delta or absolute override, reason, user_id |
| FeedMovement | farm_id, direction in\|out, qty_kg, at, note, user_id |

Unique: `(shed_id, date)` on `DailyShedLog`.

## Permission matrix (MVP)

| Action | Owner | Manager |
|--------|-------|---------|
| CRUD farms/sheds | yes | no (read assigned farms) |
| Assign managers to farms | yes | no |
| Write daily shed log | optional | yes (assigned farms) |
| Live override / set starting flock | yes | yes (assigned) |
| Feed in/out | read preferred | yes (assigned) |
| Analytics month/prev/year | yes | no |
| Monitor latest status | yes | yes (assigned) |

## Slice order (Next)

1. Auth + tenancy (SQLite, cookie login, seed Owner)
2. Farms/sheds CRUD + Manager↔Farm assignment
3. Daily log: eggs + deaths + live override
4. Godown in/out movements
5. Wire Owner dashboard to real aggregates + mortality
6. Hen-day % + shed/farm compare
7. Alerts
8. Money (manual rates)
9. SaaS admin UI (create Owners)
10. Postgres migrate

## Success criteria

- Manager completes daily shed log (eggs + deaths) in under 2 minutes on tablet.
- Owner sees live birds, deaths, eggs, and feed from real logs (not mocks) for month / prev month / year.
- No cross-tenant data leakage.
- Unauthorized role cannot hit Owner analytics or another tenant’s farms.

## Error handling (product rules)

- Auth: unauthenticated → login; wrong role → 403.
- Daily log: duplicate date → upsert or clear conflict message (prefer upsert same day).
- Deaths > live → 400 with message.
- Feed out > stock → 400 with message.

## Testing (per slice)

- Backend: tenant isolation + role checks on new endpoints.
- Smoke: login as Owner and Manager; Manager cannot see unassigned farm.
- UI: responsive check at phone / tablet / desktop widths for new screens.

## Spec self-review

- No TBD placeholders; units and bird rules explicit.
- Consistent with Approach 1 vertical slices and interview lock.
- Scope is one product design; implementation plans stay one slice each.
- “Customer” = internal tenant only; SaaS operator is out-of-band until admin UI slice.
