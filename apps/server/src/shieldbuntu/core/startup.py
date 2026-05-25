from __future__ import annotations

import os
from pathlib import Path

from alembic import command
from alembic.config import Config

from shieldbuntu.core.config import get_settings
from shieldbuntu.core.logging import get_logger


def _alembic_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent.parent


def run_pending_migrations() -> None:
    log = get_logger(__name__)
    root = _alembic_root()
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    cfg.set_main_option("sqlalchemy.url", get_settings().sync_database_url)
    cfg.attributes["configure_logger"] = False
    log.info("db.migrate.start")
    command.upgrade(cfg, "head")
    log.info("db.migrate.done")


def reclaim_data_dir_ownership() -> None:
    if os.geteuid() != 0:
        return
    sudo_uid = os.environ.get("SUDO_UID")
    sudo_gid = os.environ.get("SUDO_GID")
    if not sudo_uid or not sudo_gid:
        return
    uid = int(sudo_uid)
    gid = int(sudo_gid)
    data_dir = get_settings().data_dir
    if not data_dir.exists():
        return
    log = get_logger(__name__)
    chowned = 0
    for path in [data_dir, *data_dir.rglob("*")]:
        try:
            stat = path.stat()
            if stat.st_uid != uid or stat.st_gid != gid:
                os.chown(path, uid, gid)
                chowned += 1
        except OSError:
            continue
    if chowned:
        log.info("data_dir.chown", path=str(data_dir), uid=uid, gid=gid, count=chowned)
