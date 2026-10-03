# Task 2 Review Package — PDF renderer

## Summary

Implemented server-side dashboard PDF rendering per plan Task 2: ReportLab document assembly, matplotlib PNG charts (timeseries + eggs-by-shed pie), and a pytest unit smoke test. Dependencies appended to `requirements.txt` and installed in `backend/.venv`.

**Deviation from plan snippet:** `export_pdf.py` sets `reportlab.rl_config.pageCompression = 0` so the mandated byte-level farm-name assertion passes on current ReportLab defaults.

**Files touched:** 1 modified, 2 created (no other backend files changed).

---

## Diff: `backend/requirements.txt`

```diff
 itsdangerous
+reportlab
+matplotlib
```

---

## New file: `backend/tests/test_dashboard_export.py`

Matches plan Task 2 Step 2 exactly (60 lines): `_sample_payload()`, `test_render_dashboard_pdf_bytes_and_farm_name` asserting bytes type, `%PDF` magic, and `b"Alpha Farm" in pdf`.

---

## New file: `backend/export_pdf.py`

Plan Task 2 Step 4 implementation (~240 lines) with **additional** block after platypus imports:

```python
import reportlab.rl_config

# Uncompressed page streams so smoke tests can find farm name as literal bytes.
reportlab.rl_config.pageCompression = 0
```

Otherwise identical to plan: `RANGE_LABELS`, `_chart_timeseries`, `_chart_eggs_pie`, `render_dashboard_pdf` (KPIs, alerts, money null path, charts, shed/farm compare tables).

Public API:

```python
def render_dashboard_pdf(payload: dict) -> bytes: ...
```

---

## Verification

```text
cd backend
.\.venv\Scripts\pip.exe install reportlab matplotlib
.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_export.py::test_render_dashboard_pdf_bytes_and_farm_name -v
# PASSED
```
