# Task 1 review package — unified diff

## Summary

Refactor only: dashboard aggregation moved from `dashboard()` into `_build_dashboard_payload(db, user, farm, range)`. The route keeps range validation, farm lookup, and HTTP errors; returns the builder result. No logic or response shape changes. ~13 lines net (route wrapper + function signature).

**Baseline:** `.superpowers/sdd/briefs/pdf-task-1-before-dashboard_api.py`  
**Current:** `backend/dashboard_api.py`

---

```diff
diff --git "a/c:\\Users\\ngrah\\OneDrive\\Desktop\\poutry farm\\.superpowers\\sdd\\briefs\\pdf-task-1-before-dashboard_api.py" "b/c:\\Users\\ngrah\\OneDrive\\Desktop\\poutry farm\\backend\\dashboard_api.py"
index 44c06bd..df0b087 100644
--- "a/c:\\Users\\ngrah\\OneDrive\\Desktop\\poutry farm\\.superpowers\\sdd\\briefs\\pdf-task-1-before-dashboard_api.py"	
+++ "b/c:\\Users\\ngrah\\OneDrive\\Desktop\\poutry farm\\backend\\dashboard_api.py"	
@@ -311,25 +311,12 @@ def _build_series(
     ]
 
 
-@router.get("/dashboard")
-def dashboard(
-    farm_id: str = Query(..., description="Farm id"),
-    range: str = Query(
-        "current_month",
-        description="current_month | previous_month | year",
-    ),
-    user: User = Depends(require_user),
-    db: Session = Depends(get_db),
-):
-    if range not in VALID_RANGES:
-        raise HTTPException(
-            status_code=400,
-            detail=f"range must be one of: {', '.join(sorted(VALID_RANGES))}",
-        )
-    farm = get_farm_for_user(db, user, farm_id)
-    if farm is None:
-        raise HTTPException(status_code=404, detail="Farm not found")
-
+def _build_dashboard_payload(
+    db: Session,
+    user: User,
+    farm: Farm,
+    range: str,
+) -> dict:
     sheds = (
         db.query(Shed)
         .filter(Shed.farm_id == farm.id)
@@ -430,3 +417,24 @@ def dashboard(
         "alerts": alerts,
         "money": _money_block(db, farm.id, eggs_period, start, end),
     }
+
+
+@router.get("/dashboard")
+def dashboard(
+    farm_id: str = Query(..., description="Farm id"),
+    range: str = Query(
+        "current_month",
+        description="current_month | previous_month | year",
+    ),
+    user: User = Depends(require_user),
+    db: Session = Depends(get_db),
+):
+    if range not in VALID_RANGES:
+        raise HTTPException(
+            status_code=400,
+            detail=f"range must be one of: {', '.join(sorted(VALID_RANGES))}",
+        )
+    farm = get_farm_for_user(db, user, farm_id)
+    if farm is None:
+        raise HTTPException(status_code=404, detail="Farm not found")
+    return _build_dashboard_payload(db, user, farm, range)
```
