# Beads Integration Guide

## Overview

White Room uses **Beads (bd)** for comprehensive task management and issue tracking. This guide covers installation, usage patterns, and best practices for the project.

## Installation

### Current Status
- **bd version**: 0.11.0 (dev)
- **Installation method**: `go install github.com/steveyegge/beads/cmd/bd@latest`
- **Binary location**: `/Users/bretbouchard/go/bin/bd`
- **Database**: `.beads/white_room.db`

### Installation Commands
```bash
# Install bd via Go
go install github.com/steveyegge/beads/cmd/bd@latest

# Verify installation
which bd
bd version

# Initialize in project (already done)
bd init
```

## Project Status

### Current Statistics (as of 2026-01-15)
- **Total Issues**: 305
- **Open**: 162
- **In Progress**: 4
- **Closed**: 139
- **Blocked**: 6
- **Ready**: 156
- **Average Lead Time**: 20.6 hours

### Database Location
```
/Users/bretbouchard/apps/schill/white_room/.beads/
├── white_room.db          # Main SQLite database
├── issues.jsonl           # Git-synced issue export
├── memory/                # Confucius memory artifacts
├── daemon.log             # Background sync daemon log
└── daemon.pid             # Daemon process ID
```

## Core Workflow

### 1. Before Starting Work
**ALWAYS** check bd status before beginning any task:

```bash
# Check ready issues (no blockers)
bd ready --json

# Show all open issues
bd list --status open

# Show issues by priority
bd list --labels priority-P0
bd list --labels priority-P1
```

### 2. Creating Issues

#### Basic Issue Creation
```bash
# Create simple issue
bd create "Issue title"

# Create with type and priority
bd create "Fix audio glitch" --type bug --priority P0

# Create with description
bd create "Implement feature" --description "Detailed explanation..."
```

#### Issue Types
- `feature` - New functionality
- `bug` - Defects or errors
- `task` - Work items (refactoring, docs, etc.)
- `epic` - Large features spanning multiple issues

#### Priority Levels
- `P0` - Critical, blocking
- `P1` - High priority
- `P2` - Medium priority
- `P3` - Low priority

### 3. Working on Issues

#### Claim an Issue
```bash
# Start working on an issue
bd update white_room-123 --status in-progress --actor "Your Name"

# Or claim multiple issues
bd update white_room-123 white_room-124 --status in-progress
```

#### Update Issues
```bash
# Add description
bd update white_room-123 --description "New details..."

# Add labels
bd label add white_room-123 foundation sdk

# Remove labels
bd label remove white_room-123 old-label
```

### 4. Closing Issues

```bash
# Close with resolution message
bd close white_room-123 --message "Complete. Implemented X, Y, Z."

# Close multiple issues
bd close white_room-123 white_room-124 --message "All complete."
```

**Important**: When you close an issue, **Confucius automatically learns** from it:
1. Extracts patterns and learnings
2. Stores as structured artifact in `.beads/memory/`
3. Tags with issue ID, labels, confidence score
4. Makes it available for future retrieval

### 5. Managing Dependencies

```bash
# Add dependency (white_room-124 depends on white_room-123)
bd dep add white_room-124 white_room-123

# Remove dependency
bd dep remove white_room-124 white_room-123

# Show dependency graph
bd dep show white_room-124
```

## Best Practices

### 1. Always Check bd Ready
Before starting any work:
```bash
bd ready --json
```
This shows issues with no blockers, ready to be worked on.

### 2. Create Issues for ALL Work
No work happens without tracking:
- Feature development → Create `feature` issue
- Bug fixes → Create `bug` issue
- Refactoring → Create `task` issue
- Documentation → Create `task` issue
- Questions → Create `task` with label `question`

### 3. Use Consistent Labels
Project-specific labels:
- **Component**: `sdk`, `juce_backend`, `swift_frontend`, `daw_control`
- **Type**: `foundation`, `integration`, `enhancement`, `bug`
- **Priority**: `priority-P0`, `priority-P1`, `priority-P2`
- **Phase**: `phase-1`, `phase-2`, `milestone`
- **Blocker**: `blocking` for issues that block other work

### 4. Close Issues Properly
Always include resolution message:
```bash
bd close white_room-123 --message "Complete. Implemented X, tested Y, documentation updated."
```

This helps Confucius learn better patterns.

### 5. Check Confucius Before Starting
When starting work, ask Claude:
```
"Check Confucius for patterns related to [your task]"
```

Confucius will retrieve relevant past solutions and patterns.

## Confucius Integration

### What is Confucius?

Confucius is an AI-powered hierarchical memory system that:
- **Automatically learns** from closed bd issues
- **Retrieves relevant context** when you need it
- **Stores patterns, errors, design decisions**
- Makes the team collectively smarter over time

### When to Use Confucius

#### ✅ ALWAYS Use Confucius When:
1. **Starting a new task** - "Check Confucius for patterns about [topic]"
2. **Encountering an error** - "What does Confucius know about [error type]?"
3. **Making design decisions** - "What has Confucius learned about [component]?"
4. **Repeating work** - "Search Confucius for similar past solutions"
5. **Learning about a component** - "What does Confucius know about [module]?"

#### ❌ DON'T Use Confucius For:
- Simple code syntax questions
- One-time calculations
- Real-time system status
- Unrelated topics

### Memory Organization

