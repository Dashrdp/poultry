# Review package — Task 1 (no-git mode)

Base: pre-task working tree
Head: post-task working tree
Commits: none

## Stat
 models.py | Farm/Shed/ManagerFarmAssignment added
 db.py | init_db imports extended
 access.py | created
 tests/test_access.py | created

## Full files (no-git substitute for git diff)

### backend/access.py (new)
```
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

### backend/db.py init_db (changed)
```
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

### backend/models.py additions (lines 39-94)
Farm, Shed, ManagerFarmAssignment as in brief — cascade delete-orphan on sheds/assignments; UniqueConstraint farm_id+number; composite PK on assignments; live_bird_count default 0.

### backend/tests/test_access.py (new)
test_owner_sees_all_tenant_farms_manager_sees_assigned_only — matches brief verbatim (unused Session import present).
