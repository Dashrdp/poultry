# 2026-10-02 — Dashboard PDF export design

Slice design for Owner dashboard snapshot export as PDF. Checklist: [TODO-LIST.md](../../../TODO-LIST.md). Related: [product design](./2026-10-01-poultry-saas-product-design.md), [Owner dashboard](./2026-10-01-owner-dashboard-design.md), [architecture](../../architecture.md).

## Goal

Owner downloads a **PDF report** for the selected farm and analytics range that mirrors the dashboard snapshot: tables/numbers plus egg timeseries and eggs-by-shed pie charts.

## Decisions locked

| Topic | Choice |
|-------|--------|
| Report type | Dashboard snapshot (not day-by-day ops dump) |
| Charts | Egg production timeseries + pie of **eggs by shed** (period) |
| Generation | **Server-side** PDF download |
| Who | **Owner only** |
| Ranges | Same as dashboard: `current_month` \| `previous_month` \| `year` |

## Non-goals

- Manager export
- Day-by-day audit / ops dump
- Editable templates or branded letterhead
- Pixel-matching Kumo chart styling
- Client-only PDF (jsPDF) or browser Print-as-PDF as the primary path
- Extra pie for live birds (eggs-by-shed only)

## API

```
GET /api/dashboard/export.pdf?farm_id={id}&range={range}
```

- Auth: session cookie; `require_owner`
- Farm access: same tenant/farm checks as dashboard
- Success: `200`, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="farm-{slug}-{range}.pdf"`
- Errors: `401` unauthenticated, `403` non-owner / no access, `404` unknown farm, `400` bad range

## PDF contents (order)

1. **Header** — farm name, location, range label, generated-at **UTC** (`YYYY-MM-DD HH:MM UTC`)
2. **KPI table** — birds, eggs (period), deaths (period), hen-day %, godown feed stock
3. **Alerts** — list messages, or “No alerts”
4. **Rough margin** — revenue / feed cost / margin when rates set; else “Rates not set”
5. **Egg production chart** — timeseries from dashboard `series`
6. **Eggs by shed pie** — period egg totals from `compare_sheds` (or equivalent)
7. **Compare tables** — shed compare; farm compare when present on dashboard payload

Empty series or all-zero pie still render with a short “No data” note.

## Architecture

```
Owner UI (Export PDF)
  → GET /api/dashboard/export.pdf (cookie)
    → build dashboard payload (reuse existing dashboard builder)
    → export_pdf.render(payload) → bytes
    → StreamingResponse / Response(pdf)
```

| Piece | Responsibility |
|-------|----------------|
| `dashboard_api.py` | New export route; owner gate; call shared payload builder |
| `export_pdf.py` (new) | ReportLab layout; matplotlib PNG for timeseries + pie; return bytes |
| `requirements.txt` | Add `reportlab`, `matplotlib` |
| `OwnerDashboard` | “Export PDF” control beside range toggle; blob download |

**Invariant:** Aggregate math lives in one place (dashboard builder). PDF renderer must not re-query business totals independently.

## Frontend UX

- Button visible on Owner dashboard when a farm is loaded
- Disabled / loading while download in flight
- On failure: short error text (reuse existing error patterns)
- Filename from `Content-Disposition` when present; else fallback `dashboard-export.pdf`

## Testing & acceptance

- Owner: `200`, `application/pdf`, body starts with `%PDF`
- Manager: `403`
- Unknown farm: `404`
- Export succeeds when `money` is `null`
- With known logs: farm name (and preferably a KPI figure) present in PDF text layer
- Manual: Owner clicks Export on dashboard and gets a readable PDF with tables + both charts

**Done when:** Owner can export current farm + range and open a PDF containing KPIs, alerts, money, timeseries, eggs-by-shed pie, and compare tables.

## Implementation notes

- Prefer extracting a shared `_dashboard_payload(...)` (or equivalent) from the existing JSON route so export and JSON stay in sync.
- Matplotlib: non-interactive backend (`Agg`) for server use.
- Keep PDF styling plain (black text, simple tables); no second design system.
