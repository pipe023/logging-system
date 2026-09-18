"""delete_logs_with_null_path

Revision ID: 6f3748e3bdf9
Revises: 89a2b0984fce
Create Date: 2026-08-19 15:40:36.504365

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f3748e3bdf9'
down_revision: Union[str, Sequence[str], None] = '89a2b0984fce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
