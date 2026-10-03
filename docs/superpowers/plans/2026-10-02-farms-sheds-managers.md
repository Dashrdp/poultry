# Farms / Sheds / Managers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist farms and sheds in SQLite, let Owners CRUD them and create/assign Managers, let Managers read only assigned farms/sheds, and back the Owner dashboard farm selector with real farms while keeping mock KPIs/series.

**Architecture:** Extend SQLAlchemy models with `Farm`, `Shed`, `ManagerFarmAssignment`. FastAPI nested REST under `/api/farms`, `/api/sheds`, `/api/managers` with `require_owner` / assignment checks. Hybrid `GET /api/dashboard` merges DB identity with `mock_data` stats. Frontend adds `react-router-dom`, Owner `/farms` + `/managers` screens, Manager read-only farm list.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, SQLite, pytest, Vite React TS, react-router-dom, Kumo UI.

**Spec:** [docs/superpowers/specs/2026-10-02-farms-sheds-managers-design.md](../specs/2026-10-02-farms-sheds-managers-design.md)

## Global Constraints

- Roles only: `owner` | `farm_manager`
- Tenant isolation via `customer_id` on every data query
- Manager farm visibility = `ManagerFarmAssignment` only
- Hard delete farm cascades sheds + assignments
- `live_bird_count` defaults to `0` this slice (no starting-flock UI)
- Dashboard KPIs/series stay mock; farm/shed identity from DB
- Prefer seeded ids `farm-1`, `farm-2`, `farm-3` so mock series still map
- Kumo UI + Geist + `data-mode`; no custom brand palette
- HTTP-only session cookie auth (existing)
- Backend port `8010`, frontend `5173`

---

## File structure

| File | Responsibility |
|------|----------------|
| `backend/models.py` | Add `Farm`, `Shed`, `ManagerFarmAssignment` |
| `backend/db.py` | Import new models in `init_db` |
| `backend/access.py` | `list_farms_for_user`, `get_farm_for_user`, assignment helpers |
| `backend/schemas_farms.py` | Pydantic request/response models |
| `backend/farms_api.py` | Farm + shed route handlers (or keep in `main.py` if small) |
| `backend/managers_api.py` | Manager CRUD + assignment handlers |
| `backend/mock_data.py` | Keep mock stats; stop owning farm list as source of truth |
| `backend/seed.py` | Seed farms/sheds + assign Manager to `farm-1` |
| `backend/main.py` | Mount routes; real `GET /api/farms`; hybrid dashboard |
| `backend/tests/test_farms_api.py` | Farm/shed CRUD + role isolation |
| `backend/tests/test_managers_api.py` | Manager create/assign + isolation |
| `frontend/package.json` | Add `react-router-dom` |
| `frontend/src/types.ts` | Shed, Manager types; Farm.location optional |
| `frontend/src/api.ts` | Farm/shed/manager API helpers |
| `frontend/src/App.tsx` | Router + role routes |
| `frontend/src/components/OwnerShell.tsx` | Nav: Dashboard / Farms / Managers |
| `frontend/src/components/OwnerDashboard.tsx` | Move current dashboard out of App |
| `frontend/src/components/FarmsPage.tsx` | Owner farm list + create |
| `frontend/src/components/FarmDetailPage.tsx` | Edit farm + shed CRUD |
| `frontend/src/components/ManagersPage.tsx` | Manager list/create/edit/delete |
| `frontend/src/components/ManagerHome.tsx` | Assigned farms + read-only sheds |
| `specs/003-farms-sheds-managers.md` | Slice pointer |
| `TODO-LIST.md` / `MEMORY.md` / `docs/roadmap.md` | Mark slice progress |

---

### Task 1: ORM models + access helpers

**Files:**
- Modify: `backend/models.py`
- Modify: `backend/db.py`
- Create: `backend/access.py`
- Test: `backend/tests/test_access.py`

