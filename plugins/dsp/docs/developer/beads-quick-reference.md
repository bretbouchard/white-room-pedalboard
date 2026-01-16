# Beads Quick Reference

## Essential Commands

### Daily Workflow
```bash
# Check what's ready to work on
bd ready

# See project status
./scripts/status.sh

# Check Beads workflow
./scripts/beads-workflow.sh
```

### Issue Management
```bash
# Create issue
bd create "Issue title" --type feature --priority P1

# Start working
bd update ISSUE_ID --status in-progress

# Add labels
bd label add ISSUE_ID sdk foundation

# Complete issue
bd close ISSUE_ID --reason "Complete. Details..."
```

### Query Issues
```bash
# By status
bd list --status open
bd list --status in-progress

# By priority
bd list --labels priority-P0 --status open

# By component
bd list --labels sdk --status open

# Ready issues
bd ready
```

### Dependencies
```bash
# Add dependency
bd dep add ISSUE_ID DEPENDS_ON_ID

# Show dependencies
bd dep show ISSUE_ID

# Show blocked issues
bd blocked
```

## Quick Reference

### Issue Types
- `feature` - New functionality
- `bug` - Defects or errors
- `task` - Work items
- `epic` - Large features

### Priorities
- `P0` - Critical, blocking
- `P1` - High priority
- `P2` - Medium priority
- `P3` - Low priority

### Common Labels
**Components:**
- `sdk`, `juce_backend`, `swift_frontend`, `daw_control`

**Types:**
- `foundation`, `integration`, `enhancement`, `bug`

**Special:**
- `blocking`, `dependencies`, `question`, `review`

## Work Checklist

### Before Starting Work
- [ ] Check `bd ready`
- [ ] Check Confucius for patterns
- [ ] Create or claim issue
- [ ] Add relevant labels
- [ ] Mark as in-progress

### During Work
- [ ] Update issue with progress
- [ ] Add dependencies as needed
- [ ] Document blockers

### Completing Work
- [ ] Close with detailed reason
- [ ] This triggers Confucius auto-learning!
- [ ] Update related issues

## Confucius Integration

### When to Use
✅ **Before starting**: "Check Confucius for patterns about [topic]"
✅ **When stuck**: "What does Confucius know about [error]?"
✅ **Making decisions**: "What has Confucius learned about [component]?"

### Memory Types
- `pattern` - Reusable solutions
- `error_message` - Common errors and fixes
- `design_decision` - Architectural choices
- `build_log` - Build-related learnings

## Scripts

### status.sh
Full project status dashboard:
```bash
./scripts/status.sh
```
Shows:
- Beads integration status
- Issues overview
- Confucius memory status
- Git status
- Project structure
- Recommendations

### beads-workflow.sh
Beads workflow automation:
```bash
./scripts/beads-workflow.sh
```
Shows:
- Ready issues
- Open issues by priority
- In-progress issues
- Blocked issues
- Recent activity
- Statistics

## Pre-commit Hook

Install the pre-commit hook:
```bash
cp .git/hooks/pre-commit.beads.example .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

The hook checks:
- Work is tracked in bd
- Commit message references issue
- Reminds about P0 issues

## Troubleshooting

### Daemon Issues
```bash
# Check daemon status
ps aux | grep "bd daemon"

# Restart daemon
pkill -f "bd daemon"
bd daemon &
```

### Database Issues
```bash
# Export backup
bd export

# Reimport
bd import
```

## Documentation

- **Integration Guide**: `docs/beads-integration.md`
- **Best Practices**: `docs/beads-best-practices.md`
- **Quick Reference**: This file
- **Project Instructions**: `.claude/CLAUDE.md`

## Getting Help

1. Check Confucius for patterns
2. Review documentation
3. Create issue with label `question`
4. Ask team

---

**Last Updated**: 2026-01-15
**Beads Version**: 0.11.0 (dev)
