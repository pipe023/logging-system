"""add machine_id and metrics columns

Revision ID: 89a2b0984fce
Revises: e7f13aa54d3a
Create Date: 2026-08-13 09:14:31.293977

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '89a2b0984fce'
down_revision: Union[str, Sequence[str], None] = 'e7f13aa54d3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('logs', sa.Column('machine_id', sa.String(length=100), nullable=True))
    op.add_column('logs', sa.Column('metrics', sa.JSON(), nullable=True))
    op.create_index(op.f('ix_logs_machine_id'), 'logs', ['machine_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_logs_machine_id'), table_name='logs')
    op.drop_column('logs', 'metrics')
    op.drop_column('logs', 'machine_id')