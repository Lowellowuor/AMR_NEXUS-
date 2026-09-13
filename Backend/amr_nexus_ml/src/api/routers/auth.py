from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from src.api.deps import get_db
from src.db.models import User
from src.core.security import verify_password, create_access_token
from src.db.models import AuditEvent

router = APIRouter()


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=LoginResponse)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = (form.username or "").strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled. Contact your administrator.")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(user.id, user.role, user.email, user.token_version)

    db.add(AuditEvent(
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role,
        action="login",
        resource="session",
        resource_id=str(user.id),
        method="POST",
        path="/auth/login",
        status_code=200,
        result="success",
    ))
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "assigned_county": user.assigned_county,
            "must_change_password": bool(user.must_change_password),
        },
    }


@router.get("/verify")
def verify():
    return {"status": "auth-ready"}
