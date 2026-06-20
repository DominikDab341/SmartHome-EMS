"""add energy log interval

Revision ID: c2a7f9e4d601
Revises: b8e4c2d7a901
Create Date: 2026-06-19 15:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2a7f9e4d601"
down_revision: Union[str, Sequence[str], None] = "b8e4c2d7a901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "energy_logs",
        sa.Column(
            "interval_seconds",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("60"),
        ),
    )
    op.alter_column(
        "energy_logs",
        "interval_seconds",
        server_default=sa.text("1800"),
    )


def downgrade() -> None:
    op.drop_column("energy_logs", "interval_seconds")
