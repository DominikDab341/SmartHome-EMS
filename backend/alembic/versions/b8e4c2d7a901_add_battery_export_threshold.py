"""add battery export threshold

Revision ID: b8e4c2d7a901
Revises: 9c1b7d4e5f02
Create Date: 2026-06-19 15:35:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8e4c2d7a901"
down_revision: Union[str, Sequence[str], None] = "9c1b7d4e5f02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "system_settings",
        sa.Column(
            "battery_export_threshold_percentage",
            sa.Float(),
            nullable=False,
            server_default=sa.text("80.0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("system_settings", "battery_export_threshold_percentage")
