"""Business logic for the Action layer."""

from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from src.modules.actions.models import ActionPlan
from src.modules.actions.schemas import (
    ActionClose,
    ActionCreate,
    ActionUpdate,
)


def list_actions(
    db: Session,
    status: str | None = None,
    priority: str | None = None,
    assigned_to: int | None = None,
    county: str | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[ActionPlan]:
    stmt = select(ActionPlan)
    if status:
        stmt = stmt.where(ActionPlan.status == status)
    if priority:
        stmt = stmt.where(ActionPlan.priority == priority)
    if assigned_to is not None:
        stmt = stmt.where(ActionPlan.assigned_to == assigned_to)
    if county:
        stmt = stmt.where(ActionPlan.county == county)
    if source_type:
        stmt = stmt.where(ActionPlan.source_type == source_type)
    if source_id:
        stmt = stmt.where(ActionPlan.source_id == source_id)
    stmt = stmt.order_by(desc(ActionPlan.created_at)).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def get_action(db: Session, action_id: int) -> ActionPlan | None:
    return db.get(ActionPlan, action_id)


def create_action(db: Session, payload: ActionCreate, created_by: int) -> ActionPlan:
    action = ActionPlan(
        **payload.model_dump(),
        created_by=created_by,
    )
    if action.assigned_to is None:
        action.assigned_to = created_by
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


def update_action(db: Session, action: ActionPlan, payload: ActionUpdate) -> ActionPlan:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(action, key, value)
    db.commit()
    db.refresh(action)
    return action


def close_action(db: Session, action: ActionPlan, payload: ActionClose) -> ActionPlan:
    action.status = payload.status
    action.closing_note = payload.closing_note
    action.closed_at = datetime.now(UTC)
    db.commit()
    db.refresh(action)
    return action
