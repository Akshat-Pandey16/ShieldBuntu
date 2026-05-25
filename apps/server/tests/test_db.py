from __future__ import annotations

from pathlib import Path

from shieldbuntu.core.db import dispose_db, init_db, run_metadata_create_all, session_scope
from shieldbuntu.models.run import (
    EventLevel,
    HardeningEvent,
    HardeningRun,
    RunAction,
    RunStatus,
)


async def test_create_and_load_run(tmp_path: Path) -> None:
    init_db(f"sqlite+aiosqlite:///{tmp_path / 'db.sqlite'}")
    await run_metadata_create_all()
    try:
        async with session_scope() as session:
            run = HardeningRun(task_id="kernel", action=RunAction.APPLY, dry_run=True)
            session.add(run)
            await session.commit()
            await session.refresh(run)
            run_id = run.id

        async with session_scope() as session:
            loaded = await session.get(HardeningRun, run_id)
            assert loaded is not None
            assert loaded.task_id == "kernel"
            assert loaded.action == RunAction.APPLY
            assert loaded.dry_run is True
            assert loaded.status == RunStatus.PENDING
    finally:
        await dispose_db()


async def test_events_cascade_with_run(tmp_path: Path) -> None:
    init_db(f"sqlite+aiosqlite:///{tmp_path / 'db.sqlite'}")
    await run_metadata_create_all()
    try:
        async with session_scope() as session:
            run = HardeningRun(task_id="ssh", action=RunAction.APPLY)
            session.add(run)
            await session.commit()
            await session.refresh(run)
            run_id = run.id

            for i in range(3):
                session.add(
                    HardeningEvent(
                        run_id=run_id,
                        seq=i,
                        level=EventLevel.INFO,
                        message=f"event {i}",
                    )
                )
            await session.commit()

        async with session_scope() as session:
            loaded = await session.get(HardeningRun, run_id)
            assert loaded is not None
            await session.refresh(loaded, attribute_names=["events"])
            assert len(loaded.events) == 3
            assert [e.seq for e in loaded.events] == [0, 1, 2]
    finally:
        await dispose_db()
