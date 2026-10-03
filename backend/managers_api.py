import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import require_owner
from auth_passwords import hash_password
from db import get_db
from models import Farm, ManagerFarmAssignment, User
from schemas_managers import ManagerCreate, ManagerOut, ManagerUpdate

router = APIRouter(prefix="/api/managers")


def _manager_or_404(db: Session, owner: User, manager_id: str) -> User:
    manager = db.get(User, manager_id)
    if (
        manager is None
        or manager.customer_id != owner.customer_id
        or manager.role != "farm_manager"
    ):
        raise HTTPException(status_code=404, detail="Manager not found")
    return manager


def _validate_farm_ids(
    db: Session,
    customer_id: str,
    farm_ids: list[str],
) -> list[str]:
    unique_ids = list(dict.fromkeys(farm_ids))
    if not unique_ids:
        return unique_ids
    tenant_ids = {
        farm_id
        for (farm_id,) in (
            db.query(Farm.id)
            .filter(
                Farm.customer_id == customer_id,
                Farm.id.in_(unique_ids),
            )
            .all()
        )
    }
    if tenant_ids != set(unique_ids):
        raise HTTPException(status_code=404, detail="Farm not found")
    return unique_ids


def _farm_ids_for_manager(db: Session, manager_id: str) -> list[str]:
    return [
        farm_id
        for (farm_id,) in (
            db.query(ManagerFarmAssignment.farm_id)
            .filter(ManagerFarmAssignment.user_id == manager_id)
            .order_by(ManagerFarmAssignment.farm_id)
            .all()
        )
    ]


def _manager_out(db: Session, manager: User) -> ManagerOut:
    return ManagerOut(
        id=manager.id,
        email=manager.email,
        role=manager.role,
        customer_id=manager.customer_id,
        farm_ids=_farm_ids_for_manager(db, manager.id),
    )


def _replace_assignments(
    db: Session,
    manager_id: str,
    farm_ids: list[str],
) -> None:
    db.query(ManagerFarmAssignment).filter(
        ManagerFarmAssignment.user_id == manager_id
    ).delete(synchronize_session=False)
    db.add_all(
        [
            ManagerFarmAssignment(user_id=manager_id, farm_id=farm_id)
            for farm_id in farm_ids
        ]
    )


@router.get("", response_model=list[ManagerOut])
def list_managers(
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> list[ManagerOut]:
    managers = (
        db.query(User)
        .filter(
            User.customer_id == owner.customer_id,
            User.role == "farm_manager",
        )
        .order_by(User.email)
        .all()
    )
    return [_manager_out(db, manager) for manager in managers]


@router.post("", response_model=ManagerOut)
def create_manager(
    body: ManagerCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> ManagerOut:
    email = body.email.lower().strip()
    if db.query(User).filter(User.email == email).first() is not None:
        raise HTTPException(status_code=409, detail="Email already exists")
    farm_ids = _validate_farm_ids(db, owner.customer_id, body.farm_ids)
    manager = User(
        id=str(uuid.uuid4()),
        customer_id=owner.customer_id,
        email=email,
        password_hash=hash_password(body.password),
        role="farm_manager",
    )
    db.add(manager)
    try:
        db.flush()
        _replace_assignments(db, manager.id, farm_ids)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists") from exc
    db.refresh(manager)
    return _manager_out(db, manager)


@router.patch("/{manager_id}", response_model=ManagerOut)
def update_manager(
    manager_id: str,
    body: ManagerUpdate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> ManagerOut:
    manager = _manager_or_404(db, owner, manager_id)
    fields = body.model_fields_set
    if "password" in fields and body.password is not None:
        manager.password_hash = hash_password(body.password)
    if "farm_ids" in fields and body.farm_ids is not None:
        farm_ids = _validate_farm_ids(db, owner.customer_id, body.farm_ids)
        _replace_assignments(db, manager.id, farm_ids)
    db.commit()
    db.refresh(manager)
    return _manager_out(db, manager)


@router.delete("/{manager_id}")
def delete_manager(
    manager_id: str,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> dict[str, bool]:
    manager = _manager_or_404(db, owner, manager_id)
    db.query(ManagerFarmAssignment).filter(
        ManagerFarmAssignment.user_id == manager.id
    ).delete(synchronize_session=False)
    db.delete(manager)
    db.commit()
    return {"ok": True}
