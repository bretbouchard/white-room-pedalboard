# tvOS SDK Build Failure - Handoff to SDK Team

**Date:** December 31, 2025
**Priority:** HIGH (blocking Apple TV integration)
**Component:** Schillinger SDK (tvOS branch)
**Reporter:** JUCE Backend Team

---

## Executive Summary

The JUCE backend team is attempting to build a **tvOS JavaScriptCore bundle** from the Schillinger SDK (tvOS branch) but is **blocked by TypeScript compilation errors** in the SDK itself. The SDK cannot be built, which prevents us from creating the required `SchillingerSDK.bundle.js` for tvOS integration.

---

## What We're Trying to Do

Build a tvOS-compatible JavaScript bundle using:

```bash
# Location: /Users/bretbouchard/apps/schill/juce_backend/frontend/build-tvos-sdk.sh
esbuild ../../schillinger-sdk/core/index.ts \
  --bundle \
  --platform=node \
  --target=es2020 \
  --format=iife \
  --global-name=SchillingerSDK \
  --outfile=../platform/tvos/SchillingerSDK.bundle.js
```

**Purpose:** Create a self-contained JavaScript bundle that can be loaded in tvOS JavaScriptCore via the Swift bridge (`SchillingerBridge.swift`).

---

## Current Blocker: TypeScript Compilation Errors

When attempting to build the SDK with `npm run build`, we encounter **multiple TypeScript compilation errors**:

### Error Output

```bash
cd /Users/bretbouchard/apps/schill/schillinger-sdk
npm run build
```

**Results in:**

```
✗ ERROR TS2308: Module './types/index' has already exported a member named 'MusicalEvent'
✗ ERROR TS2308: Module './types/index' has already exported a member named 'ParameterAddress'
✗ ERROR TS2308: Module './types/index' has already exported a member named 'TimeRange'
✗ ERROR TS2305: Module '"./song-graph"' has no exported member 'SongGraphId'
✗ ERROR TS2459: Module '"./timeline"' declares 'TimelineId' locally, but it is not exported
✗ ERROR TS2724: '"./realization-policy"' has no exported member named 'RealizationPolicyId'
✗ ERROR TS2308: Module './types' has already exported a member named 'ControlId'
✗ ERROR TS2308: Module './types' has already exported a member named 'RoleId'
✗ ERROR TS2308: Module './types' has already exported a member named 'ParameterAddress'
✗ ERROR TS2308: Module './types' has already exported a member named 'VariationIntentId'
✗ ERROR TS2305: Module '"./types"' has no exported member 'Pitch'
```

**Location:** `packages/shared/src/` (first failure in build chain)

**Impact:** Build chain cannot proceed past `@schillinger-sdk/shared`, so `@schillinger-sdk/core` is never built.

---

## Detailed Error Breakdown

### 1. Duplicate Export Errors (Type Ambiguity)

**Files Affected:**
- `packages/shared/src/index.ts`
- `packages/shared/src/ir/index.ts`

**Issue:** Multiple modules export the same type names, causing ambiguity:

```typescript
// Example:
// Module A exports: MusicalEvent, ParameterAddress, TimeRange
// Module B also exports: MusicalEvent, ParameterAddress, TimeRange
// index.ts re-exports both → TS2308 error
```

**Types with Conflicts:**
- `MusicalEvent`
- `ParameterAddress`
- `TimeRange`
- `ControlId`
- `RoleId`
- `VariationIntentId`

**Required Fix:** Use explicit re-exports with type aliases to resolve ambiguity:

```typescript
// Instead of:
export * from './types/index';
export * from './ir/index';

// Use:
export type { MusicalEvent as core_MusicalEvent } from './types/index';
export type { MusicalEvent as ir_MusicalEvent } from './ir/index';
```

### 2. Missing Export Errors

**Files Affected:**
- `packages/shared/src/ir/song-graph.ts`
- `packages/shared/src/ir/timeline.ts`
- `packages/shared/src/ir/realization-policy.ts`
- `packages/shared/src/ir/intent.ts`
- `packages/shared/src/ir/process.ts`

**Missing Exports:**
```typescript
// song-graph.ts
export type { SongGraphId }  // ← MISSING

// timeline.ts
export type { TimelineId }  // ← MISSING (declared locally but not exported)

// realization-policy.ts
export type { RealizationPolicyId }  // ← MISSING (only RealizationPolicyIR_v1 exists)

// intent.ts
export type { IntentId }  // ← MISSING

// process.ts
export type { ProcessId }  // ← MISSING
```