**Interfaces:**
- Produces: `Farm`, `Shed`, `ManagerFarmAssignment`; `list_farms_for_user(db, user) -> list[Farm]`; `get_farm_for_user(db, user, farm_id) -> Farm | None`; `user_assigned_to_farm(db, user_id, farm_id) -> bool`
- Consumes: existing `Customer`, `User`, `get_db`

- [ ] **Step 1: Write failing access test**

Create `backend/tests/test_access.py`:

```python
from sqlalchemy.orm import Session

import db
from access import get_farm_for_user, list_farms_for_user
from models import Farm, ManagerFarmAssignment, User


def test_owner_sees_all_tenant_farms_manager_sees_assigned_only():
    with db.SessionLocal() as session:
        owner = session.query(User).filter(User.email == "owner@demo.local").one()
        manager = session.query(User).filter(User.email == "manager@demo.local").one()

        farm_a = Farm(
            id="test-farm-a",
            customer_id=owner.customer_id,
            name="A",
            location=None,
        )
        farm_b = Farm(
            id="test-farm-b",
            customer_id=owner.customer_id,
            name="B",
            location=None,
        )
        session.add_all([farm_a, farm_b])
        session.add(
            ManagerFarmAssignment(user_id=manager.id, farm_id="test-farm-a")
        )
        session.commit()

        owner_ids = {f.id for f in list_farms_for_user(session, owner)}
        manager_ids = {f.id for f in list_farms_for_user(session, manager)}
        assert "test-farm-a" in owner_ids and "test-farm-b" in owner_ids
        assert manager_ids == {"test-farm-a"}
        assert get_farm_for_user(session, manager, "test-farm-b") is None
        assert get_farm_for_user(session, manager, "test-farm-a") is not None
```

- [ ] **Step 2: Run test — expect fail**

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest tests/test_access.py -v
```

Expected: FAIL (`access` missing or models missing).

- [ ] **Step 3: Add models**

Append to `backend/models.py` (keep existing `Customer` / `User`):

```python
from sqlalchemy import ForeignKey, Integer, UniqueConstraint
# ensure Integer imported alongside existing imports

class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    sheds: Mapped[list["Shed"]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )
    assignments: Mapped[list["ManagerFarmAssignment"]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )


class Shed(Base):
    __tablename__ = "sheds"
    __table_args__ = (
        UniqueConstraint("farm_id", "number", name="uq_sheds_farm_number"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    farm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("farms.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    live_bird_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    farm: Mapped["Farm"] = relationship(back_populates="sheds")


class ManagerFarmAssignment(Base):
    __tablename__ = "manager_farm_assignments"
    __table_args__ = (
        UniqueConstraint("user_id", "farm_id", name="uq_manager_farm"),
    )

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), primary_key=True
    )
    farm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("farms.id"), primary_key=True
    )

    farm: Mapped["Farm"] = relationship(back_populates="assignments")
```

Update `backend/db.py` `init_db`:

```python
def init_db() -> None:
    from models import (  # noqa: F401
        Customer,
        Farm,
        ManagerFarmAssignment,
        Shed,
        User,
    )

    Base.metadata.create_all(bind=engine)
```

- [ ] **Step 4: Implement `backend/access.py`**

```python
from sqlalchemy.orm import Session

from models import Farm, ManagerFarmAssignment, User


def user_assigned_to_farm(db: Session, user_id: str, farm_id: str) -> bool:
    row = (
        db.query(ManagerFarmAssignment)
        .filter_by(user_id=user_id, farm_id=farm_id)
        .one_or_none()
    )
    return row is not None


def list_farms_for_user(db: Session, user: User) -> list[Farm]:
    q = db.query(Farm).filter(Farm.customer_id == user.customer_id)
    if user.role == "owner":
        return q.order_by(Farm.name).all()
    if user.role == "farm_manager":
        return (
            q.join(
                ManagerFarmAssignment,
                ManagerFarmAssignment.farm_id == Farm.id,
            )
            .filter(ManagerFarmAssignment.user_id == user.id)
            .order_by(Farm.name)
            .all()
        )
    return []


