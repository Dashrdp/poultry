from datetime import date, timedelta

import pytest
from fastapi import HTTPException

from period import (
    MAX_SPAN_DAYS,
    day_count,
    default_this_month,
    prior_window,
    resolve_period,
)


def test_day_count_inclusive() -> None:
    assert day_count(date(2026, 3, 1), date(2026, 3, 1)) == 1
    assert day_count(date(2026, 3, 1), date(2026, 3, 7)) == 7


def test_prior_window_equal_length() -> None:
    start, end = date(2026, 3, 10), date(2026, 3, 16)
    prior_start, prior_end = prior_window(start, end)
    assert (prior_start, prior_end) == (date(2026, 3, 3), date(2026, 3, 9))
    assert day_count(prior_start, prior_end) == day_count(start, end)


def test_prior_window_single_day() -> None:
    assert prior_window(date(2026, 3, 5), date(2026, 3, 5)) == (
        date(2026, 3, 4),
        date(2026, 3, 4),
    )


def test_default_this_month_monitor() -> None:
    today = date(2026, 10, 15)
    assert default_this_month(today, today=today) == (date(2026, 10, 1), date(2026, 10, 15))


def test_default_this_month_analytics_yesterday() -> None:
    today = date(2026, 10, 15)
    yesterday = today - timedelta(days=1)
    assert default_this_month(yesterday, today=today) == (
        date(2026, 10, 1),
        date(2026, 10, 14),
    )


def test_resolve_defaults_when_both_missing() -> None:
    end_cap = date(2026, 10, 14)
    assert resolve_period(None, None, end_cap=end_cap, today=date(2026, 10, 15)) == (
        date(2026, 10, 1),
        date(2026, 10, 14),
    )


def test_resolve_requires_both_when_one_set() -> None:
    with pytest.raises(HTTPException) as exc:
        resolve_period("2026-10-01", None, end_cap=date(2026, 10, 15))
    assert exc.value.status_code == 400


def test_resolve_rejects_inverted_and_future_and_span() -> None:
    end_cap = date(2026, 10, 15)
    with pytest.raises(HTTPException) as exc:
        resolve_period("2026-10-10", "2026-10-01", end_cap=end_cap)
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        resolve_period("2026-10-01", "2026-10-16", end_cap=end_cap)
    assert exc.value.status_code == 400

    start = end_cap - timedelta(days=MAX_SPAN_DAYS)
    with pytest.raises(HTTPException) as exc:
        resolve_period(start.isoformat(), end_cap.isoformat(), end_cap=end_cap)
    assert exc.value.status_code == 400


def test_resolve_accepts_valid_custom() -> None:
    end_cap = date(2026, 10, 15)
    assert resolve_period(
        "2026-10-01",
        "2026-10-07",
        end_cap=end_cap,
    ) == (date(2026, 10, 1), date(2026, 10, 7))
