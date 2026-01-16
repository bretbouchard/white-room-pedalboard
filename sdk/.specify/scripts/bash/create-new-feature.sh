#!/bin/bash

# SpecKit Feature Creator
# Creates a new feature branch and specification file

set -e

# Get feature description from argument
FEATURE_DESC="$1"

# Generate slug from description
FEATURE_SLUG=$(echo "$FEATURE_DESC" | sed 's/[^a-zA-Z0-9 ]//g' | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]' | cut -c1-50)

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create branch name
BRANCH_NAME="feature/${FEATURE_SLUG}-${TIMESTAMP}"

# Create feature directory
FEATURE_DIR="specs/${FEATURE_SLUG}-${TIMESTAMP}"
mkdir -p "$FEATURE_DIR"

# Create spec file path
SPEC_FILE="${FEATURE_DIR}/spec.md"

# Create the spec file with template
touch "$SPEC_FILE"

# Create branch
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

# Output JSON
cat <<EOF
{
  "BRANCH_NAME": "$BRANCH_NAME",
  "SPEC_FILE": "$(pwd)/$SPEC_FILE",
  "FEATURE_DIR": "$(pwd)/$FEATURE_DIR",
  "FEATURE_SLUG": "$FEATURE_SLUG"
}
EOF
