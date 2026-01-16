# Beads Best Practices Guide

## Overview

This guide covers best practices for using Beads (bd) task management in the White Room project. Following these practices ensures consistent tracking, effective collaboration, and maximum benefit from the Confucius memory system.

## Core Principles

### 1. Track Everything
**No work happens without bd tracking.**

✅ **Always create issues for:**
- Feature development
- Bug fixes
- Refactoring work
- Documentation updates
- Test writing
- Build system changes
- Configuration changes

❌ **Never work without:**
- Creating an issue first
- Updating issue status when starting
- Closing issue when complete

### 2. Check Before You Work
**Always consult bd and Confucius before starting.**

```bash
# 1. Check bd for ready issues
bd ready --json

# 2. Check Confucius for patterns
"Search Confucius for patterns about [your topic]"

# 3. Create or claim issue
bd create "Task description" --type feature --priority P1
bd update white_room-XXX --status in-progress

# 4. Work...

# 5. Close with resolution
bd close white_room-XXX --message "Complete. Details..."
```

### 3. Close Issues Properly
**Always include resolution message.**

✅ **Good:**
```bash
bd close white_room-123 --message "Complete. Implemented X, tested Y, updated docs."
```

❌ **Bad:**
```bash
bd close white_room-123
```

**Why?** Confucius learns from resolution messages. Better messages = better patterns.

### 4. Use Consistent Labels
**Follow project labeling conventions.**

#### Priority Labels
- `priority-P0` - Critical, blocking, production issues
- `priority-P1` - High priority, important features
- `priority-P2` - Medium priority, nice-to-have
- `priority-P3` - Low priority, backlog

#### Component Labels
- `sdk` - TypeScript SDK work
- `juce_backend` - JUCE C++ backend
- `swift_frontend` - SwiftUI frontend
- `daw_control` - DAW integration layer
- `design_system` - UI/UX components
- `infrastructure` - Build, CI/CD, tooling

#### Type Labels
- `foundation` - Core infrastructure, schemas
- `integration` - Component integration
- `enhancement` - Feature improvements
- `bug` - Defects and errors
- `documentation` - Docs and guides
- `testing` - Test development

#### Phase Labels
- `phase-1`, `phase-2`, etc. - Development phases
- `milestone` - Major milestones
- `spike` - Research and exploration

#### Special Labels
- `blocking` - Blocks other work
- `dependencies` - Requires external dependencies
- `question` - Questions to be answered
- `review` - Needs review

## Issue Creation Best Practices

### Title Format
Use clear, descriptive titles:

✅ **Good:**
```
"Implement performance state switching at bar boundaries"
"Fix audio glitch when switching between performances"
"Add CLAP plugin format support to juce_backend"
```

❌ **Bad:**
```
"Fix stuff"
"Work on thing"
"Updates"
```

### Description Template
Use structured descriptions:

```markdown
## Summary
One-line overview of the issue.

## Context
Why is this needed? Background information.

## Scope
What's included? What's out of scope?

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Implementation Plan
1. Step 1
2. Step 2
3. Step 3

## Dependencies
- white_room-XXX (must complete first)

## Estimated Time
X days

## Deliverable
What does done look like?
```

### Issue Types
Choose appropriate type:

- `feature` - New functionality for users
- `bug` - Defects, errors, broken behavior
- `task` - Work items (refactoring, docs, tests)
- `epic` - Large features spanning multiple issues

### Priority Guidelines
Assign appropriate priority:

**P0 - Critical**
- Production crashes
- Data loss
- Security vulnerabilities
- Blocking other work

**P1 - High**
- Important features
- Significant bugs
- User-facing issues

**P2 - Medium**
- Nice-to-have features
- Minor bugs
- Improvements

**P3 - Low**
- Backlog items
- Future enhancements
- Ideas

## Workflow Best Practices

