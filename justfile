# ShieldBuntu task runner. Install `just`: https://github.com/casey/just

set shell := ["bash", "-cu"]

# Default: list recipes
default:
    @just --list

# Install all dependencies (backend + frontend)
install:
    cd apps/server && uv sync --all-extras
    cd apps/web && pnpm install

# Run backend + frontend dev servers (use Ctrl-C to stop both)
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    trap 'kill 0' EXIT INT TERM
    (cd apps/server && uv run uvicorn shieldbuntu.main:app --reload --port 8000) &
    (cd apps/web && pnpm dev --port 5173) &
    wait

# Backend only
dev-server:
    cd apps/server && uv run uvicorn shieldbuntu.main:app --reload --port 8000

# Frontend only
dev-web:
    cd apps/web && pnpm dev --port 5173

# Run all tests
test: test-server test-web

test-server:
    cd apps/server && uv run pytest

test-web:
    cd apps/web && pnpm test

# Lint + format check (read-only)
lint:
    cd apps/server && uv run ruff check . && uv run ruff format --check .
    cd apps/web && pnpm lint && pnpm format:check

# Apply formatting (writes)
format:
    cd apps/server && uv run ruff check --fix . && uv run ruff format .
    cd apps/web && pnpm format

# Regenerate the typed frontend API client from the live backend's OpenAPI schema
gen-api:
    cd apps/web && pnpm gen:api

# Build the .deb (requires nfpm)
build:
    bash packaging/debian/build.sh

# Clean all generated artifacts
clean:
    rm -rf apps/server/.venv apps/server/.pytest_cache apps/server/.ruff_cache
    rm -rf apps/web/node_modules apps/web/dist
    rm -rf packaging/dist
