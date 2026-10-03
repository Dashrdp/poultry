from collections import defaultdict
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from access import get_farm_for_user, list_farms_for_user
from auth import require_owner
from db import get_db
from flocks import active_flocks_by_shed, age_week, lifecycle_stage
from godown_api import _stock_kg
from kpis import (
    DEPLETION_WEEK,
    FlockDay,
    Totals,
    feed_g_per_bird,
    feed_per_10_eggs,
    flock_days,
    gap,
    group_totals,
    hdep,
    load_standards,
    mortality_pct,
    pct,
    status_for_gap,
    std_feed_g_per_bird,
    std_hdep,
    totals,
    week_start,
)
from models import Breed, FeedMovement, Flock, Shed, User
from period import day_count, prior_window, resolve_period

router = APIRouter(prefix="/api/analytics")

SPARK_WEEKS = 8


def _analytics_bounds(
    from_param: str | None,
    to_param: str | None,
) -> tuple[date, date]:
    yesterday = date.today() - timedelta(days=1)
    return resolve_period(from_param, to_param, end_cap=yesterday)


def _scope(db: Session, owner: User) -> tuple[dict[str, str], list[Shed], dict[str, Flock]]:
    farms = {farm.id: farm.name for farm in list_farms_for_user(db, owner)}
    sheds = (
        db.query(Shed)
        .filter(Shed.farm_id.in_(farms))
        .order_by(Shed.farm_id, Shed.number)
        .all()
        if farms
        else []
    )
    flocks = active_flocks_by_shed(db, [shed.id for shed in sheds])
    return farms, sheds, flocks


def _between(rows: list[FlockDay], start: date, end: date) -> list[FlockDay]:
    return [row for row in rows if start <= row.day <= end]


def _daily_mortality(t: Totals) -> float | None:
    return round(100.0 * t.deaths / t.bird_days, 3) if t.bird_days else None


def _kpi(key: str, label: str, value: float | None, baseline: float | None, unit: str) -> dict:
    return {"key": key, "label": label, "value": value, "baseline": baseline, "unit": unit}


def _avg(value: float | int, days: int) -> float:
    return round(value / days, 2) if days else 0.0


def _days_of_cover(db: Session, farm_ids: list[str], ref: date) -> float | None:
    if not farm_ids:
        return None
    stock = sum(_stock_kg(db, farm_id) for farm_id in farm_ids)
    issued = sum(
        qty
        for (qty,) in db.query(FeedMovement.qty_kg).filter(
            FeedMovement.farm_id.in_(farm_ids),
            FeedMovement.direction == "out",
            FeedMovement.date > ref - timedelta(days=7),
            FeedMovement.date <= ref,
        )
    )
    daily = issued / 7
    return round(stock / daily, 1) if daily > 0 else None


def _completeness(rows: list[FlockDay], day: date, expected: list[Flock]) -> dict:
    reported = {row.flock_id for row in rows if row.day == day}
    due = [flock for flock in expected if flock.placed_date <= day]
    return {"reported": sum(1 for f in due if f.id in reported), "total": len(due)}


def _weekly_hdep(rows: list[FlockDay], ref: date) -> list[dict]:
    first = week_start(ref) - timedelta(weeks=SPARK_WEEKS - 1)
    buckets: dict[date, list[FlockDay]] = defaultdict(list)
    for row in rows:
        if row.day >= first:
            buckets[week_start(row.day)].append(row)
    out = []
    for index in range(SPARK_WEEKS):
        start = first + timedelta(weeks=index)
        t = totals(buckets.get(start, []))
        out.append({"week_start": start.isoformat(), "hdep": hdep(t), "std_hdep": std_hdep(t)})
    return out


