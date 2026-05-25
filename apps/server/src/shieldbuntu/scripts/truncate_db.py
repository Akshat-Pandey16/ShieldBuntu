from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import MetaData

from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import dispose_db, get_engine, init_db

_DEFAULT_PRESERVED = ("alembic_version", "auth_session")


async def truncate_all_tables(*, preserve: tuple[str, ...]) -> int:
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    init_db(settings.database_url)
    engine = get_engine()
    try:
        metadata = MetaData()
        async with engine.begin() as conn:
            await conn.run_sync(metadata.reflect)
            deleted = 0
            for table in reversed(metadata.sorted_tables):
                if table.name in preserve:
                    continue
                await conn.execute(table.delete())
                deleted += 1
            return deleted
    finally:
        await dispose_db()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Truncate ShieldBuntu tables (run data, sessions, etc).",
    )
    parser.add_argument(
        "--include-sessions",
        action="store_true",
        help="Also truncate auth_session (default: preserved).",
    )
    args = parser.parse_args()

    preserve = ("alembic_version",) if args.include_sessions else _DEFAULT_PRESERVED
    count = asyncio.run(truncate_all_tables(preserve=preserve))
    print(f"Truncated {count} table(s); preserved {list(preserve)}")


if __name__ == "__main__":
    main()
