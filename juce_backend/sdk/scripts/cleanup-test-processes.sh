#!/bin/bash

# Cleanup script for test processes
# This script kills any lingering test servers or processes

echo "🧹 Cleaning up test processes..."

# Kill any processes using port 8000
if command -v lsof >/dev/null 2>&1; then
    echo "Checking for processes on port 8000..."
    PIDS=$(lsof -ti:8000 2>/dev/null || true)
    if [ ! -z "$PIDS" ]; then
        echo "Killing processes on port 8000: $PIDS"
        echo $PIDS | xargs kill -9 2>/dev/null || true
    fi
fi

# Kill any node processes with 'test-server' in the name
echo "Checking for test-server processes..."
pkill -f "test-server" 2>/dev/null || true

# Kill any vitest processes that might be hanging
echo "Checking for hanging vitest processes..."
pkill -f "vitest" 2>/dev/null || true

# Clean up any temporary test files
echo "Cleaning up temporary test files..."
rm -rf /tmp/schillinger-test-* 2>/dev/null || true

echo "✅ Test process cleanup completed"