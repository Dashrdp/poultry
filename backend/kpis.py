"""Flock-day stats recomputed from raw rows; every group KPI sums numerators and denominators."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy.orm import Session

from flocks import age_week
from models import BirdAdjustment, BreedStandard, DailyShedLog, FeedMovement, Flock, Shed

DEPLETION_WEEK = 80
GAP_WATCH = -3.0
GAP_BAD = -5.0


@dataclass
class FlockDay:
    flock_id: str
    shed_id: str
    farm_id: str
    day: date
    age_week: int
    birds: int
    eggs: int
    deaths: int
    feed_kg: float
    std_hdep: float | None
    std_feed_g: float | None


@dataclass
class Totals:
    bird_days: int = 0
    eggs: int = 0
    deaths: int = 0
    feed_kg: float = 0.0
    std_bird_days: int = 0
    std_eggs: int = 0
    expected_eggs: float = 0.0
    std_feed_bird_days: int = 0
    expected_feed_g: float = 0.0
    opening_birds: int = 0

    def add(self, row: FlockDay) -> None:
        self.bird_days += row.birds
        self.eggs += row.eggs
        self.deaths += row.deaths
        self.feed_kg += row.feed_kg
        if row.std_hdep is not None:
            self.std_bird_days += row.birds
            self.std_eggs += row.eggs
            self.expected_eggs += row.birds * row.std_hdep / 100
        if row.std_feed_g is not None:
            self.std_feed_bird_days += row.birds
            self.expected_feed_g += row.birds * row.std_feed_g


def pct(numerator: float, denominator: float) -> float | None:
    if denominator <= 0:
        return None
    return round(100.0 * numerator / denominator, 2)


def hdep(t: Totals) -> float | None:
    return pct(t.eggs, t.bird_days)


def std_hdep(t: Totals) -> float | None:
    return pct(t.expected_eggs, t.std_bird_days)


def gap(t: Totals) -> float | None:
    actual = pct(t.std_eggs, t.std_bird_days)
    standard = std_hdep(t)
    if actual is None or standard is None:
        return None
    return round(actual - standard, 2)


def mortality_pct(t: Totals) -> float | None:
    return pct(t.deaths, t.opening_birds)


def feed_g_per_bird(t: Totals) -> float | None:
    if t.bird_days <= 0:
        return None
    return round(t.feed_kg * 1000 / t.bird_days, 1)


def std_feed_g_per_bird(t: Totals) -> float | None:
    if t.std_feed_bird_days <= 0:
        return None
    return round(t.expected_feed_g / t.std_feed_bird_days, 1)


def feed_per_10_eggs(t: Totals) -> float | None:
    if t.eggs <= 0:
        return None
    return round(t.feed_kg / t.eggs * 10, 3)


def status_for_gap(value: float | None) -> str:
    if value is None:
        return "unknown"
    if value < GAP_BAD:
        return "bad"
    if value < GAP_WATCH:
        return "watch"
    return "good"


def load_standards(db: Session, breed_ids: set[str]) -> dict[tuple[str, int], BreedStandard]:
    if not breed_ids:
        return {}
    rows = db.query(BreedStandard).filter(BreedStandard.breed_id.in_(breed_ids)).all()
    return {(row.breed_id, row.age_week): row for row in rows}


def flock_days(
    db: Session,
    flocks: list[Flock],
    start: date,
    end: date,
) -> list[FlockDay]:
    """One row per logged flock-day in [start, end].

    Pass every active flock on a farm: farm feed is split across the flocks given.
    """
    if not flocks:
        return []
    flock_ids = [flock.id for flock in flocks]
    by_id = {flock.id: flock for flock in flocks}
    shed_farm = {
        shed_id: farm_id
        for shed_id, farm_id in db.query(Shed.id, Shed.farm_id).filter(
            Shed.id.in_({flock.shed_id for flock in flocks})
        )
    }
    standards = load_standards(db, {flock.breed_id for flock in flocks})

    logs = (
        db.query(DailyShedLog)
        .filter(DailyShedLog.flock_id.in_(flock_ids), DailyShedLog.date <= end)
        .order_by(DailyShedLog.flock_id, DailyShedLog.date)
        .all()
    )
    adjustments: dict[str, list[tuple[date, int]]] = defaultdict(list)
    for adj in db.query(BirdAdjustment).filter(BirdAdjustment.flock_id.in_(flock_ids)):
        adjustments[adj.flock_id].append(
            (adj.at.date(), adj.live_bird_count - adj.previous_count)
        )

    rows: list[FlockDay] = []
    deaths_before: dict[str, int] = defaultdict(int)
    for log in logs:
        flock = by_id[log.flock_id]
        delta = sum(d for at, d in adjustments[flock.id] if at < log.date)
        opening = max(0, flock.birds_placed - deaths_before[flock.id] + delta)
        deaths_before[flock.id] += log.deaths
        if log.date < start:
            continue
        week = age_week(flock.hatch_date, log.date)
        std = standards.get((flock.breed_id, week))
        rows.append(
            FlockDay(
                flock_id=flock.id,
                shed_id=flock.shed_id,
                farm_id=shed_farm[flock.shed_id],
                day=log.date,
                age_week=week,
                birds=opening,
                eggs=log.eggs_collected,
                deaths=log.deaths,
                feed_kg=0.0,
                std_hdep=std.hdep_pct if std else None,
                std_feed_g=std.feed_g if std else None,
            )
        )
    _allocate_farm_feed(db, rows, start, end)
    return rows


def _allocate_farm_feed(db: Session, rows: list[FlockDay], start: date, end: date) -> None:
    """Godown feed is issued per farm; split each day's issue by flock bird-days."""
    farm_ids = {row.farm_id for row in rows}
    if not farm_ids:
        return
    issued: dict[tuple[str, date], float] = defaultdict(float)
    for farm_id, day, qty in db.query(
        FeedMovement.farm_id, FeedMovement.date, FeedMovement.qty_kg
    ).filter(
        FeedMovement.farm_id.in_(farm_ids),
        FeedMovement.direction == "out",
        FeedMovement.date >= start,
        FeedMovement.date <= end,
    ):
        issued[(farm_id, day)] += qty
    birds_on_day: dict[tuple[str, date], int] = defaultdict(int)
    for row in rows:
        birds_on_day[(row.farm_id, row.day)] += row.birds
    for row in rows:
        total = birds_on_day[(row.farm_id, row.day)]
        if total > 0:
            row.feed_kg = issued[(row.farm_id, row.day)] * row.birds / total


def totals(rows: list[FlockDay]) -> Totals:
    t = Totals()
    first_day: dict[str, FlockDay] = {}
    for row in rows:
        t.add(row)
        if row.flock_id not in first_day or row.day < first_day[row.flock_id].day:
            first_day[row.flock_id] = row
    t.opening_birds = sum(row.birds for row in first_day.values())
    return t


def group_totals(rows: list[FlockDay], key: str) -> dict[str, Totals]:
    groups: dict[str, list[FlockDay]] = defaultdict(list)
    for row in rows:
        groups[getattr(row, key)].append(row)
    return {group: totals(items) for group, items in groups.items()}


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())
