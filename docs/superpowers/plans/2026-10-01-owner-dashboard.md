# Owner Dashboard Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Owner dashboard with farm selector, shed top-view hover, KPIs, range toggle, chart — fed by mock FastAPI endpoints.

**Architecture:** Seed mock domain data in backend; expose `/api/farms` + `/api/dashboard`. Frontend Owner shell fetches and renders shed map + KPIs + SVG chart (no echarts dep).

**Tech Stack:** FastAPI, React/TS, Kumo Select/Button, Google fonts (Fraunces + DM Sans), custom SVG chart.

## Global Constraints

- Owner-only UI slice; no auth
- Palette: deep green + straw on sage/stone
- Match design spec `docs/superpowers/specs/2026-10-01-owner-dashboard-design.md`

---

### Task 1: Mock API

**Files:**
- Create: `backend/mock_data.py`
- Modify: `backend/main.py`

- [ ] Add seed farms/sheds/series + `/api/farms` + `/api/dashboard`
- [ ] Smoke: GET both endpoints

### Task 2: Frontend types + API

**Files:**
- Create: `frontend/src/types.ts`, `frontend/src/api.ts`

### Task 3: Dashboard UI

**Files:**
- Create: `frontend/src/components/*`, rewrite `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`, `frontend/index.html`

### Task 4: Docs tracking

- Update `MEMORY.md`, `specs/001-owner-dashboard.md`, roadmap note