**Required Fix:** Add explicit type exports to each module:

```typescript
// timeline.ts (example)
export type TimelineId = string;  // ← ADD THIS

// Or if it's declared in a namespace/interface:
export { TimelineId };  // ← OR THIS
```

### 3. Type Import Errors

**File:** `packages/shared/src/ir/types.ts`

**Issue:**
```typescript
// Error: Module '"./types"' has no exported member 'Pitch'
import { Pitch } from './types';  // ← Pitch is not exported
```

**Required Fix:** Either export `Pitch` from `types.ts` or correct the import path.

---

## Build Context

### SDK Repository Information

**Path:** `/Users/bretbouchard/apps/schill/schillinger-sdk`
**Branch:** `tvOS`
**Status:** Has uncommitted changes (test files modified)

### Build Command Sequence

```bash
# From SDK root
npm run build

# This runs:
npm run build:sequential
  → npm run build:shared  ← FAILS HERE
  → npm run build:core     (never reached)
  → npm run build:analysis (never reached)
  ...
```

### Expected Output (If Successful)

```
packages/shared/dist/
  ├── index.js
  ├── index.d.ts
  ├── math/*.js
  ├── types/*.js
  └── ir/*.js
```

---

## Impact on Apple TV Integration

### What We Need

For the tvOS platform, we need:

1. **A single JavaScript bundle** (`SchillingerSDK.bundle.js`)
2. **ES2020 compatible** (for tvOS JavaScriptCore)
3. **IIFE format** (immediately-invoked function expression)
4. **No Node.js runtime dependencies** (or shimmable)
5. **Deterministic** (seeded RNG, no timers)
6. **Validated** (all TypeScript types compile correctly)

### Why We Need the SDK Built

The Swift bridge expects to load a pre-bundled JavaScript file:

```swift
// SchillingerBridge.swift (already implemented)
let jsURL = Bundle.main.url(forResource: "SchillingerSDK", withExtension: "bundle.js")!
jsContext.evaluateScript(try String(contentsOf: jsURL))
```

**We cannot proceed with tvOS integration until the SDK builds successfully.**

---

## Recommended Fix Approach

### Phase 1: Fix Shared Package (Immediate Blocker)

**Priority:** CRITICAL
**Estimated Time:** 2-4 hours

1. **Resolve duplicate exports** in `packages/shared/src/index.ts`
2. **Add missing type exports** to IR modules
3. **Fix type import errors** in `ir/types.ts`

**Verification:**
```bash
cd packages/shared
npm run build
# Should succeed without TS errors
```

### Phase 2: Build Core Package

**Priority:** CRITICAL
**Estimated Time:** 1-2 hours (after Phase 1)

1. Ensure `@schillinger-sdk/core` builds successfully
2. Verify all imports resolve correctly
3. Check for any circular dependencies

**Verification:**
```bash
npm run build:core
# Should produce dist/index.js
```

### Phase 3: tvOS Bundle Generation

**Priority:** HIGH
**Estimated Time:** 1-2 hours

Once SDK builds, the JUCE backend team will:

1. Run the bundle script: `./build-tvos-sdk.sh`
2. Verify bundle loads in JavaScriptCore
3. Test Swift bridge integration
4. Create golden test fixtures

---

## Test Commands for SDK Team

### Verify TypeScript Compilation

```bash
cd /Users/bretbouchard/apps/schill/schillinger-sdk

# Full build
npm run build

# Individual package builds
cd packages/shared && npm run build
cd ../core && npm run build
```

### Type Check Only (Faster)

```bash
cd packages/shared
npx tsc --noEmit
```

### Check for Duplicate Exports

```bash
cd packages/shared
grep -r "export.*MusicalEvent" src/
grep -r "export.*ParameterAddress" src/
grep -r "export.*TimeRange" src/
```

---

## Environment Details

**Node.js Version:** (please provide)
**TypeScript Version:** (check with `npx tsc --version`)
**Package Manager:** npm (workspaces)

**SDK Location:**
```
/Users/bretbouchard/apps/schill/schillinger-sdk
```

**Branch:**
```bash
git branch --show-current
# Expected: tvOS
```

---

## Success Criteria

The SDK team has successfully resolved this issue when:

