#!/bin/bash

#==============================================================================
# Create Instrument Repositories
#
# Creates GitHub repositories for each instrument if they don't exist
# Requires GitHub CLI (gh) or GH_TOKEN environment variable
#==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/instrument_repos.conf"

# Load configuration
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "ERROR: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

source "$CONFIG_FILE"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

#==============================================================================
# Create Repository Function
#==============================================================================

create_repo_if_missing() {
    local name="$1"
    local repo_url="$2"
    local repo_name=$(basename -s .git "$repo_url")

    log_info "Checking repository: $repo_name"

    # Extract repo owner and name from URL
    # https://github.com/bretbouchard/repo.git -> bretbouchard/repo
    local repo_path=$(echo "$repo_url" | sed -E 's|https://github.com/||' | sed 's/.git$//')

    # Check if repo exists using GitHub API
    if gh repo view "$repo_path" > /dev/null 2>&1; then
        log_info "  Repository exists: $repo_name"
        return 0
    fi

    # Create repository
    log_info "  Creating repository: $repo_name"

    gh repo create "$repo_path" \
        --public \
        --description "Instrument DSP code for $name" \
        --add-readme \
        --default-branch="$DEFAULT_BRANCH" || {
        log_warning "  Failed to create $repo_name (may already exist)"
        return 0
    }

    log_info "  Created: $repo_name"
}

#==============================================================================
# Main
#==============================================================================

log_info "Creating instrument repositories..."

for instrument in "${INSTRUMENTS[@]}"; do
    IFS='|' read -r name path repo branch <<< "$instrument"
    create_repo_if_missing "$name" "$repo"
done

log_info "Repository creation complete!"
