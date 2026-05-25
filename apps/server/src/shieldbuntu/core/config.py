from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


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

    @property
    def database_url(self) -> str:
        return f"sqlite+aiosqlite:///{self.data_dir / 'shieldbuntu.db'}"

    @property
    def sync_database_url(self) -> str:
        return f"sqlite:///{self.data_dir / 'shieldbuntu.db'}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
