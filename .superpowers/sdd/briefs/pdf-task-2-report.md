# Task 2 Report — PDF renderer + dependencies

**Status:** DONE_WITH_CONCERNS  
**Date:** 2026-10-02  
**Commits:** none (no-git per brief)

## Scope delivered

| File | Action |
|------|--------|
| `backend/requirements.txt` | Added `reportlab`, `matplotlib` |
| `backend/export_pdf.py` | Created — `render_dashboard_pdf(payload) -> bytes` |
| `backend/tests/test_dashboard_export.py` | Created — unit render smoke test |

**Out of scope (Task 3):** `GET /api/dashboard/export.pdf`, auth tests, `dashboard_api.py` changes.

## TDD evidence

| Phase | Command | Result |
|-------|---------|--------|
| **RED** | `pytest tests/test_dashboard_export.py::test_render_dashboard_pdf_bytes_and_farm_name -v` (before `export_pdf.py`) | `ModuleNotFoundError: No module named 'export_pdf'` |
| **GREEN** | Same after `export_pdf.py` + `pip install reportlab matplotlib` | `1 passed` (~0.77s) |

Intermediate note: first GREEN attempt failed on `assert b"Alpha Farm" in pdf` with plan-only code (ReportLab default page compression). Fixed with `reportlab.rl_config.pageCompression = 0` (see Concerns).

## Self-review

| Constraint | OK |
|------------|-----|
| Matplotlib `Agg` backend before pyplot | Yes |
| Charts: egg timeseries + eggs-by-shed pie only | Yes |
| Header UTC `YYYY-MM-DD HH:MM UTC` | Yes |
| Plain tables / black-ish styling | Yes |
| Consumes payload keys per plan | Yes |
| No HTTP export route | Yes |

## Concerns

1. **Plan deviation:** Added `reportlab.rl_config.pageCompression = 0` (lines 22–25 in `export_pdf.py`). ReportLab’s default Flate-compressed page streams do not contain literal UTF-8 farm names, so the plan’s `assert b"Alpha Farm" in pdf` fails without this. Production PDFs are slightly larger; content unchanged.
2. **Dependencies:** Installed into local `.venv` only; lock/pin versions not added (matches existing `requirements.txt` style).

## Next (Task 3)

Wire `render_dashboard_pdf` + `_build_dashboard_payload` on Owner-only export route; extend `test_dashboard_export.py` with API tests.

## Artifacts

- Review package: `.superpowers/sdd/briefs/pdf-task-2-review-pkg.md`
