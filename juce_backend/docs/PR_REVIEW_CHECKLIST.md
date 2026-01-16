# PR Review Checklist

**Audio Engine Pull Request Review**

**Purpose:** Ensure all PRs follow execution language and architectural standards
**Status:** Enforced for all engine-related PRs
**Audience:** Code reviewers, tech leads

---

## Pre-Review Checklist

**Before reviewing code:**

- [ ] PR description clearly explains the change
- [ ] PR links to relevant issue/discussion
- [ ] PR size is reasonable (< 800 lines for core changes)
- [ ] Tests included or explanation why not
- [ ] Docs updated if API changed

---

## Terminology Checklist ⚠️ CRITICAL

**Check ALL engine code for deprecated terminology:**

### Variables & Methods
- [ ] No `track` variables/methods (use `lane`)
- [ ] No `song` or `composition` terminology (use `schedule`)
- [ ] No `transport` control logic (host's job)
- [ ] No `harmony` or `rhythm` in engine code (Schillinger's domain)
- [ ] No `backendServer` references (server era deprecated)

### Approved Terminology Present
- [ ] Uses `lane` for audio paths
- [ ] Uses `event` for audio events
- [ ] Uses `buffer` for audio data
- [ ] Uses `parameter` for controls
- [ ] Uses `schedule` for timing
- [ ] Uses `voiceBus` for audio sources
- [ ] Uses `audioHost` for host integration

**❌ FAIL:** If any deprecated terms found → Request changes
**✅ PASS:** All approved terminology used

---

## Architecture Checklist

### Separation of Concerns
- [ ] Engine code doesn't manage songs
- [ ] Engine code doesn't control transport
- [ ] Engine code doesn't do music theory
- [ ] Schillinger code stays in frontend
- [ ] Bridge layer clearly defined

### Real-Time Safety
- [ ] No heap allocation in `process()` / `processBlock()`
- [ ] No blocking calls in audio thread
- [ ] No expensive operations per-sample (use control-rate)
- [ ] All operations deterministic

### Performance
- [ ] No per-sample trig in hot loops
- [ ] Control-rate updates where appropriate
- [ ] Parameter smoothing prevents zipper noise
- [ ] Silence detection/bypass where appropriate

### Channel Strip Safety
- [ ] CPU scales linearly with active channels
- [ ] Idle channels are cheap
- [ ] No unbounded loops
- [ ] No recursive calls

---

## Code Quality Checklist

### General
- [ ] Code follows project style guide
- [ ] No commented-out code
- [ ] No TODO/FIXME without issue
- [ ] No debugging code left in
- [ ] No unused variables

### C++ Specific
- [ ] No raw pointers that could be smart pointers
- [ ] Proper const correctness
- [ ] No memory leaks (RAII preferred)
- [ ] No unnecessary copies
- [ ] Meaningful variable names

### DSP Specific
- [ ] No denormal numbers
- [ ] Proper handling of NaN infinity
- [ ] Buffer bounds checking
- [ ] Sample rate handling correct
- [ ] Channel count validation

---

## Testing Checklist

### Unit Tests
- [ ] New features have unit tests
- [ ] Bug fixes have regression tests
- [ ] Edge cases covered
- [ ] Tests pass locally

### Integration Tests
- [ ] Works with existing features
- [ ] No regressions in related areas
- [ ] Compatible with different hosts
- [ ] Cross-platform (if applicable)

### Performance Tests
- [ ] No CPU regressions
- [ ] No memory regressions
- [ ] Scales appropriately (N channels, etc.)
- [ ] Real-time safe verified

---

## Documentation Checklist

### Code Comments
- [ ] Complex algorithms explained
- [ ] Non-obvious code commented
- [ ] Performance-critical sections marked
- [ ] References to external resources

### API Docs
- [ ] Public APIs documented
- [ ] Parameter ranges explained
- [ ] Usage examples provided
- [ ] Thread-safety documented

### Architecture Docs
- [ ] Design doc updated if architecture changed
- [ ] Migration guide if breaking change
- [ ] Performance characteristics documented
- [ ] Troubleshooting guide if applicable

---

## Security Checklist

### Input Validation
- [ ] All user inputs validated
- [ ] Buffer overflows prevented
- [ ] No injection vulnerabilities
- [ ] Error handling robust

### Secrets
- [ ] No hardcoded credentials
- [ ] No API keys in code
- [ ] Proper secret management
- [ ] Environment variables used

---

## Schillinger Integration

### Bridge Layer
- [ ] Schillinger terminology separated from engine
- [ ] Conversion functions clearly defined
- [ ] No direct Schillinger → DSP coupling
- [ ] Intent-based mapping documented

### Execution Language
- [ ] Engine uses execution terms only
- [ ] Schillinger uses own terms
- [ ] Bridge layer converts between domains
- [ ] No domain leakage

---

## Apple TV Specific

### tvOS Compliance
- [ ] No networking symbols (validate with CheckNoNetworking)
- [ ] No dynamic loading
- [ ] No JIT compilation
- [ ] Resource usage within limits

### Performance
- [ ] CPU budget not exceeded
- [ ] Memory usage reasonable
- [ ] Battery impact considered
- [ ] Thermal management

---

## Sign-Off

**Reviewer Decision:**

- [ ] **APPROVED** - Merge this PR
- [ ] **APPROVED WITH MINOR CHANGES** - Address nits before merge
- [ ] **REQUEST CHANGES** - Blocking issues must be fixed
- [ ] **COMMENT ONLY** - Non-blocking feedback provided

**Additional Comments:**

```
[Add any specific feedback, concerns, or praise here]
```

---

## Quick Reference: Blocking Issues

**Must Fix (Blocking):**

1. ❌ Deprecated terminology in new code
2. ❌ Heap allocation in audio thread
3. ❌ Per-sample trig in hot loop
4. ❌ Security vulnerabilities
5. ❌ Test failures
6. ❌ Performance regressions
7. ❌ Breaking changes without migration

**Should Fix (Non-Blocking but Strongly Recommended):**

1. ⚠️ Missing tests
2. ⚠️ Missing docs
3. ⚠️ Style violations
4. ⚠️ Unclear code
5. ⚠️ Poor performance

**Nice to Have:**

- 💡 More tests
- 💡 Better comments
- 💡 Optimizations
- 💡 Refactoring

---

## Process

1. **Automated Checks Run** - CI must pass
2. **Reviewer Uses Checklist** - Go through each section
3. **Feedback Provided** - Clear, actionable comments
4. **Author Responds** - Address or explain each item
5. **Re-Review if Needed** - Second pass if significant changes
6. **Approval & Merge** - Sign off when ready

---

**End of PR Review Checklist**
**Status:** Enforced
**Last Updated:** December 31, 2025
**Maintainer:** Tech Lead
