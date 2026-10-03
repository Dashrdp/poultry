"""Shared from/to period validation for Owner dashboard and analytics."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import HTTPException

MAX_SPAN_DAYS = 366


def day_count(start: date, end: date) -> int:
    return (end - start).days + 1


def prior_window(start: date, end: date) -> tuple[date, date]:
    """Equal-length window ending the day before ``start``."""
    n = day_count(start, end)
    prior_end = start - timedelta(days=1)
    prior_start = prior_end - timedelta(days=n - 1)
    return prior_start, prior_end


def parse_iso_date(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"{field} must be YYYY-MM-DD",
        ) from exc


def default_this_month(end_cap: date, today: date | None = None) -> tuple[date, date]:
    """Calendar this-month start through end_cap (Monitor=today, Analytics=yesterday)."""
    today = today or date.today()
    start = date(today.year, today.month, 1)
    end = end_cap if end_cap >= start else start
    return start, end


def resolve_period(
    from_param: str | None,
    to_param: str | None,
    *,
    end_cap: date,
    today: date | None = None,
) -> tuple[date, date]:
    """
    Resolve inclusive [from, to].

    Missing both → this month capped by end_cap.
    One missing → 400.
    """
    if from_param is None and to_param is None:
        return default_this_month(end_cap, today=today)

    if from_param is None or to_param is None:
        raise HTTPException(
            status_code=400,
            detail="from and to are both required",
        )

    start = parse_iso_date(from_param, "from")
    end = parse_iso_date(to_param, "to")

    if start > end:
        raise HTTPException(status_code=400, detail="from must be on or before to")
    if end > end_cap:
        raise HTTPException(
            status_code=400,
            detail=f"to must be on or before {end_cap.isoformat()}",
        )
    if day_count(start, end) > MAX_SPAN_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"period span must be at most {MAX_SPAN_DAYS} days",
        )
    return start, end
