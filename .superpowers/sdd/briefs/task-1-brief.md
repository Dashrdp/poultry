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

- [ ] **Step 2: Run test â€” expect fail**

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

- [ ] **Step 5: Run test â€” expect pass**

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

