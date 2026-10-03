# Auth & Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Customer + User in SQLite, add HTTP-only cookie login, seed an Owner (and optional Manager), protect APIs with tenant + role checks, and add a frontend login + role-aware shell — without replacing mock dashboard data yet.

**Architecture:** FastAPI owns a SQLite file (`backend/poultry.db`), SQLAlchemy models, bcrypt password hashes, and signed session cookies (`itsdangerous` or Starlette SessionMiddleware). Frontend sends `credentials: 'include'`, gates on `/api/auth/me`, shows Login for anonymous users, and keeps the existing Owner dashboard behind auth. Manager login lands on a minimal placeholder until daily-ops slices.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, SQLite, passlib[bcrypt] (or bcrypt), SessionMiddleware, React/TS, Kumo form controls, Vite.

**Spec:** [docs/superpowers/specs/2026-10-01-poultry-saas-product-design.md](../specs/2026-10-01-poultry-saas-product-design.md)

## Global Constraints

- Roles only: `owner` | `farm_manager`
- Tenant isolation via `customer_id` on every data query
- HTTP-only session cookie (not JWT in localStorage)
- SQLite file path: `backend/poultry.db` (gitignored)
- CORS must keep `allow_credentials=True` for `http://localhost:5173`
- Do not replace mock `/api/farms` or `/api/dashboard` bodies in this slice — only require auth + tenant header/session context
- Kumo UI + `data-mode`; no custom brand palette
- Responsive login (phone / tablet / desktop)
- No SaaS admin UI yet (seed script only)
- No Manager↔Farm assignment yet (Manager may log in; farm list still mock / empty for Manager until slice 2)

---

## File structure

| File | Responsibility |
|------|----------------|
| `backend/requirements.txt` | Add sqlalchemy, passlib[bcrypt], python-multipart |
| `backend/db.py` | Engine, SessionLocal, Base, `get_db` |
| `backend/models.py` | Customer, User ORM models |
| `backend/auth.py` | Password hash/verify, session helpers, `require_user` / `require_owner` deps |
| `backend/seed.py` | CLI/script: create demo customer + owner (+ optional manager) |
| `backend/main.py` | Wire SessionMiddleware, auth routes, protect farms/dashboard |
| `backend/tests/test_auth.py` | Login, me, logout, isolation, protected routes |
| `frontend/src/api.ts` | `credentials: 'include'`; login/logout/me helpers |
| `frontend/src/auth.tsx` | AuthProvider + `useAuth` |
| `frontend/src/components/LoginPage.tsx` | Email/password form |
| `frontend/src/App.tsx` | Gate: loading → login → role shell |
| `frontend/src/components/AppShell.tsx` | Show user email + Logout |
| `.gitignore` | Ensure `*.db` ignored |
| `TODO-LIST.md` / `MEMORY.md` | Tick slice 1 when done |

---

### Task 1: SQLite models + password helpers

**Files:**
- Create: `backend/db.py`
- Create: `backend/models.py`
- Create: `backend/auth_passwords.py`
- Modify: `backend/requirements.txt`
- Modify: `.gitignore` (add `*.db` if missing)
- Test: `backend/tests/test_passwords.py`

**Interfaces:**
- Produces: `get_db()`, `Customer`, `User`, `hash_password(plain: str) -> str`, `verify_password(plain: str, hashed: str) -> bool`
- Consumes: nothing prior

- [ ] **Step 1: Add dependencies**

Append to `backend/requirements.txt`:

```
sqlalchemy
passlib[bcrypt]
python-multipart
httpx
pytest
```

Run:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Expected: packages install cleanly.

- [ ] **Step 2: Write failing password test**

Create `backend/tests/test_passwords.py`:

```python
from auth_passwords import hash_password, verify_password


def test_hash_and_verify_roundtrip():
    h = hash_password("secret-pass")
    assert h != "secret-pass"
    assert verify_password("secret-pass", h)
    assert not verify_password("wrong", h)
```

