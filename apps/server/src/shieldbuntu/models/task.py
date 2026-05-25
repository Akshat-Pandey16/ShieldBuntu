from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from shieldbuntu.models.run import RunAction


class Profile(StrEnum):
    CIS_LEVEL_1 = "cis-l1"
    CIS_LEVEL_2 = "cis-l2"
    WORKSTATION = "workstation"
    SERVER = "server"


class TaskInputSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    label: str
    description: str = ""
    secret: bool = False
    required: bool = True
    pattern: str | None = None


class TaskMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str
    category: str = "general"
    cis_refs: list[str] = Field(default_factory=list)
    profiles: list[Profile] = Field(default_factory=list)
    capabilities: list[RunAction] = Field(
        default_factory=lambda: [RunAction.APPLY, RunAction.CHECK]
    )
    requires_root: bool = True
    tags: list[str] = Field(default_factory=list)
    inputs: list[TaskInputSpec] = Field(default_factory=list)
