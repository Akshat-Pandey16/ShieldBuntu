#!/usr/bin/env bash
# Build the ShieldBuntu .deb.
# Phase 0: skeleton — emits a not-yet-functional .deb so the pipeline works end-to-end.
# Phase 5: this gets fleshed out (zipapp build, real frontend bundle, signing).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIST="$ROOT/packaging/dist"
mkdir -p "$DIST"

VERSION="$(python3 -c "import tomllib,pathlib; print(tomllib.loads(pathlib.Path('$ROOT/apps/server/pyproject.toml').read_text())['project']['version'])")"
export VERSION

echo "==> Building shieldbuntu v$VERSION"

# 1. Build the React frontend
echo "==> Building frontend"
(cd "$ROOT/apps/web" && pnpm install --frozen-lockfile && pnpm build)

# 2. Build the Python backend (placeholder — Phase 5 will use shiv or a wheel install)
echo "==> Building backend (placeholder)"
cat > "$DIST/shieldbuntu-server" <<'EOF'
#!/usr/bin/env python3
import sys
print("shieldbuntu-server: Phase 0 placeholder. Replace with shiv-built zipapp in Phase 5.")
sys.exit(1)
EOF
chmod +x "$DIST/shieldbuntu-server"

# 3. Pack the .deb
echo "==> Running nfpm"
if ! command -v nfpm >/dev/null 2>&1; then
    echo "nfpm not found. Install from https://nfpm.goreleaser.com/install/"
    exit 1
fi
nfpm pkg --packager deb --config "$ROOT/packaging/debian/nfpm.yaml" --target "$DIST/"

echo "==> Built: $DIST/"
ls -lh "$DIST/"
