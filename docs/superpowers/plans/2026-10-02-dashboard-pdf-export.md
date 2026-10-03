# Dashboard PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Owners download a server-generated PDF snapshot of the current farm dashboard (KPIs, alerts, money, egg timeseries, eggs-by-shed pie, compare tables).

**Architecture:** Extract a shared `_build_dashboard_payload(db, user, farm, range)` used by JSON and PDF routes. New `export_pdf.py` renders ReportLab PDF with matplotlib `Agg` chart PNGs. `GET /api/dashboard/export.pdf` is Owner-only. Frontend blob-downloads from Owner dashboard.

**Tech Stack:** FastAPI, SQLAlchemy, ReportLab, matplotlib, pytest, Vite React TS, Kumo UI

**Spec:** [docs/superpowers/specs/2026-10-02-dashboard-pdf-export-design.md](../specs/2026-10-02-dashboard-pdf-export-design.md)

## Global Constraints

- Owner only for export (`require_owner`); Manager → 403
- Reuse dashboard aggregates; PDF must not recompute business totals from raw queries
- Ranges: `current_month` | `previous_month` | `year` only
- Charts: egg timeseries + eggs-by-shed pie only (no birds pie)
- Generated-at timestamp in header: UTC `YYYY-MM-DD HH:MM UTC`
- Tenant isolation unchanged
- Kumo UI on frontend; PDF styling plain black text / simple tables
- Backend port `8010`, frontend `5173`
- Prefer small vertical slice; no branded letterhead

---

## File structure

| File | Responsibility |
|------|----------------|
| `backend/dashboard_api.py` | Extract `_build_dashboard_payload`; add `GET /dashboard/export.pdf` |
| `backend/export_pdf.py` | `render_dashboard_pdf(payload: dict) -> bytes` |
| `backend/requirements.txt` | Add `reportlab`, `matplotlib` |
| `backend/tests/test_dashboard_export.py` | Auth + PDF magic + content smoke |
| `frontend/src/api.ts` | `downloadDashboardPdf(farmId, range)` |
| `frontend/src/components/OwnerDashboard.tsx` | Export PDF button + loading/error |
| `specs/012-dashboard-pdf-export.md` | Slice pointer |
| `TODO-LIST.md` / `MEMORY.md` / `docs/roadmap.md` | Track slice |

---

### Task 1: Shared dashboard payload builder

**Files:**
- Modify: `backend/dashboard_api.py`
- Test: `backend/tests/test_dashboard_hybrid.py` (existing; must still pass)

**Interfaces:**
- Produces: `_build_dashboard_payload(db: Session, user: User, farm: Farm, range: str) -> dict`
- Consumes: existing helpers in `dashboard_api.py` (`_range_bounds`, `_period_totals`, etc.)

- [ ] **Step 1: Refactor JSON route to call shared builder**

In `backend/dashboard_api.py`, move the body of `dashboard()` (from after farm lookup through the return dict) into:

```python
def _build_dashboard_payload(
    db: Session,
    user: User,
    farm: Farm,
    range: str,
) -> dict:
    # existing aggregation logic unchanged; return the same dict shape
    ...
```

Keep `dashboard()` as:

```python
@router.get("/dashboard")
def dashboard(
    farm_id: str = Query(...),
    range: str = Query("current_month"),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    if range not in VALID_RANGES:
        raise HTTPException(
            status_code=400,
            detail=f"range must be one of: {', '.join(sorted(VALID_RANGES))}",
        )
    farm = get_farm_for_user(db, user, farm_id)
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")
    return _build_dashboard_payload(db, user, farm, range)
```

- [ ] **Step 2: Verify existing dashboard tests still pass**

Run:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_hybrid.py tests/test_alerts.py tests/test_money.py -q
```

Expected: all passed

- [ ] **Step 3: Commit**

```bash
git add backend/dashboard_api.py
git commit -m "refactor: extract shared dashboard payload builder"
```

---

### Task 2: PDF renderer + dependencies

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/export_pdf.py`
- Test: `backend/tests/test_dashboard_export.py` (unit-style render first)

**Interfaces:**
- Produces: `render_dashboard_pdf(payload: dict) -> bytes`
- Consumes: dashboard payload keys: `farm`, `range`, `kpis`, `alerts`, `money`, `series`, `compare_sheds`, `compare_farms`

- [ ] **Step 1: Add dependencies**

Append to `backend/requirements.txt`:

```
reportlab
matplotlib
```

Install:

```powershell
cd backend
.\.venv\Scripts\pip.exe install reportlab matplotlib
```