def get_farm_for_user(db: Session, user: User, farm_id: str) -> Farm | None:
    farm = db.get(Farm, farm_id)
    if farm is None or farm.customer_id != user.customer_id:
        return None
    if user.role == "owner":
        return farm
    if user.role == "farm_manager" and user_assigned_to_farm(
        db, user.id, farm_id
    ):
        return farm
    return None
```

- [ ] **Step 5: Run test — expect pass**

```powershell
pytest tests/test_access.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```powershell
git add backend/models.py backend/db.py backend/access.py backend/tests/test_access.py
git commit -m "feat: add Farm, Shed, assignment models and access helpers"
```

---

### Task 2: Seed demo farms / sheds / assignment

**Files:**
- Modify: `backend/seed.py`
- Test: `backend/tests/test_seed_farms.py`

**Interfaces:**
- Produces: idempotent seed of `farm-1`..`farm-3` with sheds; Manager assigned to `farm-1` only
- Consumes: `Farm`, `Shed`, `ManagerFarmAssignment`, `DEMO_CUSTOMER_ID`

- [ ] **Step 1: Write failing seed test**

```python
import db
from models import Farm, ManagerFarmAssignment, Shed, User
from seed import seed_demo


def test_seed_creates_farms_and_assigns_manager_to_farm_one_only():
    with db.SessionLocal() as session:
        seed_demo(session)
        farms = session.query(Farm).filter(Farm.customer_id.isnot(None)).all()
        ids = {f.id for f in farms}
        assert {"farm-1", "farm-2", "farm-3"}.issubset(ids)
        sheds = session.query(Shed).filter(Shed.farm_id == "farm-1").all()
        assert len(sheds) >= 2
        manager = session.query(User).filter(User.email == "manager@demo.local").one()
        assigned = {
            a.farm_id
            for a in session.query(ManagerFarmAssignment).filter_by(
                user_id=manager.id
            )
        }
        assert assigned == {"farm-1"}
```

- [ ] **Step 2: Run — expect fail** (no farm seed yet)

- [ ] **Step 3: Extend `seed_demo`**

After users are ensured, upsert farms/sheds/assignment. Use fixed shed ids `shed-1`.. matching mock where possible. Example structure:

```python
DEMO_FARMS = (
    ("farm-1", "Green Valley", "Nashik", (("shed-1", "Shed 1", 1), ("shed-2", "Shed 2", 2), ("shed-3", "Shed 3", 3))),
    ("farm-2", "Sunrise Layers", "Pune", (("shed-4", "Shed 1", 1), ("shed-5", "Shed 2", 2))),
    ("farm-3", "Riverbend Poultry", "Ahmednagar", (("shed-6", "Shed 1", 1), ("shed-7", "Shed 2", 2), ("shed-8", "Shed 3", 3))),
)

# in seed_demo after users:
for farm_id, name, location, sheds in DEMO_FARMS:
    farm = db.get(Farm, farm_id)
    if farm is None:
        farm = Farm(id=farm_id, customer_id=customer.id, name=name, location=location)
        db.add(farm)
        db.flush()
    for shed_id, shed_name, number in sheds:
        if db.get(Shed, shed_id) is None:
            db.add(
                Shed(
                    id=shed_id,
                    farm_id=farm_id,
                    name=shed_name,
                    number=number,
                    live_bird_count=0,
                )
            )

manager = db.query(User).filter(User.email == "manager@demo.local").one()
if (
    db.query(ManagerFarmAssignment)
    .filter_by(user_id=manager.id, farm_id="farm-1")
    .one_or_none()
    is None
):
    db.add(ManagerFarmAssignment(user_id=manager.id, farm_id="farm-1"))
db.commit()
```

- [ ] **Step 4: Run seed + test**

```powershell
python seed.py
pytest tests/test_seed_farms.py -v
```

Expected: PASS; console still prints demo logins.

- [ ] **Step 5: Commit**

