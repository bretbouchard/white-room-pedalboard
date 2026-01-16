#!/usr/bin/env bash
set -euo pipefail

# Script: pin_daid_core.sh
# Usage: scripts/pin_daid_core.sh <COMMIT_SHA>
# Pins the daid-core submodule to a specific commit and creates a commit in the superproject.

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <COMMIT_SHA>"
  exit 2
fi

COMMIT=$1

echo "Pinning daid-core to $COMMIT"

if [ ! -d "daid-core" ]; then
  echo "daid-core submodule not found. Run: git submodule update --init --recursive"
  exit 1
fi

pushd daid-core >/dev/null
  git fetch --all --tags
  git checkout "$COMMIT"
popd >/dev/null

# Record the submodule change
git add daid-core
git commit -m "chore(submodule): pin daid-core to ${COMMIT}"

echo "Pinned daid-core to ${COMMIT} and committed in superproject."
