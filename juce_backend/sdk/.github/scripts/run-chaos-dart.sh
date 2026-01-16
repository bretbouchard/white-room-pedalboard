#!/bin/bash
set -e

echo "🌀 Running Chaos Scenarios (Dart)..."

cd packages/dart

# Run chaos scenarios
dart test test/chaos/chaos_test.dart

echo "✅ Chaos tests complete"
