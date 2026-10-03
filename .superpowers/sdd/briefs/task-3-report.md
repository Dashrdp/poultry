# Task 3 Report: Farms + sheds HTTP API

## Status

**Complete.** DB-backed farm/shed routes implemented with tenant and role checks.

## Commits

None (per task constraint).

## Changes

| File | Action |
|------|--------|
| `backend/tests/test_farms_api.py` | Added owner CRUD, manager access, conflict, and not-found API tests |
| `backend/schemas_farms.py` | Added farm/shed request and response schemas |
| `backend/farms_api.py` | Added farms/sheds router and authorization/scoping logic |
| `backend/main.py` | Included router and removed mock farms handler |

## TDD

1. Added API tests before route implementation.
2. First focused run: **3 failed, 1 passed** because create routes were absent and the mock farm list ignored assignments.
3. Implemented schemas/router and wired it into the app.
4. Focused rerun: **4 passed**.

## Behavior

- Owner can create, list, patch, and delete tenant farms and sheds.
- Manager lists assigned farms only, reads assigned farm sheds, and receives `403` for mutation or an unassigned same-tenant farm.
- Missing and cross-tenant resources resolve as `404`.
- Null farm locations serialize as `""`.
- Omitted shed numbers use the next number in that farm; duplicates return `409`.
- Farm deletion uses existing SQLAlchemy delete-orphan cascades for sheds and assignments.

## Verification

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_farms_api.py -v
.\.venv\Scripts\python.exe -m pytest -v
.\.venv\Scripts\python.exe -m compileall -q main.py farms_api.py schemas_farms.py tests\test_farms_api.py
```

- Focused tests: **4 passed**.
- Full backend suite: **9 passed**.
- Compile check: passed.
- IDE diagnostics on changed files: none.

## Concerns

- Existing dependency deprecation warnings remain: FastAPI `on_event`, SQLAlchemy `datetime.utcnow`, and TestClient/httpx compatibility.
- Duplicate-number handling checks before insert; the database unique constraint remains the final guard for concurrent requests.
