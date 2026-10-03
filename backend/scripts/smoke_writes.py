"""Live API write-path smoke against http://127.0.0.1:8010.

Creates temporary farm/shed/manager, exercises mutations + role denials,
then cleans up. Safe to re-run; uses unique emails/names each run.

Usage (from backend, with venv):
  python scripts/smoke_writes.py
"""

from __future__ import annotations

import sys
import time
import uuid

import httpx

BASE = "http://127.0.0.1:8010"
OWNER = ("owner@demo.local", "owner-pass")
MANAGER = ("manager@demo.local", "manager-pass")


class Fail(Exception):
    pass


def expect(resp: httpx.Response, code: int, label: str) -> dict | list | None:
    if resp.status_code != code:
        raise Fail(f"{label}: expected {code}, got {resp.status_code}: {resp.text}")
    if resp.status_code == 204 or not resp.content:
        return None
    try:
        return resp.json()
    except Exception:
        return None


def main() -> int:
    stamp = uuid.uuid4().hex[:8]
    farm_id = None
    shed_id = None
    mgr_id = None
    steps_ok = 0

    print(f"Smoke writes start ({stamp})")
    with httpx.Client(base_url=BASE, timeout=15.0) as client:
        health = client.get("/health")
        expect(health, 200, "GET /health")
        steps_ok += 1
        print("  OK health")

        # --- Owner writes ---
        r = client.post("/api/auth/login", json={"email": OWNER[0], "password": OWNER[1]})
        expect(r, 200, "owner login")
        steps_ok += 1
        print("  OK owner login")

        r = client.post(
            "/api/farms",
            json={"name": f"Smoke Farm {stamp}", "location": "Test"},
        )
        farm = expect(r, 200, "POST /api/farms")
        assert isinstance(farm, dict)
        farm_id = farm["id"]
        steps_ok += 1
        print(f"  OK create farm {farm_id}")

        r = client.patch(
            f"/api/farms/{farm_id}",
            json={"name": f"Smoke Farm Renamed {stamp}", "location": "Test"},
        )
        expect(r, 200, "PATCH /api/farms")
        steps_ok += 1
        print("  OK patch farm")

        r = client.post(
            f"/api/farms/{farm_id}/sheds",
            json={"name": "Smoke Shed"},
        )
        shed = expect(r, 200, "POST sheds")
        assert isinstance(shed, dict)
        shed_id = shed["id"]
        assert shed["number"] == 1
        steps_ok += 1
        print(f"  OK create shed {shed_id}")

        r = client.patch(
            f"/api/sheds/{shed_id}",
            json={"name": "Smoke Shed B", "capacity": 100},
        )
        expect(r, 200, "PATCH shed")
        steps_ok += 1
        print("  OK patch shed")

        r = client.post(
            f"/api/farms/{farm_id}/sheds",
            json={"name": "Dup", "number": 1},
        )
        expect(r, 409, "duplicate shed number")
        steps_ok += 1
        print("  OK 409 duplicate shed number")

        mgr_email = f"smoke-mgr-{stamp}@demo.local"
        r = client.post(
            "/api/managers",
            json={
                "email": mgr_email,
                "password": "smoke-pass",
                "farm_ids": [farm_id],
            },
        )
        mgr = expect(r, 200, "POST /api/managers")
        assert isinstance(mgr, dict)
        mgr_id = mgr["id"]
        assert mgr["farm_ids"] == [farm_id]
        steps_ok += 1
        print(f"  OK create manager {mgr_id}")

        r = client.patch(
            f"/api/managers/{mgr_id}",
            json={"farm_ids": [farm_id, "farm-1"]},
        )
        patched = expect(r, 200, "PATCH manager farms")
        assert isinstance(patched, dict)
        assert set(patched["farm_ids"]) == {farm_id, "farm-1"}
        steps_ok += 1
        print("  OK patch manager assignments")

        r = client.get(
            "/api/dashboard",
            params={"farm_id": farm_id, "range": "current_month"},
        )
        dash = expect(r, 200, "owner dashboard new farm")
        assert isinstance(dash, dict)
        assert dash["farm"]["id"] == farm_id
        assert dash["kpis"]["eggs_period"] == 0
        steps_ok += 1
        print("  OK hybrid dashboard zeros")

        client.post("/api/auth/logout")

        # --- New manager role checks ---
        r = client.post(
            "/api/auth/login",
            json={"email": mgr_email, "password": "smoke-pass"},
        )
        expect(r, 200, "smoke manager login")
        steps_ok += 1
        print("  OK smoke manager login")

        r = client.get("/api/farms")
        farms = expect(r, 200, "manager list farms")
        assert isinstance(farms, list)
        ids = {f["id"] for f in farms}
        assert farm_id in ids and "farm-1" in ids
        assert "farm-2" not in ids
        steps_ok += 1
        print("  OK manager farm list scoped")

        r = client.post("/api/farms", json={"name": "Nope"})
        expect(r, 403, "manager create farm denied")
        steps_ok += 1
        print("  OK manager 403 create farm")

        r = client.get(f"/api/farms/{farm_id}/sheds")
        expect(r, 200, "manager read assigned sheds")
        steps_ok += 1
        print("  OK manager read sheds")

        r = client.get("/api/farms/farm-2/sheds")
        if r.status_code not in (403, 404):
            raise Fail(f"unassigned sheds: expected 403/404, got {r.status_code}")
        steps_ok += 1
        print(f"  OK manager denied farm-2 sheds ({r.status_code})")

        r = client.get("/api/managers")
        expect(r, 403, "manager GET managers denied")
        steps_ok += 1
        print("  OK manager 403 managers API")

        client.post("/api/auth/logout")

        # --- Seeded manager still only farm-1 by default ---
        r = client.post(
            "/api/auth/login",
            json={"email": MANAGER[0], "password": MANAGER[1]},
        )
        expect(r, 200, "seed manager login")
        r = client.get("/api/farms")
        farms = expect(r, 200, "seed manager farms")
        assert isinstance(farms, list)
        assert {f["id"] for f in farms} == {"farm-1"}
        steps_ok += 1
        print("  OK seed manager only farm-1")
        client.post("/api/auth/logout")

        # --- Cleanup as owner ---
        r = client.post(
            "/api/auth/login",
            json={"email": OWNER[0], "password": OWNER[1]},
        )
        expect(r, 200, "owner re-login")

        if mgr_id:
            r = client.delete(f"/api/managers/{mgr_id}")
            expect(r, 200, "DELETE manager")
            steps_ok += 1
            print("  OK delete manager")

        if shed_id:
            r = client.delete(f"/api/sheds/{shed_id}")
            expect(r, 200, "DELETE shed")
            steps_ok += 1
            print("  OK delete shed")

        if farm_id:
            r = client.delete(f"/api/farms/{farm_id}")
            expect(r, 200, "DELETE farm")
            steps_ok += 1
            print("  OK delete farm")

            r = client.get(f"/api/farms/{farm_id}/sheds")
            expect(r, 404, "farm gone")
            steps_ok += 1
            print("  OK farm 404 after delete")

        client.post("/api/auth/logout")

    print(f"PASS {steps_ok} checks in {time.strftime('%H:%M:%S')}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Fail as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
    except httpx.ConnectError:
        print(
            "FAIL: cannot connect to http://127.0.0.1:8010 — start uvicorn first",
            file=sys.stderr,
        )
        raise SystemExit(1)
