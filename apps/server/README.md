# shieldbuntu-server

The FastAPI service that drives ShieldBuntu's Ansible hardening engine.

## Quickstart

```bash
uv sync --all-extras
uv run uvicorn shieldbuntu.main:app --reload --port 8000
```

The OpenAPI UI is at <http://localhost:8000/docs>.

## Tests

```bash
uv run pytest
uv run pytest --cov                 # with coverage
```

## Lint + format

```bash
uv run ruff check .                 # lint
uv run ruff format .                # format
uv run ruff check --fix .           # autofix
```

## Layout

```
src/shieldbuntu/
  api/        FastAPI routers
  core/       config, logging, database, auth
  engine/     ansible-runner wrapper
  models/     SQLModel schemas
  main.py     FastAPI app factory
  __main__.py CLI entry (python -m shieldbuntu)
ansible/
  playbooks/  thin orchestration playbooks
  roles/      one role per hardening task
  inventory/  starts with localhost; gains managed_hosts later
tests/
```
