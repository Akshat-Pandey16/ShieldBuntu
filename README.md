# ShieldBuntu

Production-grade Ubuntu hardening, driven by a local web app.

ShieldBuntu installs as a systemd service and exposes a browser UI for applying, checking, and reverting CIS-aligned hardening to your Ubuntu system. Under the hood, every action is an Ansible role — idempotent, dry-run capable, with structured audit logs.

> **Status:** v2 rewrite in progress. The previous Tauri/Rust/bash implementation is preserved in the sibling directory `ShieldBuntu-v1-legacy/`.

## Stack

- **Backend:** Python 3.12+ · FastAPI · Pydantic v2 · SQLModel · SQLite · `ansible-runner` · structlog
- **Frontend:** React 19 · TypeScript 6 · Vite 8 · Tailwind v4 · shadcn/ui · TanStack Router + Query
- **Engine:** Ansible roles (CIS Level 1 / Level 2 profiles)
- **Packaging:** `.deb` via nfpm · systemd unit · PAM auth
- **Target:** Ubuntu 24.04 LTS

See [docs/adr/0001-architecture.md](docs/adr/0001-architecture.md) for the architectural rationale.

## Layout

```
shieldbuntu/
├── apps/
│   ├── server/    # FastAPI service + Ansible engine
│   └── web/       # React SPA
├── packaging/     # systemd + .deb build (nfpm)
├── docs/adr/      # architecture decision records
└── justfile       # one-shot dev commands
```

## Dev quickstart

Prerequisites: Python 3.12+, Node 22+, `uv`, `pnpm`, and (optional) `just`.

```bash
# Backend
cd apps/server
uv sync
uv run uvicorn shieldbuntu.main:app --reload

# Frontend (in a second terminal)
cd apps/web
pnpm install
pnpm dev
```

Or with `just` from the repo root:

```bash
just dev      # boots backend + frontend together
just test     # runs both test suites
just lint     # ruff + eslint + prettier
just build    # builds .deb
```

## License

TBD.
