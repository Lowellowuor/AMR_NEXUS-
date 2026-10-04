"""add validation and investigation columns on isolates

Revision ID: 940bfb427cd4
Revises: 85d739b482ca
Create Date: 2026-10-04 15:25:28.743219

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "940bfb427cd4"
down_revision: str | Sequence[str] | None = "85d739b482ca"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "amr_isolate_records",
        sa.Column(
            "validation_state",
            sa.String(length=20),
            nullable=False,
            server_default="unverified",
        ),
    )
    op.add_column(
        "amr_isolate_records",
        sa.Column("validated_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "amr_isolate_records",
        sa.Column("validated_by", sa.Integer(), nullable=True),
    )
    op.add_column(
        "amr_isolate_records",
        sa.Column("validation_notes", sa.Text(), nullable=True),
    )
    op.add_column(
        "amr_isolate_records",
        sa.Column(
            "investigation_status",
            sa.String(length=20),
            nullable=False,
            server_default="none",
        ),
    )
    op.add_column(
        "amr_isolate_records",
        sa.Column("investigation_notes", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_amr_isolate_records_investigation_status",
        "amr_isolate_records",
        ["investigation_status"],
        unique=False,
    )
    op.create_index(
        "ix_amr_isolate_records_validation_state",
        "amr_isolate_records",
        ["validation_state"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_amr_isolate_records_validated_by",
        "amr_isolate_records",
        "users",
        ["validated_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_amr_isolate_records_validated_by",
        "amr_isolate_records",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_amr_isolate_records_validation_state",
        table_name="amr_isolate_records",
    )
    op.drop_index(
        "ix_amr_isolate_records_investigation_status",
        table_name="amr_isolate_records",
    )
    op.drop_column("amr_isolate_records", "investigation_notes")
    op.drop_column("amr_isolate_records", "investigation_status")
    op.drop_column("amr_isolate_records", "validation_notes")
    op.drop_column("amr_isolate_records", "validated_by")
    op.drop_column("amr_isolate_records", "validated_at")
    op.drop_column("amr_isolate_records", "validation_state")
