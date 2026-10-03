import argparse
import random
import sys
import uuid
from datetime import date, timedelta
from pathlib import Path

try:
    from sqlalchemy.orm import Session

    from auth_passwords import hash_password
    from breed_csv import parse_breed_csv
    from db import SessionLocal, init_db
    from flocks import LAYING_FROM_WEEK, age_week
    from models import (
        BirdAdjustment,
        Breed,
        BreedStandard,
        Customer,
        DailyShedLog,
        Farm,
        FarmRates,
        FeedMovement,
        Flock,
        ManagerFarmAssignment,
        Shed,
        User,
    )
except ModuleNotFoundError as exc:
    print(
        "Missing dependency (use the project venv, not system Python):\n"
        "  .\\.venv\\Scripts\\Activate.ps1\n"
        "  pip install -r requirements.txt\n"
        "  python seed.py\n"
        f"Details: {exc}",
        file=sys.stderr,
    )
    raise SystemExit(1) from exc

DEMO_CUSTOMER_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde"

DEMO_USERS = (
    ("owner@demo.local", "owner-pass", "owner"),
    ("manager@demo.local", "manager-pass", "farm_manager"),
)

DEMO_FARMS = (
    (
        "farm-1",
        "Green Valley",
        "Nashik",
        (
            ("shed-1", "Shed 1", 1),
            ("shed-2", "Shed 2", 2),
            ("shed-3", "Shed 3", 3),
        ),
    ),
    (
        "farm-2",
        "Sunrise Layers",
        "Pune",
        (("shed-4", "Shed 1", 1), ("shed-5", "Shed 2", 2)),
    ),
    (
        "farm-3",
        "Riverbend Poultry",
        "Ahmednagar",
        (
            ("shed-6", "Shed 1", 1),
            ("shed-7", "Shed 2", 2),
            ("shed-8", "Shed 3", 3),
        ),
    ),
)

DEMO_SHED_IDS = tuple(
    shed_id for _farm_id, _n, _loc, sheds in DEMO_FARMS for shed_id, _sn, _num in sheds
)

DEMO_FARM_IDS = tuple(farm_id for farm_id, _n, _loc, _sheds in DEMO_FARMS)

# Opening flock sizes keyed by shed id
DEMO_START_BIRDS: dict[str, int] = {
    "shed-1": 1200,
    "shed-2": 1100,
    "shed-3": 1300,
    "shed-4": 900,
    "shed-5": 1000,
    "shed-6": 1150,
    "shed-7": 1050,
    "shed-8": 1250,
}

DEMO_BREED_ID = "hyline-w80"
DEMO_BREED_NAME = "Hy-Line W-80"
DEMO_BREED_CSV = Path(__file__).resolve().parent / "data" / "breeds" / "hyline_w80.csv"

# Flock age today (weeks) and performance vs breed standard, keyed by shed id
DEMO_FLOCKS: dict[str, tuple[int, float]] = {
    "shed-1": (72, 0.99),
    "shed-2": (40, 0.97),
    "shed-3": (85, 0.93),
    "shed-4": (60, 1.00),
    "shed-5": (28, 0.96),
    "shed-6": (78, 0.94),
    "shed-7": (50, 0.98),
    "shed-8": (66, 0.90),
}
PLACED_AT_WEEK = 17

DEMO_RATES: dict[str, tuple[float, float]] = {
    "farm-1": (5.0, 2.0),
    "farm-2": (4.5, 1.8),
    "farm-3": (5.2, 2.1),
}

OPS_DAYS = 365
OPS_RNG_SEED = 42


def seed_breeds(db: Session) -> None:
    if db.get(Breed, DEMO_BREED_ID) is not None:
        return
    rows = parse_breed_csv(DEMO_BREED_CSV.read_text(encoding="utf-8-sig"))
    breed = Breed(id=DEMO_BREED_ID, customer_id=None, name=DEMO_BREED_NAME)
    breed.standards = [BreedStandard(**row) for row in rows]
    db.add(breed)
    db.commit()


