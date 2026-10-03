# Task 1: Shared dashboard payload builder

**Files:**
- Modify: `backend/dashboard_api.py`
- Test: `backend/tests/test_dashboard_hybrid.py` (existing; must still pass)

**Interfaces:**
- Produces: `_build_dashboard_payload(db: Session, user: User, farm: Farm, range: str) -> dict`
- Consumes: existing helpers in `dashboard_api.py` (`_range_bounds`, `_period_totals`, etc.)

- [ ] **Step 1: Refactor JSON route to call shared builder**

In `backend/dashboard_api.py`, move the body of `dashboard()` (from after farm lookup through the return dict) into:

```python
def _build_dashboard_payload(
    db: Session,
    user: User,
    farm: Farm,
    range: str,
) -> dict:
    # existing aggregation logic unchanged; return the same dict shape
    ...
```

Keep `dashboard()` as:

```python
@router.get("/dashboard")
def dashboard(
    farm_id: str = Query(...),
    range: str = Query("current_month"),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    if range not in VALID_RANGES:
        raise HTTPException(
            status_code=400,
            detail=f"range must be one of: {', '.join(sorted(VALID_RANGES))}",
        )
    farm = get_farm_for_user(db, user, farm_id)
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")
    return _build_dashboard_payload(db, user, farm, range)
```

- [ ] **Step 2: Verify existing dashboard tests still pass**

Run:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_hybrid.py tests/test_alerts.py tests/test_money.py -q
```

Expected: all passed

- [ ] **Step 3: Commit** — SKIP (repo has no git; mode=no-git)

## Global constraints (binding)

- Reuse dashboard aggregates; PDF must not recompute business totals from raw queries (this task enables that)
- Ranges: `current_month` | `previous_month` | `year` only
- Tenant isolation unchanged
- Backend port `8010`