- [ ] **Step 3: Run test — expect fail**

```powershell
cd backend
pytest tests/test_passwords.py -v
```

Expected: FAIL (module missing) or import error.

- [ ] **Step 4: Implement `auth_passwords.py`, `db.py`, `models.py`**

`backend/auth_passwords.py`:

```python
from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)
```

`backend/db.py`:

```python
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DB_PATH = Path(__file__).resolve().parent / "poultry.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from models import Customer, User  # noqa: F401

    Base.metadata.create_all(bind=engine)
```

`backend/models.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    users: Mapped[list["User"]] = relationship(back_populates="customer")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.id"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # owner | farm_manager
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    customer: Mapped["Customer"] = relationship(back_populates="users")
```

Ensure `.gitignore` contains `*.db`.

- [ ] **Step 5: Re-run password test**

```powershell
cd backend
pytest tests/test_passwords.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit** (only if user asked for commits; otherwise skip)

```bash
git add backend/requirements.txt backend/db.py backend/models.py backend/auth_passwords.py backend/tests/test_passwords.py .gitignore
git commit -m "feat(auth): add SQLite user models and password hashing"
```

---

### Task 2: Session auth API + seed script

**Files:**
- Create: `backend/auth.py`
- Create: `backend/seed.py`
- Create: `backend/schemas_auth.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_auth_api.py`

**Interfaces:**
- Consumes: `User`, `get_db`, `hash_password`, `verify_password`, `init_db`
- Produces:
  - `POST /api/auth/login` body `{email, password}` → sets session; returns `{id, email, role, customer_id}`
  - `POST /api/auth/logout` → clears session
  - `GET /api/auth/me` → same user payload or 401
  - `require_user` FastAPI dependency returning User
  - Session key: `user_id`
  - Seed: `owner@demo.local` / `owner-pass` and `manager@demo.local` / `manager-pass` under customer `Demo Farms`

- [ ] **Step 1: Write failing API tests**

Create `backend/tests/conftest.py` that uses a temp SQLite DB (override `DATABASE_URL` / recreate engine) OR delete `poultry.db` in fixture and call `init_db` + seed helpers.

Minimal `backend/tests/test_auth_api.py`:

```python
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_login_me_logout_roundtrip():
    # Assumes seed ran in fixture: owner@demo.local / owner-pass
    r = client.post(
        "/api/auth/login",
        json={"email": "owner@demo.local", "password": "owner-pass"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "owner"
    assert body["email"] == "owner@demo.local"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["id"] == body["id"]

    out = client.post("/api/auth/logout")
    assert out.status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_farms_requires_auth():
    assert client.get("/api/farms").status_code == 401
```

Use a pytest fixture that seeds before tests (implement alongside seed helpers).

- [ ] **Step 2: Run tests — expect fail**

```powershell
cd backend
pytest tests/test_auth_api.py -v
```

Expected: FAIL (routes missing / 401 not enforced).

- [ ] **Step 3: Implement session auth + wire `main.py`**

Use Starlette `SessionMiddleware` with a secret from env `PF_SESSION_SECRET` defaulting to a local-only string.

`backend/schemas_auth.py`:

```python
from pydantic import BaseModel, EmailStr, Field


class LoginBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    customer_id: str
```

`backend/auth.py` (core):

```python
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from auth_passwords import verify_password
from db import get_db
from models import User

SESSION_USER_KEY = "user_id"


def user_to_out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "customer_id": user.customer_id,
    }


def require_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get(SESSION_USER_KEY)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.get(User, user_id)
    if user is None:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_owner(user: User = Depends(require_user)) -> User:
    if user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.lower().strip()).one_or_none()
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user
```

In `main.py`:

- Call `init_db()` at startup
- `app.add_middleware(SessionMiddleware, secret_key=os.getenv("PF_SESSION_SECRET", "dev-only-change-me"), same_site="lax", https_only=False)`
- Add login / logout / me routes
- Change `farms` and `dashboard` to `Depends(require_user)` (still return mock data)

Login sets `request.session[SESSION_USER_KEY] = user.id`.

- [ ] **Step 4: Implement `seed.py`**

```powershell
cd backend
python seed.py
```

Script creates customer + owner + manager if missing. Print credentials.

- [ ] **Step 5: Re-run API tests**

```powershell
cd backend
pytest tests/test_auth_api.py -v
```

Expected: PASS.

- [ ] **Step 6: Manual smoke**

```powershell
# terminal 1
uvicorn main:app --reload --port 8010
```

```powershell
# after seed
curl -c cookies.txt -X POST http://localhost:8010/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"owner@demo.local\",\"password\":\"owner-pass\"}"
curl -b cookies.txt http://localhost:8010/api/auth/me
curl -b cookies.txt http://localhost:8010/api/farms
```

Expected: login 200, me 200, farms 200 with cookie; farms 401 without cookie.

---

### Task 3: Frontend auth gate + login page

**Files:**
- Create: `frontend/src/auth.tsx`
- Create: `frontend/src/components/LoginPage.tsx`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/AppShell.tsx`
- Modify: `frontend/src/main.tsx` (wrap AuthProvider)
- Modify: `frontend/src/types.ts` (add `AuthUser`)

