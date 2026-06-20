"""scope ems tables by user

Revision ID: 4ad7f0b8c2e1
Revises: 0f7c3a9d4b2e
Create Date: 2026-06-08 22:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4ad7f0b8c2e1"
down_revision: Union[str, Sequence[str], None] = "0f7c3a9d4b2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("devices", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_devices_user_id"), "devices", ["user_id"], unique=False)
    op.create_foreign_key(
        "fk_devices_user_id_users",
        "devices",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.add_column("batteries", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_batteries_user_id"), "batteries", ["user_id"], unique=True)
    op.create_foreign_key(
        "fk_batteries_user_id_users",
        "batteries",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.add_column("system_settings", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index(
        op.f("ix_system_settings_user_id"),
        "system_settings",
        ["user_id"],
        unique=True,
    )
    op.create_foreign_key(
        "fk_system_settings_user_id_users",
        "system_settings",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.add_column("energy_logs", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_energy_logs_user_id"), "energy_logs", ["user_id"], unique=False)
    op.create_foreign_key(
        "fk_energy_logs_user_id_users",
        "energy_logs",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_energy_logs_user_id_users", "energy_logs", type_="foreignkey")
    op.drop_index(op.f("ix_energy_logs_user_id"), table_name="energy_logs")
    op.drop_column("energy_logs", "user_id")

    op.drop_constraint("fk_system_settings_user_id_users", "system_settings", type_="foreignkey")
    op.drop_index(op.f("ix_system_settings_user_id"), table_name="system_settings")
    op.drop_column("system_settings", "user_id")

    op.drop_constraint("fk_batteries_user_id_users", "batteries", type_="foreignkey")
    op.drop_index(op.f("ix_batteries_user_id"), table_name="batteries")
    op.drop_column("batteries", "user_id")

    op.drop_constraint("fk_devices_user_id_users", "devices", type_="foreignkey")
    op.drop_index(op.f("ix_devices_user_id"), table_name="devices")
    op.drop_column("devices", "user_id")
