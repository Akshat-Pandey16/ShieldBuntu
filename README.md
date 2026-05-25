# ShieldBuntu

> Production-grade Ubuntu hardening, driven from a local browser UI.

ShieldBuntu turns CIS Benchmark Ubuntu hardening into a one-click experience.
A small FastAPI daemon discovers a library of idempotent Ansible roles, exposes
them as a typed HTTP API, and a React SPA lets a local sudoer apply, dry-run,
check, or revert any of them while watching every Ansible event stream in real
time.

- **Target OS:** Ubuntu 24.04 LTS
- **Status:** v0.2, active development. The legacy Tauri/Rust/bash app lives in
  the sibling `ShieldBuntu-v1-legacy/` directory.

---

## Highlights

- **16 hardening roles** out of the box — ssh, firewall (ufw), kernel sysctl,
  AppArmor, auditd, fail2ban, ClamAV, rkhunter, GRUB password, USB control
  (usbguard), Tor exit-node blocking, unattended upgrades, sudoers/UAC,
  session TMOUT, fstab `nodev/nosuid/noexec`, unused-package cleanup.
- **Every role maps to CIS controls** and declares its CIS refs, profiles
  (`cis-l1`, `cis-l2`, `workstation`, `server`), capabilities (apply / check /
  revert), and typed inputs (e.g. the GRUB password role asks the UI for the
  required secret).
- **Apply, Check (dry-run), Revert** for almost every role. Reverts use
  snapshots (`/etc/ssh/sshd_config.shieldbuntu-bak`, fstab snapshot, usbguard
  rules backup, etc.) where available.
- **Live Server-Sent Events** for every run — auto-reconnect with replay
  from the last seen sequence; events persisted in SQLite and cached in the
  React Query store so navigation is instant.
- **PAM auth** with sudo/wheel/admin group enforcement, login throttling,
  and SameSite=strict cookies.
- **Concurrency-safe orchestrator** — per `(task_id, host_id)` lock plus a
  409 if you double-submit; cancellation propagates through ansible-runner.
- **Modern UI** — violet/cyan glass design system, virtualised event stream,
  command palette (`⌘K` / `Ctrl K`), responsive sidebar, and an optional
  custom "Aurora" cursor (`Alt+Shift+C` to toggle).

---

## Architecture

```
┌────────────────────────┐         ┌──────────────────────────┐
│  React 19 SPA (Vite)   │  HTTP   │   FastAPI daemon         │
│  TanStack Router/Query │ ◀────▶  │   (uvicorn, async)       │
│  Tailwind v4           │   SSE   │                          │
└────────────────────────┘         │  ┌────────────────────┐  │
            ▲                      │  │  Orchestrator      │  │
            │ ⌘K / dialogs         │  │  • per-target lock │  │
            ▼                      │  │  • event bus       │  │
       browser cookie              │  │  • SSE subscribers │  │
       (HttpOnly,                  │  └─────────┬──────────┘  │
        SameSite=strict)           │            │             │
                                   │  ┌─────────▼──────────┐  │
                                   │  │  ansible-runner    │  │
                                   │  │  (thread-pooled)   │  │
                                   │  └─────────┬──────────┘  │
                                   │            │             │
                                   │  ┌─────────▼──────────┐  │
                                   │  │ Ansible playbooks  │  │
                                   │  │ + 16 roles         │  │
                                   │  └────────────────────┘  │
                                   │                          │
                                   │  SQLite + Alembic        │
                                   │  (WAL, FK on)            │
                                   └──────────────────────────┘
```

The backend runs as **root** (so apply/revert can actually modify the system).
The web UI is served separately by Vite in dev or your hosting of choice in
prod. Vite proxies `/api/*` to the backend at `127.0.0.1:8000`.

For deeper detail see [`docs/adr/0001-architecture.md`](docs/adr/0001-architecture.md).

---

## Layout