**Interfaces:**
- Consumes: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Produces: `useAuth()` → `{ user, loading, login, logout, refresh }`

- [ ] **Step 1: Update `api.ts` for credentials**

```typescript
async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}
```

Add `login`, `logout`, `fetchMe`. Keep `fetchFarms` / `fetchDashboard` on `requestJson`.

- [ ] **Step 2: AuthProvider**

On mount call `fetchMe`; 401 → `user = null`. Provide login/logout.

- [ ] **Step 3: LoginPage**

Kumo inputs + button. Submit → `login(email, password)` → on success AuthProvider sets user. Show error text on failure. Layout: single column, max-width ~24rem, centered — works on phone/tablet/desktop.

- [ ] **Step 4: Gate App**

```tsx
if (loading) return <Loader />
if (!user) return <LoginPage />
if (user.role === 'farm_manager') {
  return <ManagerHomePlaceholder onLogout={logout} user={user} />
}
// existing Owner dashboard
```

Manager placeholder: short Text “Manager home coming in daily ops” + Logout. Do not build full manager UI here.

- [ ] **Step 5: AppShell logout**

Footer: email + Logout button calling `logout()` then clear local auth state.

- [ ] **Step 6: Verify**

```powershell
cd frontend
npm run build
```

Expected: typecheck + build succeed.

Manual: open `http://localhost:5173`, login as owner, see dashboard; logout; login as manager, see placeholder; farms API fails without cookie (Network tab).

---

### Task 4: Docs tick

**Files:**
- Modify: `TODO-LIST.md` (check item 1 when slice verified)
- Modify: `MEMORY.md` (active phase → slice 2)
- Modify: `docs/roadmap.md` (tick Phase 1 items completed)
- Create optional: `specs/002-auth-tenancy.md` pointing at this plan + product design

- [ ] **Step 1: Update tracking docs after smoke passes**
- [ ] **Step 2: Stop — do not start farms CRUD until TODO item 2**

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| SQLite Customer/User | 1 |
| Cookie session login | 2 |
| Seed Owner (operator provision) | 2 |
| Tenant isolation on farm routes (auth required; customer_id on user) | 2 |
| Frontend login + role-aware shell | 3 |
| Responsive login | 3 |
| Keep mock dashboard data | 2–3 |
| No admin UI / no assignment yet | explicit non-goals |

## Placeholder scan

No TBD steps. Commit steps optional if user has not asked to commit.

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-10-01-auth-tenancy.md`.

**Do not implement until** you confirm the product design + TODO list look good (or say “start slice 1”).

Two execution options when ready:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks
2. **Inline Execution** — execute in this session with checkpoints

Which approach?
