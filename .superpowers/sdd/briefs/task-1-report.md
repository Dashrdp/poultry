# Task 1 Report: ORM models + access helpers

## Status

DONE

## What was implemented

- **Models** (`backend/models.py`): `Farm`, `Shed`, `ManagerFarmAssignment` with FKs, indexes, unique constraints, and relationships/cascades as specified in the brief.
- **DB init** (`backend/db.py`): `init_db()` imports all new models so `Base.metadata.create_all` creates `farms`, `sheds`, and `manager_farm_assignments` tables in test and app startup paths.
- **Access helpers** (`backend/access.py`):
  - `user_assigned_to_farm(db, user_id, farm_id) -> bool`
  - `list_farms_for_user(db, user) -> list[Farm]` — owner: all tenant farms by name; farm_manager: assigned only; other roles: empty list.
  - `get_farm_for_user(db, user, farm_id) -> Farm | None` — tenant check + owner or assigned manager.
- **Tests** (`backend/tests/test_access.py`): integration test using seeded demo users and temp SQLite from `conftest.py`.

## TDD evidence

### RED (Step 2)

Command:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest tests/test_access.py -v
```

Output (excerpt):

```
ERROR collecting tests/test_access.py
...
from access import get_farm_for_user, list_farms_for_user
E   ModuleNotFoundError: No module named 'access'
!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
```

### GREEN (Step 5)

Command:

```powershell
pytest tests/test_access.py -v
```

Output (excerpt):

```
tests/test_access.py::test_owner_sees_all_tenant_farms_manager_sees_assigned_only PASSED [100%]
======================== 1 passed, 6 warnings in 0.03s ========================
```

Full suite:

```powershell
pytest -v
```

```
4 passed, 8 warnings in 0.99s
```

## Files changed

| File | Action |
|------|--------|
| `backend/models.py` | Modified — added `Farm`, `Shed`, `ManagerFarmAssignment`; `Integer` import |
| `backend/db.py` | Modified — `init_db` model imports |
| `backend/access.py` | Created |
| `backend/tests/test_access.py` | Created |

## Self-review

- Implementation matches task brief code paths and behavior.
- Tenant isolation: all queries filter by `user.customer_id` before role logic.
- Manager scoping uses `ManagerFarmAssignment` join; unassigned farms return `None` from `get_farm_for_user`.
- `conftest.py` calls `db.init_db()` before tests — new tables are created without conftest changes.
- Style aligned with existing `Customer`/`User` models (Mapped columns, relationship back_populates).
- No git commit per user constraint.

## Concerns

- **Low**: Unknown/future `user.role` values get empty list / denied access — correct for MVP but not covered by tests.
- **Low**: `datetime.utcnow` in model defaults matches existing auth models; SQLAlchemy emits deprecation warnings (pre-existing pattern).
- **None blocking** for downstream API tasks.

## Commits

Skipped (no git history by user choice).
