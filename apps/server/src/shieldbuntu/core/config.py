from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


def _server_root() -> Path:
    return Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SHIELDBUNTU_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = "127.0.0.1"
    port: int = 8000
    dev_mode: bool = True
    log_level: LogLevel = "INFO"

    data_dir: Path = Field(default_factory=lambda: Path.cwd() / "var")
    ansible_root: Path = Field(default_factory=lambda: Path.cwd() / "ansible")
    alembic_root: Path = Field(default_factory=_server_root)

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    login_max_attempts: int = 5
    login_window_seconds: int = 60
    login_lockout_seconds: int = 300

    event_payload_max_bytes: int = 4096
    event_flush_interval_ms: int = 250
    event_flush_batch_size: int = 32

    session_purge_interval_seconds: int = 3600

    @property
    def database_url(self) -> str:
        return f"sqlite+aiosqlite:///{self.data_dir / 'shieldbuntu.db'}"

    @property
    def sync_database_url(self) -> str:
        return f"sqlite:///{self.data_dir / 'shieldbuntu.db'}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    get_settings.cache_clear()
