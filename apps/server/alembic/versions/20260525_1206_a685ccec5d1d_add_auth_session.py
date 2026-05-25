from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "a685ccec5d1d"
down_revision: str | None = "8bbed8a27ee6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "auth_session",
        sa.Column("token", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("username", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(), nullable=False),
        sa.Column("ip_address", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("user_agent", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint("token"),
    )
    with op.batch_alter_table("auth_session", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_auth_session_expires_at"), ["expires_at"], unique=False
        )
        batch_op.create_index(batch_op.f("ix_auth_session_username"), ["username"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("auth_session", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_auth_session_username"))
        batch_op.drop_index(batch_op.f("ix_auth_session_expires_at"))

    op.drop_table("auth_session")
