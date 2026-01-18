#!/bin/bash

###############################################################################
# Hono Security Fix Monitoring Script
###############################################################################
#
# Purpose: Monitor npm registry for Hono 4.11.4 availability (JWT security fix)
#
# Vulnerabilities Fixed:
# - GHSA-3vhc-576x-3qv4 (CVE-2026-22818) - JWT algorithm confusion
# - GHSA-f67f-6cw9-8mq4 - JWT middleware default algorithm bypass
#
# Usage:
#   ./scripts/monitor-hono-updates.sh
#
# Schedule: Run daily via cron or GitHub Actions
#
# Author: Security Team
# Created: 2026-01-17
# Version: 1.0
#
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET_VERSION="4.11.4"
MIN_VERSION="4.11.4"
PACKAGE_NAME="hono"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/.beads/logs/hono-monitor.log"
STATE_FILE="$PROJECT_ROOT/.beads/state/hono-monitor.state"
ALERT_SENT_FILE="$PROJECT_ROOT/.beads/state/hono-alert-sent"

# GitHub issue configuration
BD_ISSUE="white_room-419"

###############################################################################
# Logging Functions
###############################################################################

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"
}

###############################################################################
# State Management
###############################################################################

init_state() {
    mkdir -p "$(dirname "$STATE_FILE")"
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$(dirname "$ALERT_SENT_FILE")"
}

save_state() {
    local last_checked_version="$1"
    local last_check_date="$2"
    cat > "$STATE_FILE" << EOF
last_checked_version=$last_checked_version
last_check_date=$last_check_date
last_check_timestamp=$(date +%s)
EOF
}

load_state() {
    if [[ -f "$STATE_FILE" ]]; then
        source "$STATE_FILE"
        echo "$last_checked_version"
    else
        echo ""
    fi
}

mark_alert_sent() {
    echo "$(date +%s)" > "$ALERT_SENT_FILE"
}

was_alert_sent() {
    if [[ -f "$ALERT_SENT_FILE" ]]; then
        local alert_time=$(cat "$ALERT_SENT_FILE")
        local current_time=$(date +%s)
        local elapsed_seconds=$((current_time - alert_time))
        local elapsed_days=$((elapsed_seconds / 86400))

        # Reset alert flag after 7 days (in case we need to re-alert)
        if [[ $elapsed_days -gt 7 ]]; then
            rm -f "$ALERT_SENT_FILE"
            return 1
        fi
        return 0
    fi
    return 1
}

###############################################################################
# Version Checking Functions
###############################################################################

check_npm_version() {
    log_info "Checking npm registry for $PACKAGE_NAME $TARGET_VERSION..."

    # Check if specific version exists - capture output
    local output
    output=$(npm view "$PACKAGE_NAME@$TARGET_VERSION" 2>&1)
    local exit_code=$?

    if [[ $exit_code -eq 0 && ! "$output" =~ "404" ]]; then
        log_success "npm view succeeded for version $TARGET_VERSION"
        return 0
    else
        log_info "npm view failed: version $TARGET_VERSION not found (exit code: $exit_code)"
        return 1
    fi
}

get_latest_version() {
    local latest=$(npm view "$PACKAGE_NAME" version 2>/dev/null || echo "unknown")
    echo "$latest"
}

get_all_versions() {
    npm view "$PACKAGE_NAME" versions --json 2>/dev/null | jq -r '.[]' | tail -20
}

check_github_release() {
    log_info "Checking GitHub for honojs/hono releases..."

    local release_info=$(curl -s "https://api.github.com/repos/honojs/hono/releases/tags/v$TARGET_VERSION" 2>/dev/null)

    if [[ $? -eq 0 && -n "$release_info" ]]; then
        local published_at=$(echo "$release_info" | jq -r '.published_at // empty' 2>/dev/null)
        if [[ -n "$published_at" ]]; then
            log_success "GitHub release v$TARGET_VERSION published on: $published_at"
            return 0
        fi
    fi

    return 1
}

###############################################################################
# Alert Functions
###############################################################################

