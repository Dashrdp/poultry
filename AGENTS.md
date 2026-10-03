# AGENTS.md — Poultry Farm

Lean instructions for AI coding agents. Deep detail lives in linked docs — read those instead of inventing scope.

## Purpose

Multi-tenant poultry ops web app: **Customer → Farms → Sheds**, farm **godown** feed, daily shed logs (birds, eggs). **Owner** monitors + analytics; **Farm Manager** enters daily data.

## Read first

| Doc | When |
|-----|------|
| [docs/PRD-poultry-farm-MVP.md](docs/PRD-poultry-farm-MVP.md) | Product scope, roles, in/out |
| [docs/architecture.md](docs/architecture.md) | Modules, data model, API, permissions |
| [docs/roadmap.md](docs/roadmap.md) | Phase order |
| [docs/decisions.md](docs/decisions.md) | Locked ADRs |
| [MEMORY.md](MEMORY.md) | Active phase / next goal |
| [agent_docs/](agent_docs/) | Stack, patterns, testing, brief |
| [REVIEW-CHECKLIST.md](REVIEW-CHECKLIST.md) | Definition of done |
| [kumo-ui.com](https://kumo-ui.com/) | **UI source of truth** — components, colors |
| [kumo-ui.com/charts](https://kumo-ui.com/charts/) | **Charts source of truth** — Timeseries, Chart, ChartLegend, ChartPalette |

## UI (mandatory)

Frontend look/feel = Cloudflare dashboard via **Kumo**. Follow `.cursor/rules/kumo-ui.mdc`:
semantic tokens, `data-mode` light/dark, **Kumo charts only** from [kumo-ui.com/charts](https://kumo-ui.com/charts/) (`TimeseriesChart`, `Chart`, `ChartLegend`, `ChartPalette`). Palette by task: **semantic** (polarity/trends), **categorical** (farm/shed identity bars), **sequential** (density only — out of MVP). Docs: [colors](https://kumo-ui.com/charts/colors/), [timeseries](https://kumo-ui.com/charts/timeseries/), [custom](https://kumo-ui.com/charts/custom/). No custom farm palettes or raw ECharts UIs.

**Taste skill (always for UI):** read `.agents/skills/design-taste-frontend/SKILL.md` (or `.cursor/skills/design-taste-frontend/`) before frontend/layout/styling work. Anti-slop hierarchy/spacing/motion inside Kumo. Precedence: Kumo components/tokens > taste-skill polish. Rule: `.cursor/rules/taste-skill.mdc`. Upstream: [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill). Reinstall: `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend" -y`.

## Repo map

```
frontend/     Vite React + TS + Kumo  (port 5173)
backend/      FastAPI                 (port 8000)
docs/         PRD, architecture, roadmap, decisions
agent_docs/   Agent deep-dives
specs/        Per-feature specs
```

## Commands

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8010
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Checks (when relevant)

```powershell
cd frontend
npm run build
npm run lint
```

API smoke: `GET http://localhost:8010/health`, `GET /api/farms`, `GET /api/dashboard?farm_id=farm-1&from=2026-10-01&to=2026-10-02`.

## Conventions

- Match existing scaffold style (`frontend/src`, `backend/main.py`).
- Prefer Kumo UI components on the frontend.
- Scope all data access by `customer_id`.
- Owner-only for analytics; Manager writes daily logs + godown.
- Small vertical slices per roadmap; add a file under `specs/` for non-trivial features.
- After meaningful work: update `MEMORY.md`, tick `docs/roadmap.md`, append ADR if a real decision landed.

## Boundaries

### Always

- Read PRD/architecture before adding product behavior.
- Keep tenant isolation on every data query.
- Update living docs when phases or decisions change.

### Ask first

- New roles beyond Owner / Farm Manager.
- New persistence/auth technology choices (record ADR after approval).
- Expanding analytics beyond period presets / custom from–to (already shipped in specs/015).

### Never

- Invent features listed as out of scope in the PRD.
- Commit secrets, `.env` with credentials, or real user passwords.
- Break customer isolation or expose one tenant’s data to another.
- Paste giant PRD text into Cursor rules — link instead.
