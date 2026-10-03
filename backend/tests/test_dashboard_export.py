from datetime import date

from export_pdf import render_dashboard_pdf
from fastapi.testclient import TestClient

from helpers import dashboard_params


def _sample_payload() -> dict:
    return {
        "farm": {"id": "f1", "name": "Alpha Farm", "location": "Nashik"},
        "from": "2026-10-01",
        "to": "2026-10-15",
        "kpis": {
            "birds": 100,
            "eggs_period": 40,
            "deaths_period": 1,
            "hen_day_pct": 12.5,
            "feed_qty": 2.0,
            "feed_unit": "quintal",
        },
        "alerts": [],
        "money": None,
        "series": [
            {"label": "2026-10-01", "eggs": 10, "birds": 100},
            {"label": "2026-10-02", "eggs": 30, "birds": 100},
        ],
        "compare_sheds": [
            {
                "id": "s1",
                "number": 1,
                "name": "Shed A",
                "birds": 60,
                "eggs_period": 25,
                "deaths_period": 0,
                "hen_day_pct": 10.0,
            },
            {
                "id": "s2",
                "number": 2,
                "name": "Shed B",
                "birds": 40,
                "eggs_period": 15,
                "deaths_period": 1,
                "hen_day_pct": 8.0,
            },
        ],
        "compare_farms": [
            {
                "id": "f1",
                "name": "Alpha Farm",
                "birds": 100,
                "eggs_period": 40,
                "deaths_period": 1,
                "hen_day_pct": 12.5,
            }
        ],
    }


def test_render_dashboard_pdf_bytes_and_farm_name():
    pdf = render_dashboard_pdf(_sample_payload())
    assert isinstance(pdf, (bytes, bytearray))
    assert pdf[:4] == b"%PDF"
    assert b"Alpha Farm" in pdf


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200


def test_owner_export_pdf(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "PDF Farm", "location": ""},
    ).json()
    res = client.get(
        "/api/dashboard/export.pdf",
        params=dashboard_params(farm["id"]),
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("application/pdf")
    assert res.content[:4] == b"%PDF"
    assert b"PDF Farm" in res.content
    assert "attachment" in res.headers.get("content-disposition", "")


def test_manager_cannot_export_pdf(client: TestClient) -> None:
    _login(client, "manager@demo.local", "manager-pass")
    res = client.get(
        "/api/dashboard/export.pdf",
        params=dashboard_params("farm-1"),
    )
    assert res.status_code == 403


def test_export_unknown_farm_404(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    res = client.get(
        "/api/dashboard/export.pdf",
        params=dashboard_params("missing-farm"),
    )
    assert res.status_code == 404


def test_export_with_money_null_ok(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "No Rates Farm", "location": ""},
    ).json()
    dash = client.get(
        "/api/dashboard",
        params=dashboard_params(farm["id"]),
    ).json()
    assert dash["money"] is None
    res = client.get(
        "/api/dashboard/export.pdf",
        params=dashboard_params(farm["id"]),
    )
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"


def test_render_escapes_markup_in_user_strings():
    payload = _sample_payload()
    payload["farm"] = {"id": "f1", "name": "Farm <b> & Co", "location": "A<i>B"}
    payload["alerts"] = [{"message": "Low <feed> & water"}]
    pdf = render_dashboard_pdf(payload)
    assert pdf[:4] == b"%PDF"


def test_owner_export_content_disposition_slug(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "PDF Farm", "location": ""},
    ).json()
    today = date.today()
    start = date(today.year, today.month, 1)
    res = client.get(
        "/api/dashboard/export.pdf",
        params=dashboard_params(farm["id"]),
    )
    assert res.status_code == 200
    expected = f'filename="farm-pdf-farm-{start.isoformat()}_{today.isoformat()}.pdf"'
    assert expected in res.headers["content-disposition"]


def test_owner_export_non_ascii_farm_name(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "फार्म", "location": ""},
    ).json()
    today = date.today()
    start = date(today.year, today.month, 1)
    res = client.get(
        "/api/dashboard/export.pdf",
        params=dashboard_params(farm["id"]),
    )
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"
    expected = f'filename="farm-farm-{start.isoformat()}_{today.isoformat()}.pdf"'
    assert expected in res.headers["content-disposition"]


def test_owner_export_markup_farm_name(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    farm = client.post(
        "/api/farms",
        json={"name": "Farm <b>", "location": "<i>x"},
    ).json()
    res = client.get(
        "/api/dashboard/export.pdf",
        params=dashboard_params(farm["id"]),
    )
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"