- [ ] **Step 2: Write failing render test**

Create `backend/tests/test_dashboard_export.py`:

```python
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
```

- [ ] **Step 3: Run test — expect fail (import/module missing)**

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_export.py::test_render_dashboard_pdf_bytes_and_farm_name -v
```

Expected: FAIL (`ModuleNotFoundError: export_pdf` or similar)

- [ ] **Step 4: Implement `export_pdf.py`**

Create `backend/export_pdf.py`:

```python
from __future__ import annotations

import io
from datetime import datetime, timezone

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

RANGE_LABELS = {
    "current_month": "Current month",
    "previous_month": "Previous month",
    "year": "Year",
}


def _chart_timeseries(series: list[dict]) -> bytes | None:
    if not series:
        return None
    labels = [p["label"] for p in series]
    eggs = [int(p["eggs"]) for p in series]
    fig, ax = plt.subplots(figsize=(7.2, 2.4))
    ax.plot(range(len(eggs)), eggs, color="#1a1a1a", linewidth=1.5)
    step = max(1, len(labels) // 8)
    ax.set_xticks(range(0, len(labels), step))
    ax.set_xticklabels([labels[i] for i in range(0, len(labels), step)], rotation=30, ha="right")
    ax.set_ylabel("Eggs")
    ax.set_title("Egg production")
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _chart_eggs_pie(compare_sheds: list[dict]) -> bytes | None:
    labels = []
    sizes = []
    for row in compare_sheds:
        eggs = int(row.get("eggs_period") or 0)
        if eggs <= 0:
            continue
        labels.append(str(row.get("name") or row.get("id")))
        sizes.append(eggs)
    if not sizes:
        return None
    fig, ax = plt.subplots(figsize=(4.5, 3.2))
    ax.pie(sizes, labels=labels, autopct="%1.0f%%", startangle=90)
    ax.set_title("Eggs by shed")
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def render_dashboard_pdf(payload: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    story: list = []

    farm = payload["farm"]
    range_key = payload["range"]
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph(str(farm["name"]), styles["Title"]))
    story.append(
        Paragraph(
            f"{farm.get('location') or '—'} · "
            f"{RANGE_LABELS.get(range_key, range_key)} · Generated {generated}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.4 * cm))

    kpis = payload["kpis"]
    hen = kpis.get("hen_day_pct")
    hen_s = "—" if hen is None else f"{hen}%"
    kpi_rows = [
        ["Birds", "Eggs (period)", "Deaths", "Hen-day", "Feed"],
        [
            str(kpis["birds"]),
            str(kpis["eggs_period"]),
            str(kpis["deaths_period"]),
            hen_s,
            f"{kpis['feed_qty']} {kpis['feed_unit']}",
        ],
    ]
    t = Table(kpi_rows, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.92, 0.92, 0.92)),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(Paragraph("Period snapshot", styles["Heading2"]))
    story.append(t)
    story.append(Spacer(1, 0.35 * cm))

    story.append(Paragraph("Alerts", styles["Heading2"]))
    alerts = payload.get("alerts") or []
    if not alerts:
        story.append(Paragraph("No alerts", styles["Normal"]))
    else:
        for alert in alerts:
            story.append(Paragraph(f"• {alert['message']}", styles["Normal"]))
    story.append(Spacer(1, 0.35 * cm))

    story.append(Paragraph("Rough margin", styles["Heading2"]))
    money = payload.get("money")
    if money is None:
        story.append(Paragraph("Rates not set", styles["Normal"]))
    else:
        money_rows = [
            ["Revenue", "Feed cost", "Margin"],
            [str(money["revenue"]), str(money["feed_cost"]), str(money["margin"])],
        ]
        mt = Table(money_rows, hAlign="LEFT")
        mt.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.92, 0.92, 0.92)),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(mt)
    story.append(Spacer(1, 0.35 * cm))

    ts_png = _chart_timeseries(payload.get("series") or [])
    story.append(Paragraph("Egg production", styles["Heading2"]))
    if ts_png is None:
        story.append(Paragraph("No data", styles["Normal"]))
    else:
        story.append(Image(io.BytesIO(ts_png), width=16 * cm, height=5.3 * cm))
    story.append(Spacer(1, 0.35 * cm))

    pie_png = _chart_eggs_pie(payload.get("compare_sheds") or [])
    story.append(Paragraph("Eggs by shed", styles["Heading2"]))
    if pie_png is None:
        story.append(Paragraph("No data", styles["Normal"]))
    else:
        story.append(Image(io.BytesIO(pie_png), width=10 * cm, height=7 * cm))
    story.append(Spacer(1, 0.35 * cm))

    story.append(Paragraph("Shed compare", styles["Heading2"]))
    shed_header = ["#", "Name", "Birds", "Eggs", "Deaths", "Hen-day"]
    shed_rows = [shed_header]
    for row in payload.get("compare_sheds") or []:
        hd = row.get("hen_day_pct")
        shed_rows.append(
            [
                str(row.get("number", "")),
                str(row.get("name", "")),
                str(row.get("birds", "")),
                str(row.get("eggs_period", "")),
                str(row.get("deaths_period", "")),
                "—" if hd is None else f"{hd}%",
            ]
        )
    if len(shed_rows) == 1:
        story.append(Paragraph("No data", styles["Normal"]))
    else:
        st = Table(shed_rows, hAlign="LEFT")
        st.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.92, 0.92, 0.92)),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                ]
            )
        )
        story.append(st)
    story.append(Spacer(1, 0.35 * cm))

    story.append(Paragraph("Farm compare", styles["Heading2"]))
    farm_header = ["Name", "Birds", "Eggs", "Deaths", "Hen-day"]
    farm_rows = [farm_header]
    for row in payload.get("compare_farms") or []:
        hd = row.get("hen_day_pct")
        farm_rows.append(
            [
                str(row.get("name", "")),
                str(row.get("birds", "")),
                str(row.get("eggs_period", "")),
                str(row.get("deaths_period", "")),
                "—" if hd is None else f"{hd}%",
            ]
        )
    if len(farm_rows) == 1:
        story.append(Paragraph("No data", styles["Normal"]))
    else:
        ft = Table(farm_rows, hAlign="LEFT")
        ft.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.92, 0.92, 0.92)),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                ]
            )
        )
        story.append(ft)

    doc.build(story)
    return buffer.getvalue()
