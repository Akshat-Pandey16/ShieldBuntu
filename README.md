# ShieldBuntu

Production-grade Ubuntu hardening, driven by a local browser UI.

ShieldBuntu runs as a local web service (FastAPI) backed by an Ansible
hardening engine, controlled from a React UI in your browser. Every action
is an idempotent Ansible role with structured audit logs in SQLite.

> **Status:** v2 in active development. The previous Tauri/Rust/bash
> implementation is preserved in the sibling directory `ShieldBuntu-v1-legacy/`.

## Stack

- **Backend:** Python 3.12+ · FastAPI · Pydantic v2 · SQLModel · SQLite
  · `ansible-runner` · structlog · pamela (PAM auth) · sse-starlette
- **Frontend:** React 19 · TypeScript 6 · Vite 8 · Tailwind v4 · shadcn/ui
  · TanStack Router + Query
- **Engine:** Ansible roles (CIS Level 1 / Level 2 profiles)
- **Target:** Ubuntu 24.04 LTS

See [docs/adr/0001-architecture.md](docs/adr/0001-architecture.md) for the
architectural rationale.

## Layout

```
shieldbuntu/
├── apps/
│   ├── server/    # FastAPI service + Ansible engine
│   └── web/       # React SPA
├── docs/adr/      # architecture decision records
└── Makefile       # all dev commands
```

## Dev quickstart

Prerequisites: Python 3.12+, Node 22+, [uv](https://docs.astral.sh/uv/),
[pnpm](https://pnpm.io/), GNU Make.

```bash
make install        # uv sync + pnpm install + ansible collections
make dev            # boots backend + frontend together
make help           # list every command
```

Open <http://localhost:5173> to use the app. The Vite dev server proxies
`/api/*` calls to the FastAPI backend on `:8000`.

**Real hardening requires root.** Start the backend with sudo when you
want apply/revert actions to actually modify the system:

```bash
sudo make dev-server   # backend as root
make dev-web           # frontend as your user
```

Dry-run mode (`?dry_run=true` or `--check` in Ansible) works as your
regular user — it reports what *would* change without touching anything.

## Common workflows

```bash
make lint           # ruff + eslint (read-only)
make format         # ruff + prettier (writes)
make typecheck      # tsc -b on frontend
make deps-outdated  # show what's out of date
make deps-upgrade   # bump everything to latest (verified live)
make db-current     # show migration revision
make db-migration NAME="add foo"
make db-reset CONFIRM=yes
make gen-api        # regenerate typed frontend API client (server must be running)
make build          # production-build both apps
```

## License

TBD.
