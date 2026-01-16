# JUCE tvOS Build Checklist

**Date:** December 31, 2025
**Purpose:** Validate clean tvOS local-only build
**Status:** Ready for implementation

---

## Pre-Build Configuration

### Step 1: Configure CMake for tvOS Local-Only

```bash
cmake -DSCHILLINGER_TVOS_LOCAL_ONLY=ON ..
```

**Expected Output:**
```
=== tvOS LOCAL-ONLY BUILD MODE ===
The following targets are DISABLED:
  ❌ BackendServer
  ❌ WebSocket tests
  ❌ REST/HTTP endpoints
  ❌ Docker/Fly.io deployment
  ❌ nginx/Prometheus configs
  ❌ Audio export (desktop-only)

The following targets remain ENABLED:
  ✅ Audio engine & DSP
  ✅ Plugin hosting (VST3/AU)
  ✅ Lock-free real-time safety
  ✅ Performance tests
  ✅ tvOS SDK integration
====================================
```

---

## Build Validation

### Step 2: Build All Targets

```bash
cmake --build .
```

**Expected Behavior:**
- ✅ JUCE plugin targets build successfully
- ✅ DSP tests compile
- ✅ Performance tests compile
- ❌ BackendServer target skipped
- ❌ WebSocket tests skipped
- ❌ Server deployment scripts excluded

---

## Post-Build Validation

### Step 3: Verify No Networking Symbols

The build automatically runs `CheckNoNetworking.cmake` to validate.

**Expected Output:**
```
✅ No networking symbols found in SchillingerEcosystemBackend.artefacts/.../SchillingerEcosystemBackend
```

**If networking symbols found:**
```
❌ FORBIDDEN networking symbol found: socket
   File: path/to/binary
   tvOS local-only builds MUST NOT link networking code!
```

**Action:** Review CMakeLists.txt for accidentally included server sources.

---

## Source File Validation

### Step 4: Confirm Excluded Sources

Run this command to verify server sources are not included:

```bash
nm path/to/binary | grep -E "(BackendServer|WebSocket|HttpApi)" || echo "✅ Clean"
```

**Expected:** No output (or "✅ Clean")

---

## Test Validation

### Step 5: Run Core Tests Only

```bash
ctest -R "realtime|dropout|performance|simd"
```

**Expected:**
- ✅ Real-time safety tests pass
- ✅ Dropout tests pass
- ✅ Performance tests pass
- ✅ SIMD tests pass
- ❌ WebSocket tests excluded
- ❌ Server integration tests excluded

---

## API Validation

### Step 6: Verify Execution Language

Check that public APIs use execution language, not musical language:

**Good (✅):**
- `voiceBus`, `executionLane`, `schedule`, `eventQueue`
- `processBlock()`, `prepareToPlay()`, `getNextAudioBlock()`

**Bad (❌):**
- `track`, `composition`, `addTrack()`, `getComposition()`

**Validation Command:**
```bash
grep -r "addTrack\|getComposition\|DAW" include/ src/ || echo "✅ Clean"
```

---

## Target Validation

### Step 7: Confirm Target List

```bash
cmake --build . --target help
```

**Should NOT see:**
- ❌ BackendServer
- ❌ test_websocket
- ❌ test_simple_websocket
- ❌ real_websocket_server
- ❌ audio_export

**Should see:**
- ✅ SchillingerEcosystemBackend (VST3/AU)
- ✅ RealtimeSafetyTest
- ✅ DropoutTest
- ✅ PerformanceTest
- ✅ SIMDCompilationTest
- ✅ AudioBufferPoolTest

---

## Binary Validation

### Step 8: Check Binary Dependencies

```bash
otool -L path/to/binary.plugin | grep -E "(ssl|crypto|curl)" || echo "✅ Clean"
```

**Expected:** No SSL/cryptographic/networking libraries linked

---

## Documentation Validation

### Step 9: Update README

Confirm README reflects tvOS local-only nature:

**Should include:**
- ✅ "Audio execution engine for tvOS"
- ✅ "Local-only, no server components"
- ✅ "Deterministic, real-time safe"
- ❌ No references to "backend server"
- ❌ No references to "WebSocket collaboration"

---

## Final Validation

### Step 10: Integration Test

Test Swift → JUCE integration:

```swift
// Swift test
let plan = getSchillingerPlanCache().getPlan(sessionId)
assert(plan != nil)
assert(plan!.isValid())
```

**Expected:**
- ✅ Plan retrieved from lock-free cache
- ✅ No network calls made
- ✅ No server process started

---

## Troubleshooting

### Issue: Build Fails with "undefined symbol"

**Cause:** Server code still being linked

**Fix:**
1. Check CMakeLists.txt for conditional compilation
2. Verify `SCHILLINGER_TVOS_LOCAL_ONLY` is defined
3. Check source file exclusions in cmake/TvosOptions.cmake

### Issue: Networking symbols still present

**Cause:** Hidden dependency through JUCE or external library

**Fix:**
1. Run `nm -u binary | grep -E "(socket|connect|bind)"`
2. Trace back to source file
3. Exclude source file with `set_source_files_properties`

### Issue: Tests fail

**Cause:** Tests reference server components

**Fix:**
1. Wrap server-dependent tests in `#ifndef SCHILLINGER_NO_SERVER`
2. Or exclude test files with `set_source_files_properties`

---

## Success Criteria

✅ **Build passes** with `SCHILLINGER_TVOS_LOCAL_ONLY=ON`
✅ **No networking symbols** in any binary
✅ **No server targets** in build output
✅ **All execution tests** pass
✅ **Documentation updated** to reflect local-only nature
✅ **Binary size** minimized (no server bloat)

---

## Sign-Off

When all 10 steps pass with ✅:

**Builder:** _________________ Date: ________
**Reviewer:** _________________ Date: ________
**Platform Lead:** _____________ Date: ________

---

**Status:** Ready for tvOS local-only builds
