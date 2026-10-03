# Task 5 Review Package — Docs + CORS

## Summary

Slice spec `specs/012-dashboard-pdf-export.md` points at design doc. Trackers mark dashboard PDF export complete. CORS exposes `Content-Disposition` so `downloadDashboardPdf` can parse server filename on cross-origin dev (Vite 5173 → API 8010).

**Files touched:** 5 (1 create, 4 modify) — matches brief.

---

## `backend/main.py` CORS change

```python
expose_headers=["Content-Disposition"],
```

Added to existing `CORSMiddleware` block (origins 5173, credentials true).

---

## `specs/012-dashboard-pdf-export.md`

- Links `docs/superpowers/specs/2026-10-02-dashboard-pdf-export-design.md`
- Slice: Owner `GET /api/dashboard/export.pdf`, dashboard snapshot contents, Owner dashboard button
- Out: manager export, ops dump, branded templates, Kumo chart styling in PDF

---

## Tracker deltas

- **MEMORY:** active phase PDF export done; goal ask next priority
- **TODO-LIST:** `[x] Dashboard PDF export` with spec + plan links
- **roadmap:** `[x] Export / reports — dashboard PDF snapshot`; separate hardening line remains open

---

## Review checklist

| Item | Pass |
|------|------|
| Spec matches plan Task 5 template | Yes |
| No scope creep in docs | Yes |
| CORS fix only (no other backend edits) | Yes |
| Commits skipped | Yes |
