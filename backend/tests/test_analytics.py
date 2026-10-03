from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

import db
from helpers import analytics_window
from kpis import FlockDay, gap, hdep, status_for_gap, std_hdep, totals
from models import Customer, Farm, Shed
from seed import DEMO_BREED_ID


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def _row(flock: str, birds: int, eggs: int, std: float | None) -> FlockDay:
    return FlockDay(
        flock_id=flock,
        shed_id=flock,
        farm_id="farm",
        day=date(2026, 9, 1),
        age_week=40,
        birds=birds,
        eggs=eggs,
        deaths=0,
        feed_kg=0.0,
        std_hdep=std,
        std_feed_g=None,
    )


def test_group_hdep_sums_bird_days_not_average_of_percentages() -> None:
    t = totals([_row("a", 100, 90, 90.0), _row("b", 900, 450, 80.0)])
    assert hdep(t) == 54.0
    assert std_hdep(t) == 81.0
    assert gap(t) == -27.0


def test_gap_ignores_days_without_a_standard() -> None:
    t = totals([_row("a", 100, 90, 92.0), _row("b", 100, 10, None)])
    assert hdep(t) == 50.0
    assert gap(t) == -2.0


@pytest.mark.parametrize(
    ("value", "status"),
    [(None, "unknown"), (0.5, "good"), (-3.0, "good"), (-4.0, "watch"), (-5.5, "bad")],
)
def test_status_for_gap(value: float | None, status: str) -> None:
    assert status_for_gap(value) == status


def _kpi_farm(client: TestClient) -> tuple[str, str, float]:
    """Own farm + shed with two logged days at age week 40; returns (farm, shed, std hdep)."""
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post("/api/farms", json={"name": "KPI Farm"}).json()["id"]
    shed = client.post(
        f"/api/farms/{farm}/sheds", json={"name": "KPI Shed", "capacity": 2000}
    ).json()["id"]
    ref = date.today() - timedelta(days=1)
    hatch = ref - timedelta(weeks=40)
    placed = client.post(
        f"/api/sheds/{shed}/flocks",
        json={
            "breed_id": DEMO_BREED_ID,
            "hatch_date": hatch.isoformat(),
            "placed_date": (hatch + timedelta(weeks=17)).isoformat(),
            "birds_placed": 1000,
        },
    )
    assert placed.status_code == 200
    day1 = ref - timedelta(days=1)
    for day, eggs, deaths in [(day1, 900, 10), (ref, 891, 0)]:
        logged = client.put(
            f"/api/sheds/{shed}/daily-logs/{day.isoformat()}",
            json={"eggs_collected": eggs, "deaths": deaths},
        )
        assert logged.status_code == 200
    moves = [("in", 5, day1), ("out", 2, day1), ("out", 1.98, ref)]
    for direction, quintal, day in moves:
        moved = client.post(
            f"/api/farms/{farm}/godown/movements",
            json={"direction": direction, "qty_quintal": quintal, "date": day.isoformat()},
        )
        assert moved.status_code == 200
    standards = client.get(f"/api/breeds/{DEMO_BREED_ID}/standards").json()
    week_std = {row["age_week"]: row["hdep_pct"] for row in standards}
    # day1 is week 39, ref is week 40; expected eggs weighted by opening birds
    expected = (1000 * week_std[39] + 990 * week_std[40]) / 100
    return farm, shed, round(100 * expected / 1990, 2)


def test_compare_shed_row_uses_bird_days(client: TestClient) -> None:
    farm, shed, std = _kpi_farm(client)
    window = analytics_window(7)
    try:
        body = client.get("/api/analytics/compare", params={"level": "shed", **window}).json()
        row = next(item for item in body["rows"] if item["id"] == shed)
        assert row["age_week"] == 40
        assert row["birds"] == 990
        assert row["hdep"] == 90.0
        assert row["std_hdep"] == std
        assert row["gap"] == round(90.0 - std, 2)
        assert row["mortality_pct"] == 1.0
        assert row["feed_g"] == 200.0
        assert row["feed_per_10_eggs"] == round(398 / 1791 * 10, 3)
        assert row["livability_pct"] == 99.0
        assert row["occupancy_pct"] == 49.5
        assert any(curve["shed_id"] == shed for curve in body["age_curves"])
        assert body["breed_curves"][0]["breed_id"] == DEMO_BREED_ID

        farm_body = client.get(
            "/api/analytics/compare",
            params={"level": "farm", **window},
        ).json()
        farm_row = next(item for item in farm_body["rows"] if item["id"] == farm)
        assert farm_row["hdep"] == 90.0
        assert farm_row["age_week"] is None
    finally:
        client.delete(f"/api/farms/{farm}")


def test_shed_drilldown_and_portfolio(client: TestClient) -> None:
    farm, shed, _std = _kpi_farm(client)
    window = analytics_window(7)
    try:
        drill = client.get(f"/api/analytics/sheds/{shed}", params=window).json()
        assert drill["flock"]["age_week"] == 40
        assert [row["eggs"] for row in drill["daily"]] == [900, 891]
        assert drill["daily"][0]["feed_g"] == 200.0
        assert drill["lifetime"]["hhe"] == 1.8
        assert drill["lifetime"]["livability_pct"] == 99.0
        assert drill["lifetime"]["projected_hhe"] > drill["lifetime"]["hhe"]

        portfolio = client.get("/api/analytics/portfolio", params=window).json()
        card = next(item for item in portfolio["farms"] if item["id"] == farm)
        assert card["hdep"] == 90.0
        assert card["completeness"] == {"reported": 1, "total": 1}
        assert len(card["weekly"]) == 8
        assert len(portfolio["egg_trend"]) == 7
        assert portfolio["egg_trend"][-1]["by_farm"][farm] == 891
    finally:
        client.delete(f"/api/farms/{farm}")


def test_analytics_owner_only_and_valid_period(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    assert client.get("/api/analytics/portfolio").status_code == 403
    assert client.get("/api/analytics/compare").status_code == 403
    assert client.get("/api/analytics/sheds/shed-1").status_code == 403

    _login(client, "owner@demo.local", "owner-pass")
    assert (
        client.get(
            "/api/analytics/portfolio",
            params={"from": "2026-10-10", "to": "2026-10-01"},
        ).status_code
        == 400
    )


def test_drilldown_hides_other_tenant_shed(client: TestClient) -> None:
    with db.SessionLocal() as session:
        session.add(Customer(id="cust-x", name="Other"))
        session.flush()
        session.add(Farm(id="farm-x", customer_id="cust-x", name="Other farm"))
        session.flush()
        session.add(Shed(id="shed-x", farm_id="farm-x", name="Other shed", number=1))
        session.commit()
    try:
        _login(client, "owner@demo.local", "owner-pass")
        assert client.get("/api/analytics/sheds/shed-x").status_code == 404
        ids = {
            row["id"]
            for row in client.get("/api/analytics/compare", params={"level": "farm"}).json()[
                "rows"
            ]
        }
        assert "farm-x" not in ids
    finally:
        with db.SessionLocal() as session:
            session.delete(session.get(Shed, "shed-x"))
            session.flush()
            session.delete(session.get(Farm, "farm-x"))
            session.flush()
            session.delete(session.get(Customer, "cust-x"))
            session.commit()
