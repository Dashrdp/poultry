# Tech stack

## Frontend (`frontend/`)

- Vite 8 + React 19 + TypeScript
- UI: `@cloudflare/kumo` ([kumo-ui.com](https://kumo-ui.com/)) — Cloudflare dashboard look
- Charts: [Kumo Charts](https://kumo-ui.com/charts/) (`TimeseriesChart`, `Chart`, `ChartLegend`, `ChartPalette`) + peer `echarts`
- Theme: `data-mode` light/dark on `<html>` (semantic Kumo tokens; no Tailwind `dark:`)
- Styling: Tailwind CSS 4 (`@tailwindcss/vite`)
- Lint: `oxlint` via `npm run lint`
- Dev server: **http://localhost:5173**

```powershell
cd frontend
npm install
npm run dev
npm run build
npm run lint
```

## Backend (`backend/`)

- Python FastAPI + `uvicorn[standard]`
- Entry: `backend/main.py` (`main:app`)
- CORS allows `http://localhost:5173`
- API: **http://localhost:8010**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8010
```

## Current endpoints

- `GET /health` → `{ "status": "ok" }`
- `GET /api/hello` → `{ "message": "Poultry farm API ready" }`
- `GET /api/farms`
- `GET /api/dashboard?farm_id=&range=current_month|previous_month|year`

## Not chosen yet (record ADR when picked)

- Database (SQLite vs Postgres)
- Auth transport (JWT vs cookie session)
- ORM / migrations tool

See [../docs/architecture.md](../docs/architecture.md) and [../docs/decisions.md](../docs/decisions.md).