send_alert() {
    local current_version="$1"
    local latest_version="$2"

    log_warning "╔════════════════════════════════════════════════════════════╗"
    log_warning "║                                                        ║"
    log_warning "║   🚨 HONO SECURITY FIX AVAILABLE - IMMEDIATE ACTION   ║"
    log_warning "║                                                        ║"
    log_warning "╚════════════════════════════════════════════════════════════╝"
    log_warning ""
    log_warning "Target Version: $TARGET_VERSION"
    log_warning "Current Latest: $latest_version"
    log_warning ""
    log_warning "Security Fixes:"
    log_warning "  ✅ GHSA-3vhc-576x-3qv4 (CVE-2026-22818) - JWT algorithm confusion"
    log_warning "  ✅ GHSA-f67f-6cw9-8mq4 - JWT middleware default algorithm bypass"
    log_warning ""
    log_warning "Next Steps:"
    log_warning "  1. Update dependency: npm update hono"
    log_warning "  2. Test MCP SDK functionality"
    log_warning "  3. Run full test suite"
    log_warning "  4. Update bd issue $BD_ISSUE"
    log_warning "  5. Close this monitoring script"
    log_warning ""

    # Create bd issue comment or update
    if command -v bd &> /dev/null; then
        log_info "Updating bd issue $BD_ISSUE..."

        # Add comment to bd issue
        bd comment "$BD_ISSUE" "Hono $TARGET_VERSION is now available on npm! 🎉

Security fixes:
- GHSA-3vhc-576x-3qv4 (CVE-2026-22818)
- GHSA-f67f-6cw9-8mq4

Next steps:
1. Run: npm update hono
2. Test MCP SDK functionality
3. Run full test suite
4. Close this issue

Detected by: scripts/monitor-hono-updates.sh" 2>/dev/null || true
    fi

    # Mark alert as sent
    mark_alert_sent

    # Send to log file for review
    {
        echo ""
        echo "=============================================="
        echo "HONO SECURITY FIX AVAILABLE - $(date)"
        echo "=============================================="
        echo "Version: $TARGET_VERSION"
        echo "Action Required: Update immediately"
        echo ""
    } >> "$PROJECT_ROOT/.beads/security-reports/HONO_UPDATE_ALERT.txt"
}

###############################################################################
# Main Monitoring Logic
###############################################################################

main() {
    log_info "════════════════════════════════════════════════════════════"
    log_info "Hono Security Fix Monitoring - Starting Check"
    log_info "════════════════════════════════════════════════════════════"
    log_info ""

    # Initialize state
    init_state

    # Load previous state
    local previous_version=$(load_state)
    log_info "Previous check: $previous_version"

    # Check if alert was already sent
    if was_alert_sent; then
        log_warning "Alert already sent. Skipping notification to avoid spam."
        log_info "Alert will reset after 7 days. To re-alert immediately, run: rm $ALERT_SENT_FILE"
        log_info ""
    fi

    # Get current latest version
    local latest_version=$(get_latest_version)
    log_info "Current latest version on npm: $latest_version"
    log_info ""

    # Check if target version is available
    if check_npm_version; then
        log_success "✅ $PACKAGE_NAME $TARGET_VERSION IS AVAILABLE on npm!"

        # Send alert only if not already sent
        if ! was_alert_sent; then
            send_alert "$previous_version" "$latest_version"
            log_success "Alert sent and state updated."
        else
            log_info "Alert previously sent. Use 'rm $ALERT_SENT_FILE' to reset."
        fi

        # Update state
        save_state "$TARGET_VERSION" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

        log_info ""
        log_info "════════════════════════════════════════════════════════════"
        log_success "Monitoring Complete - Version $TARGET_VERSION Found!"
        log_info "════════════════════════════════════════════════════════════"
        return 0

    else
        log_warning "❌ $PACKAGE_NAME $TARGET_VERSION NOT YET AVAILABLE on npm"
        log_info ""

        # Check GitHub release status
        if check_github_release; then
            log_info "GitHub release exists but npm registry not yet synchronized"
            log_info "This is normal - npm registry typically syncs within 1-7 days"
        else
            log_warning "GitHub release also not found - may not be published yet"
        fi

        log_info ""
        log_info "Recent versions available on npm:"
        get_all_versions | while read version; do
            if [[ "$version" == "$TARGET_VERSION" ]]; then
                echo -e "  ${GREEN}✓ $version${NC}"
            else
                echo "    $version"
            fi
        done

        log_info ""
        log_info "Will check again tomorrow..."
        log_info ""

        # Update state
        save_state "$latest_version" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

        log_info "════════════════════════════════════════════════════════════"
        log_info "Monitoring Complete - Version Not Yet Available"
        log_info "════════════════════════════════════════════════════════════"
        return 1
    fi
}

###############################################################################
# Script Entry Point
###############################################################################

# Change to project root
cd "$PROJECT_ROOT" || exit 1

# Run main function
main "$@"
