from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "8bbed8a27ee6"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "hardening_run",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("host_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("action", sa.Enum("APPLY", "REVERT", "CHECK", name="runaction"), nullable=False),
        sa.Column("dry_run", sa.Boolean(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", name="runstatus"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("exit_code", sa.Integer(), nullable=True),
        sa.Column("summary", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("hardening_run", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_hardening_run_host_id"), ["host_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_hardening_run_status"), ["status"], unique=False)
        batch_op.create_index(batch_op.f("ix_hardening_run_task_id"), ["task_id"], unique=False)

    op.create_table(
        "hardening_event",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("ts", sa.DateTime(), nullable=False),
        sa.Column(
            "level",
            sa.Enum("INFO", "CHANGE", "WARNING", "ERROR", "FATAL", name="eventlevel"),
            nullable=False,
        ),
        sa.Column("message", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["hardening_run.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("hardening_event", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_hardening_event_level"), ["level"], unique=False)
        batch_op.create_index(batch_op.f("ix_hardening_event_run_id"), ["run_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_hardening_event_seq"), ["seq"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("hardening_event", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_hardening_event_seq"))
        batch_op.drop_index(batch_op.f("ix_hardening_event_run_id"))
        batch_op.drop_index(batch_op.f("ix_hardening_event_level"))

    op.drop_table("hardening_event")
    with op.batch_alter_table("hardening_run", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_hardening_run_task_id"))
        batch_op.drop_index(batch_op.f("ix_hardening_run_status"))
        batch_op.drop_index(batch_op.f("ix_hardening_run_host_id"))

    op.drop_table("hardening_run")
