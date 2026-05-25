from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from shieldbuntu.models.run import EventLevel, HardeningEvent

_OK_EVENTS = {"runner_on_ok", "runner_item_on_ok"}
_FAIL_EVENTS = {"runner_on_failed", "runner_item_on_failed", "runner_on_unreachable"}
_FATAL_EVENTS = {"error"}
_SKIPPED_EVENTS = {"runner_on_skipped", "runner_item_on_skipped"}
_WARNING_EVENTS = {"warning", "runner_on_warning"}

_MAX_MESSAGE_LEN = 512


def _truncate(value: str, limit: int = _MAX_MESSAGE_LEN) -> str:
    if len(value) <= limit:
        return value
    return value[: limit - 1] + "…"


def _shrink_payload(raw: dict[str, Any], max_bytes: int) -> dict[str, Any]:
    encoded = json.dumps(raw, default=str)
    if len(encoded.encode("utf-8")) <= max_bytes:
        return raw
    pruned = dict(raw)
    event_data = dict(pruned.get("event_data") or {})
    for key in ("stdout", "stderr"):
        val = event_data.get(key)
        if isinstance(val, str) and len(val) > 256:
            event_data[key] = val[:256] + "…[truncated]"
    res = dict(event_data.get("res") or {})
    for key in ("stdout", "stderr", "msg", "module_stdout", "module_stderr"):
        val = res.get(key)
        if isinstance(val, str) and len(val) > 512:
            res[key] = val[:512] + "…[truncated]"
    if res:
        event_data["res"] = res
    pruned["event_data"] = event_data
    if "stdout" in pruned and isinstance(pruned["stdout"], str) and len(pruned["stdout"]) > 256:
        pruned["stdout"] = pruned["stdout"][:256] + "…[truncated]"
    encoded = json.dumps(pruned, default=str)
    if len(encoded.encode("utf-8")) <= max_bytes:
        return pruned
    return {
        "event": pruned.get("event"),
        "truncated": True,
        "original_size": len(encoded),
    }


def _classify(event_type: str, res: dict[str, Any]) -> EventLevel:
    if event_type in _FATAL_EVENTS:
        return EventLevel.FATAL
    if event_type in _FAIL_EVENTS:
        return EventLevel.ERROR
    if event_type in _WARNING_EVENTS:
        return EventLevel.WARNING
    if event_type in _OK_EVENTS and res.get("changed"):
        return EventLevel.CHANGE
    return EventLevel.INFO


def _format_message(event_type: str, event_data: dict[str, Any], res: dict[str, Any]) -> str:
    task = event_data.get("task") or ""
    host = event_data.get("host") or ""

    if event_type == "playbook_on_play_start":
        message = f"PLAY: {event_data.get('name') or task}"
    elif event_type == "playbook_on_task_start":
        message = f"TASK: {task}"
    elif event_type in _OK_EVENTS:
        marker = "CHANGED" if res.get("changed") else "OK"
        message = f"{marker} [{host}]: {task}"
    elif event_type in _FAIL_EVENTS:
        message = f"FAILED [{host}]: {task} — {res.get('msg') or 'failed'}"
    elif event_type in _SKIPPED_EVENTS:
        message = f"SKIPPED [{host}]: {task}"
    elif event_type in _WARNING_EVENTS:
        warn = res.get("msg") or event_data.get("warning") or "warning"
        message = f"WARNING [{host}]: {task or event_type} — {warn}"
    elif event_type == "playbook_on_stats":
        message = "PLAY RECAP"
    else:
        message = event_data.get("stdout") or event_type
    return _truncate(message)


def build_event(
    run_id: UUID, raw: dict[str, Any], seq: int, *, max_payload_bytes: int
) -> HardeningEvent:
    event_type = raw.get("event", "")
    event_data = raw.get("event_data") or {}
    res = event_data.get("res") or {}
    level = _classify(event_type, res)
    message = _format_message(event_type, event_data, res)
    payload = _shrink_payload(raw, max_payload_bytes)
    return HardeningEvent(
        run_id=run_id,
        seq=seq,
        level=level,
        message=message,
        payload=payload,
        ts=datetime.now(UTC),
    )


_STATS_KEY_MAP = (
    ("ok", "ok"),
    ("changed", "changed"),
    ("failures", "failures"),
    ("skipped", "skipped"),
    ("dark", "unreachable"),
    ("rescued", "rescued"),
    ("ignored", "ignored"),
)


def summarise_stats(stats: dict[str, Any]) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "ok": 0,
        "changed": 0,
        "failures": 0,
        "skipped": 0,
        "unreachable": 0,
        "rescued": 0,
        "ignored": 0,
    }
    if not stats:
        return summary
    for stats_key, out_key in _STATS_KEY_MAP:
        bucket = stats.get(stats_key)
        if isinstance(bucket, dict) and bucket:
            summary[out_key] = sum(int(v) for v in bucket.values() if isinstance(v, int | float))
    return summary
