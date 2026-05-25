# ADR 0001 — v2 architecture: FastAPI + React + Ansible

- **Status:** Accepted
- **Date:** 2026-05-25
- **Supersedes:** the v1 Tauri + Rust + bash architecture (archived as `ShieldBuntu-v1-legacy/`)

## Context

ShieldBuntu v1 (2023) was a Tauri 1.x desktop app: a React UI driven by a Rust backend that shelled out to a fleet of ~40 ad-hoc bash scripts. The architecture had real problems:

- Tauri 1.x is feature-frozen (v2 GA'd mid-2024) and the Rust layer was almost entirely thin `Command::new("sudo")` boilerplate.
- Bash scripts were non-idempotent — running the same hardening twice could duplicate firewall rules and sysctl entries.
- No dry-run, no diff preview, no atomic rollback.
- Rollback coverage was ~40%; many `apply` scripts had no `reverse` counterpart.
- Sudo password held in `unsafe static` Rust memory for the whole session, no timeout.
- Zero tests, zero CI, no auto-update, no code signing.
- A copy-paste bug in `apparmor.rs` invoked `firewall.sh`, meaning the AppArmor button had been silently doing the wrong thing.
- Remote/fleet management was advertised in the README but never implemented.

The goal of v2 is to be a production-grade tool that could credibly compete with commercial Linux hardening products on UX, robustness, and operational maturity — without adding features beyond the v1 surface.

## Decision

### Form factor: local web app, not desktop

A Python FastAPI service runs as a systemd unit and serves a React SPA. The user opens a browser to access it. Rationale:

- The Python ecosystem fits sysadmin tooling much better than Rust does (Ansible, configuration management, system libraries).
- A web app naturally extends to fleet management later (remote nodes expose the same API).
- Removes the bundle-size and cross-platform headaches Tauri was struggling with.
- The trade-off — no native installer feel, runs in a browser — is acceptable for a Linux sysadmin tool.

### Privilege model: single root daemon, PAM auth at the UI

The systemd unit runs as root. The web UI requires PAM login (the user authenticates as a local sudoer). One auth per session, matching the v1 UX. Alternatives considered:

- **Per-action polkit escalation:** more "correct" least-privilege, but causes constant password prompts during a hardening flow and requires many `.policy` files.
- **Split daemon (root worker + user UI over unix socket):** cleanest separation, but meaningful upfront complexity for a v1 that doesn't need it yet.

We may revisit if/when remote fleet management lands — at that point a split agent/manager design becomes more attractive.

### Hardening engine: Ansible roles, invoked via `ansible-runner`

Every hardening task becomes an Ansible role. The Python service drives execution via the `ansible-runner` API and streams events back to the UI over Server-Sent Events. We do **not** rewrite the v1 bash scripts as Python `subprocess` calls. Rationale:

- Ansible is the production-grade tool for exactly this problem.
- Idempotency, dry-run (`--check`), change detection, and rollback semantics come for free instead of being reinvented poorly.
- CIS-aligned hardening collections (`devsec.hardening`, `ansible-lockdown`) already exist and can be composed.
- The structured event stream feeds the audit log naturally.
- Ansible was designed to run against N hosts — fleet management later is additive, not a rewrite.

The cost (Ansible is ~150MB installed) is acceptable: on Ubuntu we declare it as an apt runtime dependency rather than vendoring.

### Fleet scope: single-machine v1, fleet-ready abstractions

We ship single-machine only, but design the engine, API contracts, and Ansible inventory so adding remote hosts later is purely additive. Concretely:

- The Ansible inventory always has a `localhost` group today; it will gain `managed_hosts` later.
- API routes are scoped by host ID (`/api/hosts/{host_id}/runs/...`), with `local` as the only valid ID in v1.
- The engine takes a target spec, not a hard-coded localhost reference.

### Distro: Ubuntu 24.04 LTS only

We do not pre-optimize for Ubuntu 22.04, Debian, Mint, or Pop_OS. The Ansible roles can be made portable later; the `.deb` is built and tested against 24.04.

### Stack choices

- **Python ≥3.12** (Ubuntu 24.04 default, no custom interpreter needed at runtime).
- **FastAPI + Pydantic v2 + SQLModel** — modern type-safe Python web stack with auto-generated OpenAPI.
- **SQLite via SQLAlchemy 2.x async + alembic** — single-file DB is enough; no extra daemon.
- **structlog → JSON → journald** — structured logs queryable via `journalctl`.
- **Uvicorn** as ASGI server. Granian (Rust-backed, faster) is the obvious upgrade if perf demands it later — the swap is one line.
- **PAM via `python-pam`** for login; server-side sessions in SQLite, HTTP-only cookies. **No JWT** — unnecessary complexity for a single-machine browser app.
- **uv** for dependency management (~100× faster than pip; pyproject.toml + uv.lock as the source of truth).
- **Ruff** for both lint and format (replaces black + flake8 + isort).
- **React 19 + TypeScript 6 + Vite 8 + Tailwind v4** — current as of May 2026. Tailwind v4 uses the new Vite plugin model (no postcss, CSS-based `@theme` config).
- **TanStack Router** (file-based, type-safe) — preferred over React Router for a new project.
- **TanStack Query** + auto-generated typed client (`openapi-typescript` + `openapi-fetch`) — zero hand-written API calls.
- **shadcn/ui** on Radix — the v1 chose this and it's still the right answer.
- **Vitest + Playwright** for tests.
- **`.deb` via nfpm** + systemd unit — the lean, declarative way to package.

## Consequences

**Positive:**
- Real test coverage becomes possible (Python is much easier to test than `sudo` bash).
- Real audit log (structured JSON, queryable via journalctl).
- Dry-run and diff preview become natural (Ansible's `--check` + change detection).
- Fleet management later is a matter of expanding the inventory, not a rewrite.
- Single distributable target (`.deb`) instead of trying to ship Tauri for all platforms.

**Negative / risks:**
- We become dependent on Ansible's quirks — its YAML, its module ecosystem, its error reporting style.
- Running as a root daemon enlarges the trusted process surface; every API endpoint is effectively `setuid root`. The PAM login layer must be defense-grade.
- SQLite is fine for single-machine but limits future fleet scale; we'd swap for Postgres if we cross that bridge.
- Web UI in a browser is less "installed app" feeling than a native window — acceptable for a sysadmin tool.
