# PDF export whole-branch review package

Mode: no-git — review the listed files directly (no git range).

## Spec / plan

- Design: `docs/superpowers/specs/2026-10-02-dashboard-pdf-export-design.md`
- Plan: `docs/superpowers/plans/2026-10-02-dashboard-pdf-export.md`
- Slice: `specs/012-dashboard-pdf-export.md`

## Files to review

- `backend/dashboard_api.py` — `_build_dashboard_payload`, `GET /dashboard/export.pdf`
- `backend/export_pdf.py` — `render_dashboard_pdf`
- `backend/tests/test_dashboard_export.py`
- `backend/requirements.txt` — reportlab, matplotlib
- `backend/main.py` — CORS `expose_headers=["Content-Disposition"]`
- `frontend/src/api.ts` — `downloadDashboardPdf`
- `frontend/src/components/OwnerDashboard.tsx` — Export PDF button
- `MEMORY.md`, `TODO-LIST.md`, `docs/roadmap.md`

## Progress ledger minors to triage

- pageCompression=0 for byte smoke tests
- Optional tests: exact Content-Disposition filename, export 400/401
- Duplicate range/farm guards between JSON and PDF routes

## Acceptance (design)

Owner downloads PDF for farm+range with KPIs, alerts, money, timeseries, eggs-by-shed pie, compare tables. Manager 403.
