# Task 2 Report: Seed demo farms / sheds / assignment

## Status

**Complete.** Demo seed extended; test green.

## Commits

None (per task constraint).

## Changes

| File | Action |
|------|--------|
| `backend/tests/test_seed_farms.py` | Added (from brief verbatim) |
| `backend/seed.py` | Added `DEMO_FARMS`, farm/shed upsert, manager → `farm-1` assignment |
| `backend/tests/test_access.py` | Subset assertions + teardown test farms (shared DB with new seed) |

## TDD

1. Wrote `test_seed_creates_farms_and_assigns_manager_to_farm_one_only` — **FAILED** (no farms in seed).
2. Extended `seed_demo` with `DEMO_FARMS` tuple matching brief/mock names and shed ids `shed-1`..`shed-8`.
3. Re-ran pytest — **PASSED**.

## Idempotency

- Farms: create only if `db.get(Farm, farm_id)` is `None`.
- Sheds: create only if `db.get(Shed, shed_id)` is `None`.
- Assignment: add `ManagerFarmAssignment` for `manager@demo.local` + `farm-1` only when missing.
- Re-running `python seed.py` or calling `seed_demo` twice does not duplicate rows.

## Verification

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest tests/test_seed_farms.py -v
python seed.py
```

- Full `pytest tests/`: **5 passed** (includes `test_seed_farms.py`).
- `python seed.py`: prints demo logins unchanged.

## Data seeded

| Farm ID | Name | Location | Sheds |
|---------|------|----------|-------|
| farm-1 | Green Valley | Nashik | shed-1, shed-2, shed-3 |
| farm-2 | Sunrise Layers | Pune | shed-4, shed-5 |
| farm-3 | Riverbend Poultry | Ahmednagar | shed-6, shed-7, shed-8 |

Manager `manager@demo.local` assigned to **farm-1 only** (Owner unassigned, sees all farms via access layer).

## Concerns

- Seed does not update farm name/location if row already exists with different values (upsert-by-id skip only).
- Seed does not remove stray manager assignments on other farms if DB was edited manually.
- `conftest.py` runs `seed_demo` at import; all API tests now see demo farms (intended for upcoming slices).

## Next

Task 3+ can wire `/api/farms` to DB using these ids aligned with `mock_data.py`.
