# Task 3: Export API route + auth tests

**Files:**
- Modify: `backend/dashboard_api.py`
- Modify: `backend/tests/test_dashboard_export.py`

**Interfaces:**
- Produces: `GET /api/dashboard/export.pdf?farm_id=&range=`
- Consumes: `_build_dashboard_payload`, `render_dashboard_pdf`, `require_owner`

Follow plan Task 3 in `docs/superpowers/plans/2026-10-02-dashboard-pdf-export.md` exactly:
1. Add API tests (owner 200 + %PDF + farm name; manager 403; unknown farm 404; money null ok)
2. Run — expect fail (404 route missing) except existing render test
3. Add export route with require_owner, VALID_RANGES check, Content-Disposition filename
4. Run all export tests — pass
5. Commit — SKIP (no-git)

## Global constraints (binding)

- Owner only for export (`require_owner`); Manager → 403
- Reuse dashboard aggregates via `_build_dashboard_payload` (do not recompute totals)
- Ranges: `current_month` | `previous_month` | `year` only
- Tenant isolation unchanged
- Success: application/pdf, attachment filename `farm-{slug}-{range}.pdf`
