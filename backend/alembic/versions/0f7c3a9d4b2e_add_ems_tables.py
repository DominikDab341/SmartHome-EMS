"""add ems tables

Revision ID: 0f7c3a9d4b2e
Revises: f31f23b2a11f
Create Date: 2026-06-02 23:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0f7c3a9d4b2e"
down_revision: Union[str, Sequence[str], None] = "f31f23b2a11f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


device_type = postgresql.ENUM(
    "APPLIANCE",
    "SOLAR",
    name="devicetype",
    create_type=False,
)
strategy_type = postgresql.ENUM(
    "MAXIMIZE_PROFIT",
    "ECO_FRIENDLY",
    "BATTERY_LIFE",
    name="strategytype",
    create_type=False,
)


def upgrade() -> None:
    """Upgrade schema."""
    device_type.create(op.get_bind(), checkfirst=True)
    strategy_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=96), nullable=False),
        sa.Column("type", device_type, nullable=False),
        sa.Column("max_power_kw", sa.Float(), nullable=False),
        sa.Column("current_power_kw", sa.Float(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_devices_id"), "devices", ["id"], unique=False)
    op.create_index(op.f("ix_devices_name"), "devices", ["name"], unique=False)

    op.create_table(
        "batteries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("total_capacity_kwh", sa.Float(), nullable=False),
        sa.Column("current_charge_kwh", sa.Float(), nullable=False),
        sa.Column("min_safe_percentage", sa.Float(), nullable=False),
        sa.Column("max_charge_rate_kw", sa.Float(), nullable=False),
        sa.Column("max_discharge_rate_kw", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_batteries_id"), "batteries", ["id"], unique=False)

    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("active_strategy", strategy_type, nullable=False),
        sa.Column("grid_buy_price", sa.Float(), nullable=False),
        sa.Column("grid_sell_price", sa.Float(), nullable=False),
        sa.Column("location_name", sa.String(length=96), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_system_settings_id"), "system_settings", ["id"], unique=False)

    op.create_table(
        "energy_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("total_consumption_kwh", sa.Float(), nullable=False),
        sa.Column("total_production_kwh", sa.Float(), nullable=False),
        sa.Column("grid_bought_kwh", sa.Float(), nullable=False),
        sa.Column("grid_sold_kwh", sa.Float(), nullable=False),
        sa.Column("battery_charged_kwh", sa.Float(), nullable=False),
        sa.Column("battery_discharged_kwh", sa.Float(), nullable=False),
        sa.Column("cost", sa.Float(), nullable=False),
        sa.Column("revenue", sa.Float(), nullable=False),
        sa.Column("strategy", strategy_type, nullable=False),
        sa.Column("weather_cloud_cover", sa.Float(), nullable=False),
        sa.Column("solar_factor", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_energy_logs_id"), "energy_logs", ["id"], unique=False)
    op.create_index(op.f("ix_energy_logs_timestamp"), "energy_logs", ["timestamp"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_energy_logs_timestamp"), table_name="energy_logs")
    op.drop_index(op.f("ix_energy_logs_id"), table_name="energy_logs")
    op.drop_table("energy_logs")

    op.drop_index(op.f("ix_system_settings_id"), table_name="system_settings")
    op.drop_table("system_settings")

    op.drop_index(op.f("ix_batteries_id"), table_name="batteries")
    op.drop_table("batteries")

    op.drop_index(op.f("ix_devices_name"), table_name="devices")
    op.drop_index(op.f("ix_devices_id"), table_name="devices")
    op.drop_table("devices")

    strategy_type.drop(op.get_bind(), checkfirst=True)
    device_type.drop(op.get_bind(), checkfirst=True)
