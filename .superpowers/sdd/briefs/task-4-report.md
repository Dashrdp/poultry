# Task 4 Report — Managers API

## Status

Complete. Added owner-only Managers CRUD at `/api/managers`, including password hashing, normalized duplicate-email checks, tenant-scoped farm assignment validation, assignment replacement, and protected deletion of tenant Farm Manager users only.

## Files

- Added `backend/schemas_managers.py`
- Added `backend/managers_api.py`
- Added `backend/tests/test_managers_api.py`
- Updated `backend/main.py`

## TDD evidence

- RED: `pytest tests/test_managers_api.py -v` — 3 failed, 1 passed because routes were absent.
- GREEN: `pytest tests/test_managers_api.py -v` — 4 passed.
- Regression: `pytest -v` — 13 passed.
- IDE diagnostics: no linter errors in changed files.

## Commits

None, per task constraint.

## Concerns

Existing suite emits dependency and deprecated API warnings (`httpx` TestClient shim, `datetime.utcnow`, FastAPI `on_event`); unrelated to this task.
