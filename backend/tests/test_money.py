from datetime import date

from fastapi.testclient import TestClient

from helpers import start_flock


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def test_rates_unset_and_owner_put(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "Money Farm", "location": ""},
    ).json()
    farm_id = farm["id"]

    missing = client.get(f"/api/farms/{farm_id}/rates")
    assert missing.status_code == 404

    dash = client.get(
        "/api/dashboard",
        params={"farm_id": farm_id},
    ).json()
    assert dash["money"] is None

    saved = client.put(
        f"/api/farms/{farm_id}/rates",
        json={"egg_price": 5.0, "feed_cost_per_kg": 2.0},
    )
    assert saved.status_code == 200
    assert saved.json() == {
        "farm_id": farm_id,
        "egg_price": 5.0,
        "feed_cost_per_kg": 2.0,
    }

    fetched = client.get(f"/api/farms/{farm_id}/rates")
    assert fetched.status_code == 200
    assert fetched.json()["egg_price"] == 5.0


def test_manager_cannot_put_rates(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "Mgr Rates Farm", "location": ""},
    ).json()
    farm_id = farm["id"]
    client.put(
        f"/api/farms/{farm_id}/rates",
        json={"egg_price": 4.0, "feed_cost_per_kg": 1.5},
    )

    client.post("/api/auth/logout")
    _login(client, "manager@demo.local", "manager-pass")
    denied = client.put(
        f"/api/farms/{farm_id}/rates",
        json={"egg_price": 9.0, "feed_cost_per_kg": 9.0},
    )
    assert denied.status_code in (403, 404)


def test_dashboard_margin_math(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "Margin Farm", "location": ""},
    ).json()
    farm_id = farm["id"]
    shed = client.post(
        f"/api/farms/{farm_id}/sheds",
        json={"name": "Margin Shed"},
    ).json()
    shed_id = shed["id"]

    start_flock(client, shed_id, 100)
    client.put(
        f"/api/farms/{farm_id}/rates",
        json={"egg_price": 5.0, "feed_cost_per_kg": 2.0},
    )

    today = date.today().isoformat()
    client.put(
        f"/api/sheds/{shed_id}/daily-logs/{today}",
        json={"eggs_collected": 100, "deaths": 0},
    )
    client.post(
        f"/api/farms/{farm_id}/godown/movements",
        json={"direction": "in", "qty_quintal": 2, "date": today},
    )
    client.post(
        f"/api/farms/{farm_id}/godown/movements",
        json={"direction": "out", "qty_quintal": 1, "date": today},
    )

    body = client.get(
        "/api/dashboard",
        params={"farm_id": farm_id},
    ).json()
    money = body["money"]
    assert money is not None
    # 1 quintal out = 100 kg
    assert money["eggs_period"] == 100
    assert money["feed_out_kg"] == 100.0
    assert money["revenue"] == 500.0
    assert money["feed_cost"] == 200.0
    assert money["margin"] == 300.0
