"""HTTP router for role-based alert routing.

Mounted at /modules/role-routing by the module registry. Read for any
authenticated user; write for admin only.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.db.models import User
from src.modules.registry import ModuleMeta
from src.modules.role_routing import service
from src.modules.role_routing.schemas import (
    RoleRoutingRead,
    RoleRoutingResetResponse,
    RoleRoutingUpdate,
)

MODULE_META = ModuleMeta(
    name="role_routing",
    version="0.1.0",
    description="Role-based alert routing for notifications.",
    nav_label="Alert Routing",
    nav_order=60,
)

router = APIRouter(prefix="/modules/role-routing", tags=["role-routing"])


def _require_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )


@router.get("", response_model=list[RoleRoutingRead])
def list_rules(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return service.list_all(db)


@router.patch("/{rule_id}", response_model=RoleRoutingRead)
def update_rule(
    rule_id: int,
    payload: RoleRoutingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    rule = service.get_rule(db, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return service.update_rule(db, rule, payload, updated_by=user.id)


@router.post("/reset-defaults", response_model=RoleRoutingResetResponse)
def reset_defaults(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    restored = service.reset_defaults(db, updated_by=user.id)
    return RoleRoutingResetResponse(restored=restored)
