import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from access import get_farm_for_user, list_farms_for_user
from auth import require_owner, require_user
from db import get_db
from flocks import active_flock, active_flocks_by_shed
from flocks_api import flock_out
from models import Farm, Flock, Shed, User
from schemas_farms import (
    FarmCreate,
    FarmOut,
    FarmUpdate,
    ShedCreate,
    ShedOut,
    ShedUpdate,
)

router = APIRouter(prefix="/api")


def _farm_out(farm: Farm) -> FarmOut:
    return FarmOut(id=farm.id, name=farm.name, location=farm.location or "")


def _shed_out(shed: Shed, flock: Flock | None) -> ShedOut:
    return ShedOut(
        id=shed.id,
        farm_id=shed.farm_id,
        name=shed.name,
        number=shed.number,
        live_bird_count=flock.live_birds if flock is not None else 0,
        capacity=shed.capacity,
        flock=flock_out(flock, date.today()) if flock is not None else None,
    )


def _tenant_farm_or_404(db: Session, user: User, farm_id: str) -> Farm:
    farm = db.get(Farm, farm_id)
    if farm is None or farm.customer_id != user.customer_id:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


def _readable_farm(db: Session, user: User, farm_id: str) -> Farm:
    farm = _tenant_farm_or_404(db, user, farm_id)
    if get_farm_for_user(db, user, farm_id) is None:
        raise HTTPException(status_code=403, detail="Farm access denied")
    return farm


def _tenant_shed_or_404(db: Session, user: User, shed_id: str) -> Shed:
    shed = db.get(Shed, shed_id)
    if shed is None:
        raise HTTPException(status_code=404, detail="Shed not found")
    farm = db.get(Farm, shed.farm_id)
    if farm is None or farm.customer_id != user.customer_id:
        raise HTTPException(status_code=404, detail="Shed not found")
    return shed


def _ensure_shed_number_available(
    db: Session,
    farm_id: str,
    number: int,
    *,
    exclude_shed_id: str | None = None,
) -> None:
    query = db.query(Shed).filter(
        Shed.farm_id == farm_id,
        Shed.number == number,
    )
    if exclude_shed_id is not None:
        query = query.filter(Shed.id != exclude_shed_id)
    if query.first() is not None:
        raise HTTPException(status_code=409, detail="Shed number already exists")


@router.get("/farms", response_model=list[FarmOut])
def list_farms(
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> list[FarmOut]:
    return [_farm_out(farm) for farm in list_farms_for_user(db, user)]


@router.post("/farms", response_model=FarmOut)
def create_farm(
    body: FarmCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> FarmOut:
    farm = Farm(
        id=str(uuid.uuid4()),
        customer_id=owner.customer_id,
        name=body.name,
        location=body.location,
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return _farm_out(farm)


@router.patch("/farms/{farm_id}", response_model=FarmOut)
def update_farm(
    farm_id: str,
    body: FarmUpdate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> FarmOut:
    farm = _tenant_farm_or_404(db, owner, farm_id)
    fields = body.model_fields_set
    if "name" in fields and body.name is not None:
        farm.name = body.name
    if "location" in fields:
        farm.location = body.location
    db.commit()
    db.refresh(farm)
    return _farm_out(farm)


@router.delete("/farms/{farm_id}")
def delete_farm(
    farm_id: str,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> dict[str, bool]:
    farm = _tenant_farm_or_404(db, owner, farm_id)
    db.delete(farm)
    db.commit()
    return {"ok": True}


@router.get("/farms/{farm_id}/sheds", response_model=list[ShedOut])
def list_sheds(
    farm_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> list[ShedOut]:
    _readable_farm(db, user, farm_id)
    sheds = (
        db.query(Shed)
        .filter(Shed.farm_id == farm_id)
        .order_by(Shed.number)
        .all()
    )
    flocks = active_flocks_by_shed(db, [shed.id for shed in sheds])
    return [_shed_out(shed, flocks.get(shed.id)) for shed in sheds]


@router.post("/farms/{farm_id}/sheds", response_model=ShedOut)
def create_shed(
    farm_id: str,
    body: ShedCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> ShedOut:
    _tenant_farm_or_404(db, owner, farm_id)
    number = body.number
    if number is None:
        highest = (
            db.query(func.max(Shed.number))
            .filter(Shed.farm_id == farm_id)
            .scalar()
        )
        number = (highest or 0) + 1
    _ensure_shed_number_available(db, farm_id, number)
    shed = Shed(
        id=str(uuid.uuid4()),
        farm_id=farm_id,
        name=body.name,
        number=number,
        capacity=body.capacity,
    )
    db.add(shed)
    db.commit()
    db.refresh(shed)
    return _shed_out(shed, None)


@router.patch("/sheds/{shed_id}", response_model=ShedOut)
def update_shed(
    shed_id: str,
    body: ShedUpdate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> ShedOut:
    shed = _tenant_shed_or_404(db, owner, shed_id)
    fields = body.model_fields_set
    if "name" in fields and body.name is not None:
        shed.name = body.name
    if "number" in fields and body.number is not None:
        _ensure_shed_number_available(
            db,
            shed.farm_id,
            body.number,
            exclude_shed_id=shed.id,
        )
        shed.number = body.number
    if "capacity" in fields:
        shed.capacity = body.capacity
    db.commit()
    db.refresh(shed)
    return _shed_out(shed, active_flock(db, shed.id))


@router.delete("/sheds/{shed_id}")
def delete_shed(
    shed_id: str,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> dict[str, bool]:
    shed = _tenant_shed_or_404(db, owner, shed_id)
    db.delete(shed)
    db.commit()
    return {"ok": True}
