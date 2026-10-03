from datetime import date, timedelta

from fastapi.testclient import TestClient

from seed import DEMO_BREED_ID


def start_flock(client: TestClient, shed_id: str, birds: int) -> None:
    """Place a flock with `birds`, or reset the active flock's live count."""
    placed = client.post(
        f"/api/sheds/{shed_id}/flocks",
        json={
            "breed_id": DEMO_BREED_ID,
            "hatch_date": "2025-09-01",
            "placed_date": "2026-01-01",
            "birds_placed": birds,
        },
    )
    if placed.status_code == 409:
        reset = client.put(
            f"/api/sheds/{shed_id}/live-count",
            json={"live_bird_count": birds, "reason": "test reset"},
        )
        assert reset.status_code == 200, reset.text
        return
    assert placed.status_code == 200, placed.text


def dashboard_params(farm_id: str, **extra: str) -> dict[str, str]:
    """Default this-month window for Monitor (end-cap today)."""
    today = date.today()
    params = {
        "farm_id": farm_id,
        "from": date(today.year, today.month, 1).isoformat(),
        "to": today.isoformat(),
    }
    params.update(extra)
    return params


def analytics_window(days: int = 7) -> dict[str, str]:
    """Rolling window ending yesterday (analytics end-cap)."""
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days - 1)
    return {"from": start.isoformat(), "to": end.isoformat()}
