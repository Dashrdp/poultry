from datetime import date
from typing import Literal

from sqlalchemy.orm import Session

from models import Flock

Stage = Literal["brooding", "growing", "pre_lay", "laying", "depleted"]

# Week boundaries from the Hy-Line W-80 management guide.
GROWING_FROM_WEEK = 6
PRE_LAY_FROM_WEEK = 16
LAYING_FROM_WEEK = 18


def age_week(hatch_date: date, on: date) -> int:
    return max(0, (on - hatch_date).days // 7)


def lifecycle_stage(flock: Flock, on: date) -> Stage:
    if flock.depleted_on is not None and flock.depleted_on <= on:
        return "depleted"
    week = age_week(flock.hatch_date, on)
    if week >= LAYING_FROM_WEEK:
        return "laying"
    if week >= PRE_LAY_FROM_WEEK:
        return "pre_lay"
    if week >= GROWING_FROM_WEEK:
        return "growing"
    return "brooding"


def active_flock(db: Session, shed_id: str) -> Flock | None:
    return (
        db.query(Flock)
        .filter(Flock.shed_id == shed_id, Flock.depleted_on.is_(None))
        .one_or_none()
    )


def active_flocks_by_shed(db: Session, shed_ids: list[str]) -> dict[str, Flock]:
    if not shed_ids:
        return {}
    rows = (
        db.query(Flock)
        .filter(Flock.shed_id.in_(shed_ids), Flock.depleted_on.is_(None))
        .all()
    )
    return {flock.shed_id: flock for flock in rows}


def live_birds_by_shed(db: Session, shed_ids: list[str]) -> dict[str, int]:
    return {
        shed_id: flock.live_birds
        for shed_id, flock in active_flocks_by_shed(db, shed_ids).items()
    }
