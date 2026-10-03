import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from analytics_api import router as analytics_router
from auth import SESSION_USER_KEY, authenticate, require_user, user_to_out
from dashboard_api import router as dashboard_router
from db import get_db, init_db
from farms_api import router as farms_router
from flocks_api import router as flocks_router
from godown_api import router as godown_router
from logs_api import router as logs_router
from managers_api import router as managers_router
from rates_api import router as rates_router
from models import User
from schemas_auth import LoginBody, UserOut

app = FastAPI(title="PoultryTrack API")
app.include_router(farms_router)
app.include_router(flocks_router)
app.include_router(godown_router)
app.include_router(logs_router)
app.include_router(managers_router)
app.include_router(rates_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("PF_SESSION_SECRET", "dev-only-change-me"),
    same_site="lax",
    https_only=False,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/hello")
def hello():
    return {"message": "Poultry farm API ready"}


@app.post("/api/auth/login", response_model=UserOut)
def login(body: LoginBody, request: Request, db: Session = Depends(get_db)):
    user = authenticate(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    request.session[SESSION_USER_KEY] = user.id
    return user_to_out(user)


@app.post("/api/auth/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(require_user)):
    return user_to_out(user)
