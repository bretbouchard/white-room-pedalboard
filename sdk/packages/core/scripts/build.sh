#!/bin/bash

# Build script for Schillinger SDK v1 Core Package

set -e

cd "$(dirname "$0")/.."

echo "🔨 Building @schillinger-sdk/core-v1..."
echo ""

# Clean previous build
echo "Cleaning previous build..."
npm run clean --silent

# Type check
echo "Running type check..."
npm run type-check --silent

# Build
echo "Compiling TypeScript..."
npm run build --silent

echo ""
echo "✅ Build complete!"
echo "📦 Output: dist/"