```

- [ ] **Step 5: Run render test — expect pass**

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_export.py::test_render_dashboard_pdf_bytes_and_farm_name -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/export_pdf.py backend/tests/test_dashboard_export.py
git commit -m "feat: render dashboard snapshot PDF"
```

---

### Task 3: Export API route + auth tests

**Files:**
- Modify: `backend/dashboard_api.py`
- Modify: `backend/tests/test_dashboard_export.py`

**Interfaces:**
- Produces: `GET /api/dashboard/export.pdf?farm_id=&range=`
- Consumes: `_build_dashboard_payload`, `render_dashboard_pdf`, `require_owner`

- [ ] **Step 1: Add failing API tests**

Append to `backend/tests/test_dashboard_export.py`:

```python
from fastapi.testclient import TestClient


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
        params={"farm_id": farm["id"], "range": "current_month"},
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
        params={"farm_id": "farm-1", "range": "current_month"},
    )
    assert res.status_code == 403


def test_export_unknown_farm_404(client: TestClient) -> None:
    _login(client, "owner@demo.local", "owner-pass")
    res = client.get(
        "/api/dashboard/export.pdf",
        params={"farm_id": "missing-farm", "range": "current_month"},
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
        params={"farm_id": farm["id"], "range": "current_month"},
    ).json()
    assert dash["money"] is None
    res = client.get(
        "/api/dashboard/export.pdf",
        params={"farm_id": farm["id"], "range": "current_month"},
    )
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"
```

