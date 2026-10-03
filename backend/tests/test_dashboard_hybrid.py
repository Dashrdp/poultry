from datetime import date

from fastapi.testclient import TestClient

from helpers import dashboard_params, start_flock


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def test_dashboard_requires_assignment_for_manager(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")

    allowed = client.get(
        "/api/dashboard",
        params=dashboard_params("farm-1"),
    )
    assert allowed.status_code == 200
    assert allowed.json()["farm"]["id"] == "farm-1"
    assert len(allowed.json()["sheds"]) >= 1

    denied = client.get(
        "/api/dashboard",
        params=dashboard_params("farm-2"),
    )
    assert denied.status_code == 404


def test_blank_farm_dashboard_is_zeros(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    created = client.post(
        "/api/farms",
        json={"name": "Blank", "location": ""},
    )
    assert created.status_code == 200
    farm_id = created.json()["id"]
    shed = client.post(
        f"/api/farms/{farm_id}/sheds",
        json={"name": "North Shed"},
    )
    assert shed.status_code == 200

    response = client.get(
        "/api/dashboard",
        params=dashboard_params(farm_id),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["farm"] == {"id": farm_id, "name": "Blank", "location": ""}
    today = date.today()
    assert body["from"] == date(today.year, today.month, 1).isoformat()
    assert body["to"] == today.isoformat()
    assert body["kpis"] == {
        "birds": 0,
        "eggs_period": 0,
        "deaths_period": 0,
        "hen_day_pct": None,
        "feed_qty": 0,
        "feed_unit": "quintal",
    }
    assert len(body["series"]) == today.day
    assert all(point["eggs"] == 0 for point in body["series"])
    assert body["sheds"] == [
        {
            "id": shed.json()["id"],
            "number": 1,
            "name": "North Shed",
            "bird_count": 0,
            "eggs_today": 0,
            "last_log_date": "",
        }
    ]
    assert body["compare_sheds"] == [
        {
            "id": shed.json()["id"],
            "number": 1,
            "name": "North Shed",
            "birds": 0,
            "eggs_period": 0,
            "deaths_period": 0,
            "hen_day_pct": None,
        }
    ]
    assert any(row["id"] == farm_id for row in body["compare_farms"])
    blank_farm = next(row for row in body["compare_farms"] if row["id"] == farm_id)
    assert "margin" in blank_farm
    assert blank_farm["margin"] is None
    assert "low_feed" in {alert["code"] for alert in body["alerts"]}
    assert "missing_log" not in {alert["code"] for alert in body["alerts"]}


def test_dashboard_aggregates_logs_and_feed(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    created = client.post(
        "/api/farms",
        json={"name": "Agg Farm", "location": "Test"},
    )
    farm_id = created.json()["id"]
    shed = client.post(
        f"/api/farms/{farm_id}/sheds",
        json={"name": "A"},
    )
    shed_id = shed.json()["id"]
    today = date.today().isoformat()

    start_flock(client, shed_id, 100)
    logged = client.put(
        f"/api/sheds/{shed_id}/daily-logs/{today}",
        json={"eggs_collected": 40, "deaths": 3},
    )
    assert logged.status_code == 200
    assert logged.json()["live_bird_count"] == 97

    feed = client.post(
        f"/api/farms/{farm_id}/godown/movements",
        json={"direction": "in", "qty_quintal": 2.5, "date": today},
    )
    assert feed.status_code == 200

    response = client.get(
        "/api/dashboard",
        params=dashboard_params(farm_id),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["kpis"]["birds"] == 97
    assert body["kpis"]["eggs_period"] == 40
    assert body["kpis"]["deaths_period"] == 3
    assert body["kpis"]["feed_qty"] == 2.5
    assert body["kpis"]["feed_unit"] == "quintal"
    days = date.today().day
    expected_hen_day = round(100.0 * 40 / (97 * days), 2)
    assert body["kpis"]["hen_day_pct"] == expected_hen_day

    shed_row = body["sheds"][0]
    assert shed_row["bird_count"] == 97
    assert shed_row["eggs_today"] == 40
    assert shed_row["last_log_date"] == today

    today_point = next(p for p in body["series"] if p["label"] == today)
    assert today_point["eggs"] == 40
    assert today_point["birds"] == 97

    assert len(body["compare_sheds"]) == 1
    assert body["compare_sheds"][0]["eggs_period"] == 40
    assert body["compare_sheds"][0]["deaths_period"] == 3
    assert body["compare_sheds"][0]["hen_day_pct"] == expected_hen_day
    farm_ids = {row["id"] for row in body["compare_farms"]}
    assert farm_id in farm_ids
    assert "farm-1" in farm_ids


def test_manager_compare_farms_only_assigned(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    response = client.get(
        "/api/dashboard",
        params=dashboard_params("farm-1"),
    )
    assert response.status_code == 200
    farm_ids = {row["id"] for row in response.json()["compare_farms"]}
    assert farm_ids == {"farm-1"}


def test_invalid_period_rejected(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    response = client.get(
        "/api/dashboard",
        params={"farm_id": "farm-1", "from": "2026-10-10", "to": "2026-10-01"},
    )
    assert response.status_code == 400

    only_from = client.get(
        "/api/dashboard",
        params={"farm_id": "farm-1", "from": "2026-10-01"},
    )
    assert only_from.status_code == 400
