### Task 6: Frontend router + Owner shell nav

**Files:**
- Modify: `frontend/package.json` (add `react-router-dom`)
- Create: `frontend/src/components/OwnerShell.tsx`
- Create: `frontend/src/components/OwnerDashboard.tsx` (extract from `App.tsx`)
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/AppShell.tsx` (accept nav items / active path; farm selector only on dashboard)

**Interfaces:**
- Produces: routes `/`, `/farms`, `/farms/:farmId`, `/managers` for Owner; Manager routes in Task 8
- Consumes: existing auth

- [ ] **Step 1: Install router**

```powershell
cd frontend
npm install react-router-dom
```

- [ ] **Step 2: Extract `OwnerDashboard` and wire `BrowserRouter`**

`App.tsx` sketch:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// ...
if (user.role === 'farm_manager') {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ManagerHome />} />
        <Route path="/farms/:farmId" element={<ManagerFarmDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
return (
  <BrowserRouter>
    <Routes>
      <Route element={<OwnerShell />}>
        <Route path="/" element={<OwnerDashboard />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/farms/:farmId" element={<FarmDetailPage />} />
        <Route path="/managers" element={<ManagersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
)
```

Owner shell: Sidebar buttons navigate with `useNavigate` / `NavLink`; active state from `useLocation`. Farm selector only rendered for `/` dashboard route (pass as optional slot from `OwnerDashboard` or conditional in shell).

Temporary stubs for Farms/Managers/Manager pages until Tasks 7â€“8 (empty `Text` â€œComing soonâ€) so app builds.

- [ ] **Step 3: Verify**

```powershell
npm run build
```

Expected: success.

- [ ] **Step 4: Commit**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/src
git commit -m "feat: add react-router and owner shell navigation"
```

---

