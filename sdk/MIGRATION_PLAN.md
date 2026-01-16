# Clean Package Layout Migration Plan

**Status**: In Progress
**Branch**: tvOS
**Created**: 2025-12-31

---

## Overview

This migration restructures the repository to make architectural authority **obvious by folder name alone**.

**From**: `packages/` monolith (old worldview)
**To**: `/core`, `/engines`, `/hosts`, `/clients` (authority-obvious structure)

---

## Migration Strategy (Minimal Churn)

Following the recommended sequence to minimize disruption:

1. **Phase 1-5**: Move folders + update imports (structural changes)
2. **Phase 6-8**: Rename packages + update READMEs (naming enforcement)
3. **Phase 9**: Add CI grep gates (policy enforcement)
4. **Phase 10**: Validate tests pass (verification)

---

## Phase 1: Create /core (TS Authoritative Brain)

### Target Structure
```
/core                     # All TypeScript music generation logic
  /ir                      # Canonical IR schemas + validators
  /planning                # Lookahead planning, windowed plan generation
  /arbitration             # Intent arbitration (human/system/AI)
  /process                 # Schillinger operations (resultant, interference)
  /structure               # Structural/form logic (sections, hierarchy)
  /control                 # Musical fields (density/tension/dynamics)
  /explain                 # Explainability emission + queries
  /tests
    /golden                # Golden fixture tests
    /property              # Property-based tests
    /replay                # Record/replay tests
```

### Migration Steps
1. Create `/core` directory at repo root
2. Move `packages/core/src` → `/core`
3. Move `packages/shared/src/ir` → `/core/ir` (canonical IR schemas)
4. Create `/core/tests` structure
5. Move tests from `packages/core/__tests__` → `/core/tests`

### Import Updates
- `@schillinger-sdk/core` → remain unchanged (package.json exports)
- `@schillinger-sdk/shared/ir` → `@schillinger-sdk/core/ir`

---

## Phase 2: Create /runtimes (Build Targets)

### Target Structure
```
/runtimes
  /tvos-jsbundle            # JSCore bundle (no Node APIs)
    webpack.tvos.config.js
    tsconfig.tvos.json
    /dist                   # Bundled JS output
  /node-local               # Optional desktop/local service runtime
  /shared                   # Runtime-agnostic utilities (no Node-only deps)
```

### Migration Steps
1. Create `/runtimes` directory
2. Move `tsconfig.tvos.json` → `/runtimes/tvos-jsbundle/tsconfig.json`
3. Create `webpack.tvos.config.js` in `/runtimes/tvos-jsbundle/`
4. Move runtime-agnostic utilities from `packages/shared/src/runtime` → `/runtimes/shared`

---

## Phase 3: Create /engines (Execution Only)

### Target Structure
```
/engines
  /juce-execution           # C++ audio execution engine
    /include                # Public headers
    /src                    # Implementation
    /tests                  # Engine tests
    README.md               # "Execution engine" wording only
    CMakeLists.txt
```

### Migration Steps
1. Create `/engines` directory
2. Move `packages/juce-execution` → `/engines/juce-execution`
3. Verify README.md uses "execution engine" language (NOT "SDK")
4. Update all references to package in docs

---

## Phase 4: Create /hosts (Presentation/Control Only)

### Target Structure
```
/hosts
  /tvos-swift-host          # Swift host for tvOS
    /SchillingerHost        # JSCore wrapper + IR bridging
    /UI                     # tvOS navigation + controls
    /Bridge                 # Swift ↔ C++ bridge
    /Tests                  # JSCore parity tests, bridge tests
    Package.swift
```

### Migration Steps
1. Create `/hosts` directory
2. Create `/hosts/tvos-swift-host`
3. Move tvOS-specific files from `packages/swift` → `/hosts/tvos-swift-host`
4. Ensure all Swift code uses "Host" naming (not "SDK")
5. Update Package.swift if exists

---

## Phase 5: Create /clients (Remote Clients - Optional)

### Target Structure
```
/clients
  /swift-remote-client      # Swift client for remote service
  /dart-remote-client       # Dart client for remote service
  /python-remote-client     # Python client for remote service
```

### Migration Steps
1. Create `/clients` directory
2. Move remote client code from `packages/swift` → `/clients/swift-remote-client`
3. Move `packages/dart` → `/clients/dart-remote-client`
4. Move `packages/python` → `/clients/python-remote-client`

---

## Phase 6: Create /tools (Dev Tools & Codegen)

### Target Structure
```
/tools
  /codegen
    /ir-ts-to-swift         # Generate Swift structs from TS IR
    /ir-ts-to-cpp           # Generate C++ structs from TS IR
  /fixtures                 # Recorded envelopes, sample IR, replay logs
```

### Migration Steps
1. Create `/tools` directory
2. Create `/tools/codegen` structure
3. Move existing fixture data → `/tools/fixtures`
4. Add codegen scripts if not present

---

## Phase 7: Update All Import Paths

### TypeScript Imports

**Before**:
```typescript
import { PatternIR } from '@schillinger-sdk/shared/ir';
import { generateResultant } from '@schillinger-sdk/core';
```

**After**:
```typescript
import { PatternIR } from '@schillinger-sdk/core/ir';
import { generateResultant } from '@schillinger-sdk/core';
```