def seed_demo(db: Session, *, with_ops: bool = True, force_ops: bool = False) -> None:
    seed_breeds(db)

    customer = db.get(Customer, DEMO_CUSTOMER_ID)
    if customer is None:
        customer = Customer(id=DEMO_CUSTOMER_ID, name="Demo Farms")
        db.add(customer)
        db.flush()

    for email, password, role in DEMO_USERS:
        existing = db.query(User).filter(User.email == email).one_or_none()
        if existing is None:
            db.add(
                User(
                    id=str(uuid.uuid4()),
                    customer_id=customer.id,
                    email=email,
                    password_hash=hash_password(password),
                    role=role,
                )
            )

    for farm_id, name, location, sheds in DEMO_FARMS:
        farm = db.get(Farm, farm_id)
        if farm is None:
            farm = Farm(
                id=farm_id, customer_id=customer.id, name=name, location=location
            )
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

    if with_ops:
        seed_ops_history(db, force=force_ops)


def _demo_shed_log_count(db: Session) -> int:
    return (
        db.query(DailyShedLog)
        .filter(DailyShedLog.shed_id.in_(DEMO_SHED_IDS))
        .count()
    )


def _clear_demo_ops(db: Session) -> None:
    db.query(DailyShedLog).filter(DailyShedLog.shed_id.in_(DEMO_SHED_IDS)).delete(
        synchronize_session=False
    )
    db.query(BirdAdjustment).filter(BirdAdjustment.shed_id.in_(DEMO_SHED_IDS)).delete(
        synchronize_session=False
    )
    db.query(Flock).filter(Flock.shed_id.in_(DEMO_SHED_IDS)).delete(
        synchronize_session=False
    )
    db.query(FeedMovement).filter(FeedMovement.farm_id.in_(DEMO_FARM_IDS)).delete(
        synchronize_session=False
    )
    db.query(FarmRates).filter(FarmRates.farm_id.in_(DEMO_FARM_IDS)).delete(
        synchronize_session=False
    )
    db.commit()


