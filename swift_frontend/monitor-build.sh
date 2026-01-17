#!/bin/bash

# Continuous Build Monitoring Script
# Monitors build progress and reports error trends

LOG_FILE="/tmp/white_room_build.log"
ERROR_LOG="/tmp/white_room_errors.log"
TRENDS_LOG="/tmp/white_room_trends.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== White Room Build Monitor ===" | tee -a "$TRENDS_LOG"
echo "Started at $(date)" | tee -a "$TRENDS_LOG"

# Initial build
cd /Users/bretbouchard/apps/schill/white_room/swift_frontend
xcodebuild -project WhiteRoomiOS/WhiteRoomiOSProject/WhiteRoomiOS.xcodeproj \
  -scheme WhiteRoomiOS -sdk iphonesimulator \
  -destination 'id=00008110-001579DC2E91A01E' \
  clean build 2>&1 | tee "$LOG_FILE"

# Count errors
ERROR_COUNT=$(grep "error:" "$LOG_FILE" | wc -l | tr -d ' ')
echo "Initial error count: $ERROR_COUNT" | tee -a "$TRENDS_LOG"

# Extract and categorize errors
grep "error:" "$LOG_FILE" > "$ERROR_LOG"

AMBIGUOUS_COUNT=$(grep -c "is ambiguous for type lookup" "$ERROR_LOG" || echo "0")
MISSING_TYPE_COUNT=$(grep -c "type annotation missing in pattern" "$ERROR_LOG" || echo "0")
SCOPE_COUNT=$(grep -c "cannot find.*in scope" "$ERROR_LOG" || echo "0")
VIEWBUILDER_COUNT=$(grep -c "cannot use explicit 'return' statement in the body of result builder 'ViewBuilder'" "$ERROR_LOG" || echo "0")
PROTOCOL_COUNT=$(grep -c "does not conform to protocol" "$ERROR_LOG" || echo "0")
REDECLARATION_COUNT=$(grep -c "invalid redeclaration" "$ERROR_LOG" || echo "0")

echo "" | tee -a "$TRENDS_LOG"
echo "Error Categories:" | tee -a "$TRENDS_LOG"
echo "  Ambiguous types:     $AMBIGUOUS_COUNT" | tee -a "$TRENDS_LOG"
echo "  Missing types:       $MISSING_TYPE_COUNT" | tee -a "$TRENDS_LOG"
echo "  Scope issues:        $SCOPE_COUNT" | tee -a "$TRENDS_LOG"
echo "  ViewBuilder errors:  $VIEWBUILDER_COUNT" | tee -a "$TRENDS_LOG"
echo "  Protocol issues:     $PROTOCOL_COUNT" | tee -a "$TRENDS_LOG"
echo "  Redeclarations:      $REDECLARATION_COUNT" | tee -a "$TRENDS_LOG"
echo "" | tee -a "$TRENDS_LOG"

# Top 10 files with most errors
echo "Top 10 files with errors:" | tee -a "$TRENDS_LOG"
grep "error:" "$ERROR_LOG" | cut -d':' -f1 | sort | uniq -c | sort -rn | head -10 | tee -a "$TRENDS_LOG"
echo "" | tee -a "$TRENDS_LOG"

if [ "$ERROR_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓ BUILD SUCCESSFUL!${NC}" | tee -a "$TRENDS_LOG"
  exit 0
else
  echo -e "${RED}✗ Build failed with $ERROR_COUNT errors${NC}" | tee -a "$TRENDS_LOG"
  exit 1
fi
