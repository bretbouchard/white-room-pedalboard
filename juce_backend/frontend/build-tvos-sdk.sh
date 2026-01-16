#!/bin/bash
#
# build-tvos-sdk.sh
# Builds the Schillinger SDK for tvOS JavaScriptCore embedding
#
# This script bundles the actual Schillinger SDK from the tvOS branch
# located at ../schillinger-sdk
#
# Usage: ./build-tvos-sdk.sh
#

set -e  # Exit on error

echo "Building Schillinger SDK for tvOS..."
echo "================================================"

# Navigate to frontend directory (script is already in frontend/)
cd "$(dirname "$0")"

# Path to Schillinger SDK (tvOS branch)
SDK_PATH="../../schillinger-sdk"

# Check if SDK exists
if [ ! -d "$SDK_PATH" ]; then
    echo "❌ ERROR: Schillinger SDK not found at $SDK_PATH"
    echo "   Ensure the schillinger-sdk repository is checked out on the tvOS branch"
    exit 1
fi

# Check we're on the tvOS branch
cd "$SDK_PATH"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "tvOS" ]; then
    echo "⚠️  WARNING: SDK is on branch '$CURRENT_BRANCH', expected 'tvOS'"
    echo "   Proceeding anyway, but results may vary..."
fi
cd - > /dev/null

# Ensure SDK dependencies are installed
if [ ! -d "$SDK_PATH/node_modules" ]; then
    echo "Installing SDK dependencies..."
    cd "$SDK_PATH"
    npm install
    cd - > /dev/null
fi

# Ensure frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Build SDK bundle with esbuild
echo "Bundling SDK with esbuild..."
echo "Source: $SDK_PATH/core/index.ts"
echo "Target: ../platform/tvos/SchillingerSDK.bundle.js"

npx esbuild "$SDK_PATH/core/index.ts" \
  --bundle \
  --platform=node \
  --target=es2020 \
  --format=iife \
  --global-name=SchillingerSDK \
  --outfile=../platform/tvos/SchillingerSDK.bundle.js \
  --banner:js="// SchillingerSDK v2.0.0 | Built: $(date -u +"%Y-%m-%dT%H:%M:%SZ") | Platform: tvOS JavaScriptCore | Branch: tvOS\n// WARNING: Contains Node.js EventEmitter, will need runtime shims in tvOS" \
  --define:process.env.NODE_ENV="\"production\""

# Generate SHA-256 hash for integrity verification
echo "Generating SHA-256 hash..."
shasum -a 256 ../platform/tvos/SchillingerSDK.bundle.js > ../platform/tvos/SchillingerSDK.bundle.js.sha256

# Display hash
SHA_HASH=$(cat ../platform/tvos/SchillingerSDK.bundle.js.sha256)
FILE_SIZE=$(wc -c < ../platform/tvos/SchillingerSDK.bundle.js)
echo ""
echo "================================================"
echo "✅ SDK bundle built successfully!"
echo "================================================"
echo "Source:    schillinger-sdk (tvOS branch)"
echo "Bundle:    platform/tvos/SchillingerSDK.bundle.js"
echo "SHA-256:   $SHA_HASH"
echo "Size:      $FILE_SIZE bytes"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Review bundle for compliance with tvOS constraints"
echo "2. Test bundle loading in JavaScriptCore"
echo "3. Verify Swift bridge integration"
echo "4. Create test fixtures in tests/schillinger/fixtures/"
echo ""