### Starting Work
```bash
# 1. Check ready issues
bd ready --json

# 2. Check Confucius
"Search Confucius for patterns about [topic]"

# 3. Create or claim issue
bd create "Task" --type feature --priority P1
bd update white_room-XXX --status in-progress

# 4. Add relevant labels
bd label add white_room-XXX sdk foundation
```

### During Work
```bash
# Update progress
bd update white_room-XXX --description "Progress update..."

# Add labels as needed
bd label add white_room-XXX blocking

# Add dependencies
bd dep add white_room-XXX white_room-YYY
```

### Completing Work
```bash
# Close with resolution
bd close white_room-XXX --message "Complete. Implemented X, tested Y, docs updated."

# This triggers Confucius auto-learning!
```

### Blocked Work
```bash
# If blocked, document it
bd update white_room-XXX --description "Blocked by ZZZ"

# Add blocking label
bd label add white_room-XXX blocking

# When unblocked
bd label remove white_room-XXX blocking
```

## Confucius Integration

### What Confucius Learns
When you close an issue, Confucius extracts:
- **Patterns** - Reusable solutions
- **Error messages** - Common errors and fixes
- **Design decisions** - Architectural choices
- **Build logs** - Build-related learnings
- **Test results** - Testing insights

### How to Help Confucius

✅ **Do:**
- Write detailed resolution messages
- Include root cause analysis for bugs
- Document design decisions
- Include error messages and solutions
- Share lessons learned

❌ **Don't:**
- Close with empty message
- Use vague descriptions
- Skip documentation

### Using Confucius Effectively

**Before starting work:**
```
"Check Confucius for patterns about [topic]"
```

**When encountering errors:**
```
"What does Confucius know about [error type]?"
```

**Making design decisions:**
```
"What has Confucius learned about [component]?"
```

**After learning something:**
```
"Store this in Confucius: [your learning]"
```

## Common Anti-Patterns

### 1. Working Without Tracking
❌ **Bad:**
```
Just code without creating issues
```

✅ **Good:**
```bash
bd create "Task" --type feature --priority P1
bd update white_room-XXX --status in-progress
# Work...
bd close white_room-XXX --message "Complete..."
```

### 2. Poor Issue Titles
❌ **Bad:**
```
"fix bug"
"work on feature"
"update stuff"
```

✅ **Good:**
```
"Fix audio glitch when switching performances"
"Implement CLAP plugin format support"
"Add Confucius memory integration"
```

### 3. Vague Resolution Messages
❌ **Bad:**
```bash
bd close white_room-123 --message "done"
```

✅ **Good:**
```bash
bd close white_room-123 --message "Complete. Implemented X, tested Y, updated docs."
```

### 4. Not Checking Dependencies
❌ **Bad:**
```
Start work without checking if dependencies are met
```

✅ **Good:**
```bash
bd dep show white_room-XXX
bd list --labels blocking
bd ready --json
```

### 5. Ignoring Confucius
❌ **Bad:**
```
Never check Confucius for past solutions
```

✅ **Good:**
```
"Check Confucius for patterns about [topic]"
"What does Confucius know about [error]?"
```

## Team Collaboration

### Assigning Work
```bash
# Claim issue
bd update white_room-XXX --status in-progress --actor "Name"

# Or claim for someone else
bd update white_room-XXX --actor "Other Name" --status in-progress
```

### Code Review
```bash
# Add review label
bd label add white_room-XXX review

# Update with review request
bd update white_room-XXX --description "Ready for review"
```

### Questions
```bash
# Create question issue
bd create "Question about X" --type task --priority P2
bd label add white_room-YYY question

# Answer and close
bd close white_room-YYY --message "Answer: X is Y because Z"
```

## Documentation and Knowledge Sharing

### Issue-Based Documentation
Each issue should tell a story:
1. **Why** - Context and motivation
2. **What** - Scope and acceptance criteria
3. **How** - Implementation approach
4. **Result** - Resolution and lessons learned

### Confucius as Knowledge Base
Confucius remembers:
- Every closed issue
- Patterns extracted from resolutions
- Error messages and solutions
- Design decisions

