"""SQLAlchemy model for the Action layer."""
from datetime import UTC, datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from src.db.models import Base


class ActionPlan(Base):
    __tablename__ = "action_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)

    source_type = Column(String(20), nullable=False, index=True, default="manual")
    source_id = Column(String(100), nullable=True, index=True)

    assigned_to = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    due_date = Column(DateTime, nullable=True, index=True)
    status = Column(String(20), nullable=False, default="open", index=True)
    priority = Column(String(20), nullable=False, default="medium", index=True)

    county = Column(String(100), nullable=True, index=True)
    sub_county = Column(String(100), nullable=True, index=True)

    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False, index=True
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    closed_at = Column(DateTime, nullable=True)
    closing_note = Column(Text, nullable=True)

    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
