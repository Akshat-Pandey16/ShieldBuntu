from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Profile(StrEnum):
    CIS_LEVEL_1 = "cis-l1"
    CIS_LEVEL_2 = "cis-l2"
    WORKSTATION = "workstation"
    SERVER = "server"


class TaskCapability(StrEnum):
    APPLY = "apply"
    REVERT = "revert"
    CHECK = "check"


class TaskMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str
    category: str = "general"
    cis_refs: list[str] = Field(default_factory=list)
    profiles: list[Profile] = Field(default_factory=list)
    capabilities: list[TaskCapability] = Field(
        default_factory=lambda: [TaskCapability.APPLY, TaskCapability.CHECK]
    )
    requires_root: bool = True
    tags: list[str] = Field(default_factory=list)
