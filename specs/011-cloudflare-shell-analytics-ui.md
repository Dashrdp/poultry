# 011 — Cloudflare-like shell + Analytics UI

Design: [docs/superpowers/specs/2026-10-02-cloudflare-shell-analytics-ui-design.md](../docs/superpowers/specs/2026-10-02-cloudflare-shell-analytics-ui-design.md)

## Slice

- Owner sidebar: nested Monitor / Analytics / Setup (Kumo Collapsible + MenuSub), peekable, tooltips, email in header.
- Analytics `/analytics`: KPI strip (sparklines on eggs/birds) + 2×2 (eggs, birds, shed bars, farm bars) + rank toggle + compare tables.
- No backend changes.

## Acceptance

- Owner can collapse sidebar; nested groups expand when child active.
- Analytics shows 5 KPI cards and 2×2 charts; rank still reorders bars/tables.
- Manager unchanged (no Owner Analytics nav).

## Out of this slice

Quick search, % deltas, Dashboard redesign, new API.
