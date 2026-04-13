"""create users table

Revision ID: 69dd40a4
Revises: 
Create Date: 2026-04-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '69dd40a4'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the UserRole enum type in PostgreSQL
    userrole_enum = postgresql.ENUM(
        'ADMIN', 'OWNER', 'RESIDENT',
        name='userrole',
        create_type=True,
    )
    userrole_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column(
            'role',
            sa.Enum('ADMIN', 'OWNER', 'RESIDENT', name='userrole', create_type=False),
            nullable=False,
        ),
        sa.Column('house_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ['house_id'],
            ['houses.id'],
            ondelete='SET NULL',
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'),    'users', ['email'],    unique=True)
    op.create_index(op.f('ix_users_house_id'), 'users', ['house_id'], unique=False)
    op.create_index(op.f('ix_users_id'),       'users', ['id'],       unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'),       table_name='users')
    op.drop_index(op.f('ix_users_house_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'),    table_name='users')
    op.drop_table('users')

    postgresql.ENUM(name='userrole').drop(op.get_bind(), checkfirst=True)
