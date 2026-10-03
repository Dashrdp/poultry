import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from access import get_farm_for_user
from auth import require_user
from db import get_db
from models import Farm, FeedMovement, User
from schemas_godown import FeedMovementOut, FeedMovementWrite, GodownOut

router = APIRouter(prefix="/api")

KG_PER_QUINTAL = 100.0
MOVEMENT_LIST_LIMIT = 50


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _writable_farm(db: Session, user: User, farm_id: str) -> Farm:
    farm = get_farm_for_user(db, user, farm_id)
    if farm is not None:
        return farm
    row = db.get(Farm, farm_id)
    if row is None or row.customer_id != user.customer_id:
        raise HTTPException(status_code=404, detail="Farm not found")
    raise HTTPException(status_code=403, detail="Farm access denied")


def _stock_kg(db: Session, farm_id: str) -> float:
    total = 0.0
    rows = db.query(FeedMovement).filter(FeedMovement.farm_id == farm_id).all()
    for row in rows:
        if row.direction == "in":
            total += row.qty_kg
        elif row.direction == "out":
            total -= row.qty_kg
    return round(total, 6)


def _movement_out(row: FeedMovement) -> FeedMovementOut:
    return FeedMovementOut(
        id=row.id,
        farm_id=row.farm_id,
        direction=row.direction,  # type: ignore[arg-type]
        qty_kg=row.qty_kg,
        qty_quintal=round(row.qty_kg / KG_PER_QUINTAL, 6),
        date=row.date.isoformat(),
        note=row.note,
    )


def _godown_out(db: Session, farm_id: str) -> GodownOut:
    stock = _stock_kg(db, farm_id)
    movements = (
        db.query(FeedMovement)
        .filter(FeedMovement.farm_id == farm_id)
        .order_by(FeedMovement.date.desc(), FeedMovement.created_at.desc())
        .limit(MOVEMENT_LIST_LIMIT)
        .all()
    )
    return GodownOut(
        farm_id=farm_id,
        stock_kg=stock,
        stock_quintal=round(stock / KG_PER_QUINTAL, 6),
        movements=[_movement_out(row) for row in movements],
    )


@router.get("/farms/{farm_id}/godown", response_model=GodownOut)
def get_godown(
    farm_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> GodownOut:
    _writable_farm(db, user, farm_id)
    return _godown_out(db, farm_id)


@router.post("/farms/{farm_id}/godown/movements", response_model=GodownOut)
def create_feed_movement(
    farm_id: str,
    body: FeedMovementWrite,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> GodownOut:
    _writable_farm(db, user, farm_id)
    qty_kg = round(body.qty_quintal * KG_PER_QUINTAL, 6)
    if body.direction == "out":
        stock = _stock_kg(db, farm_id)
        if qty_kg > stock:
            raise HTTPException(status_code=400, detail="Feed out exceeds stock")

    db.add(
        FeedMovement(
            id=str(uuid.uuid4()),
            farm_id=farm_id,
            direction=body.direction,
            qty_kg=qty_kg,
            date=body.date,
            note=_clean_text(body.note),
            user_id=user.id,
            created_at=datetime.utcnow(),
        )
    )
    db.commit()
    return _godown_out(db, farm_id)
