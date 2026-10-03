import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from access import get_farm_for_user
from auth import require_user
from db import get_db
from flocks import active_flock
from models import BirdAdjustment, DailyShedLog, Farm, Flock, Shed, User
from schemas_logs import DailyLogOut, DailyLogWrite, LiveCountOut, LiveCountWrite

router = APIRouter(prefix="/api")


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _writable_shed(db: Session, user: User, shed_id: str) -> Shed:
    shed = db.get(Shed, shed_id)
    if shed is None:
        raise HTTPException(status_code=404, detail="Shed not found")
    if get_farm_for_user(db, user, shed.farm_id) is not None:
        return shed
    farm = db.get(Farm, shed.farm_id)
    if farm is None or farm.customer_id != user.customer_id:
        raise HTTPException(status_code=404, detail="Shed not found")
    raise HTTPException(status_code=403, detail="Farm access denied")


def _require_active_flock(db: Session, shed: Shed) -> Flock:
    flock = active_flock(db, shed.id)
    if flock is None:
        raise HTTPException(status_code=400, detail="No active flock in this shed")
    return flock


def _live_birds(db: Session, shed: Shed) -> int:
    flock = active_flock(db, shed.id)
    return flock.live_birds if flock is not None else 0


def _log_out(log: DailyShedLog, live_bird_count: int) -> DailyLogOut:
    return DailyLogOut(
        shed_id=log.shed_id,
        date=log.date.isoformat(),
        eggs_collected=log.eggs_collected,
        deaths=log.deaths,
        notes=log.notes,
        live_bird_count=live_bird_count,
    )


@router.get("/sheds/{shed_id}/daily-logs/{log_date}", response_model=DailyLogOut)
def get_daily_log(
    shed_id: str,
    log_date: date,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> DailyLogOut:
    shed = _writable_shed(db, user, shed_id)
    log = (
        db.query(DailyShedLog)
        .filter(DailyShedLog.shed_id == shed.id, DailyShedLog.date == log_date)
        .one_or_none()
    )
    if log is None:
        raise HTTPException(status_code=404, detail="No log for this date")
    return _log_out(log, _live_birds(db, shed))


@router.put("/sheds/{shed_id}/daily-logs/{log_date}", response_model=DailyLogOut)
def upsert_daily_log(
    shed_id: str,
    log_date: date,
    body: DailyLogWrite,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> DailyLogOut:
    shed = _writable_shed(db, user, shed_id)
    flock = _require_active_flock(db, shed)
    if log_date < flock.placed_date:
        raise HTTPException(status_code=400, detail="Date is before flock placement")
    existing = (
        db.query(DailyShedLog)
        .filter(DailyShedLog.shed_id == shed.id, DailyShedLog.date == log_date)
        .one_or_none()
    )
    if existing is not None and existing.flock_id != flock.id:
        raise HTTPException(status_code=409, detail="Log belongs to an earlier flock")
    previous_deaths = existing.deaths if existing is not None else 0
    delta = body.deaths - previous_deaths
    if flock.live_birds - delta < 0:
        raise HTTPException(status_code=400, detail="Deaths exceed live bird count")

    flock.live_birds -= delta
    notes = _clean_text(body.notes)
    now = datetime.utcnow()
    if existing is None:
        existing = DailyShedLog(
            id=str(uuid.uuid4()),
            shed_id=shed.id,
            flock_id=flock.id,
            date=log_date,
            eggs_collected=body.eggs_collected,
            deaths=body.deaths,
            notes=notes,
            recorded_by_user_id=user.id,
            created_at=now,
            updated_at=now,
        )
        db.add(existing)
    else:
        existing.eggs_collected = body.eggs_collected
        existing.deaths = body.deaths
        existing.notes = notes
        existing.recorded_by_user_id = user.id
        existing.updated_at = now

    db.commit()
    db.refresh(flock)
    db.refresh(existing)
    return _log_out(existing, flock.live_birds)


@router.put("/sheds/{shed_id}/live-count", response_model=LiveCountOut)
def set_live_count(
    shed_id: str,
    body: LiveCountWrite,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> LiveCountOut:
    shed = _writable_shed(db, user, shed_id)
    flock = _require_active_flock(db, shed)
    previous = flock.live_birds
    flock.live_birds = body.live_bird_count
    db.add(
        BirdAdjustment(
            id=str(uuid.uuid4()),
            shed_id=shed.id,
            flock_id=flock.id,
            at=datetime.utcnow(),
            previous_count=previous,
            live_bird_count=body.live_bird_count,
            reason=_clean_text(body.reason),
            user_id=user.id,
        )
    )
    db.commit()
    db.refresh(flock)
    return LiveCountOut(shed_id=shed.id, live_bird_count=flock.live_birds)
