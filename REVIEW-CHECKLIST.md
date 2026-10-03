# REVIEW-CHECKLIST.md

Definition of done before calling a task complete.

## Product / scope

- [ ] Behavior matches [docs/PRD-poultry-farm-MVP.md](docs/PRD-poultry-farm-MVP.md) (no drive-by features)
- [ ] Role rules respected: Owner analytics; Manager daily entry
- [ ] Customer isolation preserved

## Code quality

- [ ] Types / lint clean for touched frontend files (`npm run lint`, `npm run build` when UI changed)
- [ ] Backend starts with `uvicorn main:app --reload --port 8000`
- [ ] No secrets committed

## Smoke

- [ ] `GET /health` returns ok when API changed
- [ ] Happy path checked in browser for UI changes
- [ ] Permission denied path checked when auth/roles touched

## Docs hygiene

- [ ] `MEMORY.md` active phase updated if milestone moved
- [ ] `docs/roadmap.md` ticked if phase item done
- [ ] New non-obvious choice appended to `docs/decisions.md`
- [ ] Non-trivial feature has a note under `specs/` when applicable
