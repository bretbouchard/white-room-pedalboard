#!/usr/bin/env bash
# Minimal helper to run pytest with the repo `src/` on PYTHONPATH so tests import
# local packages without editing test files.
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
source "$ROOT_DIR/.venv/bin/activate"
# Ensure both top-level `src` and `backend/src` are available for imports used
# by the backend tests (many tests import as `src.*` or `backend.src.*`).
export PYTHONPATH="${ROOT_DIR}:${ROOT_DIR}/src:${ROOT_DIR}/backend:${ROOT_DIR}/backend/src"
pytest "$@"
