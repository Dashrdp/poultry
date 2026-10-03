# Manager UI shell + taste polish — Design

**Date:** 2026-10-02  
**Status:** Implemented  
**Related:** Owner Dashboard taste polish; [2026-10-02-cloudflare-shell-analytics-ui-design.md](./2026-10-02-cloudflare-shell-analytics-ui-design.md)

## Design Read

Manager ops product UI for Farm Managers: Cloudflare/Kumo language, calm dense daily-entry UI. Dials: VARIANCE **4** / MOTION **3** / DENSITY **6**. Taste-skill marketing patterns (hero, glass, marquees) do not apply. Kumo components + semantic tokens only.

## Goal

Make every Manager-facing screen feel like the polished Owner Dashboard: same AppShell chrome, dense shed tiles, soft hierarchy, skeletons — without Owner Analytics, PDF, or admin Setup.

## Scope

In:

- Manager shell (AppShell + avatar theme/logout)
- My farms (`/`)
- Farm monitor (`/farms/:farmId`)
- Daily shed log (`/farms/:farmId/sheds/:shedId`)
- Godown (`/farms/:farmId/godown`)

Out:

- Owner Analytics / KPI money wall / PDF export
- Manager admin (Owners’ Managers page)
- New APIs (reuse `GET /api/dashboard` for shed summaries + alerts)
- Redesigning Owner Dashboard again

## Approach

**Approach 1 (locked):** Dedicated `ManagerShell` on shared `AppShell`, Manager-specific flat nav, farm page reuses dense `ShedMap` + optional `AlertsPanel` via dashboard API, strip duplicate BrandMark headers from forms.

## Shell + IA

### ManagerShell

- New component wrapping Manager routes (mirror `OwnerShell`).
- Uses `AppShell` + `UserMenu` (theme / logout).
- Loads assigned farms once; tracks active `farmId`.
- Outlet context: `{ farmId, farms, farmsLoading, farmsError }` (and farm change helper as needed).

### Nav (flat)

| Label | Path |
|-------|------|
| My farms | `/` |
| Farm | `/farms/:farmId` (active farm) |
| Godown | `/farms/:farmId/godown` |

Farm selector in header on farm / shed / godown routes. Changing farm while on a farm-scoped route updates the URL to the same page type for the new farm.

### Page titles

| Route | Title |
|-------|--------|
| `/` | My farms |
| `/farms/:farmId` | Farm (or farm name if cheap) |
| `/farms/:farmId/sheds/:shedId` | Daily log |
| `/farms/:farmId/godown` | Godown |

No Monitor/Analytics/Setup groups for Manager.

## Pages

### My farms (`ManagerHome`)

- Content-only inside shell (no BrandMark header).
- Title + short helper; `LayerCard` rows (name, location, Open).
- Skeleton while loading; Empty for none / error.
- Single farm still listed (no forced auto-redirect).

### Farm monitor (`ManagerFarmDetail`)

- Farm H1 + location; primary Godown button.
- Soft “Shed top view” label; reuse `ShedMap` (birds, eggs today, last log, link to shed log).
- Data: `fetchDashboard(farmId, 'current_month')` — show sheds + `AlertsPanel` if alerts present.
- Do **not** show Owner KPI row, money panel, range toggle, or PDF export.

### Daily log + Godown

- Bare content inside shell for both roles (Manager and Owner already share these routes under their shells).
- Remove Manager-only BrandMark / Dark / Log out wrapping.
- Soften section titles (sentence case); prefer `LayerCard` / clear field groups; layout-shaped skeleton instead of blank centered spinner where practical.
- Keep existing save / validation / API behavior.
- Back: shed → farm; godown → farm (ghost).

## Routing

```text
ManagerShell
  /                         ManagerHome
  /farms/:farmId            ManagerFarmDetail
  /farms/:farmId/godown     GodownPage
  /farms/:farmId/sheds/:id  ShedLogPage
```

Wire in `App.tsx` under `user.role === 'farm_manager'`.

## Data

| Screen | API |
|--------|-----|
| My farms | `GET /api/farms` |
| Farm monitor | `GET /api/dashboard?farm_id=&range=current_month` (`require_user` + farm ACL already) |
| Shed log / Godown | existing endpoints unchanged |

## Visual rules

- Soft section titles (`variant="secondary" size="sm"`), no ALL-CAPS eyebrow spam.
- Shared spacing rhythm with OwnerDashboard (`gap-6`).
- Skeletons for first load; fade or keep layout on refresh where applicable.
- No custom farm palette; Kumo semantic tokens only.

## Success criteria

- Manager chrome matches Owner AppShell language (sidebar + avatar menu).
- Farm shed birds/eggs/last log readable without hover; tiles navigate to daily log.
- No duplicate headers on shed log / godown for Manager.
- Alerts on farm page are quieter + actionable when present.
- `npm run build` green; Manager demo login smoke path works.

## Files (expected)

- Create: `frontend/src/components/ManagerShell.tsx`
- Edit: `frontend/src/App.tsx`, `ManagerHome.tsx`, `ManagerFarmDetail.tsx`, `ShedLogPage.tsx`, `GodownPage.tsx`
- Reuse: `AppShell`, `ShedMap`, `AlertsPanel`, `UserMenu`
- Docs after ship: `MEMORY.md` (and roadmap tick if tracked)