def seed_ops_history(db: Session, *, force: bool = False) -> None:
    if force:
        _clear_demo_ops(db)
    elif _demo_shed_log_count(db) > 0:
        print("Ops history already present; skip (use --force-ops to rebuild)")
        return

    owner = db.query(User).filter(User.email == "owner@demo.local").one()
    manager = db.query(User).filter(User.email == "manager@demo.local").one()
    rng = random.Random(OPS_RNG_SEED)
    today = date.today()
    start = today - timedelta(days=OPS_DAYS - 1)
    std_hdep = {
        row.age_week: row.hdep_pct
        for row in db.query(BreedStandard).filter_by(breed_id=DEMO_BREED_ID)
        if row.hdep_pct is not None
    }

    for farm_id, egg_price, feed_cost in (
        (fid, *DEMO_RATES[fid]) for fid in DEMO_FARM_IDS
    ):
        if db.get(FarmRates, farm_id) is None:
            db.add(
                FarmRates(
                    farm_id=farm_id,
                    egg_price=egg_price,
                    feed_cost_per_kg=feed_cost,
                )
            )

    flocks: dict[str, Flock] = {}
    for shed_id, (weeks_today, _factor) in DEMO_FLOCKS.items():
        if db.get(Shed, shed_id) is None:
            continue
        hatch = today - timedelta(weeks=weeks_today)
        flock = Flock(
            id=f"flock-{shed_id}",
            shed_id=shed_id,
            breed_id=DEMO_BREED_ID,
            hatch_date=hatch,
            placed_date=hatch + timedelta(weeks=PLACED_AT_WEEK),
            birds_placed=DEMO_START_BIRDS[shed_id],
            live_birds=DEMO_START_BIRDS[shed_id],
            source="Demo hatchery",
        )
        db.add(flock)
        flocks[shed_id] = flock
    db.flush()

    log_rows: list[DailyShedLog] = []
    for day_offset in range(OPS_DAYS):
        day = start + timedelta(days=day_offset)
        for shed_id, flock in flocks.items():
            week = age_week(flock.hatch_date, day)
            if week < LAYING_FROM_WEEK or flock.live_birds <= 0:
                continue
            shed = db.get(Shed, shed_id)
            recorder = manager.id if shed.farm_id == "farm-1" else owner.id
            factor = DEMO_FLOCKS[shed_id][1]
            hen_day = std_hdep.get(week, 0.0) / 100 * factor + rng.uniform(-0.02, 0.02)
            hen_day = max(0.0, min(0.98, hen_day))
            birds = flock.live_birds
            eggs = max(0, int(round(birds * hen_day + rng.uniform(-8, 8))))
            deaths = 0
            if rng.random() < 0.08 and birds > 10:
                deaths = rng.randint(1, 3)
                flock.live_birds = max(0, birds - deaths)
            log_rows.append(
                DailyShedLog(
                    id=str(uuid.uuid4()),
                    shed_id=shed_id,
                    flock_id=flock.id,
                    date=day,
                    eggs_collected=eggs,
                    deaths=deaths,
                    notes=None,
                    recorded_by_user_id=recorder,
                )
            )
    db.add_all(log_rows)

    # Feed: weekly large in + daily out; end stock stays above 1 quintal (100 kg)
    for farm_id, _name, _loc, sheds in DEMO_FARMS:
        recorder = manager.id if farm_id == "farm-1" else owner.id
        shed_count = len(sheds)
        stock_kg = 0.0
        movements: list[FeedMovement] = []
        for day_offset in range(OPS_DAYS):
            day = start + timedelta(days=day_offset)
            if day_offset % 7 == 0:
                qty_in = 800.0 + 200.0 * shed_count
                stock_kg += qty_in
                movements.append(
                    FeedMovement(
                        id=str(uuid.uuid4()),
                        farm_id=farm_id,
                        direction="in",
                        qty_kg=qty_in,
                        date=day,
                        note="Demo delivery",
                        user_id=recorder,
                    )
                )
            # ~110 g/bird/day rough; use current farm bird total estimate
            farm_birds = sum(
                flocks[sid].live_birds for sid, _sn, _num in sheds if sid in flocks
            )
            qty_out = round(farm_birds * 0.11 + rng.uniform(-5, 5), 1)
            qty_out = max(10.0, qty_out)
            # Keep buffer so stock never drains below 150 kg
            if stock_kg - qty_out < 150.0:
                top_up = 500.0 + 100.0 * shed_count
                stock_kg += top_up
                movements.append(
                    FeedMovement(
                        id=str(uuid.uuid4()),
                        farm_id=farm_id,
                        direction="in",
                        qty_kg=top_up,
                        date=day,
                        note="Demo top-up",
                        user_id=recorder,
                    )
                )
            stock_kg -= qty_out
            movements.append(
                FeedMovement(
                    id=str(uuid.uuid4()),
                    farm_id=farm_id,
                    direction="out",
                    qty_kg=qty_out,
                    date=day,
                    note=None,
                    user_id=recorder,
                )
            )
        db.add_all(movements)

    db.commit()
    print(
        f"Ops history seeded: {OPS_DAYS} days x {len(DEMO_SHED_IDS)} sheds, "
        f"rates + feed for {len(DEMO_FARM_IDS)} farms"
    )


def _print_credentials() -> None:
    print("Demo tenant seeded (Demo Farms)")
    for email, password, role in DEMO_USERS:
        print(f"  {role}: {email} / {password}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed demo tenant + sample-year ops")
    parser.add_argument(
        "--force-ops",
        action="store_true",
        help="Delete and rebuild demo ops history (flocks, logs, feed, rates)",
    )
    parser.add_argument(
        "--no-ops",
        action="store_true",
        help="Seed topology only (no logs/feed/rates)",
    )
    args = parser.parse_args()
    init_db()
    with SessionLocal() as db:
        seed_demo(db, with_ops=not args.no_ops, force_ops=args.force_ops)
    _print_credentials()