- [ ] **Step 2: Run API tests — expect fail (404 route missing)**

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_export.py -v
```

Expected: render test PASS; API tests FAIL with 404

- [ ] **Step 3: Add export route**

In `backend/dashboard_api.py` add imports:

```python
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from auth import require_owner, require_user
from export_pdf import render_dashboard_pdf
```

Add route (after JSON dashboard):

```python
@router.get("/dashboard/export.pdf")
def export_dashboard_pdf(
    farm_id: str = Query(...),
    range: str = Query("current_month"),
    owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    if range not in VALID_RANGES:
        raise HTTPException(
            status_code=400,
            detail=f"range must be one of: {', '.join(sorted(VALID_RANGES))}",
        )
    farm = get_farm_for_user(db, owner, farm_id)
    if farm is None:
        raise HTTPException(status_code=404, detail="Farm not found")
    payload = _build_dashboard_payload(db, owner, farm, range)
    pdf = render_dashboard_pdf(payload)
    slug = "".join(
        ch.lower() if ch.isalnum() else "-" for ch in farm.name
    ).strip("-") or "farm"
    filename = f"farm-{slug}-{range}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
```

- [ ] **Step 4: Run export tests — expect pass**

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_dashboard_export.py -q
```

Expected: all passed

- [ ] **Step 5: Commit**

```bash
git add backend/dashboard_api.py backend/tests/test_dashboard_export.py
git commit -m "feat: add owner dashboard PDF export endpoint"
```

---

### Task 4: Frontend Export button

**Files:**
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/components/OwnerDashboard.tsx`

**Interfaces:**
- Produces: `downloadDashboardPdf(farmId: string, range: DashboardRange): Promise<void>`
- Consumes: `GET http://localhost:8010/api/dashboard/export.pdf` with credentials

- [ ] **Step 1: Add API helper**

In `frontend/src/api.ts` (near `fetchDashboard`):

```typescript
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const match = /filename="([^"]+)"/i.exec(header)
  return match?.[1] ?? null
}

export async function downloadDashboardPdf(
  farmId: string,
  range: DashboardRange,
): Promise<void> {
  const params = new URLSearchParams({ farm_id: farmId, range })
  const res = await fetch(`${API_BASE}/api/dashboard/export.pdf?${params}`, {
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download =
    filenameFromDisposition(res.headers.get('Content-Disposition')) ??
    'dashboard-export.pdf'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Wire Owner dashboard button**

In `OwnerDashboard.tsx`:

- Import `Button` from `@cloudflare/kumo` and `downloadDashboardPdf` from `../api`
- State: `exporting` boolean, reuse/extend `dashError` or local `exportError`
- Next to `RangeToggle`, add:

```tsx
<Button
  type="button"
  variant="secondary"
  disabled={!farmId || exporting || dashLoading}
  onClick={() => {
    if (!farmId) return
    setExporting(true)
    setExportError(null)
    void downloadDashboardPdf(farmId, range)
      .catch((err: unknown) => {
        setExportError(
          err instanceof Error ? err.message : 'Failed to export PDF',
        )
      })
      .finally(() => setExporting(false))
  }}
>
  {exporting ? 'Exporting…' : 'Export PDF'}
</Button>
```

Show `exportError` under the header row when set.

- [ ] **Step 3: Frontend build**

```powershell
cd frontend
npm run build
```

Expected: success

- [ ] **Step 4: Manual smoke**

1. Restart/reload API with deps installed
2. Login Owner → dashboard → Export PDF
3. Open file: KPIs + charts present

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api.ts frontend/src/components/OwnerDashboard.tsx
git commit -m "feat: owner dashboard Export PDF button"
```

---

### Task 5: Docs + checklist

**Files:**
- Create: `specs/012-dashboard-pdf-export.md`
- Modify: `MEMORY.md`, `TODO-LIST.md`, `docs/roadmap.md`

- [ ] **Step 1: Write slice spec**

`specs/012-dashboard-pdf-export.md`:

```markdown
# 010 — Dashboard PDF export

Design: [docs/superpowers/specs/2026-10-02-dashboard-pdf-export-design.md](../docs/superpowers/specs/2026-10-02-dashboard-pdf-export-design.md)

## Slice

Owner downloads `GET /api/dashboard/export.pdf?farm_id=&range=` — dashboard snapshot PDF (KPIs, alerts, money, egg timeseries, eggs-by-shed pie, compare tables). Button on Owner dashboard.

## Out of this slice

Manager export, day-by-day ops dump, branded templates, Kumo-matching chart styling.
```

- [ ] **Step 2: Update trackers**

- `TODO-LIST.md`: add/check item under hardening or Next: **Dashboard PDF export**
- `docs/roadmap.md`: tick Export / reports (or sub-bullet PDF snapshot)
- `MEMORY.md`: active phase = PDF export done; next = ask priority

- [ ] **Step 3: Commit**

```bash
git add specs/012-dashboard-pdf-export.md MEMORY.md TODO-LIST.md docs/roadmap.md
git commit -m "docs: mark dashboard PDF export slice"
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Owner-only PDF download | Task 3 |
| Same farm + range as dashboard | Task 1 + 3 |
| KPIs, alerts, money, timeseries, eggs pie, compare | Task 2 |
| Reuse dashboard payload | Task 1 |
| ReportLab + matplotlib | Task 2 |
| Export button + blob download | Task 4 |
| Tests: 200/403/404/money null/%PDF | Task 2–3 |
| Docs | Task 5 |

## Placeholder / consistency review

- No TBDs
- `render_dashboard_pdf(payload: dict) -> bytes` consistent across tasks
- Route path `/api/dashboard/export.pdf` consistent with frontend helper
