# Task 4: Frontend Export button

**Files:**
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/components/OwnerDashboard.tsx`

**Interfaces:**
- Produces: `downloadDashboardPdf(farmId: string, range: DashboardRange): Promise<void>`
- Consumes: `GET http://localhost:8010/api/dashboard/export.pdf` with credentials

Follow plan Task 4 in `docs/superpowers/plans/2026-10-02-dashboard-pdf-export.md`:
1. Add `downloadDashboardPdf` + `filenameFromDisposition` to api.ts
2. Wire Export PDF button beside RangeToggle on OwnerDashboard (loading/disabled/error)
3. `npm run build` must pass
4. Manual smoke optional if servers up
5. Commit — SKIP (no-git)

## Global constraints (binding)

- Owner dashboard only (this page is already Owner)
- Kumo UI for the button
- Blob download with credentials include
- Filename from Content-Disposition when present; else `dashboard-export.pdf`
