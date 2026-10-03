from datetime import date, timedelta

from fastapi.testclient import TestClient

from helpers import start_flock


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def _codes(body: dict) -> set[str]:
    return {alert["code"] for alert in body["alerts"]}


def test_missing_log_and_low_feed_alerts(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "Alert Farm", "location": ""},
    ).json()
    farm_id = farm["id"]
    shed = client.post(
        f"/api/farms/{farm_id}/sheds",
        json={"name": "Alert Shed"},
    ).json()
    shed_id = shed["id"]

    start_flock(client, shed_id, 50)

    body = client.get(
        "/api/dashboard",
        params={"farm_id": farm_id},
    ).json()
    assert "missing_log" in _codes(body)
    assert "low_feed" in _codes(body)
    missing = next(a for a in body["alerts"] if a["code"] == "missing_log")
    assert missing["shed_id"] == shed_id

    today = date.today().isoformat()
    client.put(
        f"/api/sheds/{shed_id}/daily-logs/{today}",
        json={"eggs_collected": 10, "deaths": 0},
    )
    client.post(
        f"/api/farms/{farm_id}/godown/movements",
        json={"direction": "in", "qty_quintal": 2, "date": today},
    )

    cleared = client.get(
        "/api/dashboard",
        params={"farm_id": farm_id},
    ).json()
    assert "missing_log" not in _codes(cleared)
    assert "low_feed" not in _codes(cleared)


def test_egg_drop_alert(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "Drop Farm", "location": ""},
    ).json()
    farm_id = farm["id"]
    shed = client.post(
        f"/api/farms/{farm_id}/sheds",
        json={"name": "Drop Shed"},
    ).json()
    shed_id = shed["id"]
    start_flock(client, shed_id, 100)
    client.post(
        f"/api/farms/{farm_id}/godown/movements",
        json={
            "direction": "in",
            "qty_quintal": 5,
            "date": date.today().isoformat(),
        },
    )

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    today = date.today().isoformat()
    client.put(
        f"/api/sheds/{shed_id}/daily-logs/{yesterday}",
        json={"eggs_collected": 100, "deaths": 0},
    )
    client.put(
        f"/api/sheds/{shed_id}/daily-logs/{today}",
        json={"eggs_collected": 50, "deaths": 0},
    )

    body = client.get(
        "/api/dashboard",
        params={"farm_id": farm_id},
    ).json()
    assert "egg_drop" in _codes(body)
    drop = next(a for a in body["alerts"] if a["code"] == "egg_drop")
    assert "50.0%" in drop["message"]
    assert "50 today" in drop["message"]
    assert "100 yesterday" in drop["message"]


def test_blank_shed_with_zero_birds_skips_missing_log(
    client: TestClient,
) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "Empty Alert", "location": ""},
    ).json()
    farm_id = farm["id"]
    client.post(f"/api/farms/{farm_id}/sheds", json={"name": "Empty"})
    body = client.get(
        "/api/dashboard",
        params={"farm_id": farm_id},
    ).json()
    assert "missing_log" not in _codes(body)
    assert "low_feed" in _codes(body)
