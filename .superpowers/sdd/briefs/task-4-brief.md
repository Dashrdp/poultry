### Task 4: Managers API

**Files:**
- Create: `backend/schemas_managers.py`
- Create: `backend/managers_api.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_managers_api.py`

**Interfaces:**
- Produces: `GET/POST/PATCH/DELETE /api/managers`
- Consumes: `require_owner`, `hash_password`, `Farm` tenant check, `ManagerFarmAssignment`

- [ ] **Step 1: Write failing tests**

```python
from fastapi.testclient import TestClient


def _login_owner(client: TestClient):
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "owner@demo.local", "password": "owner-pass"},
        ).status_code
        == 200
    )


def test_owner_creates_manager_with_assignments(client: TestClient):
    _login_owner(client)
    r = client.post(
        "/api/managers",
        json={
            "email": "newmgr@demo.local",
            "password": "temp-pass",
            "farm_ids": ["farm-2"],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "newmgr@demo.local"
    assert body["farm_ids"] == ["farm-2"]
    assert body["role"] == "farm_manager"

    listed = client.get("/api/managers")
    assert any(m["id"] == body["id"] for m in listed.json())

    patched = client.patch(
        f"/api/managers/{body['id']}", json={"farm_ids": ["farm-1", "farm-2"]}
    )
    assert set(patched.json()["farm_ids"]) == {"farm-1", "farm-2"}

    deleted = client.delete(f"/api/managers/{body['id']}")
    assert deleted.status_code == 200


def test_manager_cannot_access_managers_api(client: TestClient):
    client.post(
        "/api/auth/login",
        json={"email": "manager@demo.local", "password": "manager-pass"},
    )
    assert client.get("/api/managers").status_code == 403
```

- [ ] **Step 2: Run â€” expect fail**

- [ ] **Step 3: Implement**

Rules:

- Create: normalize email lower/strip; 409 if email exists; only assign farms in same `customer_id`
- PATCH: if `farm_ids` present, delete existing assignments and recreate; if `password` present, rehash
- DELETE: 404 if not `farm_manager` in tenant; delete assignments then user
- Response: `{ id, email, role, customer_id, farm_ids: string[] }`

- [ ] **Step 4: pytest pass + commit**

```powershell
pytest tests/test_managers_api.py -v
git add backend/schemas_managers.py backend/managers_api.py backend/main.py backend/tests/test_managers_api.py
git commit -m "feat: add owner managers CRUD and farm assignment API"
```

---

