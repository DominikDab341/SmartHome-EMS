"""add weather preset

Revision ID: e5a9c3f7b204
Revises: d4f8a1c6e302
Create Date: 2026-06-20 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5a9c3f7b204"
down_revision: Union[str, Sequence[str], None] = "d4f8a1c6e302"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "system_settings",
        sa.Column(
            "weather_preset",
            sa.String(length=24),
            nullable=False,
            server_default="live",
        ),
    )


def downgrade() -> None:
    op.drop_column("system_settings", "weather_preset")
