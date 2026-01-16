#!/bin/bash
# White Room project status script
# Provides comprehensive overview of project status including Beads, Git, and Confucius

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${CYAN}${BOLD}=== $1 ===${NC}"
}

print_section() {
    echo -e "${GREEN}${BOLD}📋 $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

clear
echo -e "${CYAN}${BOLD}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           White Room Project Status Dashboard                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo ""

# ============================================
# BEADS INTEGRATION STATUS
# ============================================
print_header "Beads Integration Status"
echo ""

# Check bd installation
if command -v bd &> /dev/null; then
    BD_PATH=$(which bd)
    BD_VERSION=$(bd version 2>/dev/null | grep -oP 'version \K[0-9.]+' || echo "unknown")
    print_success "bd installed"
    echo "  Location: $BD_PATH"
    echo "  Version: $BD_VERSION"
else
    print_error "bd is NOT installed"
    echo "  Install with: go install github.com/steveyegge/beads/cmd/bd@latest"
fi
echo ""

# Check bd initialization
if [ -d ".beads" ]; then
    print_success "bd initialized in project"

    # Check database
    if [ -f ".beads/white_room.db" ]; then
        DB_SIZE=$(du -h .beads/white_room.db | cut -f1)
        echo "  Database: .beads/white_room.db ($DB_SIZE)"
    fi

    # Check daemon status
    if [ -f ".beads/daemon.pid" ]; then
        DAEMON_PID=$(cat .beads/daemon.pid)
        if ps -p "$DAEMON_PID" > /dev/null 2>&1; then
            print_success "bd daemon running (PID: $DAEMON_PID)"
        else
            print_warning "bd daemon PID file exists but process not running"
        fi
    else
        print_warning "bd daemon not running"
    fi
else
    print_error "bd NOT initialized"
    echo "  Run: bd init"
fi
echo ""

# ============================================
# BEADS ISSUES OVERVIEW
# ============================================
if command -v bd &> /dev/null && [ -d ".beads" ]; then
    print_section "Beads Issues Overview"
    echo ""

    # Get statistics
    if command -v jq &> /dev/null; then
        STATS=$(bd stats 2>/dev/null)
        echo "$STATS" | grep -E "Total Issues|Open|In Progress|Closed|Blocked|Ready" | sed 's/^/  /'
    else
        bd stats | sed 's/^/  /'
    fi
    echo ""

    # Show ready issues
    print_info "Ready Issues (No Blockers)"
    READY_COUNT=$(bd ready --json 2>/dev/null | jq '. | length' 2>/dev/null || echo "0")
    echo "  Count: $READY_COUNT"
    if [ "$READY_COUNT" -gt 0 ] && [ "$READY_COUNT" -le 5 ]; then
        echo "  Issues:"
        bd ready --json 2>/dev/null | jq -r '.[] | "    - \(.id): \(.title)"' 2>/dev/null || echo "    (Use jq for details)"
    fi
    echo ""

    # Show priority breakdown
    print_info "Issues by Priority"
    for PRIORITY in P0 P1 P2 P3; do
        COUNT=$(bd list --labels "priority-$PRIORITY" --status open --format csv 2>/dev/null | wc -l | tr -d ' ')
        if [ "$COUNT" -gt 0 ]; then
            PRIORITY_COLOR=$([ "$PRIORITY" = "P0" ] && echo "${RED}" || ([ "$PRIORITY" = "P1" ] && echo "${YELLOW}" || echo "${GREEN}"))
            echo -e "  ${PRIORITY_COLOR}$PRIORITY: $COUNT${NC}"
        fi
    done
    echo ""

    # Show in-progress
    print_info "In Progress Issues"
    IN_PROGRESS=$(bd list --status in-progress --format csv 2>/dev/null | wc -l | tr -d ' ')
    echo "  Count: $IN_PROGRESS"
    if [ "$IN_PROGRESS" -gt 0 ]; then
        bd list --status in-progress --json 2>/dev/null | jq -r '.[] | "    - \(.id): \(.title)"' 2>/dev/null | head -5 || echo "    (Use jq for details)"
    fi
    echo ""
fi

# ============================================
# CONFUCIUS MEMORY STATUS
# ============================================
print_header "Confucius Memory System"
echo ""

MEMORY_DIR=".beads/memory"
if [ -d "$MEMORY_DIR" ]; then
    print_success "Confucius memory system active"

    # Count memory artifacts
    MEMORY_COUNT=$(find "$MEMORY_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Total artifacts: $MEMORY_COUNT"

    # Count by type
    echo "  By type:"
    for type in pattern error_message design_decision build_log test_result conversation; do
        COUNT=$(find "$MEMORY_DIR" -name "*_${type}_*.json" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$COUNT" -gt 0 ]; then
            echo "    - $type: $COUNT"
        fi
    done
    echo ""

    # Show recent artifacts
    print_info "Recent Memory Artifacts (Last 7 Days)"
    RECENT_ARTIFACTS=$(find "$MEMORY_DIR" -name "*.json" -type f -mtime -7 2>/dev/null | wc -l | tr -d ' ')
    echo "  Created: $RECENT_ARTIFACTS"
    if [ "$RECENT_ARTIFACTS" -gt 0 ]; then
        echo "  Latest artifacts:"
        find "$MEMORY_DIR" -name "*.json" -type f -mtime -7 -printf "%T@ %p\n" 2>/dev/null | \
            sort -rn | head -5 | cut -d' ' -f2- | while read -r file; do
            basename "$file"
        done | sed 's/^/    /'
    fi
else
    print_warning "Confucius memory directory not found"
    echo "  Memory will be created when issues are closed"
fi
echo ""

# ============================================
# GIT STATUS
# ============================================
print_header "Git Status"
echo ""

if [ -d ".git" ]; then
    # Current branch
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    print_info "Current branch: $CURRENT_BRANCH"
    echo ""

    # Recent commits
    print_info "Recent Commits (Last 5)"
    git log --oneline -5 --decorate 2>/dev/null | sed 's/^/  /'
    echo ""

    # Working tree status
    print_info "Working Tree Status"
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        print_warning "Uncommitted changes"
        echo "  Modified files:"
        git status --porcelain 2>/dev/null | sed 's/^/    /' | head -10
        if [ $(git status --porcelain 2>/dev/null | wc -l) -gt 10 ]; then
            echo "    ... and more"
        fi
    else
        print_success "Working tree clean"
    fi
    echo ""

    # Untracked files
    UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
    if [ "$UNTRACKED" -gt 0 ]; then
        print_info "Untracked files: $UNTRACKED"
    fi
else
    print_warning "Not a git repository"
fi
echo ""

# ============================================
# PROJECT STRUCTURE
# ============================================
print_header "Project Structure"
echo ""

# Key directories
print_info "Key Components"
for dir in sdk juce_backend swift_frontend daw_control design_system infrastructure; do
    if [ -d "$dir" ]; then
        FILES=$(find "$dir" -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "  $dir: $FILES files"
    else
        echo "  $dir: ${RED}not found${NC}"
    fi
done
echo ""

# Documentation
print_info "Documentation"
for doc_dir in docs specs plans; do
    if [ -d "$doc_dir" ]; then
        DOCS=$(find "$doc_dir" -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
        echo "  $doc_dir/: $DOCS markdown files"
    fi
done
echo ""

# ============================================
# QUICK ACTIONS
# ============================================
print_header "Quick Actions"
echo ""

echo "Common commands:"
echo ""
echo "  📊 Beads:"
echo "    bd ready                    - Show ready issues"
echo "    bd create \"TITLE\"           - Create new issue"
echo "    ./scripts/beads-workflow.sh - Full Beads workflow"
echo ""
echo "  🧠 Confucius:"
echo "    Ask Claude: \"Check Confucius for patterns about [topic]\""
echo ""
echo "  🔧 Development:"
echo "    /validate                   - Run validation"
echo "    git status                  - Git status"
echo ""
echo "  📖 Documentation:"
echo "    docs/beads-integration.md   - Beads usage guide"
echo "    .claude/CLAUDE.md           - Project instructions"
echo ""

# ============================================
# RECOMMENDATIONS
# ============================================
print_header "Recommendations"
echo ""

# Check for P0 issues
if command -v bd &> /dev/null && [ -d ".beads" ]; then
    P0_COUNT=$(bd list --labels priority-P0 --status open --format csv 2>/dev/null | wc -l | tr -d ' ')
    if [ "$P0_COUNT" -gt 0 ]; then
        print_warning "Found $P0_COUNT P0 issue(s) - recommend addressing these first"
    fi
fi

# Check for uncommitted changes
if [ -d ".git" ] && [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    print_warning "Uncommitted changes - consider committing or stashing"
fi

# Check daemon
if [ -d ".beads" ] && [ ! -f ".beads/daemon.pid" ]; then
    print_info "bd daemon not running - start with: bd daemon &"
fi

echo ""
echo -e "${CYAN}${BOLD}=== End of Status Report ===${NC}"
echo ""

# Timestamp
echo -e "${BLUE}Generated: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
