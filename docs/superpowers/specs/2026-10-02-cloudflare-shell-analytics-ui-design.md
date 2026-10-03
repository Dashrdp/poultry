# Cloudflare-like shell + Analytics UI

**Date:** 2026-10-02  
**Status:** approved for implementation

## Goal

Owner chrome closer to Cloudflare dashboard; Analytics page uses KPI strip + 2×2 chart grid.

## Decisions

- Nested sidebar: Monitor (Dashboard), Analytics, Setup (Farms, Managers) via Kumo `Sidebar.Collapsible` / `MenuSub` ([docs](https://kumo-ui.com/components/sidebar/)).
- No Quick search / Command Palette.
- Analytics: KPI sparklines from existing `series`; no prev-period % deltas; no horizontal tabs.
- Frontend-only; reuse `GET /api/dashboard`.
- Dashboard `/` monitor layout unchanged.

## Non-goals

Right-rail widgets, Manager nested nav, new analytics API.
