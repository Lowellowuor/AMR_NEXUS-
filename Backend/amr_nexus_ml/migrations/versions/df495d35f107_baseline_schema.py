"""baseline schema (empty)

This migration is intentionally empty. It captures the state of the
database as it exists today, produced by `Base.metadata.create_all()` on
application startup.

Rationale: SQLite stores SQLAlchemy `UUID` columns as `NUMERIC`. Alembic's
autogenerate sees this as drift and would try to rebuild tables to change
the storage type. On PostgreSQL (production) there is no such drift -
`UUID` is native. Therefore the correct baseline is a no-op: the schema is
already at the desired state.

The existing database is marked at this revision with:

    alembic stamp head

Future schema changes autogenerate against `Base.metadata` and are the
only migrations that perform work.

Revision ID: df495d35f107
Revises:
Create Date: 2026-10-01 08:29:53.723785

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401


revision: str = 'df495d35f107'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Baseline - no-op by design. See module docstring."""
    pass


def downgrade() -> None:
    """Baseline - no-op by design. See module docstring."""
    pass