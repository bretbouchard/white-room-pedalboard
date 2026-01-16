#!/bin/bash

#==============================================================================
# Instrument Subtree Split Script
#
# Automatically splits and pushes each instrument to its own repository
# using git subtree split. Preserves full commit history per instrument.
#
# Usage: ./split_instruments.sh [instrument_name]
#
# If instrument_name is provided, only splits that instrument.
# Otherwise, splits all configured instruments.
#
# Required: GitHub PAT token with repo scope exported as GH_TOKEN
#==============================================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$SCRIPT_DIR/instrument_repos.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

#==============================================================================
# Load Configuration
#==============================================================================

if [[ ! -f "$CONFIG_FILE" ]]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

source "$CONFIG_FILE"

#==============================================================================
# Validate Environment
#==============================================================================

# Try to get token from environment, GitHub CLI, or .env file
if [[ -z "$GH_TOKEN" ]]; then
    # Try GitHub CLI
    if command -v gh &> /dev/null; then
        GH_TOKEN=$(gh auth token 2>/dev/null)
    fi

    # Try .env file
    if [[ -z "$GH_TOKEN" && -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
    fi
fi

if [[ -z "$GH_TOKEN" ]]; then
    log_error "GH_TOKEN environment variable not set"
    log_info "Create a PAT at: https://github.com/settings/tokens"
    log_info "Required scopes: repo (full control of private repositories)"
    log_info "Or use: gh auth login (GitHub CLI)"
    exit 1
fi

log_info "Using GitHub authentication"

cd "$PROJECT_ROOT"

# Ensure we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Not a git repository: $PROJECT_ROOT"
    exit 1
fi

#==============================================================================
# Functions
#==============================================================================

split_instrument() {
    local name="$1"
    local path="$2"
    local repo="$3"
    local branch="${4:-main}"

    log_info "Splitting $name from $path"

    # Create temp branch for subtree split
    local temp_branch="split-${name}-tmp-$(date +%s)"

    # Perform subtree split
    log_info "  Running subtree split (this may take a while)..."
    if ! git subtree split --prefix="$path" -b "$temp_branch" 2>&1 | tail -1; then
        log_error "  Failed to split $name"
        return 1
    fi

    # Get the commit hash for logging
    local split_hash=$(git rev-parse "$temp_branch")
    log_info "  Split at commit: ${split_hash:0:8}"

    # Add remote if it doesn't exist
    local remote_name="instrument-${name}"

    if ! git remote | grep -q "^${remote_name}$"; then
        log_info "  Adding remote: $repo"
        git remote add "$remote_name" "$repo"
    fi

    # Push to remote repository
    log_info "  Pushing to $repo (branch: $branch)..."

    # Use GH token for authentication
    local auth_repo="${repo/https:\/\//https:\/\/x-access-token:${GH_TOKEN}@}"

    if git push "$auth_repo" "$temp_branch:$branch" --force 2>&1 | tail -5; then
        log_success "$name pushed successfully"

        # Clean up temp branch
        git branch -D "$temp_branch" > /dev/null 2>&1 || true

        return 0
    else
        log_error "  Failed to push $name"
        git branch -D "$temp_branch" > /dev/null 2>&1 || true
        return 1
    fi
}

#==============================================================================
# Main Script
#==============================================================================

# Check if specific instrument requested
TARGET_INSTRUMENT="$1"

log_info "Starting instrument subtree split..."
log_info "Project root: $PROJECT_ROOT"

# Counters
total=0
success=0
failed=0

# Split each configured instrument
for instrument in "${INSTRUMENTS[@]}"; do
    IFS='|' read -r name path repo branch <<< "$instrument"

    # Skip if specific instrument requested and this isn't it
    if [[ -n "$TARGET_INSTRUMENT" && "$name" != "$TARGET_INSTRUMENT" ]]; then
        continue
    fi

    total=$((total + 1))

    if split_instrument "$name" "$path" "$repo" "$branch"; then
        success=$((success + 1))
    else
        failed=$((failed + 1))
    fi
done

#==============================================================================
# Summary
#==============================================================================

echo ""
log_info "Split complete!"
log_info "Total: $total, Success: $success, Failed: $failed"

if [[ $failed -gt 0 ]]; then
    exit 1
fi

exit 0
