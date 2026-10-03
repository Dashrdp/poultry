# 2026-10-02 — Farms / sheds CRUD + Manager↔Farm assignment

## Goal

Owner configures **farms** and **sheds**, **creates Managers**, and **assigns** them to farms. Managers see only assigned farms/sheds (read-only). Real farm list backs the Owner dashboard selector; dashboard KPIs/chart stay mock until a later slice.

## Non-goals

- Daily shed log, live override, starting flock UI (slice 3)
- Godown / feed movements (slice 4)
- Real dashboard aggregates (slice 5)
- Soft delete / archive
- SaaS admin UI (create Owners)
- Manager write access to farms/sheds
- Roles beyond Owner / Farm Manager

## Locked choices (interview)

| Topic | Choice |
|-------|--------|
| Manager users | Owner **creates** Managers (email + password) **and** assigns farms |
| Mock vs real farms | Real DB farms for list/CRUD/selector; dashboard KPIs/series stay mock keyed by farm id |
| Manager UI | Read-only farm list + sheds |
| Delete | Hard delete; farm cascades sheds + assignments |
| Owner UI | Nav: **Dashboard \| Farms \| Managers** |

## Approach

Nested REST + SQLite entities (`Farm`, `Shed`, `ManagerFarmAssignment`). `GET /api/farms` is role-scoped. Dashboard keeps response shape; merges DB farm/shed names with mock stats when available, else zeros + real sheds.

## Data model

| Entity | Key fields |
|--------|------------|
| `Farm` | `id`, `customer_id`, `name`, `location` (optional), `created_at` |
| `Shed` | `id`, `farm_id`, `name`, `number` (int, unique per farm), `live_bird_count` (default 0), `capacity` (optional), `created_at` |
| `ManagerFarmAssignment` | `user_id`, `farm_id`; unique `(user_id, farm_id)` |

Rules:

- Every farm query scoped by session `customer_id`.
- Manager visibility = assignment join only.
- Owner CRUD farms/sheds; Manager read assigned only.
- Owner creates users with `role=farm_manager` in same tenant; set/replace assignments.
- Hard delete farm → cascade sheds + assignments.
- Hard delete shed → remove row (no logs yet this slice).
- `live_bird_count` remains 0 until daily-log / starting-flock work; column exists for seed and later writes.

### Seed

- Keep demo Owner + Manager.
- Seed 2–3 farms with sheds under demo customer; prefer familiar ids (`farm-1`, …) so existing mock dashboard series still map.
- Assign Manager to **one** farm only (proves isolation).

## Permissions

| Action | Owner | Manager |
|--------|-------|---------|
| CRUD farms/sheds | yes | no |
| List / read farms & sheds | all tenant | assigned only |
| Create / update / delete Managers + assignments | yes | no |
| `GET /api/dashboard` for a farm | any tenant farm | assigned only |

## API

### Farms

- `GET /api/farms` — Owner: all tenant farms; Manager: assigned only
- `POST /api/farms` — Owner; `{ name, location? }`
- `PATCH /api/farms/{id}` — Owner
- `DELETE /api/farms/{id}` — Owner; cascade sheds + assignments

### Sheds

- `GET /api/farms/{farm_id}/sheds` — Owner (tenant farm) / Manager (assigned)
- `POST /api/farms/{farm_id}/sheds` — Owner; `{ name, number?, capacity? }` — omit `number` → next int for farm
- `PATCH /api/sheds/{id}` — Owner
- `DELETE /api/sheds/{id}` — Owner

### Managers (Owner only)

- `GET /api/managers` — Managers in tenant + `farm_ids[]`
- `POST /api/managers` — `{ email, password, farm_ids: string[] }`
- `PATCH /api/managers/{id}` — optional password; replace `farm_ids` when provided
- `DELETE /api/managers/{id}` — remove Manager user + assignments (never Owner)

### Dashboard (hybrid)

- `GET /api/dashboard?farm_id=&range=` — auth + farm access check
- Farm/shed **identity** from DB; KPI / series / hover stats from mock when `farm_id` has mock data; otherwise zeros and real shed list

### Errors

| Case | Status |
|------|--------|
| Unauthenticated | 401 |
| Wrong role / unassigned farm | 403 |
| Missing or other-tenant id | 404 (no cross-tenant leak) |
| Duplicate Manager email / shed number on farm | 409 |

## Frontend

**Owner nav:** Dashboard | Farms | Managers | Logout (+ theme)

| Route | Screen |
|-------|--------|
| `/` | Existing Owner dashboard; selector from real `GET /api/farms` |
| `/farms` | Farm list + create |
| `/farms/:farmId` | Edit farm; shed CRUD; delete farm |
| `/managers` | List / create / edit assignments & password / delete Managers |

**Manager:**

| Route | Screen |
|-------|--------|
| `/` | Assigned farms list (replaces placeholder) |
| `/farms/:farmId` | Read-only sheds (name, number, live count) |

UI kit: Kumo + Geist + `data-mode`; taste-skill for ops density. Tablet-first Manager lists; desktop-first Owner forms. Empty states for no farms / no assignments.

## Testing

**Backend**

- Owner CRUD farm + shed happy path
- Manager `GET /api/farms` only assigned; unassigned → 403/404
- Manager cannot mutate farms/sheds/managers
- Owner create Manager + assign; list includes `farm_ids`
- Dashboard requires access to `farm_id`

**Smoke**

1. Owner creates farm/shed, creates Manager, assigns farm
2. Manager sees that farm only; sheds read-only
3. Owner dashboard lists real farms; mock KPIs still work for seeded `farm-1` (etc.)

## Acceptance

1. Owner configures farms/sheds and Managers with farm assignments.
2. Manager sees only assigned farms/sheds (read-only).
3. Tenant isolation + role checks hold on new endpoints.
4. Dashboard remains usable on the real farm list (hybrid mock).

## Spec self-review

- No TBD placeholders; delete, mock hybrid, and Manager create scope explicit.
- Consistent with product design slice 2 and Approach 1 (nested REST).
- Single implementation-plan-sized slice.
- Ambiguity resolved: `live_bird_count` defaults to 0 this slice; starting flock deferred.
