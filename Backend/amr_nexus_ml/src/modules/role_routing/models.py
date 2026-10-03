"""SQLAlchemy model for role-based alert routing."""

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)

from src.db.models import Base


class RoleRouting(Base):
    __tablename__ = "role_routing"
    __table_args__ = (UniqueConstraint("role", "channel", name="uq_role_routing_role_channel"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    role = Column(String(20), nullable=False, index=True)
    channel = Column(String(20), nullable=False, index=True)
    min_severity = Column(String(20), nullable=False, default="medium")
    enabled = Column(Boolean, nullable=False, default=True)

    updated_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
