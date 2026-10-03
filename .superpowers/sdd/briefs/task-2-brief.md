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

- [ ] **Step 2: Run â€” expect fail** (no farm seed yet)

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

