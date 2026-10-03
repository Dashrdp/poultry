# Testing

No automated test suite yet. Until one exists, use this gate.

## Required smoke (every meaningful change)

1. Backend starts: `uvicorn main:app --reload --port 8000`
2. `GET /health` → `{"status":"ok"}`
3. Frontend starts: `npm run dev` in `frontend/`
4. UI loads at http://localhost:5173 without console/network failure for the changed path

## When frontend changes

```powershell
cd frontend
npm run lint
npm run build
```

## When auth / roles land

- Login as Owner → analytics reachable; Manager denied or redirected
- Login as Manager → can write daily log / godown
- Request with wrong/missing token → 401
- Cross-customer resource id → 403/404 (no leak)

## Future (Phase 4+)

- Backend: `pytest` + FastAPI `TestClient`
- Frontend: component or Playwright smoke for login + daily log

Until then, attach smoke evidence in the PR / chat summary per [../REVIEW-CHECKLIST.md](../REVIEW-CHECKLIST.md).
