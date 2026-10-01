"""HTTP router for the Action layer.

Mounted at /modules/actions by the module registry. Requires
authentication (via the global AuthMiddleware). Any authenticated user
can create; only the assignee, the creator, or an admin can update or
close an action.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.db.models import User
from src.modules.actions import service
from src.modules.actions.schemas import (
    ActionClose,
    ActionCreate,
    ActionRead,
    ActionUpdate,
)
from src.modules.registry import ModuleMeta

MODULE_META = ModuleMeta(
    name="actions",
    version="0.1.0",
    description="Action layer: track follow-up on alerts and predictions.",
    nav_label="Actions",
    nav_order=50,
)

router = APIRouter(prefix="/modules/actions", tags=["actions"])


def _can_modify(action, user: User) -> bool:
    if user.role == "admin":
        return True
    if action.created_by == user.id:
        return True
    if action.assigned_to == user.id:
        return True
    return False


@router.get("", response_model=list[ActionRead])
def list_actions(
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
    assigned_to: int | None = Query(None),
    county: str | None = Query(None),
    source_type: str | None = Query(None),
    source_id: str | None = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return service.list_actions(
        db,
        status=status_filter,
        priority=priority,
        assigned_to=assigned_to,
        county=county,
        source_type=source_type,
        source_id=source_id,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=ActionRead, status_code=status.HTTP_201_CREATED)
def create_action(
    payload: ActionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.create_action(db, payload, created_by=user.id)


@router.get("/mine", response_model=list[ActionRead])
def my_actions(
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.list_actions(db, assigned_to=user.id, status=status_filter)


@router.get("/{action_id}", response_model=ActionRead)
def get_action(
    action_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    action = service.get_action(db, action_id)
    if action is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Action not found"
        )
    return action


@router.patch("/{action_id}", response_model=ActionRead)
def update_action(
    action_id: int,
    payload: ActionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    action = service.get_action(db, action_id)
    if action is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Action not found"
        )
    if not _can_modify(action, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assignee, creator, or admin can update",
        )
    return service.update_action(db, action, payload)


@router.post("/{action_id}/close", response_model=ActionRead)
def close_action(
    action_id: int,
    payload: ActionClose,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    action = service.get_action(db, action_id)
    if action is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Action not found"
        )
    if not _can_modify(action, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assignee, creator, or admin can close",
        )
    return service.close_action(db, action, payload)
