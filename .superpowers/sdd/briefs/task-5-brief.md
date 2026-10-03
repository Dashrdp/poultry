### Task 5: Hybrid dashboard on real farms

**Files:**
- Modify: `backend/main.py` (`/api/dashboard`)
- Modify: `backend/mock_data.py` (export mock stats by farm id; farm list optional)
- Test: `backend/tests/test_dashboard_hybrid.py`

**Interfaces:**
- Produces: dashboard that 404s if user cannot access farm; uses DB farm/sheds; fills mock KPIs when `farm_id` in mock map else zeros
- Consumes: `get_farm_for_user`, shed rows, `mock_data` helpers

- [ ] **Step 1: Write failing test**

```python
from fastapi.testclient import TestClient


def test_dashboard_requires_assignment_for_manager(client: TestClient):
    client.post(
        "/api/auth/login",
        json={"email": "manager@demo.local", "password": "manager-pass"},
    )
    ok = client.get("/api/dashboard", params={"farm_id": "farm-1", "range": "current_month"})
    assert ok.status_code == 200
    assert ok.json()["farm"]["id"] == "farm-1"
    assert len(ok.json()["sheds"]) >= 1

    denied = client.get(
        "/api/dashboard", params={"farm_id": "farm-2", "range": "current_month"}
    )
    assert denied.status_code in (403, 404)


def test_owner_dashboard_unknown_farm_still_works_with_zeros(client: TestClient):
    client.post(
        "/api/auth/login",
        json={"email": "owner@demo.local", "password": "owner-pass"},
    )
    created = client.post("/api/farms", json={"name": "Blank", "location": ""})
    farm_id = created.json()["id"]
    client.post(f"/api/farms/{farm_id}/sheds", json={"name": "Shed 1"})
    dash = client.get(
        "/api/dashboard", params={"farm_id": farm_id, "range": "current_month"}
    )
    assert dash.status_code == 200
    body = dash.json()
    assert body["kpis"]["eggs_period"] == 0
    assert body["sheds"][0]["name"] == "Shed 1"
```

- [ ] **Step 2: Implement hybrid builder**

Pseudo:

```python
farm = get_farm_for_user(db, user, farm_id)
if farm is None:
    raise HTTPException(404, "Farm not found")
sheds_db = db.query(Shed).filter(Shed.farm_id == farm.id).order_by(Shed.number).all()
mock = get_mock_dashboard_stats(farm_id, range)  # may be None
# map sheds: prefer DB id/name/number; bird_count/eggs_today/last_log_date from mock match by number or id, else 0 / ""
# kpis/series from mock or zeros
```

- [ ] **Step 3: pytest + commit**

```powershell
pytest tests/test_dashboard_hybrid.py tests/test_farms_api.py -v
git add backend/main.py backend/mock_data.py backend/tests/test_dashboard_hybrid.py
git commit -m "feat: hybrid dashboard uses DB farms with mock KPIs"
```

---

