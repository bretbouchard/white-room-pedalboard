# Phase 7 Analysis: Import Path Migration

**Status**: Analysis Complete
**Date**: 2025-12-31
**Decision Point**: Critical

---

## Current Situation

### What We Have (Phases 1-6 Complete)

✅ **New Directory Structure Created**:
```
/core/              # 241 TypeScript files (copied from packages/core)
/engines/juce-execution/  # C++ execution engine
/hosts/tvos-swift-host/   # Swift host structure
/clients/             # Remote client directories
/tools/              # Codegen and fixtures
/runtimes/           # Build targets
```

✅ **Old Structure Still Exists**:
```
packages/core/      # Original TypeScript core
packages/shared/    # Original utilities + IR
packages/juce-execution/  # Original C++ engine
packages/swift/     # Original Swift package
... (other packages)
```

### The Problem

**We have duplicate code that imports from the old structure:**

```typescript
// In core/rhythm.ts (new location)
import { ValidationUtils } from '@schillinger-sdk/shared';
//                                         ^^^^^^^^^^^^^^^^^^^^^^^^
//                                         Still points to old package!
```

The new `/core` directory was **copied** from `packages/core`, but all the import statements still reference `@schillinger-sdk/shared`, which is in the **old** `packages/` directory.

---

## Why This Is a Critical Issue

### Issue #1: Duplicate Code Violates Architecture Authority

The CLEAN_PACKAGE_LAYOUT.md states:
> "If a new engineer opens the repo and asks: 'Where does the music logic live?' The answer must be obvious: `/core` only."

**Current reality**: Music logic exists in TWO places:
- `/core` (new structure)
- `packages/core` (old structure)

This violates the "obvious by folder name alone" principle.

### Issue #2: Import Paths Point to Wrong Location

Files in `/core` still import from `@schillinger-sdk/shared`, which lives in `packages/shared/`. This means:

1. The **new** `/core` cannot exist independently
2. It **depends** on the **old** `packages/shared`
3. Removing `packages/` breaks the new `/core`

### Issue #3: Build System References Old Structure

The `package.json` workspaces, `tsconfig.json` paths, and all build scripts reference `packages/*`. The new structure is invisible to the build system.

---

## Options for Moving Forward

### Option A: Full Migration (HIGH EFFORT, HIGH RISK)

**Approach**: Complete the move to new structure

**Steps**:
1. Delete `packages/core`, `packages/shared` (keep others temporarily)
2. Update `package.json` workspaces to include `/core`, `/engines`, `/hosts`
3. Update `tsconfig.json` path mappings
4. Update all imports in `/core` to use relative paths or new package names
5. Update all test imports
6. Update build scripts
7. Fix breaking changes
8. Run full test suite
9. Delete old `packages/` directory

**Pros**:
- ✅ Achieves the clean layout goal
- ✅ Authority is obvious by folder name
- ✅ Aligns with CLEAN_PACKAGE_LAYOUT.md vision

**Cons**:
- ❌ Massive breaking change
- ❌ High risk of breaking tests
- ❌ High effort (100+ files to update)
- ❌ May require significant debugging
- ❌ Hard to rollback if things break

**Estimated Time**: 6-10 hours of focused work

---

### Option B: Hybrid Structure (MEDIUM EFFORT, MEDIUM RISK)

**Approach**: Keep packages/ but reorganize internally

**Steps**:
1. Revert top-level `/core`, `/engines` creation
2. Instead, rename packages within `packages/`:
   - `packages/core` → `packages/schillinger-core` (authoritative brain)
   - `packages/juce-execution` → `packages/audio-engine` (execution only)
3. Update documentation to emphasize authority boundaries
4. Add CI grep gates to enforce authority
5. Keep build system mostly unchanged

**Pros**:
- ✅ Less disruptive to build system
- ✅ Lower risk of breaking tests
- ✅ Clearer package names
- ✅ Easier to rollback

**Cons**:
- ❌ Doesn't achieve "top-level" structure goal
- ❌ Authority not obvious at top level
- ❌ Still uses monolithic `packages/` directory

**Estimated Time**: 2-3 hours

---

### Option C: Incremental Migration (LOW EFFORT, LOW RISK)

**Approach**: Document current state, defer full migration

**Steps**:
1. Keep both structures (current state)
2. Document as "Migration In Progress"
3. Create detailed TODO for completing migration
4. Focus on lower-risk improvements:
   - Add CI grep gates (Phase 9)
   - Update README documentation (Phase 8)
   - Mark old packages as "DEPRECATED"
5. Schedule full migration for later

**Pros**:
- ✅ Lowest risk
- ✅ Can be done incrementally
- ✅ Tests continue to work
- ✅ Clear migration path documented

**Cons**:
- ❌ Duplicate code exists
- ❌ Confusing for new engineers
- ❌ Doesn't achieve clean layout goal yet

**Estimated Time**: 1-2 hours

---

## Recommendation

### Recommended: Option C (Incremental)

**Rationale**:

1. **Current state is stable** - Tests pass, code works
2. **Full migration is high-risk** - Could break many things
3. **We've made progress** - New structure exists, just needs completion
4. **Can deprecate old structure** - Mark as deprecated, migrate gradually

### Proposed Next Steps (Option C)

**Phase 7a: Document and Deprecate** (30 min)
1. Add DEPRECATED notices to old `packages/core` and `packages/shared`
2. Add comments pointing to new `/core` location
3. Update README with migration status
4. Create MIGRATION_TODO.md with remaining steps

**Phase 7b: Add Safety Checks** (30 min)
1. Add CI grep gates (Phase 9) - Prevent new code in old packages
2. Add linter rules to warn about imports from deprecated packages
3. Add TypeScript path aliases to favor new structure

**Phase 7c: Begin Gradual Migration** (1-2 hours)
1. Start with non-critical packages
2. Migrate one package at a time
3. Test after each migration
4. Document lessons learned

**Phase 7d: Complete Core Migration** (future work)
1. When confident, migrate core package
2. Update all imports
3. Remove old packages/
4. Full test validation

---

## Decision Matrix

| Criterion | Option A (Full) | Option B (Hybrid) | Option C (Incremental) |
|-----------|----------------|-------------------|----------------------|
| **Risk** | High | Medium | Low |
| **Effort** | 6-10 hours | 2-3 hours | 1-2 hours |
| **Achieves Goal** | ✅ Yes | ⚠️ Partial | ⏳ Eventually |
| **Test Safety** | ❌ May break | ⚠️ Some risk | ✅ Safe |
| **Clarity** | ✅ High | ⚠️ Medium | ⏳ Improves |
| **Rollback** | Hard | Medium | Easy |

---

## Your Decision

**Please choose one of the following:**

**A) "Go for full migration"**
- I'll execute Option A
- Update all imports, break things, fix them
- High risk, high reward

**B) "Do hybrid approach"**
- I'll execute Option B
- Reorganize within packages/
- Medium risk, partial goal achievement

**C) "Take it incremental"**
- I'll execute Option C (recommended)
- Document, deprecate, migrate gradually
- Low risk, steady progress

**D) "Pause here and document"**
- Stop migration at current state
- Create comprehensive handoff documentation
- Return later with fresh context

---

## What Happens Next

Once you decide, I will:
1. Execute the chosen option
2. Provide regular progress updates
3. Commit after each logical step
4. Create rollback points
5. Document everything

The migration is well-planned and reversible. We can proceed confidently.

---

**One sentence to remember**:

> **Migration is a journey, not a cliff. Choose the pace that matches your risk tolerance.**
