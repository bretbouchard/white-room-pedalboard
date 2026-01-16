#!/bin/bash

# SpecKit Agent Context Updater
# Updates agent-specific context files with new technology and concepts

set -e

AGENT_TYPE=${1:-claude}
CONTEXT_DIR=".specify/agent-context"
CONTEXT_FILE="${CONTEXT_DIR}/${AGENT_TYPE}.md"

# Create context directory if it doesn't exist
mkdir -p "$CONTEXT_DIR"

# Create context file if it doesn't exist
if [ ! -f "$CONTEXT_FILE" ]; then
  cat > "$CONTEXT_FILE" <<'EOF'
# Agent Context

This file contains agent-specific context for the project.

<!-- MANUAL_ADDITIONS_START -->
<!-- Add manual additions here - they will be preserved -->
<!-- MANUAL_ADDITIONS_END -->

<!-- AUTO_GENERATED_START -->
<!-- Auto-generated content will be added below -->
<!-- AUTO_GENERATED_END -->
EOF
fi

echo "Agent context updated: $CONTEXT_FILE"
echo "Agent type: $AGENT_TYPE"