```powershell
git add backend/seed.py backend/tests/test_seed_farms.py
git commit -m "feat: seed demo farms, sheds, and manager assignment"
```

---

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

- [ ] **Step 2: Run — expect fail** (routes missing)

- [ ] **Step 3: Implement schemas + router**

`schemas_farms.py` — `FarmCreate`, `FarmUpdate`, `FarmOut`, `ShedCreate`, `ShedUpdate`, `ShedOut`.

`farms_api.py` — `APIRouter(prefix="/api")` with:

- `GET /farms` → `list_farms_for_user`, serialize `{id,name,location}` (`location` `""` if null for frontend compat)
- `POST /farms` → `require_owner`, uuid id
- `PATCH /farms/{farm_id}` → owner + tenant farm
- `DELETE /farms/{farm_id}` → owner; SQLAlchemy cascade
- `GET /farms/{farm_id}/sheds` → `get_farm_for_user` else 404
- `POST /farms/{farm_id}/sheds` → owner; next `number` if omitted; 409 on duplicate number
- `PATCH /sheds/{shed_id}` / `DELETE /sheds/{shed_id}` → resolve shed→farm, owner + tenant

Include router in `main.py`. Replace mock `GET /api/farms` with real handler (or delete old and use router).

- [ ] **Step 4: Run tests — expect pass**

```powershell
pytest tests/test_farms_api.py -v
```

- [ ] **Step 5: Commit**

```powershell
git add backend/schemas_farms.py backend/farms_api.py backend/main.py backend/tests/test_farms_api.py
git commit -m "feat: add farms and sheds CRUD API with role checks"
```

---

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

- [ ] **Step 2: Run — expect fail**

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

### Task 6: Frontend router + Owner shell nav

**Files:**
- Modify: `frontend/package.json` (add `react-router-dom`)
- Create: `frontend/src/components/OwnerShell.tsx`
- Create: `frontend/src/components/OwnerDashboard.tsx` (extract from `App.tsx`)
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/AppShell.tsx` (accept nav items / active path; farm selector only on dashboard)

**Interfaces:**
- Produces: routes `/`, `/farms`, `/farms/:farmId`, `/managers` for Owner; Manager routes in Task 8
- Consumes: existing auth

- [ ] **Step 1: Install router**

```powershell
cd frontend
npm install react-router-dom
```

- [ ] **Step 2: Extract `OwnerDashboard` and wire `BrowserRouter`**

`App.tsx` sketch:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// ...
if (user.role === 'farm_manager') {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ManagerHome />} />
        <Route path="/farms/:farmId" element={<ManagerFarmDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
return (
  <BrowserRouter>
    <Routes>
      <Route element={<OwnerShell />}>
        <Route path="/" element={<OwnerDashboard />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/farms/:farmId" element={<FarmDetailPage />} />
        <Route path="/managers" element={<ManagersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
)
```

Owner shell: Sidebar buttons navigate with `useNavigate` / `NavLink`; active state from `useLocation`. Farm selector only rendered for `/` dashboard route (pass as optional slot from `OwnerDashboard` or conditional in shell).

Temporary stubs for Farms/Managers/Manager pages until Tasks 7–8 (empty `Text` “Coming soon”) so app builds.

- [ ] **Step 3: Verify**

```powershell
npm run build
```

Expected: success.

- [ ] **Step 4: Commit**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/src
git commit -m "feat: add react-router and owner shell navigation"
```

---

### Task 7: Owner Farms + Managers UI

**Files:**
- Modify: `frontend/src/api.ts`, `frontend/src/types.ts`
- Create: `frontend/src/components/FarmsPage.tsx`
- Create: `frontend/src/components/FarmDetailPage.tsx`
- Create: `frontend/src/components/ManagersPage.tsx`
- Read first: `.agents/skills/design-taste-frontend/SKILL.md` + Kumo form docs

**Interfaces:**
- Produces: working Owner CRUD screens against APIs
- Consumes: farm/shed/manager endpoints

- [ ] **Step 1: Extend types + API helpers**

```ts
export type Shed = {
  id: string
  farm_id: string
  name: string
  number: number
  live_bird_count: number
  capacity: number | null
}

