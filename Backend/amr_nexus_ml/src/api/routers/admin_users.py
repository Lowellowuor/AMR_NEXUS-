import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from typing import Optional
from pydantic import BaseModel, EmailStr

from src.api.deps import get_db, require_admin
from src.db.models import User, AuditEvent
from src.core.security import hash_password

router = APIRouter()

VALID_ROLES = {"admin", "analyst", "clinician", "viewer"}


def _generate_temp_password() -> str:
    """Generate a strong random 12-char password."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(12))


def _serialize(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "assigned_county": u.assigned_county,
        "is_active": bool(u.is_active),
        "must_change_password": bool(u.must_change_password),
        "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


class UserCreate(BaseModel):
    email: str
    name: str
    role: str = "analyst"
    assigned_county: Optional[str] = None
    initial_password: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    assigned_county: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/users")
async def list_users(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(User)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(or_(
            func.lower(User.email).like(like),
            func.lower(User.name).like(like),
        ))
    rows = q.order_by(desc(User.created_at)).all()
    return [_serialize(u) for u in rows]


@router.post("/users", status_code=201)
async def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    email = (payload.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name required")
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {sorted(VALID_ROLES)}")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="A user with that email already exists")

    temp_password = payload.initial_password or _generate_temp_password()
    if len(temp_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user = User(
        email=email,
        name=payload.name.strip(),
        hashed_password=hash_password(temp_password),
        role=payload.role,
        assigned_county=payload.assigned_county or None,
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="create",
        resource="user",
        resource_id=str(user.id),
        method="POST",
        path="/admin/users",
        status_code=201,
        result="success",
    ))
    db.commit()

    return {
        "user": _serialize(user),
        "temp_password": temp_password,
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.role is not None and payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role")

    # Prevent admin from disabling or demoting themselves
    if user.id == current_user.id:
        if payload.is_active is False:
            raise HTTPException(status_code=400, detail="You cannot disable your own account")
        if payload.role is not None and payload.role != "admin":
            raise HTTPException(status_code=400, detail="You cannot change your own role")

    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.role is not None:
        user.role = payload.role
        # Force re-login on role change
        user.token_version = (user.token_version or 1) + 1
    if payload.assigned_county is not None:
        user.assigned_county = payload.assigned_county or None
    if payload.is_active is not None:
        user.is_active = payload.is_active
        if not payload.is_active:
            user.token_version = (user.token_version or 1) + 1

    db.commit()
    db.refresh(user)

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="update",
        resource="user",
        resource_id=str(user.id),
        method="PATCH",
        path=f"/admin/users/{user_id}",
        status_code=200,
        result="success",
    ))
    db.commit()

    return _serialize(user)


@router.post("/users/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp = _generate_temp_password()
    user.hashed_password = hash_password(temp)
    user.must_change_password = True
    user.token_version = (user.token_version or 1) + 1
    db.commit()

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="update",
        resource="user_password",
        resource_id=str(user.id),
        method="POST",
        path=f"/admin/users/{user_id}/reset-password",
        status_code=200,
        result="success",
    ))
    db.commit()

    return {"user_id": user.id, "temp_password": temp}


@router.delete("/users/{user_id}", status_code=204)
async def disable_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")

    user.is_active = False
    user.token_version = (user.token_version or 1) + 1
    db.commit()

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="delete",
        resource="user",
        resource_id=str(user.id),
        method="DELETE",
        path=f"/admin/users/{user_id}",
        status_code=204,
        result="success",
    ))
    db.commit()
    return None
