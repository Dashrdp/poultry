from fastapi.testclient import TestClient

import db
from models import Customer, Farm


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def test_in_then_out_updates_stock(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    empty = client.get("/api/farms/farm-1/godown")
    assert empty.status_code == 200
    starting = empty.json()["stock_quintal"]

    added = client.post(
        "/api/farms/farm-1/godown/movements",
        json={
            "direction": "in",
            "qty_quintal": 2,
            "date": "2026-10-02",
            "note": "delivery",
        },
    )
    assert added.status_code == 200
    assert added.json()["stock_quintal"] == starting + 2
    assert added.json()["stock_kg"] == (starting + 2) * 100
    assert added.json()["movements"][0]["direction"] == "in"
    assert added.json()["movements"][0]["qty_quintal"] == 2

    removed = client.post(
        "/api/farms/farm-1/godown/movements",
        json={
            "direction": "out",
            "qty_quintal": 0.5,
            "date": "2026-10-02",
        },
    )
    assert removed.status_code == 200
    assert removed.json()["stock_quintal"] == starting + 1.5
    assert removed.json()["movements"][0]["direction"] == "out"


def test_out_above_stock_rejected(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    before = client.get("/api/farms/farm-1/godown").json()["stock_quintal"]
    rejected = client.post(
        "/api/farms/farm-1/godown/movements",
        json={
            "direction": "out",
            "qty_quintal": before + 10,
            "date": "2026-10-02",
        },
    )
    assert rejected.status_code == 400
    assert rejected.json()["detail"] == "Feed out exceeds stock"
    after = client.get("/api/farms/farm-1/godown").json()["stock_quintal"]
    assert after == before


def test_manager_cannot_touch_unassigned_farm(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    assert client.get("/api/farms/farm-2/godown").status_code == 403
    assert (
        client.post(
            "/api/farms/farm-2/godown/movements",
            json={
                "direction": "in",
                "qty_quintal": 1,
                "date": "2026-10-02",
            },
        ).status_code
        == 403
    )


def test_other_tenant_godown_not_found(client: TestClient) -> None:
    with db.SessionLocal() as session:
        session.add(Customer(id="godown-other-customer", name="Other"))
        session.add(
            Farm(
                id="godown-other-farm",
                customer_id="godown-other-customer",
                name="Other Farm",
                location=None,
            )
        )
        session.commit()

    _login(client, "owner@demo.local", "owner-pass")
    assert client.get("/api/farms/godown-other-farm/godown").status_code == 404
    assert (
        client.post(
            "/api/farms/godown-other-farm/godown/movements",
            json={
                "direction": "in",
                "qty_quintal": 1,
                "date": "2026-10-02",
            },
        ).status_code
        == 404
    )


def test_godown_requires_auth(client: TestClient) -> None:
    assert client.get("/api/farms/farm-1/godown").status_code == 401
    assert (
        client.post(
            "/api/farms/farm-1/godown/movements",
            json={
                "direction": "in",
                "qty_quintal": 1,
                "date": "2026-10-02",
            },
        ).status_code
        == 401
    )
