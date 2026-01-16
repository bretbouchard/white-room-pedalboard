#!/bin/bash
# Beads workflow automation script for White Room project
# This script provides common Beads workflow operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_section() {
    echo -e "${GREEN}📋 $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if bd is available
if ! command -v bd &> /dev/null; then
    echo -e "${RED}Error: bd is not installed${NC}"
    echo "Install with: go install github.com/steveyegge/beads/cmd/bd@latest"
    exit 1
fi

# Check if we're in a bd-initialized directory
if [ ! -d ".beads" ]; then
    echo -e "${RED}Error: .beads directory not found${NC}"
    echo "Run: bd init"
    exit 1
fi

print_header "Beads Workflow - White Room Project"
echo ""

# Show ready issues
print_section "Ready Issues (No Blockers)"
echo ""
bd ready --json | jq -r '.[] | "- \(.id): \(.title) | Priority: P\(.priority) | Status: \(.status)"' 2>/dev/null || bd ready
echo ""

# Show open issues count
print_section "Open Issues Summary"
echo ""
OPEN_COUNT=$(bd list --status open --format csv 2>/dev/null | wc -l | tr -d ' ')
echo "Total open issues: $OPEN_COUNT"
echo ""

# Break down by priority
echo "By Priority:"
for PRIORITY in P0 P1 P2 P3; do
    COUNT=$(bd list --labels "priority-$PRIORITY" --status open --format csv 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        echo "  $PRIORITY: $COUNT"
    fi
done
echo ""

# Show in-progress issues
print_section "In Progress Issues"
echo ""
IN_PROGRESS=$(bd list --status in-progress --format csv 2>/dev/null | wc -l | tr -d ' ')
if [ "$IN_PROGRESS" -gt 0 ]; then
    echo "Currently working on $IN_PROGRESS issue(s):"
    bd list --status in-progress --json | jq -r '.[] | "- \(.id): \(.title)"' 2>/dev/null || bd list --status in-progress
else
    echo "No issues currently in progress"
fi
echo ""

# Show blocked issues
print_section "Blocked Issues"
echo ""
BLOCKED_COUNT=$(bd blocked --format csv 2>/dev/null | wc -l | tr -d ' ')
if [ "$BLOCKED_COUNT" -gt 0 ]; then
    echo "$BLOCKED_COUNT issue(s) blocked:"
    bd blocked --json | jq -r '.[] | "- \(.id): \(.title) | Blocked by: \(.blockers)"' 2>/dev/null || bd blocked
else
    echo "No blocked issues"
fi
echo ""

# Show recent activity
print_section "Recent Activity (Last 10)"
echo ""
# Note: bd log command may not be available in all versions
if command -v jq &> /dev/null; then
    # Try to get recent activity from issues instead
    bd list --status open --json 2>/dev/null | jq -r '[.[] | sort_by(.updated_at) | reverse | .[0:10]] | .[] | "[\(.updated_at | .[0:19])] \(.id): \(.title)"' 2>/dev/null || echo "Recent activity not available"
else
    echo "Install jq for better output"
fi
echo ""

# Show statistics
print_section "Project Statistics"
echo ""
bd stats
echo ""

# Show Confucius memory status
print_section "Confucius Memory System"
echo ""
MEMORY_DIR=".beads/memory"
if [ -d "$MEMORY_DIR" ]; then
    MEMORY_COUNT=$(find "$MEMORY_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    echo "Memory artifacts: $MEMORY_COUNT"

    # Show recent memory artifacts
    if [ "$MEMORY_COUNT" -gt 0 ]; then
        echo ""
        echo "Recent artifacts:"
        find "$MEMORY_DIR" -name "*.json" -type f -mtime -7 2>/dev/null | head -5 | while read -r file; do
            basename "$file"
        done
    fi
else
    echo "No memory directory found"
fi
echo ""

# Show quick actions
print_section "Quick Actions"
echo ""
echo "Common commands:"
echo "  bd ready                 - Show ready issues"
echo "  bd create \"TITLE\"        - Create new issue"
echo "  bd update ISSUE_ID       - Update issue"
echo "  bd close ISSUE_ID        - Close issue"
echo "  bd list --status open    - List open issues"
echo "  ./scripts/status.sh      - Full project status"
echo ""

# Show work recommendations
print_section "Work Recommendations"
echo ""

# Check for P0 issues
P0_COUNT=$(bd list --labels priority-P0 --status open --format csv 2>/dev/null | wc -l | tr -d ' ')
if [ "$P0_COUNT" -gt 0 ]; then
    print_warning "Found $P0_COUNT P0 issue(s) - consider working on these first"
fi

# Check if too many issues in progress
if [ "$IN_PROGRESS" -gt 3 ]; then
    print_warning "You have $IN_PROGRESS issues in progress - consider focusing on fewer"
fi

# Check for old issues
echo "For more details, run:"
echo "  bd list --labels priority-P0 --status open"
echo "  bd list --labels priority-P1 --status open"
echo ""

echo "=== End of Beads Workflow ==="
