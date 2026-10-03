from datetime import date, timedelta

from fastapi.testclient import TestClient

import db
from flocks import age_week, lifecycle_stage
from models import Breed, Customer, Flock
from seed import DEMO_BREED_ID


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def _new_shed(client: TestClient, capacity: int | None = None) -> str:
    body: dict[str, object] = {"name": "Flock Test Shed"}
    if capacity is not None:
        body["capacity"] = capacity
    response = client.post("/api/farms/farm-1/sheds", json=body)
    assert response.status_code == 200
    return response.json()["id"]


def _flock_body(**overrides: object) -> dict[str, object]:
    today = date.today()
    body: dict[str, object] = {
        "breed_id": DEMO_BREED_ID,
        "hatch_date": (today - timedelta(weeks=30)).isoformat(),
        "placed_date": (today - timedelta(weeks=13)).isoformat(),
        "birds_placed": 500,
        "source": "  Hatchery A  ",
        "chick_cost": 32.5,
    }
    body.update(overrides)
    return body


def test_age_week_and_stage_are_derived_from_hatch_date() -> None:
    hatch = date(2026, 1, 1)
    flock = Flock(hatch_date=hatch, depleted_on=None)
    assert age_week(hatch, hatch + timedelta(days=6)) == 0
    assert age_week(hatch, hatch + timedelta(days=7)) == 1
    assert lifecycle_stage(flock, hatch + timedelta(weeks=5)) == "brooding"
    assert lifecycle_stage(flock, hatch + timedelta(weeks=6)) == "growing"
    assert lifecycle_stage(flock, hatch + timedelta(weeks=16)) == "pre_lay"
    assert lifecycle_stage(flock, hatch + timedelta(weeks=18)) == "laying"
    flock.depleted_on = hatch + timedelta(weeks=80)
    assert lifecycle_stage(flock, hatch + timedelta(weeks=80)) == "depleted"


