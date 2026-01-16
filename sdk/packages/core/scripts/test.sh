#!/bin/bash

# Test runner for Schillinger SDK v1 Core Package

set -e

cd "$(dirname "$0")/.."

echo "🧪 Running tests for @schillinger-sdk/core-v1..."
echo ""

# Run tests
npm test

echo ""
echo "✅ Tests passed!"
