# Code patterns

Match the scaffold until a broader pattern doc is justified.

## Frontend

- Functional React components; hooks for data fetch (`useState` / `useEffect` as in `App.tsx`).
- **UI kit:** [@cloudflare/kumo](https://kumo-ui.com/) only — check docs before inventing controls.
- Colors: Kumo semantic tokens; light/dark via `document.documentElement.dataset.mode` (`light`|`dark`). Never Tailwind `dark:`.
- Charts: only [kumo-ui.com/charts](https://kumo-ui.com/charts/) — `TimeseriesChart`, `Chart`, `ChartLegend`, `ChartPalette.semantic` + tree-shaken `echarts` peer. No custom SVG/canvas charts or raw ECharts UI.
- Keep API base explicit for now (`http://localhost:8010`); centralize when adding a real client.
- Prefer TypeScript types for API JSON shapes.
- Place imports at top of file (no inline imports).

## Backend

- FastAPI app instance in `main.py` (split into routers/modules when Phase 1+ lands).
- Use Pydantic models for request/response when endpoints grow.
- CORS already configured for local Vite origin — extend carefully for production.
- Return plain dicts or response models; keep `/health` cheap.

## Cross-cutting (when auth exists)

- Resolve `customer_id` + `role` from auth dependency; never trust client-supplied tenant ids.
- Analytics handlers: reject non-Owner.
- Daily log / godown writes: Farm Manager (and optionally Owner).

## What not to do

- Do not introduce a second UI kit beside Kumo without an ADR.
- Do not invent custom brand palettes that bypass Kumo tokens.
- Do not add large abstractions for a single call site.