def test_system_breed_has_weekly_standards(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    breeds = client.get("/api/breeds").json()
    system = next(item for item in breeds if item["id"] == DEMO_BREED_ID)
    assert system == {"id": DEMO_BREED_ID, "name": "Hy-Line W-80", "is_system": True}

    standards = client.get(f"/api/breeds/{DEMO_BREED_ID}/standards").json()
    assert [row["age_week"] for row in standards] == list(range(1, 91))
    week_60 = next(row for row in standards if row["age_week"] == 60)
    assert 250 <= week_60["hhe_cum"] <= 262
    assert standards[0]["hdep_pct"] is None


def test_place_flock_sets_live_birds_and_shows_on_shed(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    shed_id = _new_shed_as_owner(client)

    placed = client.post(f"/api/sheds/{shed_id}/flocks", json=_flock_body())
    assert placed.status_code == 200
    flock = placed.json()
    assert flock["live_birds"] == 500
    assert flock["age_week"] == 30
    assert flock["stage"] == "laying"
    assert flock["breed_name"] == "Hy-Line W-80"
    assert flock["source"] == "Hatchery A"

    sheds = client.get("/api/farms/farm-1/sheds").json()
    shed = next(item for item in sheds if item["id"] == shed_id)
    assert shed["live_bird_count"] == 500
    assert shed["flock"]["id"] == flock["id"]

    again = client.post(f"/api/sheds/{shed_id}/flocks", json=_flock_body())
    assert again.status_code == 409

    history = client.get(f"/api/sheds/{shed_id}/flocks").json()
    assert [item["id"] for item in history] == [flock["id"]]


def _new_shed_as_owner(client: TestClient, capacity: int | None = None) -> str:
    _login(client, "owner@demo.local", "owner-pass")
    shed_id = _new_shed(client, capacity)
    _login(client, "manager@demo.local", "manager-pass")
    return shed_id


def test_place_flock_validation(client: TestClient) -> None:
    shed_id = _new_shed_as_owner(client, capacity=100)
    today = date.today()
    cases = [
        (_flock_body(birds_placed=101), 400, "Birds placed exceed shed capacity"),
        (
            _flock_body(birds_placed=50, placed_date=(today + timedelta(days=1)).isoformat()),
            400,
            "Placed date cannot be in the future",
        ),
        (
            _flock_body(
                birds_placed=50,
                hatch_date=today.isoformat(),
                placed_date=(today - timedelta(days=1)).isoformat(),
            ),
            400,
            "Hatch date must be on or before placed date",
        ),
        (_flock_body(birds_placed=50, breed_id="missing"), 404, "Breed not found"),
    ]
    for body, status, detail in cases:
        response = client.post(f"/api/sheds/{shed_id}/flocks", json=body)
        assert response.status_code == status
        assert response.json()["detail"] == detail
    assert client.post(
        f"/api/sheds/{shed_id}/flocks", json=_flock_body(birds_placed=0)
    ).status_code == 422


def test_log_before_placement_rejected(client: TestClient) -> None:
    shed_id = _new_shed_as_owner(client)
    client.post(f"/api/sheds/{shed_id}/flocks", json=_flock_body())
    early = (date.today() - timedelta(weeks=20)).isoformat()
    response = client.put(
        f"/api/sheds/{shed_id}/daily-logs/{early}",
        json={"eggs_collected": 1, "deaths": 0},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Date is before flock placement"


def test_manager_cannot_place_flock_on_unassigned_farm(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    response = client.post("/api/sheds/shed-4/flocks", json=_flock_body())
    assert response.status_code == 403


def test_delete_shed_removes_flock_and_logs(client: TestClient) -> None:
    shed_id = _new_shed_as_owner(client)
    client.post(f"/api/sheds/{shed_id}/flocks", json=_flock_body())
    today = date.today().isoformat()
    assert client.put(
        f"/api/sheds/{shed_id}/daily-logs/{today}",
        json={"eggs_collected": 400, "deaths": 2},
    ).status_code == 200
    assert client.put(
        f"/api/sheds/{shed_id}/live-count",
        json={"live_bird_count": 490, "reason": "recount"},
    ).status_code == 200

    _login(client, "owner@demo.local", "owner-pass")
    assert client.delete(f"/api/sheds/{shed_id}").status_code == 200
    with db.SessionLocal() as session:
        assert session.query(Flock).filter_by(shed_id=shed_id).count() == 0


def test_owner_uploads_custom_breed_csv(client: TestClient) -> None:
    csv_text = "# custom\nage_week,hdep_pct,feed_g\n18,10,80\n19,40,\n"
    _login(client, "manager@demo.local", "manager-pass")
    forbidden = client.post(
        "/api/breeds",
        data={"name": "Local"},
        files={"file": ("b.csv", csv_text, "text/csv")},
    )
    assert forbidden.status_code == 403

    _login(client, "owner@demo.local", "owner-pass")
    created = client.post(
        "/api/breeds",
        data={"name": "BV300 (farm)"},
        files={"file": ("b.csv", csv_text, "text/csv")},
    )
    assert created.status_code == 200
    breed = created.json()
    assert breed["is_system"] is False
    rows = client.get(f"/api/breeds/{breed['id']}/standards").json()
    assert rows[1] == {
        "age_week": 19,
        "hdep_pct": 40.0,
        "hhe_cum": None,
        "mort_cum_pct": None,
        "feed_g": None,
        "egg_wt_g": None,
        "body_wt_g": None,
    }

    bad = client.post(
        "/api/breeds",
        data={"name": "Bad"},
        files={"file": ("b.csv", "age_week,hdep_pct\n18,x\n", "text/csv")},
    )
    assert bad.status_code == 400
    assert bad.json()["detail"] == "Row 2: hdep_pct must be a number"


def test_other_customer_breed_is_hidden(client: TestClient) -> None:
    with db.SessionLocal() as session:
        session.add(Customer(id="breed-other-customer", name="Other"))
        session.flush()
        session.add(
            Breed(id="breed-other", customer_id="breed-other-customer", name="Secret")
        )
        session.commit()

    _login(client, "owner@demo.local", "owner-pass")
    ids = {item["id"] for item in client.get("/api/breeds").json()}
    assert "breed-other" not in ids
    assert client.get("/api/breeds/breed-other/standards").status_code == 404
