"""SQLAlchemy model for Sampling Sites."""
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from src.db.models import Base


class SamplingSite(Base):
    __tablename__ = "sampling_sites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    site_type = Column(String(30), nullable=False, default="other", index=True)
    sector = Column(String(20), nullable=False, default="human", index=True)
    county = Column(String(100), nullable=False, index=True)
    sub_county = Column(String(100), nullable=True)
    latitude = Column(Numeric(8, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    owner_name = Column(String(200), nullable=True)
    owner_contact = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
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

    creator = relationship("User", foreign_keys=[created_by])
