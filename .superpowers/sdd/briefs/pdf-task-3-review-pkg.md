# Task 3 Review Package — Export API route + auth tests

## Summary

Owner-only `GET /api/dashboard/export.pdf` wired to `_build_dashboard_payload` and `render_dashboard_pdf`. Four pytest API tests cover 200/%PDF/content-disposition, manager 403, missing farm 404, and export when `money` is null.

**Files touched:** 2 modified (matches brief).

---

## Diff: `backend/dashboard_api.py` (vs `pdf-task-3-before-dashboard_api.py`)

**Imports:**

```diff
-from fastapi import APIRouter, Depends, HTTPException, Query
+from fastapi import APIRouter, Depends, HTTPException, Query, Response
 ...
-from auth import require_user
+from auth import require_owner, require_user
+from export_pdf import render_dashboard_pdf
```

**New route** (after JSON `@router.get("/dashboard")`):

```python
@router.get("/dashboard/export.pdf")
def export_dashboard_pdf(
    farm_id: str = Query(..., description="Farm id"),
    range: str = Query("current_month", description="current_month | previous_month | year"),
    owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    if range not in VALID_RANGES:
        raise HTTPException(status_code=400, detail=...)
    farm = get_farm_for_user(db, owner, farm_id)
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")
    payload = _build_dashboard_payload(db, owner, farm, range)
    pdf = render_dashboard_pdf(payload)
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in farm.name).strip("-") or "farm"
    filename = f"farm-{slug}-{range}.pdf"
    return Response(content=pdf, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="{filename}"',
    })
```

Matches plan Task 3 Step 3; Query `description` strings align with existing JSON dashboard route.

---

## Diff: `backend/tests/test_dashboard_export.py` (vs `pdf-task-3-before-test_dashboard_export.py`)

**Added:**

```diff
+from fastapi.testclient import TestClient
 ...
+def _login(client: TestClient, email: str, password: str) -> None: ...
+def test_owner_export_pdf(client: TestClient) -> None: ...
+def test_manager_cannot_export_pdf(client: TestClient) -> None: ...
+def test_export_unknown_farm_404(client: TestClient) -> None: ...
+def test_export_with_money_null_ok(client: TestClient) -> None: ...
```

Matches plan Task 3 Step 1 exactly (assertions: content-type, `%PDF`, farm name bytes, attachment header, 403, 404, money null smoke).

---

## Verification

```text
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_export.py -q
# 5 passed
```
