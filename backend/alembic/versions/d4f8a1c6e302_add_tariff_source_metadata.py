"""add tariff source metadata

Revision ID: d4f8a1c6e302
Revises: c2a7f9e4d601
Create Date: 2026-06-19 17:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4f8a1c6e302"
down_revision: Union[str, Sequence[str], None] = "c2a7f9e4d601"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "system_settings",
        sa.Column(
            "tariff_provider",
            sa.String(length=16),
            nullable=False,
            server_default="PGE",
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column("tariff_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "system_settings",
        sa.Column("tariff_sell_period", sa.String(length=48), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("system_settings", "tariff_sell_period")
    op.drop_column("system_settings", "tariff_updated_at")
    op.drop_column("system_settings", "tariff_provider")