### Files to Update

1. **All TypeScript files** in `/core`
2. **Test files** (import paths)
3. **package.json** exports
4. **tsconfig.json** paths
5. **vitest.config.ts** aliases

---

## Phase 8: Update READMEs with New Naming

### Naming Rules (Enforced)

**Only `/core` may use:**
- ✅ RhythmAPI, MelodyAPI, HarmonyAPI, CompositionAPI
- ✅ Arbitration, ConstraintResolver, PlanGenerator

**`/engines/*` must use:**
- ✅ ExecutionEngine, Scheduler, Renderer, PluginHost, AutomationPlayer
- ❌ NO "RhythmAPI", "MelodyAPI", etc.

**`/hosts/*` must use:**
- ✅ Host, Bridge, Controller, UI, Input
- ❌ NO "SDK" in naming

### README Updates Required

1. `/engines/juce-execution/README.md`
   - Already updated ✓ (uses "execution engine")
   - Verify no "SDK" language remains

2. `/hosts/tvos-swift-host/README.md`
   - Create if doesn't exist
   - Emphasize "Host and Bridge Layer"
   - Document JSCore integration

3. `docs/` references
   - Update any references to `packages/` structure

---

## Phase 9: Add CI Grep Gates (Enforcement)

### Gate 1: Forbid Generator APIs Outside /core

**File**: `.github/workflows/enforce-architecture.yml`

```yaml
name: Enforce Architecture Authority

on: [pull_request]

jobs:
  check-authority:
    runs-on: ubuntu-latest
    steps:
      - name: Check for RhythmAPI outside core
        run: |
          if grep -r "RhythmAPI" --exclude-dir=core --exclude-dir=node_modules --exclude-dir=dist .; then
            echo "❌ ERROR: RhythmAPI found outside /core"
            exit 1
          fi

      - name: Check for MelodyAPI outside core
        run: |
          if grep -r "MelodyAPI" --exclude-dir=core --exclude-dir=node_modules --exclude-dir=dist .; then
            echo "❌ ERROR: MelodyAPI found outside /core"
            exit 1
          fi

      - name: Check for HarmonyAPI outside core
        run: |
          if grep -r "HarmonyAPI" --exclude-dir=core --exclude-dir=node_modules --exclude-dir=dist .; then
            echo "❌ ERROR: HarmonyAPI found outside /core"
            exit 1
          fi

      - name: Check for CompositionAPI outside core
        run: |
          if grep -r "CompositionAPI" --exclude-dir=core --exclude-dir=node_modules --exclude-dir=dist .; then
            echo "❌ ERROR: CompositionAPI found outside /core"
            exit 1
          fi
```

### Gate 2: Forbid Networking in tvOS Build

```yaml
      - name: Check for networking in tvOS build
        run: |
          if grep -r "import.*fetch" --include="*.ts" core/; then
            echo "⚠️  WARNING: fetch found in /core (should be excluded from tvOS)"
          fi
```

### Gate 3: Enforce Naming Conventions

```yaml
      - name: Check for "SDK" in engines/
        run: |
          if grep -r "SDK" --exclude-dir=dist engines/; then
            echo "❌ ERROR: 'SDK' found in /engines (should use 'ExecutionEngine')"
            exit 1
          fi
```

---

## Phase 10: Validate Tests Pass

### Test Validation Steps

1. **Unit Tests**:
   ```bash
   npm test
   ```

2. **TypeScript Compilation**:
   ```bash
   npm run build
   ```

3. **tvOS Build Profile**:
   ```bash
   tsc -p runtimes/tvos-jsbundle/tsconfig.json
   ```

4. **Integration Tests** (if applicable):
   ```bash
   npm run test:integration
   ```

### Expected Outcomes

- ✅ All unit tests pass
- ✅ TypeScript compiles without errors
- ✅ No import path errors
- ✅ CI gates pass

---

## Minimal Repo Outcome Test

After migration, a new engineer should be able to answer:

**Q: "Where does the music logic live?"**
A: `/core` only.

**Q: "Where does audio happen?"**
A: `/engines/juce-execution`.

**Q: "Where is Apple TV code?"**
A: `/hosts/tvos-swift-host`.

**Q: "Can I implement RhythmAPI in Swift?"**
A: NO - forbidden by policy and CI gates.

---

## Rollback Plan

If migration fails:
```bash
git revert <migration-commit-range>
```

All migrations are designed to be:
- Atomic (single logical step per commit)
- Reversible (can revert specific phases)
- Non-destructive (folders moved, not deleted)

---

## Status Tracking

- [ ] Phase 1: Create /core
- [ ] Phase 2: Create /runtimes
- [ ] Phase 3: Create /engines
- [ ] Phase 4: Create /hosts
- [ ] Phase 5: Create /clients
- [ ] Phase 6: Update imports
- [ ] Phase 7: Update READMEs
- [ ] Phase 8: Add CI gates
- [ ] Phase 9: Validate tests

---

## References

- **Policy**: docs/ARCHITECTURE_AUTHORITY_POLICY.md
- **Layout**: docs/CLEAN_PACKAGE_LAYOUT.md
- **Build**: docs/TVOS_BUILD_GUIDE.md

---

**One sentence to remember**:

> **TS decides. Hosts control. Engines execute.**
