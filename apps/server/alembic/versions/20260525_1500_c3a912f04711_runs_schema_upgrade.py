from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "c3a912f04711"
down_revision: str | None = "a685ccec5d1d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_RUN_STATUSES = ("PENDING", "RUNNING", "SUCCEEDED", "NO_CHANGE", "FAILED", "CANCELLED")

_NAMING = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def upgrade() -> None:
    with op.batch_alter_table(
        "hardening_event", schema=None, naming_convention=_NAMING
    ) as batch_op:
        batch_op.drop_index(batch_op.f("ix_hardening_event_run_id"))
        batch_op.drop_index(batch_op.f("ix_hardening_event_seq"))
        batch_op.drop_constraint("fk_hardening_event_run_id_hardening_run", type_="foreignkey")
        batch_op.create_foreign_key(
            "fk_hardening_event_run_id_hardening_run",
            "hardening_run",
            ["run_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_index(
            "ix_hardening_event_run_seq",
            ["run_id", "seq"],
            unique=True,
        )

    with op.batch_alter_table("hardening_run", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_hardening_run_task_id"))
        batch_op.add_column(
            sa.Column(
                "cancel_requested",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch_op.add_column(
            sa.Column(
                "initiated_by",
                sqlmodel.sql.sqltypes.AutoString(),
                nullable=True,
            )
        )
        batch_op.alter_column(
            "status",
            existing_type=sa.Enum(
                "PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", name="runstatus"
            ),
            type_=sa.Enum(*_RUN_STATUSES, name="runstatus"),
            existing_nullable=False,
        )
        batch_op.create_index(
            "ix_hardening_run_task_started",
            ["task_id", "started_at"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("hardening_run", schema=None) as batch_op:
        batch_op.drop_index("ix_hardening_run_task_started")
        batch_op.alter_column(
            "status",
            existing_type=sa.Enum(*_RUN_STATUSES, name="runstatus"),
            type_=sa.Enum(
                "PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", name="runstatus"
            ),
            existing_nullable=False,
        )
        batch_op.drop_column("initiated_by")
        batch_op.drop_column("cancel_requested")
        batch_op.create_index(batch_op.f("ix_hardening_run_task_id"), ["task_id"], unique=False)

    with op.batch_alter_table(
        "hardening_event", schema=None, naming_convention=_NAMING
    ) as batch_op:
        batch_op.drop_index("ix_hardening_event_run_seq")
        batch_op.drop_constraint("fk_hardening_event_run_id_hardening_run", type_="foreignkey")
        batch_op.create_foreign_key(
            "fk_hardening_event_run_id_hardening_run",
            "hardening_run",
            ["run_id"],
            ["id"],
        )
        batch_op.create_index(batch_op.f("ix_hardening_event_seq"), ["seq"], unique=False)
        batch_op.create_index(batch_op.f("ix_hardening_event_run_id"), ["run_id"], unique=False)
