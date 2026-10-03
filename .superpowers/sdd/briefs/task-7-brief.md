### Task 7: Owner Farms + Managers UI

**Files:**
- Modify: `frontend/src/api.ts`, `frontend/src/types.ts`
- Create: `frontend/src/components/FarmsPage.tsx`
- Create: `frontend/src/components/FarmDetailPage.tsx`
- Create: `frontend/src/components/ManagersPage.tsx`
- Read first: `.agents/skills/design-taste-frontend/SKILL.md` + Kumo form docs

**Interfaces:**
- Produces: working Owner CRUD screens against APIs
- Consumes: farm/shed/manager endpoints

- [ ] **Step 1: Extend types + API helpers**

```ts
export type Shed = {
  id: string
  farm_id: string
  name: string
  number: number
  live_bird_count: number
  capacity: number | null
}

export type Manager = {
  id: string
  email: string
  role: 'farm_manager'
  customer_id: string
  farm_ids: string[]
}
```

Add `createFarm`, `updateFarm`, `deleteFarm`, `fetchSheds`, `createShed`, `updateShed`, `deleteShed`, `fetchManagers`, `createManager`, `updateManager`, `deleteManager`.

- [ ] **Step 2: Build Farms pages**

- `/farms`: table/list of farms, form (name + location), link to detail
- `/farms/:farmId`: edit name/location, delete with confirm, shed list with create/edit/delete

Use Kumo `Button`, `Text`, `Input`/`Textarea` as available; keep density high, no decorative card grid.

- [ ] **Step 3: Build Managers page**

- List managers + farm assignment summary
- Create: email, password, checkboxes of tenant farms
- Edit: farm checkboxes; optional new password
- Delete with confirm

- [ ] **Step 4: Manual smoke + build**

```powershell
npm run build
```

Smoke: login Owner â†’ create farm/shed â†’ create manager â†’ assign â†’ dashboard selector shows new farm.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src
git commit -m "feat: owner farms and managers management UI"
```

---

