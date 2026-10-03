from fastapi.testclient import TestClient


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def test_owner_can_create_list_patch_delete_farm_and_shed(
    client: TestClient,
) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    created = client.post(
        "/api/farms",
        json={"name": "New Farm", "location": "Satara"},
    )
    assert created.status_code == 200
    farm_id = created.json()["id"]
    assert created.json()["name"] == "New Farm"

    listed = client.get("/api/farms")
    assert any(farm["id"] == farm_id for farm in listed.json())

    patched = client.patch(
        f"/api/farms/{farm_id}",
        json={"name": "Renamed", "location": None},
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Renamed"
    assert patched.json()["location"] == ""

    first_shed = client.post(
        f"/api/farms/{farm_id}/sheds",
        json={"name": "Shed 1", "capacity": 1000},
    )
    assert first_shed.status_code == 200
    assert first_shed.json()["number"] == 1
    assert first_shed.json()["live_bird_count"] == 0
    shed_id = first_shed.json()["id"]

    second_shed = client.post(
        f"/api/farms/{farm_id}/sheds",
        json={"name": "Shed 2"},
    )
    assert second_shed.status_code == 200
    assert second_shed.json()["number"] == 2

    patched_shed = client.patch(
        f"/api/sheds/{shed_id}",
        json={"name": "Brooder", "capacity": 1200},
    )
    assert patched_shed.status_code == 200
    assert patched_shed.json()["name"] == "Brooder"
    assert patched_shed.json()["capacity"] == 1200

    deleted_shed = client.delete(f"/api/sheds/{shed_id}")
    assert deleted_shed.status_code == 200

    deleted = client.delete(f"/api/farms/{farm_id}")
    assert deleted.status_code == 200
    assert client.get(f"/api/farms/{farm_id}/sheds").status_code == 404


def test_manager_lists_only_assigned_and_cannot_mutate(
    client: TestClient,
) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    farms = client.get("/api/farms")
    assert farms.status_code == 200
    assert {farm["id"] for farm in farms.json()} == {"farm-1"}

    assert client.post("/api/farms", json={"name": "Nope"}).status_code == 403
    assert (
        client.patch("/api/farms/farm-1", json={"name": "Nope"}).status_code
        == 403
    )
    assert client.delete("/api/farms/farm-1").status_code == 403
    assert client.get("/api/farms/farm-2/sheds").status_code == 403

    sheds = client.get("/api/farms/farm-1/sheds")
    assert sheds.status_code == 200
    assert len(sheds.json()) >= 1
    shed_id = sheds.json()[0]["id"]

    assert (
        client.post(
            "/api/farms/farm-1/sheds",
            json={"name": "Nope"},
        ).status_code
        == 403
    )
    assert (
        client.patch(f"/api/sheds/{shed_id}", json={"name": "Nope"}).status_code
        == 403
    )
    assert client.delete(f"/api/sheds/{shed_id}").status_code == 403


def test_duplicate_shed_number_returns_conflict(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    response = client.post(
        "/api/farms/farm-1/sheds",
        json={"name": "Duplicate", "number": 1},
    )
    assert response.status_code == 409


def test_missing_farm_and_shed_return_not_found(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    assert client.get("/api/farms/missing/sheds").status_code == 404
    assert (
        client.post("/api/farms/missing/sheds", json={"name": "Nope"}).status_code
        == 404
    )
    assert (
        client.patch("/api/sheds/missing", json={"name": "Nope"}).status_code
        == 404
    )
    assert client.delete("/api/sheds/missing").status_code == 404