Confucius organizes knowledge hierarchically:
- **Repository (10%)**: Project-wide patterns
- **Submodule (30%)**: Component-specific (sdk/, juce_backend/, swift_frontend/)
- **Session (30%)**: Current conversation context
- **Task (30%)**: Task-specific learnings

### Artifact Types

- `pattern` - Reusable solutions and approaches
- `error_message` - Common errors and fixes
- `design_decision` - Architectural decisions
- `build_log` - Build-related learnings
- `test_result` - Testing insights
- `conversation` - Important discussion summaries

## Common Workflows

### Feature Development Workflow
```bash
# 1. Check ready issues
bd ready --json

# 2. Check Confucius for patterns
"Search Confucius for patterns about [feature topic]"

# 3. Create issue if needed
bd create "Implement feature" --type feature --priority P1

# 4. Claim and start work
bd update white_room-XXX --status in-progress

# 5. Work...

# 6. Close with resolution
bd close white_room-XXX --message "Complete. Details..."
```

### Bug Fix Workflow
```bash
# 1. Check Confucius for similar errors
"What does Confucius know about [error type]?"

# 2. Create bug issue
bd create "Fix bug" --type bug --priority P0

# 3. Claim and fix
bd update white_room-XXX --status in-progress

# 4. Close with fix details
bd close white_room-XXX --message "Fixed. Root cause: X, Solution: Y"
```

### Review Workflow
```bash
# Show ready issues
bd ready --json

# Show issues by priority
bd list --labels priority-P0 --status open
bd list --labels priority-P1 --status open

# Show blocked issues
bd blocked

# Show epic progress
bd epic show white_room-302
```

## Commands Reference

### Core Commands
```bash
bd ready              # Show ready issues (no blockers)
bd list               # List all issues
bd show ISSUE_ID      # Show issue details
bd create TITLE       # Create new issue
bd update ISSUE_ID    # Update issue
bd close ISSUE_ID     # Close issue
bd dep                # Manage dependencies
bd label              # Manage labels
bd stats              # Show statistics
```

### Query Patterns
```bash
# By status
bd list --status open
bd list --status in-progress
bd list --status closed

# By labels
bd list --labels sdk
bd list --labels priority-P0

# By type
bd list --type feature
bd list --type bug

# Combined
bd list --status open --labels priority-P0 --type feature
```

### JSON Output
For programmatic access:
```bash
bd ready --json | jq '.[] | select(.labels[] | contains("sdk"))'
bd list --status open --json | jq '.[] | {id, title, priority}'
```

## Git Integration

### Sync with Remote
```bash
# Sync issues to git remote
bd sync

# Import issues from remote
bd import

# Export issues to git
bd export
```

### Issue Storage
Issues are stored in two places:
1. **SQLite database** (`.beads/white_room.db`) - Fast queries
2. **JSONL file** (`.beads/issues.jsonl`) - Git-tracked, human-readable

### Background Daemon
The background sync daemon (`bd daemon`) automatically:
- Syncs issues between DB and JSONL
- Monitors for git changes
- Handles concurrent access
- Logs activity to `.beads/daemon.log`

## Workflow Scripts

### Status Check
```bash
./scripts/status.sh
```
Shows:
- Beads installation status
- Open issues count
- Ready issues
- Confucius memory count
- Recent commits

### Beads Workflow
```bash
./scripts/beads-workflow.sh
```
Shows:
- Ready issues
- Open issues count
- Recent activity

## Troubleshooting

### Daemon Issues
```bash
# Check if daemon is running
ps aux | grep "bd daemon"

# Check daemon log
tail -f .beads/daemon.log

# Restart daemon
pkill -f "bd daemon"
bd daemon &
```

### Database Issues
```bash
# Check database integrity
sqlite3 .beads/white_room.db "PRAGMA integrity_check;"

# Export to JSONL (backup)
bd export

# Reimport from JSONL
bd import
```

### Confucius Issues
```bash
# Check memory directory
ls -la .beads/memory/

# Count memory artifacts
find .beads/memory -name "*.json" | wc -l

# Clear memory (rarely needed)
# This deletes all learned patterns
rm -rf .beads/memory/
```

## Tips & Tricks

### 1. Quick Issue Creation
```bash
# Create from clipboard (macOS)
bd create "$(pbpaste)"
```

### 2. Bulk Updates
```bash
# Close multiple issues
bd close white_room-123 white_room-124 white_room-125

# Update multiple issues
bd update white_room-123 white_room-124 --status in-progress
```

### 3. Label Management
```bash
# Show all labels
bd label list

# Add label to multiple issues
bd label add white_room-123 white_room-124 priority-P0
```

### 4. Dependency Visualization
```bash
# Show dependency tree
bd dep show white_room-302

# Show blocked issues
bd blocked
```

## Related Documentation

- [Confucius Memory System](/Users/bretbouchard/apps/schill/white_room/.claude/CLAUDE.md)
- [Project Constitution](/Users/bretbouchard/apps/schill/white_room/.claude/CLAUDE.md)
- [SLC Development Philosophy](/Users/bretbouchard/apps/schill/white_room/.claude/CLAUDE.md)

## Support

For issues or questions:
1. Check Confucius for patterns
2. Review this documentation
3. Create bd issue with label `question`
4. Ask team in appropriate channel

---

**Last Updated**: 2026-01-15
**Beads Version**: 0.11.0 (dev)
**Project**: White Room
