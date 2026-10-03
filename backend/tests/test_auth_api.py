from fastapi.testclient import TestClient


def test_login_me_logout_roundtrip(client: TestClient):
    r = client.post(
        "/api/auth/login",
        json={"email": "owner@demo.local", "password": "owner-pass"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "owner"
    assert body["email"] == "owner@demo.local"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["id"] == body["id"]

    out = client.post("/api/auth/logout")
    assert out.status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_farms_requires_auth(client: TestClient):
    assert client.get("/api/farms").status_code == 401
