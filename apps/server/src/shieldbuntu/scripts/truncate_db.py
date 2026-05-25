from __future__ import annotations

import asyncio

from sqlalchemy import MetaData

from shieldbuntu.core.config import get_settings
from shieldbuntu.core.db import dispose_db, get_engine, init_db


async def truncate_all_tables() -> int:
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
                if table.name == "alembic_version":
                    continue
                await conn.execute(table.delete())
                deleted += 1
            return deleted
    finally:
        await dispose_db()


def main() -> None:
    count = asyncio.run(truncate_all_tables())
    print(f"Truncated {count} table(s)")


if __name__ == "__main__":
    main()
