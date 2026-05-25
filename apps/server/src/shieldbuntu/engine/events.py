from __future__ import annotations

from typing import Any

from shieldbuntu.models.run import EventLevel

_OK_EVENTS = {"runner_on_ok", "runner_item_on_ok"}
_FAIL_EVENTS = {"runner_on_failed", "runner_item_on_failed", "runner_on_unreachable"}
_FATAL_EVENTS = {"error"}
_SKIPPED_EVENTS = {"runner_on_skipped", "runner_item_on_skipped"}


def parse_event(raw: dict[str, Any], seq: int) -> dict[str, Any]:
    event_type = raw.get("event", "")
    event_data = raw.get("event_data") or {}
    task = event_data.get("task") or ""
    host = event_data.get("host") or ""
    res = event_data.get("res") or {}

    if event_type in _FATAL_EVENTS:
        level = EventLevel.FATAL
    elif event_type in _FAIL_EVENTS:
        level = EventLevel.ERROR
    elif event_type in _OK_EVENTS and res.get("changed"):
        level = EventLevel.CHANGE
    elif event_type in _SKIPPED_EVENTS:
        level = EventLevel.INFO
    else:
        level = EventLevel.INFO

    if event_type == "playbook_on_play_start":
        message = f"PLAY: {event_data.get('name') or task}"
    elif event_type == "playbook_on_task_start":
        message = f"TASK: {task}"
    elif event_type in _OK_EVENTS:
        marker = "CHANGED" if res.get("changed") else "OK"
        message = f"{marker} [{host}]: {task}"
    elif event_type in _FAIL_EVENTS:
        msg = res.get("msg") or "failed"
        message = f"FAILED [{host}]: {task} — {msg}"
    elif event_type in _SKIPPED_EVENTS:
        message = f"SKIPPED [{host}]: {task}"
    elif event_type == "playbook_on_stats":
        message = "PLAY RECAP"
    else:
        message = (raw.get("stdout") or event_type)[:200]

    return {"seq": seq, "level": level, "message": message, "payload": raw}


def summarise_stats(stats: dict[str, Any]) -> dict[str, Any]:
    if not stats:
        return {}
    summary: dict[str, Any] = {}
    for key in ("ok", "changed", "failures", "skipped", "dark", "rescued", "ignored"):
        bucket = stats.get(key)
        if isinstance(bucket, dict):
            summary[key] = sum(bucket.values())
    return summary
