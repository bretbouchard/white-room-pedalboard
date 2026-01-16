#!/bin/bash

# SpecKit Plan Setup
# Creates plan structure and returns paths

set -e

# Get current git branch
BRANCH_NAME=$(git branch --show-current)

# Find feature directory
FEATURE_DIR=$(find specs -name "spec.md" -type f | sed 's|/spec.md||' | head -1)
FEATURE_DIR=$(cd "$FEATURE_DIR" && pwd)

# Set paths
FEATURE_SPEC="${FEATURE_DIR}/spec.md"
PLAN_DIR="${FEATURE_DIR}/plan"
IMPL_PLAN="${PLAN_DIR}/plan.md"
SPECS_DIR=$(pwd)/specs

# Create plan directory
mkdir -p "$PLAN_DIR/contracts"

# Create plan.md from template if it doesn't exist
if [ ! -f "$IMPL_PLAN" ]; then
  touch "$IMPL_PLAN"
fi

# Output JSON
cat <<EOF
{
  "BRANCH": "$BRANCH_NAME",
  "FEATURE_SPEC": "$FEATURE_SPEC",
  "IMPL_PLAN": "$IMPL_PLAN",
  "PLAN_DIR": "$PLAN_DIR",
  "SPECS_DIR": "$SPECS_DIR"
}
EOF
