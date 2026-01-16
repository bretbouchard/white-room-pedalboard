# Task Completion Checklist for White Room

## Before Considering Any Work Complete

### 1. Beads Tracking
- [ ] Work is tracked in bd (issue created or updated)
- [ ] Issue has clear description and acceptance criteria
- [ ] Resolution note provided (for auto-learning)

### 2. Confucius Integration
- [ ] Confucius consulted for relevant patterns BEFORE starting
- [ ] Important discoveries stored in Confucius during work
- [ ] Resolution note includes "This pattern should be remembered" for learnings

### 3. SLC Validation
- [ ] **Simple**: Feature has obvious purpose, minimal learning
- [ ] **Lovable**: Delightful to use, builds trust
- [ ] **Complete**: Full user journey, NO gaps or workarounds
- [ ] No stub methods, TODO/FIXME without tickets
- [ ] No temporary solutions

### 4. Testing
- [ ] Unit tests written and passing
- [ ] Integration tests updated if applicable
- [ ] Manual testing performed for UI changes
- [ ] Edge cases considered

### 5. Code Quality
- [ ] Code follows project conventions
- [ ] Type checking passes: `npm run type-check:all` (SDK) or `swift build` (Swift)
- [ ] Linting passes: `npm run lint:all` (SDK)
- [ ] Code formatted: `swift-format .` (Swift) or Prettier (TS)

### 6. Documentation
- [ ] README.md updated if feature is user-facing
- [ ] API docs updated if public API changed
- [ ] Specs/Plans updated if architectural decision made
- [ ] Comments added for complex logic

### 7. Validation
- [ ] `/validate` passed (5-phase validation)
-   - Linting passed
-   - Type checking passed
-   - Style checking passed
-   - Unit tests passed
-   - E2E tests passed

### 8. Git & Review
- [ ] Commit message includes bd issue ID: `[white_room-123]`
- [ ] Branch name is descriptive
- [ ] PR created if required
- [ ] Code reviewed (if applicable)

### 9. Close Loop
- [ ] **Close bd issue** with resolution note
- [ ] Verify Confucius auto-learning triggered
- [ ] Check that pattern is stored for future retrieval

## Quick Validation Commands

```bash
# SDK (TypeScript)
cd sdk
npm run quality              # Type-check + lint
npm test                     # Run tests

# Swift
cd swift_frontend
swift build                  # Compile check
swift test                   # Run tests
swift-format .               # Format

# Full validation
/validate                    # 5-phase validation
```

## Common Anti-Patterns to Avoid

❌ **"It works but..."** - This is incomplete work
❌ **"I'll fix this later"** - Create a bd issue NOW
❌ **"Users can work around this"** - Incomplete feature
❌ **Skipping tests** - Tests are mandatory
❌ **No bd tracking** - ALL work must be tracked
❌ **Ignoring Confucius** - Check it FIRST, not LAST
