# Task 2: PDF renderer + dependencies

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/export_pdf.py`
- Test: `backend/tests/test_dashboard_export.py` (unit-style render first)

**Interfaces:**
- Produces: `render_dashboard_pdf(payload: dict) -> bytes`
- Consumes: dashboard payload keys: `farm`, `range`, `kpis`, `alerts`, `money`, `series`, `compare_sheds`, `compare_farms`

Follow plan steps in `docs/superpowers/plans/2026-10-02-dashboard-pdf-export.md` Task 2 exactly:
1. Add reportlab + matplotlib to requirements.txt and pip install
2. Write failing render test first (TDD)
3. Run test — expect fail
4. Implement export_pdf.py as specified in the plan (full code in plan)
5. Run test — expect pass
6. Commit — SKIP (no-git)

## Global constraints (binding)

- Charts: egg timeseries + eggs-by-shed pie only (no birds pie)
- Generated-at timestamp in header: UTC `YYYY-MM-DD HH:MM UTC`
- Keep PDF styling plain (black text, simple tables); no second design system
- Matplotlib: non-interactive backend (`Agg`)
- Owner-only and API route are Task 3 — do NOT add the FastAPI route yet