export type Manager = {
  id: string
  email: string
  role: 'farm_manager'
  customer_id: string
  farm_ids: string[]
}
```

Add `createFarm`, `updateFarm`, `deleteFarm`, `fetchSheds`, `createShed`, `updateShed`, `deleteShed`, `fetchManagers`, `createManager`, `updateManager`, `deleteManager`.

- [ ] **Step 2: Build Farms pages**

- `/farms`: table/list of farms, form (name + location), link to detail
- `/farms/:farmId`: edit name/location, delete with confirm, shed list with create/edit/delete

Use Kumo `Button`, `Text`, `Input`/`Textarea` as available; keep density high, no decorative card grid.

- [ ] **Step 3: Build Managers page**

- List managers + farm assignment summary
- Create: email, password, checkboxes of tenant farms
- Edit: farm checkboxes; optional new password
- Delete with confirm

- [ ] **Step 4: Manual smoke + build**

```powershell
npm run build
```

Smoke: login Owner → create farm/shed → create manager → assign → dashboard selector shows new farm.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src
git commit -m "feat: owner farms and managers management UI"
```

---

### Task 8: Manager read-only home

**Files:**
- Create: `frontend/src/components/ManagerHome.tsx`
- Create: `frontend/src/components/ManagerFarmDetail.tsx`
- Delete or stop using: `ManagerHomePlaceholder.tsx`
- Modify: `frontend/src/App.tsx` if stubs remain

**Interfaces:**
- Produces: Manager `/` farm list; `/farms/:farmId` shed read-only
- Consumes: `fetchFarms`, `fetchSheds`

- [ ] **Step 1: Implement ManagerHome**

Load `fetchFarms()`; empty state if none; each farm links to `/farms/:farmId`. Logout + theme (simple header, no Owner analytics nav).

- [ ] **Step 2: Implement ManagerFarmDetail**

Load sheds; show name, number, live_bird_count; back link. If 403/404, show Empty “Not available”.

- [ ] **Step 3: Smoke**

Login Manager → only `farm-1` → open sheds. Confirm cannot hit `/managers` as Owner-only (navigate away / no nav item).

- [ ] **Step 4: Commit**

```powershell
git add frontend/src
git commit -m "feat: manager read-only farms and sheds views"
```

---

### Task 9: Docs + slice pointer

**Files:**
- Create: `specs/003-farms-sheds-managers.md`
- Modify: `TODO-LIST.md` (check item 2)
- Modify: `MEMORY.md`
- Modify: `docs/roadmap.md` (tick matching items)

- [ ] **Step 1: Write `specs/003-farms-sheds-managers.md`**

Point to design + plan; one-paragraph slice summary.

- [ ] **Step 2: Update MEMORY / TODO / roadmap**

Active phase → next slice 3 daily log. Note demo assignment: Manager → `farm-1`.

- [ ] **Step 3: Run full backend tests**

```powershell
cd backend
pytest -v
```

Expected: all pass.

- [ ] **Step 4: Commit**

```powershell
git add specs/003-farms-sheds-managers.md TODO-LIST.md MEMORY.md docs/roadmap.md
git commit -m "docs: mark farms/sheds/managers slice complete"
```

---

## Plan self-review

1. **Spec coverage:** Models, CRUD APIs, manager create/assign, hard delete cascade, hybrid dashboard, Owner Farms/Managers UI, Manager read-only, seed assignment, tests, docs — each has a task.
2. **Placeholders:** None intentional; UI tasks include concrete routes and API helpers (Kumo control names may vary — check kumo-ui.com at implement time).
3. **Types:** `Farm.location` may be `string | null` in API; serialize as `""` for existing `Farm` type or widen frontend type once in Task 7.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-02-farms-sheds-managers.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session with executing-plans checkpoints

Which approach?
