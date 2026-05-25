SHELL := /bin/bash
.DEFAULT_GOAL := help

export LANG ?= C.UTF-8
export LC_ALL ?= C.UTF-8

.PHONY: help install install-hooks ansible-deps \
        dev dev-server sudo-server dev-web \
        lint lint-fix format format-check typecheck \
        gen-api \
        db-init db-migrate db-migration db-downgrade db-history db-current db-reset db-truncate db-shell \
        deps-outdated deps-upgrade deps-upgrade-server deps-upgrade-web deps-lock \
        build build-server build-web \
        clean clean-runs distclean

help: ## show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST) | sort

install: ## install all deps (uv sync + pnpm install + ansible collections)
	cd apps/server && uv sync --all-extras
	cd apps/web && pnpm install
	$(MAKE) ansible-deps

install-hooks: ## install pre-commit git hooks
	uv tool install pre-commit 2>/dev/null || true
	pre-commit install

ansible-deps: ## install ansible collections used by the hardening roles
	cd apps/server && uv run ansible-galaxy collection install -r ansible/requirements.yml

dev: ## run backend + frontend dev servers (Ctrl-C stops both)
	@trap 'kill 0' EXIT INT TERM; \
	(cd apps/server && uv run uvicorn shieldbuntu.main:app --reload --port 8000) & \
	(cd apps/web && pnpm dev --port 5173) & \
	wait

dev-server: ## backend only (uvicorn :8000) — run as your user (apply/revert will need sudo)
	cd apps/server && uv run uvicorn shieldbuntu.main:app --reload --port 8000

sudo-server: ## backend with root privileges so apply/revert actually work
	@if [ "$$(id -u)" -eq 0 ]; then \
		echo "Already root — use make dev-server instead."; exit 1; \
	fi
	@UV_PATH=$$(command -v uv); \
	if [ -z "$$UV_PATH" ]; then echo "uv not found in your PATH."; exit 1; fi; \
	echo "Re-launching as root with uv at $$UV_PATH …"; \
	cd apps/server && sudo -E env "PATH=$$PATH" "$$UV_PATH" run uvicorn shieldbuntu.main:app --reload --port 8000

dev-web: ## frontend only (vite :5173)
	cd apps/web && pnpm dev --port 5173

lint: ## ruff + eslint (read-only)
	cd apps/server && uv run ruff check .
	cd apps/web && pnpm lint

lint-fix: ## ruff --fix + eslint --fix
	cd apps/server && uv run ruff check --fix .
	cd apps/web && pnpm lint:fix

format: ## ruff format + prettier (writes)
	cd apps/server && uv run ruff format .
	cd apps/web && pnpm format

format-check: ## ruff format --check + prettier --check
	cd apps/server && uv run ruff format --check .
	cd apps/web && pnpm format:check

typecheck: ## tsc -b on frontend
	cd apps/web && pnpm typecheck

gen-api: ## regenerate typed frontend API client from backend OpenAPI (server must be running)
	cd apps/web && pnpm gen:api

db-init: ## create db + apply all migrations
	cd apps/server && mkdir -p var && uv run alembic upgrade head

db-migrate: ## apply pending migrations
	cd apps/server && uv run alembic upgrade head

db-migration: ## create new auto-generated migration (usage: make db-migration NAME="add foo")
	@test -n "$(NAME)" || (echo "Usage: make db-migration NAME=\"description\"" && exit 1)
	cd apps/server && uv run alembic revision --autogenerate -m "$(NAME)"

db-downgrade: ## revert last migration
	cd apps/server && uv run alembic downgrade -1

db-history: ## show migration history
	cd apps/server && uv run alembic history --verbose

db-current: ## show current migration revision
	cd apps/server && uv run alembic current

db-reset: ## DROP entire db + reapply migrations (requires CONFIRM=yes)
	@test "$(CONFIRM)" = "yes" || (echo "Refusing destructive op. Run: make db-reset CONFIRM=yes" && exit 1)
	cd apps/server && rm -f var/shieldbuntu.db var/shieldbuntu.db-journal var/shieldbuntu.db-wal var/shieldbuntu.db-shm
	$(MAKE) db-init

db-truncate: ## delete ALL rows in every table, keep schema (requires CONFIRM=yes)
	@test "$(CONFIRM)" = "yes" || (echo "Refusing destructive op. Run: make db-truncate CONFIRM=yes" && exit 1)
	cd apps/server && uv run python -m shieldbuntu.scripts.truncate_db

db-shell: ## open sqlite3 REPL on the dev db
	cd apps/server && sqlite3 var/shieldbuntu.db

deps-outdated: ## show outdated deps in backend + frontend (live registry check)
	@echo "=== backend (pypi) ==="
	-cd apps/server && uv tree --outdated 2>/dev/null || uv pip list --outdated
	@echo ""
	@echo "=== frontend (npm) ==="
	-cd apps/web && pnpm outdated --long || true

deps-upgrade: deps-upgrade-server deps-upgrade-web ## bump ALL deps to latest (verified live against PyPI + npm)

deps-upgrade-server: ## bump backend deps to latest (uv resolves against PyPI)
	cd apps/server && uv lock --upgrade
	cd apps/server && uv sync --all-extras

deps-upgrade-web: ## bump frontend deps to latest (pnpm resolves against npm registry)
	cd apps/web && pnpm update --latest
	cd apps/web && pnpm install

deps-lock: ## refresh lockfiles without upgrading versions
	cd apps/server && uv lock
	cd apps/web && pnpm install --lockfile-only

build: build-web build-server ## production build (frontend bundle + backend wheel)

build-server: ## build backend wheel
	cd apps/server && uv build

build-web: ## build frontend production bundle
	cd apps/web && pnpm build

clean: ## remove generated artifacts (keeps .venv + node_modules)
	rm -rf apps/server/dist apps/server/.ruff_cache apps/server/var
	rm -rf apps/web/dist apps/web/.vite apps/web/.tsbuildinfo apps/web/tsconfig*.tsbuildinfo
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

clean-runs: clean## delete cached ansible-runner per-run directories under apps/server/var/runs (keeps the db)
	rm -rf apps/server/var/runs

distclean: clean-runs ## remove EVERYTHING including .venv + node_modules
	rm -rf apps/server/.venv
	rm -rf apps/web/node_modules
