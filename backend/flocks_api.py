import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth import require_owner, require_user
from breed_csv import BreedCsvError, parse_breed_csv
from db import get_db
from flocks import active_flock, age_week, lifecycle_stage
from logs_api import _clean_text, _writable_shed
from models import Breed, BreedStandard, Flock, User
from schemas_flocks import BreedOut, BreedStandardOut, FlockCreate, FlockOut

router = APIRouter(prefix="/api")

MAX_CSV_BYTES = 200_000


def flock_out(flock: Flock, on: date) -> FlockOut:
    return FlockOut(
        id=flock.id,
        shed_id=flock.shed_id,
        breed_id=flock.breed_id,
        breed_name=flock.breed.name,
        hatch_date=flock.hatch_date.isoformat(),
        placed_date=flock.placed_date.isoformat(),
        birds_placed=flock.birds_placed,
        live_birds=flock.live_birds,
        source=flock.source,
        chick_cost=flock.chick_cost,
        depleted_on=flock.depleted_on.isoformat() if flock.depleted_on else None,
        age_week=age_week(flock.hatch_date, on),
        stage=lifecycle_stage(flock, on),
    )


def _visible_breed(db: Session, user: User, breed_id: str) -> Breed:
    breed = db.get(Breed, breed_id)
    if breed is None or breed.customer_id not in (None, user.customer_id):
        raise HTTPException(status_code=404, detail="Breed not found")
    return breed


def _breed_out(breed: Breed) -> BreedOut:
    return BreedOut(id=breed.id, name=breed.name, is_system=breed.customer_id is None)


@router.get("/breeds", response_model=list[BreedOut])
def list_breeds(
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> list[BreedOut]:
    rows = (
        db.query(Breed)
        .filter(or_(Breed.customer_id.is_(None), Breed.customer_id == user.customer_id))
        .order_by(Breed.name)
        .all()
    )
    return [_breed_out(breed) for breed in rows]


@router.get("/breeds/{breed_id}/standards", response_model=list[BreedStandardOut])
def list_breed_standards(
    breed_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> list[BreedStandardOut]:
    breed = _visible_breed(db, user, breed_id)
    return [
        BreedStandardOut(
            age_week=row.age_week,
            hdep_pct=row.hdep_pct,
            hhe_cum=row.hhe_cum,
            mort_cum_pct=row.mort_cum_pct,
            feed_g=row.feed_g,
            egg_wt_g=row.egg_wt_g,
            body_wt_g=row.body_wt_g,
        )
        for row in breed.standards
    ]


@router.post("/breeds", response_model=BreedOut)
async def upload_breed(
    name: str = Form(..., min_length=1, max_length=200),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> BreedOut:
    raw = await file.read(MAX_CSV_BYTES + 1)
    if len(raw) > MAX_CSV_BYTES:
        raise HTTPException(status_code=400, detail="CSV too large")
    try:
        rows = parse_breed_csv(raw.decode("utf-8-sig"))
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8") from exc
    except BreedCsvError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    breed = Breed(id=str(uuid.uuid4()), customer_id=owner.customer_id, name=name.strip())
    breed.standards = [BreedStandard(**row) for row in rows]
    db.add(breed)
    db.commit()
    db.refresh(breed)
    return _breed_out(breed)


@router.get("/sheds/{shed_id}/flocks", response_model=list[FlockOut])
def list_flocks(
    shed_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> list[FlockOut]:
    shed = _writable_shed(db, user, shed_id)
    today = date.today()
    rows = (
        db.query(Flock)
        .filter(Flock.shed_id == shed.id)
        .order_by(Flock.placed_date.desc())
        .all()
    )
    return [flock_out(flock, today) for flock in rows]


@router.post("/sheds/{shed_id}/flocks", response_model=FlockOut)
def place_flock(
    shed_id: str,
    body: FlockCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
) -> FlockOut:
    shed = _writable_shed(db, user, shed_id)
    _visible_breed(db, user, body.breed_id)
    today = date.today()
    if body.hatch_date > body.placed_date:
        raise HTTPException(status_code=400, detail="Hatch date must be on or before placed date")
    if body.placed_date > today:
        raise HTTPException(status_code=400, detail="Placed date cannot be in the future")
    if shed.capacity is not None and body.birds_placed > shed.capacity:
        raise HTTPException(status_code=400, detail="Birds placed exceed shed capacity")
    if active_flock(db, shed.id) is not None:
        raise HTTPException(status_code=409, detail="Shed already has an active flock")

    flock = Flock(
        id=str(uuid.uuid4()),
        shed_id=shed.id,
        breed_id=body.breed_id,
        hatch_date=body.hatch_date,
        placed_date=body.placed_date,
        birds_placed=body.birds_placed,
        live_birds=body.birds_placed,
        source=_clean_text(body.source),
        chick_cost=body.chick_cost,
        created_at=datetime.utcnow(),
    )
    db.add(flock)
    db.commit()
    db.refresh(flock)
    return flock_out(flock, today)
