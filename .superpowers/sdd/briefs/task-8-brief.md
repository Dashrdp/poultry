### Task 8: Manager read-only home

**Files:**
- Create: `frontend/src/components/ManagerHome.tsx`
- Create: `frontend/src/components/ManagerFarmDetail.tsx`
- Delete or stop using: `ManagerHomePlaceholder.tsx`
- Modify: `frontend/src/App.tsx` if stubs remain

**Interfaces:**
- Produces: Manager `/` farm list; `/farms/:farmId` shed read-only
- Consumes: `fetchFarms`, `fetchSheds`

- [ ] **Step 1: Implement ManagerHome**

Load `fetchFarms()`; empty state if none; each farm links to `/farms/:farmId`. Logout + theme (simple header, no Owner analytics nav).

- [ ] **Step 2: Implement ManagerFarmDetail**

Load sheds; show name, number, live_bird_count; back link. If 403/404, show Empty â€œNot availableâ€.

- [ ] **Step 3: Smoke**

Login Manager â†’ only `farm-1` â†’ open sheds. Confirm cannot hit `/managers` as Owner-only (navigate away / no nav item).

- [ ] **Step 4: Commit**

```powershell
git add frontend/src
git commit -m "feat: manager read-only farms and sheds views"
```

---

