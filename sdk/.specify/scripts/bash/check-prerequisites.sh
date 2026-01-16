#!/bin/bash

# SpecKit Prerequisites Checker
# Validates required files exist and returns paths

set -e

MODE=${1:-normal}
REQUIRE_TASKS=${2:-false}
INCLUDE_TASKS=${3:-false}

# Find feature directory
FEATURE_DIR=$(find specs -name "spec.md" -type f 2>/dev/null | sed 's|/spec.md||' | head -1)

if [ -z "$FEATURE_DIR" ]; then
  echo '{"error": "No feature spec found"}'
  exit 1
fi

FEATURE_DIR=$(cd "$FEATURE_DIR" && pwd)

# Check required files
SPEC_FILE="${FEATURE_DIR}/spec.md"
PLAN_FILE="${FEATURE_DIR}/plan/plan.md"
TASKS_FILE="${FEATURE_DIR}/plan/tasks.md"

MISSING=0

if [ ! -f "$SPEC_FILE" ]; then
  echo "Missing spec.md" >&2
  MISSING=1
fi

if [ ! -f "$PLAN_FILE" ]; then
  echo "Missing plan.md" >&2
  MISSING=1
fi

if [ "$REQUIRE_TASKS" = "true" ] && [ ! -f "$TASKS_FILE" ]; then
  echo "Missing tasks.md" >&2
  MISSING=1
fi

if [ $MISSING -eq 1 ]; then
  echo '{"error": "Required files missing"}'
  exit 1
fi

# Build JSON output
OUTPUT="{"
OUTPUT+="\"FEATURE_DIR\": \"$FEATURE_DIR\","
OUTPUT+="\"SPEC\": \"$SPEC_FILE\","
OUTPUT+="\"PLAN\": \"$PLAN_FILE\","
OUTPUT+="\"CONSTITUTION\": \"$(pwd)/.specify/memory/constitution.md\""

if [ "$INCLUDE_TASKS" = "true" ] && [ -f "$TASKS_FILE" ]; then
  OUTPUT+=","
  OUTPUT+="\"TASKS\": \"$TASKS_FILE\""
fi

OUTPUT+="}"

echo "$OUTPUT"