Use it as the first line of documentation.

### External Documentation
For comprehensive docs:
- `docs/` - User guides, technical docs
- `specs/` - Feature specifications
- `plans/` - Implementation plans

Link to these from issues when relevant.

## Metrics and Reporting

### Key Metrics
Track these regularly:
- **Lead time** - From creation to completion
- **Cycle time** - From in-progress to complete
- **Blocked issues** - Count and duration
- **Ready issues** - Work ready to start
- **Throughput** - Issues closed per week

### View Statistics
```bash
# Overall stats
bd stats

# By priority
bd list --labels priority-P0 --status open
bd list --labels priority-P1 --status open

# By component
bd list --labels sdk --status open
bd list --labels juce_backend --status open
```

## Automation and Scripts

### Use Provided Scripts
```bash
# Full workflow
./scripts/beads-workflow.sh

# Project status
./scripts/status.sh
```

### Pre-commit Hook
Install the pre-commit hook:
```bash
cp .git/hooks/pre-commit.beads.example .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

This checks:
- Work is tracked in bd
- Commit message references issue
- P0 issues are addressed

## Continuous Improvement

### Regular Reviews
Weekly or bi-weekly:
```bash
# Review open issues
bd list --status open

# Review blocked issues
bd blocked

# Review old issues
bd list --status open --json | jq '[.[] | select(.created_at | fromdateiso8601 < (now - 60*60*24*30))]'
```

### Clean Up
Monthly:
```bash
# Close very old issues
bd list --status open --json | jq '[.[] | select(.created_at | fromdateiso8601 < (now - 60*60*24*90))]'

# Compact old closed issues
bd compact --before "2025-12-01"
```

### Process Improvements
- Identify bottlenecks (blocked issues)
- Reduce lead time (start → finish)
- Improve issue quality (better descriptions)
- Increase Confucius learning (better resolutions)

## Examples

### Complete Feature Workflow
```bash
# 1. Check ready issues
bd ready --json

# 2. Check Confucius
"Search Confucius for patterns about audio plugins"

# 3. Create issue
bd create "Add CLAP plugin format support" \
  --type feature \
  --priority P1 \
  --description "Implement CLAP format for all White Room plugins"

# 4. Add labels
bd label add white_room-XXX enhancement plugin-format

# 5. Claim and start
bd update white_room-XXX --status in-progress

# 6. Add dependency
bd dep add white_room-XXX white_room-YYY

# 7. Work...

# 8. Close with resolution
bd close white_room-XXX \
  --message "Complete. Added CLAP support to all 7+ plugins. Validated in REAPER. Docs updated."
```

### Bug Fix Workflow
```bash
# 1. Check Confucius
"What does Confucius know about audio glitches?"

# 2. Create bug issue
bd create "Fix audio glitch on performance switch" \
  --type bug \
  --priority P0 \
  --description "Glitch occurs when switching at bar boundaries"

# 3. Add labels
bd label add white_room-XXX bug audio blocking

# 4. Claim and fix
bd update white_room-XXX --status in-progress

# 5. Root cause analysis
bd update white_room-XXX \
  --description "Root cause: Missing synchronization in audio thread. Solution: Add mutex lock."

# 6. Close with details
bd close white_room-XXX \
  --message "Fixed. Added mutex lock to prevent race condition. Tested with 100 rapid switches."
```

## Conclusion

Following these best practices ensures:
- ✅ All work is tracked
- ✅ Confucius learns effectively
- ✅ Team collaborates efficiently
- ✅ Knowledge is retained
- ✅ Issues are high quality
- ✅ Project stays organized

**Remember**: The quality of bd tracking directly impacts the effectiveness of Confucius and the team's collective intelligence.

---

**Last Updated**: 2026-01-15
**Related**: [Beads Integration Guide](/Users/bretbouchard/apps/schill/white_room/docs/beads-integration.md)
