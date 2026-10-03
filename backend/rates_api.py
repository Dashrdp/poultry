from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from access import get_farm_for_user
from auth import require_owner, require_user
from db import get_db
from models import Farm, FarmRates, User
from schemas_rates import FarmRatesOut, FarmRatesWrite

router = APIRouter(prefix="/api")


def _rates_out(row: FarmRates) -> FarmRatesOut:
    return FarmRatesOut(
        farm_id=row.farm_id,
        egg_price=row.egg_price,
        feed_cost_per_kg=row.feed_cost_per_kg,
    )


def _owner_farm(db: Session, owner: User, farm_id: str) -> Farm:
    farm = db.get(Farm, farm_id)
    if farm is None or farm.customer_id != owner.customer_id:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


@router.get("/farms/{farm_id}/rates", response_model=FarmRatesOut)
def get_rates(
    farm_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> FarmRatesOut:
    if get_farm_for_user(db, user, farm_id) is None:
        farm = db.get(Farm, farm_id)
        if farm is None or farm.customer_id != user.customer_id:
            raise HTTPException(status_code=404, detail="Farm not found")
        raise HTTPException(status_code=403, detail="Farm access denied")
    row = db.get(FarmRates, farm_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Rates not set")
    return _rates_out(row)


@router.put("/farms/{farm_id}/rates", response_model=FarmRatesOut)
def put_rates(
    farm_id: str,
    body: FarmRatesWrite,
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> FarmRatesOut:
    _owner_farm(db, owner, farm_id)
    row = db.get(FarmRates, farm_id)
    now = datetime.utcnow()
    if row is None:
        row = FarmRates(
            farm_id=farm_id,
            egg_price=body.egg_price,
            feed_cost_per_kg=body.feed_cost_per_kg,
            updated_at=now,
        )
        db.add(row)
    else:
        row.egg_price = body.egg_price
        row.feed_cost_per_kg = body.feed_cost_per_kg
        row.updated_at = now
    db.commit()
    db.refresh(row)
    return _rates_out(row)