@router.get("/portfolio")
def portfolio(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> dict:
    farms, sheds, flocks = _scope(db, owner)
    start, end = _analytics_bounds(from_date, to_date)
    prior_start, prior_end = prior_window(start, end)
    period_days = day_count(start, end)
    load_start = min(start, prior_start, week_start(end) - timedelta(weeks=SPARK_WEEKS - 1))
    rows = flock_days(db, list(flocks.values()), load_start, end)

    period = totals(_between(rows, start, end))
    prior = totals(_between(rows, prior_start, prior_end))
    live_now = sum(flock.live_birds for flock in flocks.values())
    completeness = _completeness(rows, end, list(flocks.values()))

    kpis = [
        _kpi("live_birds", "Live birds", live_now, None, "birds"),
        _kpi("eggs", "Eggs", period.eggs, _avg(prior.eggs, period_days), "eggs"),
        _kpi("hdep", "HDEP", hdep(period), hdep(prior), "pct"),
        _kpi("gap", "Gap to standard", gap(period), gap(prior), "points"),
        _kpi("mortality", "Mortality", _daily_mortality(period), _daily_mortality(prior), "pct"),
        _kpi("feed_g", "Feed per bird", feed_g_per_bird(period), feed_g_per_bird(prior), "g"),
        _kpi("cover", "Feed cover", _days_of_cover(db, list(farms), end), None, "days"),
    ]

    by_farm_flocks: dict[str, list[Flock]] = defaultdict(list)
    shed_farm = {shed.id: shed.farm_id for shed in sheds}
    for flock in flocks.values():
        by_farm_flocks[shed_farm[flock.shed_id]].append(flock)

    farm_cards = []
    for farm_id, name in farms.items():
        farm_rows = [row for row in rows if row.farm_id == farm_id]
        t = totals(_between(farm_rows, start, end))
        farm_gap = gap(t)
        farm_cards.append(
            {
                "id": farm_id,
                "name": name,
                "birds": sum(f.live_birds for f in by_farm_flocks[farm_id]),
                "hdep": hdep(t),
                "std_hdep": std_hdep(t),
                "gap": farm_gap,
                "mortality_pct": mortality_pct(t),
                "feed_per_10_eggs": feed_per_10_eggs(t),
                "status": status_for_gap(farm_gap),
                "completeness": _completeness(farm_rows, end, by_farm_flocks[farm_id]),
                "weekly": _weekly_hdep(farm_rows, end),
            }
        )

    eggs_by_day: dict[date, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    expected_by_day: dict[date, float] = defaultdict(float)
    for row in _between(rows, start, end):
        eggs_by_day[row.day][row.farm_id] += row.eggs
        if row.std_hdep is not None:
            expected_by_day[row.day] += row.birds * row.std_hdep / 100
    egg_trend = []
    for offset in range(period_days):
        day = start + timedelta(days=offset)
        egg_trend.append(
            {
                "date": day.isoformat(),
                "by_farm": dict(eggs_by_day.get(day, {})),
                "expected": round(expected_by_day.get(day, 0.0)),
            }
        )

    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "ref_date": end.isoformat(),
        "kpis": kpis,
        "completeness": completeness,
        "week": {"hdep": hdep(period), "gap": gap(period)},
        "farms": farm_cards,
        "egg_trend": egg_trend,
    }


def _row_metrics(period: Totals, lifetime: Totals, placed: int, live: int) -> dict:
    return {
        "hdep": hdep(period),
        "std_hdep": std_hdep(period),
        "gap": gap(period),
        "mortality_pct": mortality_pct(period),
        "mort_cum_pct": pct(lifetime.deaths, placed),
        "feed_g": feed_g_per_bird(period),
        "std_feed_g": std_feed_g_per_bird(period),
        "feed_per_10_eggs": feed_per_10_eggs(period),
        "livability_pct": pct(live, placed),
        "hhe": round(lifetime.eggs / placed, 1) if placed else None,
    }


@router.get("/compare")
def compare(
    level: Literal["shed", "farm"] = Query("shed"),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> dict:
    farms, sheds, flocks = _scope(db, owner)
    start, end = _analytics_bounds(from_date, to_date)
    flock_list = list(flocks.values())
    first = min((flock.placed_date for flock in flock_list), default=end)
    lifetime_rows = flock_days(db, flock_list, first, end)
    period_rows = _between(lifetime_rows, start, end)
    shed_by_id = {shed.id: shed for shed in sheds}

    rows: list[dict] = []
    if level == "shed":
        period_by = group_totals(period_rows, "flock_id")
        life_by = group_totals(lifetime_rows, "flock_id")
        for flock in flock_list:
            shed = shed_by_id[flock.shed_id]
            rows.append(
                {
                    "id": shed.id,
                    "farm_id": shed.farm_id,
                    "name": shed.name,
                    "farm_name": farms[shed.farm_id],
                    "age_week": age_week(flock.hatch_date, end),
                    "birds": flock.live_birds,
                    "occupancy_pct": pct(flock.live_birds, shed.capacity or 0),
                    **_row_metrics(
                        period_by.get(flock.id, Totals()),
                        life_by.get(flock.id, Totals()),
                        flock.birds_placed,
                        flock.live_birds,
                    ),
                }
            )
    else:
        period_by = group_totals(period_rows, "farm_id")
        life_by = group_totals(lifetime_rows, "farm_id")
        for farm_id, name in farms.items():
            farm_flocks = [f for f in flock_list if shed_by_id[f.shed_id].farm_id == farm_id]
            rows.append(
                {
                    "id": farm_id,
                    "farm_id": farm_id,
                    "name": name,
                    "farm_name": name,
                    "age_week": None,
                    "birds": sum(f.live_birds for f in farm_flocks),
                    "occupancy_pct": None,
                    **_row_metrics(
                        period_by.get(farm_id, Totals()),
                        life_by.get(farm_id, Totals()),
                        sum(f.birds_placed for f in farm_flocks),
                        sum(f.live_birds for f in farm_flocks),
                    ),
                }
            )

    by_flock_week: dict[tuple[str, int], list[FlockDay]] = defaultdict(list)
    for row in lifetime_rows:
        by_flock_week[(row.flock_id, row.age_week)].append(row)
    curves = []
    for flock in flock_list:
        shed = shed_by_id[flock.shed_id]
        weeks = sorted(week for (flock_id, week) in by_flock_week if flock_id == flock.id)
        curves.append(
            {
                "flock_id": flock.id,
                "shed_id": shed.id,
                "label": f"{farms[shed.farm_id]} · {shed.name}",
                "points": [
                    {"age_week": week, "hdep": hdep(totals(by_flock_week[(flock.id, week)]))}
                    for week in weeks
                ],
            }
        )

    breed_ids = {flock.breed_id for flock in flock_list}
    standards = load_standards(db, breed_ids)
    breed_curves = []
    for breed in db.query(Breed).filter(Breed.id.in_(breed_ids)).order_by(Breed.name) if breed_ids else []:
        points = sorted(
            (week, row.hdep_pct)
            for (breed_id, week), row in standards.items()
            if breed_id == breed.id and row.hdep_pct is not None
        )
        breed_curves.append(
            {
                "breed_id": breed.id,
                "name": breed.name,
                "points": [{"age_week": week, "hdep": value} for week, value in points],
            }
        )

    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "ref_date": end.isoformat(),
        "level": level,
        "feed_estimated": True,
        "rows": rows,
        "age_curves": curves,
        "breed_curves": breed_curves,
    }


@router.get("/sheds/{shed_id}")
def shed_drilldown(
    shed_id: str,
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    owner: User = Depends(require_owner),
) -> dict:
    shed = db.get(Shed, shed_id)
    farm = get_farm_for_user(db, owner, shed.farm_id) if shed is not None else None
    if shed is None or farm is None:
        raise HTTPException(status_code=404, detail="Shed not found")
    flock = active_flocks_by_shed(db, [shed.id]).get(shed.id)
    start, end = _analytics_bounds(from_date, to_date)
    base = {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "ref_date": end.isoformat(),
        "shed": {"id": shed.id, "name": shed.name, "farm_id": farm.id, "farm_name": farm.name},
    }
    if flock is None:
        return {**base, "flock": None, "daily": [], "lifetime": None}

    farm_sheds = [sid for (sid,) in db.query(Shed.id).filter(Shed.farm_id == farm.id)]
    farm_flocks = list(active_flocks_by_shed(db, farm_sheds).values())
    lifetime_rows = [
        row
        for row in flock_days(db, farm_flocks, flock.placed_date, end)
        if row.flock_id == flock.id
    ]
    period_rows = _between(lifetime_rows, start, end)
    lifetime = totals(lifetime_rows)
    recent = totals(_between(lifetime_rows, end - timedelta(days=27), end))

    daily = [
        {
            "date": row.day.isoformat(),
            "age_week": row.age_week,
            "birds": row.birds,
            "eggs": row.eggs,
            "deaths": row.deaths,
            "hdep": pct(row.eggs, row.birds),
            "std_hdep": row.std_hdep,
            "mortality_pct": round(100.0 * row.deaths / row.birds, 3) if row.birds else None,
            "feed_g": round(row.feed_kg * 1000 / row.birds, 1) if row.birds else None,
            "std_feed_g": row.std_feed_g,
        }
        for row in period_rows
    ]

    standards = load_standards(db, {flock.breed_id})
    current_week = age_week(flock.hatch_date, end)
    std_now = standards.get((flock.breed_id, current_week))
    livability = flock.live_birds / flock.birds_placed if flock.birds_placed else 0.0
    actual_recent = hdep(recent)
    std_recent = std_hdep(recent)
    ratio = actual_recent / std_recent if actual_recent and std_recent else 1.0
    remaining = sum(
        (row.hdep_pct or 0) * 7 / 100
        for (breed_id, week), row in standards.items()
        if breed_id == flock.breed_id and current_week < week <= DEPLETION_WEEK
    )
    hhe_now = lifetime.eggs / flock.birds_placed if flock.birds_placed else 0.0

    return {
        **base,
        "flock": {
            "id": flock.id,
            "breed_name": flock.breed.name,
            "age_week": current_week,
            "stage": lifecycle_stage(flock, end),
            "placed_date": flock.placed_date.isoformat(),
            "birds_placed": flock.birds_placed,
            "live_birds": flock.live_birds,
        },
        "daily": daily,
        "lifetime": {
            "livability_pct": round(livability * 100, 2),
            "mort_cum_pct": pct(lifetime.deaths, flock.birds_placed),
            "hhe": round(hhe_now, 1),
            "std_hhe": std_now.hhe_cum if std_now else None,
            "projected_hhe": round(hhe_now + remaining * ratio * livability, 1),
            "depletion_week": DEPLETION_WEEK,
            "hdep_28d": actual_recent,
            "std_hdep_28d": std_recent,
            "gap_28d": gap(recent),
            "feed_g_28d": feed_g_per_bird(recent),
            "feed_per_10_eggs_28d": feed_per_10_eggs(recent),
        },
    }
