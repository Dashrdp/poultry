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
