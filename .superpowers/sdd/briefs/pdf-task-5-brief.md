# Task 5: Docs + checklist (+ CORS filename fix)

**Files:**
- Create: `specs/012-dashboard-pdf-export.md`
- Modify: `MEMORY.md`, `TODO-LIST.md`, `docs/roadmap.md`
- Modify: `backend/main.py` — add `expose_headers=["Content-Disposition"]` to CORSMiddleware so browser JS can read export filename (cross-origin Vite→API). One-line fix from Task 4 review.

Follow plan Task 5 docs content from `docs/superpowers/plans/2026-10-02-dashboard-pdf-export.md`.

Update trackers:
- TODO-LIST: mark Dashboard PDF export done (add under Next/Done as appropriate)
- roadmap: tick Export / reports or note PDF snapshot done
- MEMORY: phase = PDF export done; next = ask priority

Commit — SKIP (no-git)

## Global constraints
- Keep docs thin; link design/plan
- Do not invent new product features in docs