```
ShieldBuntu/
├── apps/
│   ├── server/                       # Python 3.12 / FastAPI
│   │   ├── pyproject.toml            # uv-managed, ruff-linted
│   │   ├── alembic.ini, alembic/     # database migrations
│   │   ├── ansible/                  # roles/, playbooks/, inventory/
│   │   └── src/shieldbuntu/
│   │       ├── main.py               # FastAPI factory + lifespan
│   │       ├── __main__.py           # uvicorn launcher
│   │       ├── core/                 # config, db, auth, logging, startup
│   │       ├── api/                  # routers: auth, health, runs, tasks
│   │       ├── engine/               # discovery, events, runner, orchestrator
│   │       ├── models/               # SQLModel: AuthSession, HardeningRun, HardeningEvent
│   │       └── scripts/truncate_db.py
│   └── web/                          # React 19 / Vite / pnpm
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx              # QueryClient + RouterProvider + 401 interceptor
│           ├── styles.css            # design tokens + glass + cursor
│           ├── lib/                  # api, auth, format, statusTheme, useRunStream, useRunsQuery, cursorPref
│           ├── components/           # AppShell, Sidebar, TopBar, UserMenu, CommandPalette,
│           │                         #  ActionPanel, RunEventList, RunSummary, RunStatusBadge,
│           │                         #  CustomCursor, RootErrorBoundary, ui/* (shadcn primitives)
│           └── routes/               # __root, login, _authed (layout) + 4 authed routes
├── docs/adr/                         # architecture decision records
├── Makefile                          # all developer commands
└── README.md
```

---

## Prerequisites