1. ✅ `npm run build` completes without errors in `schillinger-sdk/tvOS`
2. ✅ `packages/shared/dist/` contains compiled JavaScript and type definitions
3. ✅ `packages/core/dist/` contains compiled JavaScript and type definitions
4. ✅ All type exports are unambiguous and properly exported
5. ✅ JUCE backend team can run `./build-tvos-sdk.sh` successfully
6. ✅ Generated `SchillingerSDK.bundle.js` loads in tvOS JavaScriptCore

---

## Next Steps

**For SDK Team:**
1. Review this handoff document
2. Prioritize fixing `packages/shared` compilation errors
3. Test build locally with `npm run build`
4. Notify JUCE backend team when build succeeds

**For JUCE Backend Team:**
1. Wait for SDK build to be fixed
2. Run `./build-tvos-sdk.sh` to generate bundle
3. Test bundle in Swift bridge
4. Create integration tests

---

## Contact & Coordination

**Handoff From:** JUCE Backend Team (Apple TV Integration)
**Handoff To:** Schillinger SDK Team
**Location:** `schillinger-sdk` repository (tvOS branch)
**Related Docs:**
- `juce_backend/platform/tvos/TVOS_SDK_EMBEDDING_HANDOFF.md`
- `juce_backend/platform/tvos/README.md`

---

## Appendix: Full Build Error Log

```bash
$ cd /Users/bretbouchard/apps/schill/schillinger-sdk && npm run build

> @schillinger-sdk/sdk-monorepo@2.0.0 build
> npm run build:sequential

> @schillinger-sdk/sdk-monorepo@2.0.0 build:sequential
> npm run build:shared && npm run build:core && npm run build:analysis && npm run build:admin && npm run build:gateway && npm run build:generation && npm run build:audio

> @schillinger-sdk/sdk-monorepo@2.0.0 build:shared
> cd packages/shared && npm run build

> @schillinger-sdk/shared@2.0.0 build
> tsc

src/index.ts(9,1): error TS2308: Module './types/index' has already exported a member named 'MusicalEvent'. Consider explicitly re-exporting to resolve the ambiguity.
src/index.ts(9,1): error TS2308: Module './types/index' has already exported a member named 'ParameterAddress'. Consider explicitly re-exporting to resolve the ambiguity.
src/index.ts(9,1): error TS2308: Module './types/index' has already exported a member named 'TimeRange'. Consider explicitly re-exporting to resolve the ambiguity.
src/ir/graph-instance.ts(25,15): error TS2305: Module '"./song-graph"' has no exported member 'SongGraphId'.
src/ir/graph-instance.ts(26,15): error TS2459: Module '"./timeline"' declares 'TimelineId' locally, but it is not exported.
src/ir/graph-instance.ts(28,15): error TS2724: '"./realization-policy"' has no exported member named 'RealizationPolicyId'. Did you mean 'RealizationPolicyIR_v1'?
src/ir/index.ts(71,1): error TS2308: Module './types' has already exported a member named 'ControlId'. Consider explicitly re-exporting to resolve the ambiguity.
src/ir/index.ts(80,1): error TS2308: Module './types' has already exported a member named 'RoleId'. Consider explicitly re-exporting to resolve the ambiguity.
src/ir/index.ts(86,1): error TS2308: Module './types' has already exported a member named 'ParameterAddress'. Consider explicitly re-exporting to resolve the ambiguity.
src/ir/index.ts(89,1): error TS2308: Module './types' has already exported a member named 'VariationIntentId'. Consider explicitly re-exporting to resolve the ambiguity.
src/ir/parameter-binding.ts(29,15): error TS2305: Module '"./intent"' has no exported member 'IntentId'.
src/ir/parameter-binding.ts(31,15): error TS2459: Module '"./process"' declares 'ProcessId' locally, but it is not exported.
src/ir/role.ts(28,15): error TS2305: Module '"./types"' has no exported member 'Pitch'.

npm error Lifecycle script `build` failed with error:
npm error code 2
npm error path /Users/bretbouchard/apps/schill/schillinger-sdk/packages/shared
npm error workspace @schillinger-sdk/shared@2.0.0
npm error location /Users/bretbouchard/apps/schill/schillinger-sdk/packages/shared
npm error command failed
npm error command sh -c tsc
```

---

**Status:** 🔴 BLOCKED - Waiting on SDK Team
**Severity:** HIGH - Blocks all Apple TV integration work
**Created:** December 31, 2025
**Last Updated:** December 31, 2025
