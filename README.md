# PoultryTrack

Phase 1 scaffold: Vite React + TypeScript + [Kumo UI](https://kumo-ui.com/) frontend, FastAPI backend.

Multi-farm poultry ops: Owners monitor and view analytics; Farm Managers log daily birds, eggs, and godown feed.

## Docs (vibe-coding stack)

| Doc | Purpose |
|-----|---------|
| [AGENTS.md](AGENTS.md) | Instructions for AI agents |
| [docs/PRD-poultry-farm-MVP.md](docs/PRD-poultry-farm-MVP.md) | Product requirements |
| [docs/architecture.md](docs/architecture.md) | System design |
| [docs/roadmap.md](docs/roadmap.md) | Phases / tracking |
| [docs/decisions.md](docs/decisions.md) | Architecture decision log |
| [MEMORY.md](MEMORY.md) | Active phase memory |
| [REVIEW-CHECKLIST.md](REVIEW-CHECKLIST.md) | Definition of done |
| [agent_docs/](agent_docs/) | Stack, patterns, testing |
| [specs/](specs/) | Per-feature specs |

## Setup

### Database (Postgres)

Requires Docker Desktop running. From repo root:

```powershell
docker compose up -d --wait
```

Creates `poultry` (dev) and `poultry_test` (pytest) on `localhost:5432`, user `poultry` / `poultry-dev` (local dev only). Override with `DATABASE_URL` / `TEST_DATABASE_URL`. Reset all data: `docker compose down -v`.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Frontend

```powershell
cd frontend
npm install
```

## Run

Terminal 1 — API (port 8010):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8010
```

Terminal 2 — UI (port 5173):

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173 — login, then Owner dashboard or Manager home.

### Demo logins (local seed)

Run `python seed.py` in `backend/` once if the DB is empty. Seeds demo users/farms plus a **sample year** of shed logs, feed movements, and rates. Rebuild ops with `python seed.py --force-ops`.

| Role | Email | Password |
|------|-------|----------|
| Owner (dashboard) | `owner@demo.local` | `owner-pass` |
| Manager (assigned farms only) | `manager@demo.local` | `manager-pass` |

Seed Manager is assigned to **`farm-1` only**.

### UI / charts

Frontend uses [Kumo UI](https://kumo-ui.com/). Charts must use Kumo chart components from [kumo-ui.com/charts](https://kumo-ui.com/charts/) (`TimeseriesChart`, `Chart`, `ChartLegend`, `ChartPalette`) — not custom SVG/canvas charts.

## Endpoints

- `GET /health` → `{ "status": "ok" }`
- `GET /api/hello` → `{ "message": "Poultry farm API ready" }`
- `GET /api/farms` → farm list for selector
- `GET /api/dashboard?farm_id=&range=current_month|previous_month|year` → Owner dashboard payload

> Note: API defaults to **8010** in this project (port 8000 may be blocked on some Windows setups). Frontend `api.ts` matches. Production builds use same-origin `/api` via Caddy (`VITE_API_BASE=""`).

## Deploy (Linux + Docker + Caddy)

Stack in `deploy/`: Postgres + FastAPI + Caddy (static UI, TLS, `/api` + `/health` proxy). Same origin — no public API port.

On the host: Docker Engine + Compose plugin, ports **80/443** open, DNS A/AAAA on your domain pointing at the box.

Always use the **deploy** compose (root `docker-compose.yml` is local Postgres only — no `api`/`web`).

```bash
cd /opt/poultry/deploy   # or: cd deploy
cp .env.example .env
# edit SITE_ADDRESS, POSTGRES_PASSWORD, PF_SESSION_SECRET
# SITE_ADDRESS=your.domain.com   # Caddy auto-HTTPS
# SITE_ADDRESS=:80               # HTTP only / IP smoke test → set PF_HTTPS_ONLY=0

docker compose up -d --build
docker compose ps
docker compose logs api --tail 100
docker compose exec api python seed.py
```

From repo root instead: `docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build`.

Open `https://your.domain.com` (or `http://SERVER_IP` if `:80`). Demo logins same as local seed.

Stop / wipe DB volume: `docker compose down` / `docker compose down -v` (from `deploy/`).

If Caddy returns 502 / `connection refused` / `lookup api`: `api` is down or you used the wrong compose file. Run `docker compose -f deploy/docker-compose.yml ps -a` and `logs api`.

If `api` crash-loops with `NumPy was built with baseline optimizations (X86_V2)`: the host CPU is older than NumPy 2’s baseline. This repo pins `numpy<2` for that; rebuild the API image after pull.
