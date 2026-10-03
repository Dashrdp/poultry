from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from access import get_farm_for_user, list_farms_for_user
from auth import require_user
from db import get_db
from godown_api import KG_PER_QUINTAL, _stock_kg
from models import DailyShedLog, Farm, FarmRates, FeedMovement, Shed, User

router = APIRouter(prefix="/api")

VALID_RANGES = frozenset({"current_month", "previous_month", "year"})

MONTH_LABELS = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)


def _range_bounds(range_key: str, today: date) -> tuple[date, date]:
    if range_key == "current_month":
        return date(today.year, today.month, 1), today
    if range_key == "previous_month":
        first_this = date(today.year, today.month, 1)
        last_prev = first_this - timedelta(days=1)
        return date(last_prev.year, last_prev.month, 1), last_prev
    if range_key == "year":
        return date(today.year, 1, 1), today
    raise ValueError(range_key)


def _day_count(start: date, end: date) -> int:
    return (end - start).days + 1


def _hen_day_pct(eggs: int, birds: int, days: int) -> float | None:
    if birds <= 0 or days <= 0:
        return None
    return round(100.0 * eggs / (birds * days), 2)


LOW_FEED_QUINTAL = 1.0
EGG_DROP_RATIO = 0.8


def _farm_eggs_on_day(db: Session, shed_ids: list[str], day: date) -> int:
    if not shed_ids:
        return 0
    total = (
        db.query(func.coalesce(func.sum(DailyShedLog.eggs_collected), 0))
        .filter(
            DailyShedLog.shed_id.in_(shed_ids),
            DailyShedLog.date == day,
        )
        .scalar()
    )
    return int(total or 0)


def _build_alerts(
    db: Session,
    sheds: list[Shed],
    shed_ids: list[str],
    today_eggs: dict[str, int],
    stock_quintal: float,
    today: date,
) -> list[dict[str, object]]:
    alerts: list[dict[str, object]] = []

    for shed in sheds:
        if shed.live_bird_count <= 0:
            continue
        if shed.id not in today_eggs:
            alerts.append(
                {
                    "code": "missing_log",
                    "severity": "warning",
                    "shed_id": shed.id,
                    "shed_name": shed.name,
                    "message": f"Missing today’s log for {shed.name}",
                }
            )

    if stock_quintal < LOW_FEED_QUINTAL:
        alerts.append(
            {
                "code": "low_feed",
                "severity": "warning",
                "shed_id": None,
                "shed_name": None,
                "message": (
                    f"Low feed stock ({stock_quintal:g} quintal; "
                    f"below {LOW_FEED_QUINTAL:g})"
                ),
            }
        )

    yesterday = today - timedelta(days=1)
    eggs_today = sum(today_eggs.values())
    eggs_yesterday = _farm_eggs_on_day(db, shed_ids, yesterday)
    if eggs_yesterday > 0 and eggs_today < eggs_yesterday * EGG_DROP_RATIO:
        drop_pct = round(100.0 * (1 - eggs_today / eggs_yesterday), 1)
        alerts.append(
            {
                "code": "egg_drop",
                "severity": "warning",
                "shed_id": None,
                "shed_name": None,
                "message": (
                    f"Egg drop {drop_pct}% vs yesterday "
                    f"({eggs_today} today, {eggs_yesterday} yesterday)"
                ),
            }
        )

    return alerts


def _feed_out_kg(
    db: Session,
    farm_id: str,
    start: date,
    end: date,
) -> float:
    total = (
        db.query(func.coalesce(func.sum(FeedMovement.qty_kg), 0.0))
        .filter(
            FeedMovement.farm_id == farm_id,
            FeedMovement.direction == "out",
            FeedMovement.date >= start,
            FeedMovement.date <= end,
        )
        .scalar()
    )
    return float(total or 0.0)


