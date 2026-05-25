from __future__ import annotations

from shieldbuntu.engine.events import parse_event, summarise_stats
from shieldbuntu.models.run import EventLevel


def test_task_start_event() -> None:
    parsed = parse_event(
        {"event": "playbook_on_task_start", "event_data": {"task": "Apply sysctl"}}, seq=1
    )
    assert parsed["seq"] == 1
    assert parsed["level"] == EventLevel.INFO
    assert "Apply sysctl" in parsed["message"]


def test_ok_unchanged_is_info() -> None:
    parsed = parse_event(
        {
            "event": "runner_on_ok",
            "event_data": {"task": "t", "host": "local", "res": {"changed": False}},
        },
        seq=2,
    )
    assert parsed["level"] == EventLevel.INFO
    assert parsed["message"].startswith("OK")


def test_ok_changed_is_change() -> None:
    parsed = parse_event(
        {
            "event": "runner_on_ok",
            "event_data": {"task": "t", "host": "local", "res": {"changed": True}},
        },
        seq=3,
    )
    assert parsed["level"] == EventLevel.CHANGE
    assert "CHANGED" in parsed["message"]


def test_failure_is_error() -> None:
    parsed = parse_event(
        {
            "event": "runner_on_failed",
            "event_data": {"task": "t", "host": "local", "res": {"msg": "boom"}},
        },
        seq=4,
    )
    assert parsed["level"] == EventLevel.ERROR
    assert "boom" in parsed["message"]


def test_fatal_error_is_fatal() -> None:
    parsed = parse_event({"event": "error", "event_data": {}}, seq=5)
    assert parsed["level"] == EventLevel.FATAL


def test_summarise_stats() -> None:
    stats = {
        "ok": {"local": 5},
        "changed": {"local": 2},
        "failures": {"local": 0},
        "skipped": {"local": 1},
    }
    summary = summarise_stats(stats)
    assert summary == {"ok": 5, "changed": 2, "failures": 0, "skipped": 1}


def test_summarise_empty_stats() -> None:
    assert summarise_stats({}) == {}
