# Task 8 Report: Manager read-only home

## Status

Complete.

## Changes

- Added `ManagerHome` with assigned-farm loading, error, and empty states.
- Added tablet-first farm rows linking to `/farms/:farmId`.
- Added `ManagerFarmDetail` with read-only shed number, name, and live bird count.
- Added a `Not available` state for inaccessible or missing farms.
- Added manager-only headers with persisted theme control and logout.
- Wired manager routes in `App.tsx`; owner-only routes remain unreachable for managers.

## Verification

- `npm run build`: passed.
- `npm run lint`: passed with five pre-existing warnings in unrelated files.
- Cursor diagnostics: no errors in changed files.
- No git commits created.

## Concerns

- Vite reports the existing JavaScript bundle exceeds 500 kB after minification.
- Browser smoke testing requires the seeded backend session and was not run in this task.
