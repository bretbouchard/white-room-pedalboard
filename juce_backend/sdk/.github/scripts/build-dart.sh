#!/bin/bash
set -e

echo "🔨 Building Dart SDK..."

cd packages/dart

# Install dependencies
dart pub get

# Run analyzer
dart analyze --fatal-infos

# Run tests
dart test

# Build for native (if applicable)
# dart compile native bin/schillinger_cli.dart

echo "✅ Dart build complete"
