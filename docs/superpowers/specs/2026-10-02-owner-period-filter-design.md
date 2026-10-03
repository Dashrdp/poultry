# Owner period filter (from/to) — design

**Date:** 2026-10-02  
**Status:** implemented

## Summary

Unify Monitor Dashboard and all Analytics tabs on one **Presets + calendar** period control. APIs take inclusive `from` + `to` (ISO dates) instead of `range=` enums or rolling `days=`.

## Decisions

| Topic | Choice |
|-------|--------|
| Scope | Monitor + Portfolio + Compare + Shed + Trends |
| UI | Yesterday · This week · This month · Last month · Year + Custom (Kumo `DatePicker` range) |
| Week | Monday–Sunday |
| Default | This month |
| Analytics end-cap | Yesterday |
| Monitor end-cap | Today |
| Prior / baseline | Equal-length window ending the day before `from` |
| Max span | 366 days |
| URL | `?preset=&from=&to=` shared across Owner tabs |
| Out of slice | Flock-to-date, new report PDF templates, Excel |

## Architecture

- `backend/period.py` — validate / default / prior window
- `frontend/src/period.ts` — preset → bounds, URL encode/decode, labels
- `AnalyticsPeriodBar` + `useOwnerPeriod` — UI + search params
- Dashboard + `/api/analytics/*` + PDF export accept `from`/`to`

## Series bucketing

Dashboard chart series: daily when span ≤ 90 days; monthly buckets when longer.
