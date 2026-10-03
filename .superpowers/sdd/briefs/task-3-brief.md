### Task 3: Farms + sheds HTTP API

**Files:**
- Create: `backend/schemas_farms.py`
- Create: `backend/farms_api.py` (APIRouter)
- Modify: `backend/main.py` (include router)
- Test: `backend/tests/test_farms_api.py`

**Interfaces:**
- Produces: routes listed in spec (farms + sheds)
- Consumes: `require_user`, `require_owner`, `get_farm_for_user`, `list_farms_for_user`

- [ ] **Step 1: Write failing API tests**

```python
from fastapi.testclient import TestClient


def _login(client: TestClient, email: str, password: str):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200


def test_owner_can_create_list_patch_delete_farm(client: TestClient):
    _login(client, "owner@demo.local", "owner-pass")
    created = client.post(
        "/api/farms", json={"name": "New Farm", "location": "Satara"}
    )
    assert created.status_code == 200
    farm_id = created.json()["id"]
    assert created.json()["name"] == "New Farm"

    listed = client.get("/api/farms")
    assert any(f["id"] == farm_id for f in listed.json())

    patched = client.patch(
        f"/api/farms/{farm_id}", json={"name": "Renamed", "location": "Satara"}
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Renamed"

    shed = client.post(
        f"/api/farms/{farm_id}/sheds", json={"name": "Shed 1"}
    )
    assert shed.status_code == 200
    assert shed.json()["number"] == 1
    shed_id = shed.json()["id"]

    deleted_shed = client.delete(f"/api/sheds/{shed_id}")
    assert deleted_shed.status_code == 200

    deleted = client.delete(f"/api/farms/{farm_id}")
    assert deleted.status_code == 200
    assert client.get(f"/api/farms/{farm_id}/sheds").status_code == 404


def test_manager_lists_only_assigned_and_cannot_mutate(client: TestClient):
    _login(client, "manager@demo.local", "manager-pass")
    farms = client.get("/api/farms").json()
    assert {f["id"] for f in farms} == {"farm-1"}
    assert client.post("/api/farms", json={"name": "Nope"}).status_code == 403
    assert client.get("/api/farms/farm-2/sheds").status_code in (403, 404)
    sheds = client.get("/api/farms/farm-1/sheds")
    assert sheds.status_code == 200
    assert len(sheds.json()) >= 1
```

- [ ] **Step 2: Run â€” expect fail** (routes missing)

- [ ] **Step 3: Implement schemas + router**

`schemas_farms.py` â€” `FarmCreate`, `FarmUpdate`, `FarmOut`, `ShedCreate`, `ShedUpdate`, `ShedOut`.

`farms_api.py` â€” `APIRouter(prefix="/api")` with:

- `GET /farms` â†’ `list_farms_for_user`, serialize `{id,name,location}` (`location` `""` if null for frontend compat)
- `POST /farms` â†’ `require_owner`, uuid id
- `PATCH /farms/{farm_id}` â†’ owner + tenant farm
- `DELETE /farms/{farm_id}` â†’ owner; SQLAlchemy cascade
- `GET /farms/{farm_id}/sheds` â†’ `get_farm_for_user` else 404
- `POST /farms/{farm_id}/sheds` â†’ owner; next `number` if omitted; 409 on duplicate number
- `PATCH /sheds/{shed_id}` / `DELETE /sheds/{shed_id}` â†’ resolve shedâ†’farm, owner + tenant

Include router in `main.py`. Replace mock `GET /api/farms` with real handler (or delete old and use router).

- [ ] **Step 4: Run tests â€” expect pass**

```powershell
pytest tests/test_farms_api.py -v
```

- [ ] **Step 5: Commit**

```powershell
git add backend/schemas_farms.py backend/farms_api.py backend/main.py backend/tests/test_farms_api.py
git commit -m "feat: add farms and sheds CRUD API with role checks"
```

---