def _money_block(
    db: Session,
    farm_id: str,
    eggs_period: int,
    start: date,
    end: date,
) -> dict[str, object] | None:
    rates = db.get(FarmRates, farm_id)
    if rates is None:
        return None
    revenue = round(eggs_period * rates.egg_price, 2)
    feed_kg = _feed_out_kg(db, farm_id, start, end)
    feed_cost = round(feed_kg * rates.feed_cost_per_kg, 2)
    return {
        "egg_price": rates.egg_price,
        "feed_cost_per_kg": rates.feed_cost_per_kg,
        "eggs_period": eggs_period,
        "feed_out_kg": round(feed_kg, 6),
        "revenue": revenue,
        "feed_cost": feed_cost,
        "margin": round(revenue - feed_cost, 2),
    }


def _iter_days(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def _period_totals(
    db: Session,
    shed_ids: list[str],
    start: date,
    end: date,
) -> tuple[int, int]:
    if not shed_ids:
        return 0, 0
    totals = (
        db.query(
            func.coalesce(func.sum(DailyShedLog.eggs_collected), 0),
            func.coalesce(func.sum(DailyShedLog.deaths), 0),
        )
        .filter(
            DailyShedLog.shed_id.in_(shed_ids),
            DailyShedLog.date >= start,
            DailyShedLog.date <= end,
        )
        .one()
    )
    return int(totals[0]), int(totals[1])


def _per_shed_period(
    db: Session,
    shed_ids: list[str],
    start: date,
    end: date,
) -> dict[str, tuple[int, int]]:
    if not shed_ids:
        return {}
    rows = (
        db.query(
            DailyShedLog.shed_id,
            func.coalesce(func.sum(DailyShedLog.eggs_collected), 0),
            func.coalesce(func.sum(DailyShedLog.deaths), 0),
        )
        .filter(
            DailyShedLog.shed_id.in_(shed_ids),
            DailyShedLog.date >= start,
            DailyShedLog.date <= end,
        )
        .group_by(DailyShedLog.shed_id)
        .all()
    )
    return {shed_id: (int(eggs), int(deaths)) for shed_id, eggs, deaths in rows}


def _farm_period_stats(
    db: Session,
    farm: Farm,
    start: date,
    end: date,
    days: int,
) -> dict[str, object]:
    sheds = db.query(Shed).filter(Shed.farm_id == farm.id).all()
    birds = sum(shed.live_bird_count for shed in sheds)
    eggs, deaths = _period_totals(db, [shed.id for shed in sheds], start, end)
    money = _money_block(db, farm.id, eggs, start, end)
    return {
        "id": farm.id,
        "name": farm.name,
        "birds": birds,
        "eggs_period": eggs,
        "deaths_period": deaths,
        "hen_day_pct": _hen_day_pct(eggs, birds, days),
        "margin": money["margin"] if money is not None else None,
    }


def _build_series(
    db: Session,
    shed_ids: list[str],
    range_key: str,
    start: date,
    end: date,
    birds_now: int,
) -> list[dict[str, object]]:
    if not shed_ids:
        return []

    if range_key == "year":
        rows = (
            db.query(
                func.strftime("%Y-%m", DailyShedLog.date).label("bucket"),
                func.coalesce(func.sum(DailyShedLog.eggs_collected), 0),
            )
            .filter(
                DailyShedLog.shed_id.in_(shed_ids),
                DailyShedLog.date >= start,
                DailyShedLog.date <= end,
            )
            .group_by("bucket")
            .all()
        )
        eggs_by_month = {bucket: int(eggs) for bucket, eggs in rows}
        series: list[dict[str, object]] = []
        for month in range(1, end.month + 1):
            key = f"{start.year}-{month:02d}"
            series.append(
                {
                    "label": MONTH_LABELS[month - 1],
                    "eggs": eggs_by_month.get(key, 0),
                    "birds": birds_now,
                }
            )
        return series

    rows = (
        db.query(
            DailyShedLog.date,
            func.coalesce(func.sum(DailyShedLog.eggs_collected), 0),
        )
        .filter(
            DailyShedLog.shed_id.in_(shed_ids),
            DailyShedLog.date >= start,
            DailyShedLog.date <= end,
        )
        .group_by(DailyShedLog.date)
        .all()
    )
    eggs_by_day = {day: int(eggs) for day, eggs in rows}
    return [
        {
            "label": day.isoformat(),
            "eggs": eggs_by_day.get(day, 0),
            "birds": birds_now,
        }
        for day in _iter_days(start, end)
    ]


@router.get("/dashboard")
def dashboard(
    farm_id: str = Query(..., description="Farm id"),
    range: str = Query(
        "current_month",
        description="current_month | previous_month | year",
    ),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    if range not in VALID_RANGES:
        raise HTTPException(
            status_code=400,
            detail=f"range must be one of: {', '.join(sorted(VALID_RANGES))}",
        )
    farm = get_farm_for_user(db, user, farm_id)
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")

    sheds = (
        db.query(Shed)
        .filter(Shed.farm_id == farm.id)
        .order_by(Shed.number)
        .all()
    )
    shed_ids = [shed.id for shed in sheds]
    today = date.today()
    start, end = _range_bounds(range, today)
    days = _day_count(start, end)

    today_eggs: dict[str, int] = {}
    last_log: dict[str, date] = {}
    if shed_ids:
        for shed_id, eggs in (
            db.query(DailyShedLog.shed_id, DailyShedLog.eggs_collected)
            .filter(
                DailyShedLog.shed_id.in_(shed_ids),
                DailyShedLog.date == today,
            )
            .all()
        ):
            today_eggs[shed_id] = eggs

        for shed_id, max_date in (
            db.query(DailyShedLog.shed_id, func.max(DailyShedLog.date))
            .filter(DailyShedLog.shed_id.in_(shed_ids))
            .group_by(DailyShedLog.shed_id)
            .all()
        ):
            last_log[shed_id] = max_date

    shed_data = [
        {
            "id": shed.id,
            "number": shed.number,
            "name": shed.name,
            "bird_count": shed.live_bird_count,
            "eggs_today": today_eggs.get(shed.id, 0),
            "last_log_date": (
                last_log[shed.id].isoformat() if shed.id in last_log else ""
            ),
        }
        for shed in sheds
    ]

    birds_now = sum(shed.live_bird_count for shed in sheds)
    eggs_period, deaths_period = _period_totals(db, shed_ids, start, end)
    per_shed = _per_shed_period(db, shed_ids, start, end)

    compare_sheds = []
    for shed in sheds:
        eggs, deaths = per_shed.get(shed.id, (0, 0))
        compare_sheds.append(
            {
                "id": shed.id,
                "number": shed.number,
                "name": shed.name,
                "birds": shed.live_bird_count,
                "eggs_period": eggs,
                "deaths_period": deaths,
                "hen_day_pct": _hen_day_pct(eggs, shed.live_bird_count, days),
            }
        )

    compare_farms = [
        _farm_period_stats(db, other, start, end, days)
        for other in list_farms_for_user(db, user)
    ]

    stock_kg = _stock_kg(db, farm.id)
    stock_quintal = round(stock_kg / KG_PER_QUINTAL, 6)
    alerts = _build_alerts(
        db, sheds, shed_ids, today_eggs, stock_quintal, today
    )

    return {
        "farm": {
            "id": farm.id,
            "name": farm.name,
            "location": farm.location or "",
        },
        "range": range,
        "sheds": shed_data,
        "kpis": {
            "birds": birds_now,
            "eggs_period": eggs_period,
            "deaths_period": deaths_period,
            "hen_day_pct": _hen_day_pct(eggs_period, birds_now, days),
            "feed_qty": stock_quintal,
            "feed_unit": "quintal",
        },
        "series": _build_series(
            db, shed_ids, range, start, end, birds_now
        ),
        "compare_sheds": compare_sheds,
        "compare_farms": compare_farms,
        "alerts": alerts,
        "money": _money_block(db, farm.id, eggs_period, start, end),
    }
