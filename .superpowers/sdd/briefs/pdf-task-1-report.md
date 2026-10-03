# Task 1 Report: Shared dashboard payload builder

## Status

**DONE**

## Scope

Extracted `_build_dashboard_payload(db, user, farm, range) -> dict` from the JSON `GET /api/dashboard` route so Task 3 (PDF export) can reuse the same aggregation without duplicating business logic.

## Changes

| File | Change |
|------|--------|
| `backend/dashboard_api.py` | Added `_build_dashboard_payload`; `dashboard()` now validates range, resolves farm via `get_farm_for_user`, then returns `_build_dashboard_payload(...)`. Aggregation body unchanged. |

## Interface (produced)

```python
def _build_dashboard_payload(
    db: Session,
    user: User,
    farm: Farm,
    range: str,
) -> dict:
```

Return shape unchanged: `farm`, `range`, `sheds`, `kpis`, `series`, `compare_sheds`, `compare_farms`, `alerts`, `money`.

## Tests

Command (from brief):

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_hybrid.py tests/test_alerts.py tests/test_money.py -q
```

**Result:** 11 passed in ~3.3s (48 deprecation warnings, pre-existing).

## Commits

None (no-git mode per brief).

## Self-review

- **Behavior:** Pure refactor; HTTP validation and 404 remain in `dashboard()` only; payload math identical to pre-task.
- **Tenant isolation:** Unchanged — farm still resolved with `get_farm_for_user` before builder; `list_farms_for_user` inside builder for compare_farms.
- **Range validation:** Still in route; builder assumes valid `range` (same as before when only route called it).
- **Out of scope:** No PDF route, no `export_pdf`, no new tests (brief used existing suite only).
- **Risks:** None identified for Task 1; Task 3 should import/call `_build_dashboard_payload` from `dashboard_api` (module-private by convention).

## Concerns

None.

## Artifacts

- Review diff: `.superpowers/sdd/briefs/pdf-task-1-review-pkg.md`
