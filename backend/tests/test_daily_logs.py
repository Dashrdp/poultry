from fastapi.testclient import TestClient

import db
from helpers import start_flock
from models import BirdAdjustment, Customer, Farm, Shed


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def test_deaths_subtract_and_same_day_upsert_uses_delta(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    start_flock(client, "shed-1", 100)

    _login(client, "manager@demo.local", "manager-pass")
    first = client.put(
        "/api/sheds/shed-1/daily-logs/2026-10-02",
        json={"eggs_collected": 40, "deaths": 3, "notes": "morning"},
    )
    assert first.status_code == 200
    assert first.json()["eggs_collected"] == 40
    assert first.json()["deaths"] == 3
    assert first.json()["live_bird_count"] == 97

    second = client.put(
        "/api/sheds/shed-1/daily-logs/2026-10-02",
        json={"eggs_collected": 41, "deaths": 5},
    )
    assert second.status_code == 200
    assert second.json()["eggs_collected"] == 41
    assert second.json()["deaths"] == 5
    assert second.json()["live_bird_count"] == 95

    loaded = client.get("/api/sheds/shed-1/daily-logs/2026-10-02")
    assert loaded.status_code == 200
    assert loaded.json()["eggs_collected"] == 41
    assert loaded.json()["deaths"] == 5


def test_deaths_above_live_rejected(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    start_flock(client, "shed-2", 2)

    rejected = client.put(
        "/api/sheds/shed-2/daily-logs/2026-10-02",
        json={"eggs_collected": 1, "deaths": 3},
    )
    assert rejected.status_code == 400
    assert rejected.json()["detail"] == "Deaths exceed live bird count"

    sheds = client.get("/api/farms/farm-1/sheds")
    shed = next(item for item in sheds.json() if item["id"] == "shed-2")
    assert shed["live_bird_count"] == 2


def test_live_override_sets_absolute_and_is_audited(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    start_flock(client, "shed-3", 50)
    logged = client.put(
        "/api/sheds/shed-3/daily-logs/2026-10-02",
        json={"eggs_collected": 10, "deaths": 1},
    )
    assert logged.json()["live_bird_count"] == 49

    override = client.put(
        "/api/sheds/shed-3/live-count",
        json={"live_bird_count": 80, "reason": "count correction"},
    )
    assert override.status_code == 200
    assert override.json()["live_bird_count"] == 80

    loaded = client.get("/api/sheds/shed-3/daily-logs/2026-10-02")
    assert loaded.json()["deaths"] == 1
    assert loaded.json()["live_bird_count"] == 80

    with db.SessionLocal() as session:
        row = (
            session.query(BirdAdjustment)
            .filter(
                BirdAdjustment.shed_id == "shed-3",
                BirdAdjustment.reason == "count correction",
            )
            .one()
        )
        assert row is not None
        assert row.previous_count == 49
        assert row.live_bird_count == 80
        assert row.reason == "count correction"


def test_manager_cannot_log_unassigned_farm(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    response = client.put(
        "/api/sheds/shed-4/daily-logs/2026-10-02",
        json={"eggs_collected": 1, "deaths": 0},
    )
    assert response.status_code == 403


def test_other_tenant_shed_log_is_not_found(client: TestClient) -> None:
    with db.SessionLocal() as session:
        session.add(Customer(id="log-other-customer", name="Other"))
        session.add(
            Farm(
                id="log-other-farm",
                customer_id="log-other-customer",
                name="Other Farm",
                location=None,
            )
        )
        session.add(
            Shed(
                id="log-other-shed",
                farm_id="log-other-farm",
                name="Other Shed",
                number=1,
            )
        )
        session.commit()

    _login(client, "owner@demo.local", "owner-pass")
    response = client.put(
        "/api/sheds/log-other-shed/daily-logs/2026-10-02",
        json={"eggs_collected": 1, "deaths": 0},
    )
    assert response.status_code == 404


def test_log_without_active_flock_rejected(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    shed = client.post("/api/farms/farm-1/sheds", json={"name": "Empty Shed"}).json()
    response = client.put(
        f"/api/sheds/{shed['id']}/daily-logs/2026-10-02",
        json={"eggs_collected": 1, "deaths": 0},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "No active flock in this shed"
    live = client.put(
        f"/api/sheds/{shed['id']}/live-count",
        json={"live_bird_count": 5},
    )
    assert live.status_code == 400
    client.delete(f"/api/sheds/{shed['id']}")


def test_daily_log_requires_auth(client: TestClient) -> None:
    response = client.put(
        "/api/sheds/shed-1/daily-logs/2026-10-02",
        json={"eggs_collected": 1, "deaths": 0},
    )
    assert response.status_code == 401
