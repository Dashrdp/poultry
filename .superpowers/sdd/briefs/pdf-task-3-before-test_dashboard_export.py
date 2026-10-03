from export_pdf import render_dashboard_pdf


def _sample_payload() -> dict:
    return {
        "farm": {"id": "f1", "name": "Alpha Farm", "location": "Nashik"},
        "range": "current_month",
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
