"""Pydantic v2 schemas for the Action layer."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SourceType = Literal["alert", "prediction", "manual"]
ActionStatus = Literal["open", "in_progress", "done", "cancelled"]
Priority = Literal["low", "medium", "high", "critical"]


class ActionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    source_type: SourceType = "manual"
    source_id: str | None = Field(None, max_length=100)
    assigned_to: int | None = None
    due_date: datetime | None = None
    priority: Priority = "medium"
    county: str | None = Field(None, max_length=100)
    sub_county: str | None = Field(None, max_length=100)


class ActionCreate(ActionBase):
    pass


class ActionUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    assigned_to: int | None = None
    due_date: datetime | None = None
    status: ActionStatus | None = None
    priority: Priority | None = None
    county: str | None = Field(None, max_length=100)
    sub_county: str | None = Field(None, max_length=100)


class ActionClose(BaseModel):
    closing_note: str | None = None
    status: ActionStatus = "done"


class ActionRead(ActionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: ActionStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None
    closing_note: str | None = None