| Tool      | Version    | Purpose                            |
|-----------|------------|------------------------------------|
| Python    | ≥ 3.12     | Backend                            |
| Node      | ≥ 22       | Frontend (pnpm)                    |
| [uv](https://docs.astral.sh/uv/) | latest | Python env / lockfile     |
| [pnpm](https://pnpm.io/) | ≥ 11 | Frontend package manager           |
| Ansible   | (managed via `uv`) | Engine                     |
| GNU Make  | any        | Convenience wrapper                |
| Ubuntu    | 24.04 LTS  | Apply target (dev OK on others)    |

Roles depend on these Ansible collections (installed automatically by
`make ansible-deps`):

- `ansible.posix >= 2.0.0`
- `community.general >= 10.0.0`

---

## Quickstart

```bash
git clone <repo> ShieldBuntu
cd ShieldBuntu
make install        # uv sync + pnpm install + ansible-galaxy collections
make sudo-server &  # backend on :8000, as root (apply/revert work)
make dev-web        # frontend on :5173
```

Open <http://localhost:5173>. Sign in with your **local sudoer** credentials —
authentication is PAM-backed.

### Run options at a glance

```bash
make dev            # backend + frontend together (backend runs as YOUR user)
make sudo-server    # backend as root, with uv path preserved through sudo
make dev-server     # backend as your user (apply/revert will fail; check/dry-run OK)
make dev-web        # frontend only
```

> "Daemon is running as akshat, not root" banner appears when the backend can't
> actually apply changes. Click "Copy" to copy `sudo make sudo-server` and
> restart.

---

## Common commands

```bash
make help                # list every Makefile target
make lint                # ruff + eslint (read-only)
make lint-fix            # ruff --fix + eslint --fix
make format              # ruff format + prettier (writes)
make format-check        # CI-friendly check
make typecheck           # tsc -b on frontend

make build               # production bundles (frontend + server wheel)
make build-server
make build-web

make gen-api             # regenerate apps/web/src/lib/api.gen.ts from a running backend

# Database (Alembic + SQLite)
make db-init             # create db + apply all migrations
make db-migrate          # apply pending migrations
make db-migration NAME="add foo"  # autogenerate a new migration
make db-downgrade        # revert last migration
make db-history          # show migration history
make db-current          # show current revision
make db-reset CONFIRM=yes        # DROP db + reapply (destructive)
make db-truncate CONFIRM=yes     # delete all rows in tables (keeps schema; preserves auth_session by default)
make db-shell            # sqlite3 REPL on the dev db

# Dependencies (live registry check)
make deps-outdated
make deps-upgrade
make deps-upgrade-server
make deps-upgrade-web
make deps-lock           # refresh lockfiles without upgrading

# Cleanup
make clean               # generated artifacts (keeps .venv + node_modules)
make clean-runs          # also remove apps/server/var/runs/
make distclean           # also remove .venv + node_modules
```

---

## Configuration

Backend settings are loaded from environment variables (prefix `SHIELDBUNTU_`)
or a `.env` file in `apps/server/`. Defaults are sensible for dev.

| Variable | Default | Description |
|----------|---------|-------------|
| `SHIELDBUNTU_HOST` | `127.0.0.1` | Bind address |
| `SHIELDBUNTU_PORT` | `8000` | Bind port |
| `SHIELDBUNTU_DEV_MODE` | `True` | Enables `/docs`, dev error bodies, dev-friendly cookie |
| `SHIELDBUNTU_LOG_LEVEL` | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` / `CRITICAL` |
| `SHIELDBUNTU_DATA_DIR` | `./var` | SQLite + per-run artifact tree |
| `SHIELDBUNTU_ANSIBLE_ROOT` | `./ansible` | roles/, playbooks/, inventory/ |
| `SHIELDBUNTU_ALEMBIC_ROOT` | `<server pkg>/..` | Alembic config root |
| `SHIELDBUNTU_CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed origins for the UI |
| `SHIELDBUNTU_LOGIN_MAX_ATTEMPTS` | `5` | Failed attempts before lockout |
| `SHIELDBUNTU_LOGIN_WINDOW_SECONDS` | `60` | Sliding window |
| `SHIELDBUNTU_LOGIN_LOCKOUT_SECONDS` | `300` | Lockout duration after exceeding window |
| `SHIELDBUNTU_EVENT_PAYLOAD_MAX_BYTES` | `4096` | Per-event payload cap; oversize is pruned |
| `SHIELDBUNTU_EVENT_FLUSH_INTERVAL_MS` | `250` | Time-based event flush cadence |
| `SHIELDBUNTU_EVENT_FLUSH_BATCH_SIZE` | `32` | Size-based event flush cadence |
| `SHIELDBUNTU_SESSION_PURGE_INTERVAL_SECONDS` | `3600` | Background session purger cadence |

---

## API surface

All endpoints are mounted under `/api`. Auth uses an HttpOnly cookie.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET`  | `/api/health` | — | Daemon user, root state, version |
| `POST` | `/api/auth/login` | — | PAM auth + sudoer group check + login throttle (429 with Retry-After) |
| `POST` | `/api/auth/logout` | — | Clears cookie + DB session |
| `GET`  | `/api/auth/me` | cookie | Current user |
| `GET`  | `/api/tasks` | cookie | Discovered roles (with `inputs[]`, `capabilities`, `cis_refs`, etc.) |
| `GET`  | `/api/tasks/{task_id}` | cookie | Single task |
| `POST` | `/api/runs` | cookie | Validates `inputs` against the role's `TaskInputSpec`, 409 if a run for `(task_id, host_id)` is in flight |
| `GET`  | `/api/runs?task_id=&status=&limit=&offset=` | cookie | Filter + paginate |
| `GET`  | `/api/runs/{run_id}` | cookie | Single run, including `summary` / `initiated_by` / `cancel_requested` |
| `GET`  | `/api/runs/{run_id}/events?since_seq=&limit=` | cookie | Lightweight `EventSummary` projection |
| `GET`  | `/api/runs/{run_id}/events/{seq}` | cookie | Full event payload (heavy) |
| `POST` | `/api/runs/{run_id}/cancel` | cookie | 202; idempotent when already terminal |
| `GET`  | `/api/runs/{run_id}/stream?since_seq=` | cookie | Server-Sent Events: replays persisted events, streams live, ends with `terminal` event |

Run statuses: `pending`, `running`, `succeeded`, `no_change`, `failed`, `cancelled`.

The OpenAPI schema is served at `/openapi.json`. The frontend regenerates
`apps/web/src/lib/api.gen.ts` from it via `make gen-api`.

---

## Database

SQLite via SQLModel + async aiosqlite, with WAL, `synchronous=NORMAL`,
`foreign_keys=ON`, and a 5-second busy timeout enforced per connection.

Schema (current):

- `auth_session(token PK, username idx, created_at, expires_at idx, last_seen_at, ip_address, user_agent)`
- `hardening_run(id UUID PK, task_id idx, host_id idx, action, dry_run, status idx, cancel_requested, initiated_by, started_at, finished_at, exit_code, summary JSON)`  
  Composite index `(task_id, started_at)`.
- `hardening_event(id PK, run_id FK ON DELETE CASCADE, seq, ts, level idx, message, payload JSON)`  
  Composite **unique** index `(run_id, seq)` — also enforces sequence uniqueness per run.

Migrations live in [`apps/server/alembic/versions/`](apps/server/alembic/versions/).
A naming convention is wired into the metadata so future FK/index drops work
across SQLite batch mode.

---

## Writing a hardening role

Each role lives in [`apps/server/ansible/roles/<role_id>/`](apps/server/ansible/roles/)
and declares itself to the discovery layer via a single `shieldbuntu.yml` file:

```yaml
# apps/server/ansible/roles/example/shieldbuntu.yml
name: Example
description: One-line human-readable description of what this role hardens.
category: network         # network|ssh|kernel|lsm|audit|updates|malware-scanner|
                          # intrusion-prevention|bootloader|filesystem|session|
                          # auth|packages|peripherals
cis_refs:
  - 1.2.3
profiles:
  - cis-l1
  - server
capabilities:
  - apply
  - check
  - revert
requires_root: true
tags:
  - example
inputs:                   # optional — UI will prompt for these before running
  - name: example_secret
    label: API key
    description: Used by the foo daemon to call out to bar.
    secret: true          # rendered as <input type=password>
    required: true
```

Then provide `tasks/main.yml` (apply) and `tasks/revert.yml` (revert). The
playbooks at [`ansible/playbooks/`](apps/server/ansible/playbooks/) include
your role with the right `tasks_from`. `check` mode automatically wraps the
apply tasks with `check_mode: true`.

Inputs are passed through as Ansible extravars; sensitive values are not
written to logs or events. The per-run `private_data_dir/env/` directory is
deleted after the run completes so plaintext extravars don't linger on disk.

---

## Security model

- Daemon runs as root by design (apply/revert need privileges).
- PAM auth via `pamela`, service `sudo`. After authentication, the user must
  belong to `sudo`, `wheel`, or `admin`. Anonymous PAM-valid users are
  rejected.
- Login throttling: per `IP|username` sliding window — 5 attempts / 60 s,
  5 min lockout, 429 with `Retry-After` header.
- Sessions are opaque random tokens, HttpOnly, `SameSite=strict`, 8 h TTL with
  a 1 h sliding-refresh. A background purger sweeps expired rows hourly.
- Front-end has a 401 middleware: any 401 from a non-auth endpoint clears the
  user cache and bounces to `/login` with `?redirect=` set.
- CORS allows the configured origin(s) with credentials.
- Per-run artifact directories are chowned back to the invoking sudo user
  after the run finishes (so you can inspect them as your normal user).

### Not in scope (yet)

- Multi-worker uvicorn. The orchestrator state lives in process. Run with a
  single worker (the Makefile does). A real broker (Redis pub/sub) is the
  obvious next step for fleet/multi-host work.
- Audit log table. Today only `HardeningRun.initiated_by` records who started
  what — there's no separate `login_event` / `cancel_event` history.
- Remote / fleet targets. The Ansible inventory currently only contains the
  local host.

---

## Frontend notes

- **Routing:** TanStack Router with file-based routes. `_authed.tsx` is a
  pathless layout route that gates all authenticated pages and renders the
  `AppShell`. The boilerplate `requireAuth` lives in one place.
- **State:** TanStack Query. `useRunsQuery({ refetchActiveMs })` gates polling
  on whether any returned run is still active, so idle lists don't tick.
- **Streaming:** `useRunStream` hydrates from the cache, replays missed
  events via REST (`?since_seq=`), then opens an `EventSource`. On error it
  reconnects with exponential backoff. Events live in the React Query cache
  (`["run", runId, "events"]`), so leaving and coming back is instant.
- **Virtualised log:** `RunEventList` uses `@tanstack/react-virtual` so a
  2 000-line playbook is just as snappy as a 10-line one. Auto-scroll only
  while you're at the bottom; a "Jump to latest" pill appears otherwise.
- **Design system:** OKLCH palette tuned around a `brand` (violet) and
  `brand-2` (cyan). Glass surfaces, gradient mesh background, light + dark
  themes, `prefers-reduced-motion` respected.
- **Aurora cursor:** A custom site-wide cursor (rotating conic-gradient ring
  + brand-coloured dot, lerped motion). State-aware: morphs into a thin
  caret over text, expands over interactive elements, fades on disabled.
  Hidden on touch devices. Toggle via the user menu or `Alt+Shift+C`.

---

## Troubleshooting

**"Daemon is running as `<user>`, not root."**  
The backend was started without sudo. Run `sudo make sudo-server` (kills your
existing backend first). Dry-run and check still work as your user; apply
and revert won't.

**Login returns 401 with valid password.**  
You're authenticated by PAM but not in `sudo`/`wheel`/`admin`. Add yourself:
`sudo usermod -aG sudo $USER` (log out and back in).

**Login returns 429 with `Retry-After`.**  
You've exceeded the throttle (5 attempts / 60 s). Wait `Retry-After` seconds.

**SSE stream stops mid-run.**  
The hook auto-reconnects with exponential backoff and replays from the last
seen `seq`. You'll see a `reconnecting…` pill in the header. If it never
reconnects, the backend likely crashed — check `/tmp/sb-backend.log` or your
systemd journal.

**Cancellation doesn't stop immediately.**  
`ansible-runner` only polls the cancel callback between tasks. Long-running
modules (`apt`, `freshclam`, `update-grub`) won't honour cancel until the
current task ends.

**Database changes after pulling.**  
`make db-migrate` to apply any new Alembic revisions. If you've made local
schema experiments, `make db-reset CONFIRM=yes` wipes and rebuilds.

**OpenAPI / types out of sync.**  
With the backend running: `make gen-api`. This rewrites
`apps/web/src/lib/api.gen.ts` from the live `/openapi.json`.

**Frontend bundle warnings about `useVirtualizer` or fast-refresh.**  
These are library-level notes (TanStack Virtual incompatible with React
Compiler memoisation; shadcn primitives export both component and CVA
variants). They don't affect runtime.

---

## Production deploy (sketch)

This project doesn't ship a deploy story yet. The shape we'd recommend:

1. **Build:** `make build` (produces `apps/server/dist/*.whl` and
   `apps/web/dist/`).
2. **Server:** Install the wheel into a venv on the target host; expose it
   behind systemd (`ExecStart=/usr/bin/uv run --no-sync python -m shieldbuntu`).
   Run as root.
3. **Static UI:** Serve `apps/web/dist/` via nginx/Caddy/Apache on the same
   origin as the API (so the cookie's `SameSite=strict` works without CORS).
4. **Backups:** `apps/server/var/shieldbuntu.db` (SQLite, WAL mode — also
   capture `-wal` / `-shm` if the daemon is live).
5. **Updates:** Reinstall the wheel; on next start the daemon runs pending
   Alembic migrations automatically.

---

## Contributing

There are no tests (intentional — the maintainer prefers running the system
to assert on it). Quality gates:

```bash
make lint           # ruff + eslint, 0 errors expected
make format-check   # CI-friendly
make typecheck      # tsc -b
make build          # full production build must succeed
```

The repo has a `.pre-commit-config.yaml` and `make install-hooks` to wire it
into git.

---

## License

TBD.
