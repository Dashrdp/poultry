from fastapi.testclient import TestClient


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def test_owner_creates_updates_lists_and_deletes_manager(
    client: TestClient,
) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    created = client.post(
        "/api/managers",
        json={
            "email": " NewMgr@Demo.Local ",
            "password": "temp-pass",
            "farm_ids": ["farm-2"],
        },
    )
    assert created.status_code == 200
    body = created.json()
    assert body["email"] == "newmgr@demo.local"
    assert body["farm_ids"] == ["farm-2"]
    assert body["role"] == "farm_manager"

    listed = client.get("/api/managers")
    assert listed.status_code == 200
    assert any(manager["id"] == body["id"] for manager in listed.json())

    patched = client.patch(
        f"/api/managers/{body['id']}",
        json={"password": "new-pass", "farm_ids": ["farm-1", "farm-2"]},
    )
    assert patched.status_code == 200
    assert set(patched.json()["farm_ids"]) == {"farm-1", "farm-2"}

    deleted = client.delete(f"/api/managers/{body['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"ok": True}


def test_manager_cannot_access_managers_api(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    assert client.get("/api/managers").status_code == 403
    assert (
        client.post(
            "/api/managers",
            json={
                "email": "forbidden@demo.local",
                "password": "pass",
                "farm_ids": [],
            },
        ).status_code
        == 403
    )


def test_create_rejects_duplicate_email_and_unknown_farm(
    client: TestClient,
) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    duplicate = client.post(
        "/api/managers",
        json={
            "email": " OWNER@DEMO.LOCAL ",
            "password": "pass",
            "farm_ids": [],
        },
    )
    assert duplicate.status_code == 409

    missing_farm = client.post(
        "/api/managers",
        json={
            "email": "invalid-farm@demo.local",
            "password": "pass",
            "farm_ids": ["missing"],
        },
    )
    assert missing_farm.status_code == 404


def test_owner_cannot_patch_or_delete_owner_as_manager(
    client: TestClient,
) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    owner = client.get("/api/auth/me").json()
    assert (
        client.patch(
            f"/api/managers/{owner['id']}",
            json={"farm_ids": []},
        ).status_code
        == 404
    )
    assert client.delete(f"/api/managers/{owner['id']}").status_code == 404
