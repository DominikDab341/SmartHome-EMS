"""make existing users home owners

Revision ID: 9c1b7d4e5f02
Revises: 4ad7f0b8c2e1
Create Date: 2026-06-08 23:25:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c1b7d4e5f02"
down_revision: Union[str, Sequence[str], None] = "4ad7f0b8c2e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema/data."""
    op.execute(sa.text("UPDATE users SET role = 'OWNER', house_id = id"))


def downgrade() -> None:
    """Downgrade schema/data."""
    op.execute(sa.text("UPDATE users SET house_id = NULL WHERE role = 'OWNER' AND house_id = id"))
