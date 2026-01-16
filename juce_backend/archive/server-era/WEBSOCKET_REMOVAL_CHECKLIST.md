# WebSocket/Server Header Removal Checklist

**Status:** 🔄 IN PROGRESS
**Priority:** CRITICAL (Single most important security upgrade)
**Created:** 2026-01-01
**Goal:** Fully excise all WebSocket/Server headers from execution surface to enforce JUCE_EXECUTION_ONLY contract

---

## Executive Summary

This document provides an exact, step-by-step checklist for removing all WebSocket and server-era code from the JUCE backend execution surface. This is not a refactor—it is a **security boundary enforcement** action.

**Critical Principle:** Moving files to `archive/server-era/` makes them **completely inaccessible** to any execution target (tvOS, desktop plugins, standalone).

---

## Phase 1: Header File Removal (CRITICAL)

### ✅ Step 1.1: Archive Public WebSocket Headers

**Current Location:** `include/websocket/`
**Target Location:** `archive/server-era/headers/websocket/`

**Files to Move:**
```bash
# Execute these commands in order:
mkdir -p archive/server-era/headers/websocket
git mv include/websocket/AnalysisWebSocketHandler.h archive/server-era/headers/websocket/
git mv include/websocket/InstrumentWebSocketAPI.h archive/server-era/headers/websocket/
```

**Verification:**
```bash
# Verify headers moved
ls archive/server-era/headers/websocket/
# Should show: AnalysisWebSocketHandler.h, InstrumentWebSocketAPI.h

# Verify include/websocket/ is empty or removed
ls include/websocket/
# Should show: "No such file or directory" or be empty
```

**Impact Analysis:**
- ✅ These headers are **already excluded** from tvOS builds via CMakeLists.txt lines 27-50
- ⚠️ Desktop targets may still reference them—check next step

---

### ✅ Step 1.2: Check for Header References in Execution Code

**Search Pattern:** `#include.*websocket`

```bash
# Search for any remaining includes
grep -r "#include.*websocket" \
  --exclude-dir=archive \
  --exclude-dir=build-* \
  --exclude-dir=.git \
  --exclude="*.md" \
  .
```

**Expected Results:**
- **Zero matches** in execution code (engine/, effects/, instruments/, platform/)
- Test files will still reference them (moved in Phase 3)

**If Matches Found in Execution Code:**
```bash
# Document each file:
FILE: <path_to_file>
LINE: <line_number>
REFERENCE: #include "websocket/..."
ACTION: Remove include or replace with execution-only alternative
```

---

## Phase 2: Implementation File Archive

### ✅ Step 2.1: Archive Integration Directory

**Current Location:** `integration/`
**Target Location:** `archive/server-era/integration/`

**Complete File List:**
```bash
# Create target directory
mkdir -p archive/server-era/integration

# Move all integration files
git mv integration/AnalysisWebSocketHandler.cpp archive/server-era/integration/
git mv integration/EngineController.cpp archive/server-era/integration/
git mv integration/EngineController.h archive/server-era/integration/
git mv integration/EngineMain.cpp archive/server-era/integration/
git mv integration/EventQueue.cpp archive/server-era/integration/
git mv integration/EventQueue.h archive/server-era/integration/
git mv integration/InstrumentWebSocketAPI.cpp archive/server-era/integration/
git mv integration/JuceFFI.cpp archive/server-era/integration/
git mv integration/JuceFFI.h archive/server-era/integration/
git mv integration/Main.cpp archive/server-era/integration/
git mv integration/README.md archive/server-era/integration/
git mv integration/SecureWebSocketBridge.cpp archive/server-era/integration/
git mv integration/SecureWebSocketBridge.h archive/server-era/integration/
git mv integration/SF2Reader.cpp archive/server-era/integration/
git mv integration/SharedBridgeCoupling.cpp archive/server-era/integration/
git mv integration/SongModelAdapter.cpp archive/server-era/integration/
git mv integration/SongModelAdapter.h archive/server-era/integration/
git mv integration/SongModel_v1.h archive/server-era/integration/
git mv integration/SympatheticStringBank.cpp archive/server-era/integration/
git mv integration/WebSocketBridge.cpp archive/server-era/integration/
git mv integration/WebSocketBridge.h archive/server-era/integration/
git mv integration/WebSocketSecurityManager.cpp archive/server-era/integration/
git mv integration/WebSocketSecurityManager.h archive/server-era/integration/
git mv integration/AudioGraph.h archive/server-era/integration/

# Move flutter subdirectory if it exists
if [ -d integration/flutter ]; then
    git mv integration/flutter archive/server-era/integration/
fi
```

**Verification:**
```bash
# Verify all files moved
ls archive/server-era/integration/
# Should show all files listed above

# Verify integration/ directory is empty
ls integration/
# Should show: "No such file or directory" or be empty

# Remove integration/ directory if empty
rmdir integration/
```

**Status:** ✅ ALREADY EXCLUDED from tvOS builds (CMakeLists.txt lines 27-50)

---

## Phase 3: Test File Archive

### ✅ Step 3.1: Archive WebSocket Test Directories

**Current Locations:**
- `tests/websocket/`
- `tests/websocket_security/`
- `tests/archived/` (has legacy websocket tests)

**Target Locations:**
- `archive/server-era/tests/websocket/`
- `archive/server-era/tests/websocket_security/`

**Commands:**
```bash
# Create target directories
mkdir -p archive/server-era/tests/websocket
mkdir -p archive/server-era/tests/websocket_security

# Move websocket test directory
if [ -d tests/websocket ]; then
    git mv tests/websocket/* archive/server-era/tests/websocket/
    rmdir tests/websocket/
fi

# Move websocket_security test directory
if [ -d tests/websocket_security ]; then
    git mv tests/websocket_security/* archive/server-era/tests/websocket_security/
    rmdir tests/websocket_security/
fi

# Note: tests/archived/ already in archive location
```

**Verification:**
```bash
# Verify no websocket test directories in tests/
ls tests/ | grep -i websocket
# Should show: No results

# Verify archived location
ls archive/server-era/tests/
# Should show: websocket/, websocket_security/
```

---

### ✅ Step 3.2: Archive Individual WebSocket Test Files

**Files in tests/ root:**
```bash
# Move individual test files
git mv tests/test_streaming_websocket_server.cpp archive/server-era/tests/
git mv tests/test_realtime_websocket_optimization.h archive/server-era/tests/
git mv tests/test_realtime_websocket_optimization.cpp archive/server-era/tests/
git mv tests/test_realtime_streaming.cpp archive/server-era/tests/
```

**Files in tests/archived/:**
```bash
# These are already in archive location, but verify:
ls tests/archived/ | grep -i websocket
# Expected: test_websocket_server.cpp, test_websocket_minimal.cpp, etc.
```

---

## Phase 4: CMakeLists.txt Cleanup

### ✅ Step 4.1: Remove WebSocket Test CMake Lists

**Files to Remove:**
```bash
# These test subdirectories should already be empty after Phase 3
# Remove their CMakeLists.txt files:
if [ -f tests/websocket/CMakeLists.txt ]; then
    git rm tests/websocket/CMakeLists.txt
fi
if [ -f tests/websocket_security/CMakeLists.txt ]; then
    git rm tests/websocket_security/CMakeLists.txt
fi
```

---

### ✅ Step 4.2: Update Main CMakeLists.txt

**Location:** `CMakeLists.txt`

**Current State (Lines 27-50):**
```cmake
# Exclude integration/ directory files (legacy server-era WebSocket code)
if(SCHILLINGER_TVOS_LOCAL_ONLY)
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/integration/)
        message(STATUS "🔒 Integration/ directory files excluded (tvOS local-only mode)")
        set_source_files_properties(...)
    endif()
endif()
```

**Update To:**
```cmake
# Server-era files have been moved to archive/server-era/
# No integration/ directory exists - nothing to exclude
# This section is preserved for documentation only
if(SCHILLINGER_TVOS_LOCAL_ONLY)
    message(STATUS "✅ Execution-only build - no server code present")
endif()
```

**Verification:**
```bash
# Search for any remaining integration/ references
grep -n "integration/" CMakeLists.txt
# Should show: Only in comments or removed completely
```

---

### ✅ Step 4.3: Update tests/CMakeLists.txt

**Search Pattern:** `websocket|WebSocket`

```bash
# Check for websocket test references
grep -n -i "websocket" tests/CMakeLists.txt
```

**Action:** Remove any add_subdirectory(websocket) or add_executable(... websocket ...) lines

---

## Phase 5: CI Guardrails (PREVENTION)

### ✅ Step 5.1: Add WebSocket Detection to CI

**Create:** `.github/workflows/execution-only-check.yml`

```yaml
name: Execution-Only Enforcement

on: [pull_request, push]

jobs:
  check-no-websocket:
    runs-on: macos-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Check for WebSocket headers in execution code
        run: |
          if grep -r "#include.*websocket" \
              --exclude-dir=archive \
              --exclude-dir=tests \
              engine/ effects/ instruments/ platform/ \
              2>/dev/null; then
            echo "❌ ERROR: WebSocket includes found in execution code!"
            exit 1
          fi
          echo "✅ No WebSocket includes in execution code"

      - name: Check for integration/ directory
        run: |
          if [ -d "integration/" ]; then
            echo "❌ ERROR: integration/ directory still exists!"
            exit 1
          fi
          echo "✅ No integration/ directory"
```

---

### ✅ Step 5.2: Add CMake Pre-build Check

**Add to:** `cmake/ExecutionOnlyGuards.cmake` (create if not exists)

```cmake
# Execution-only build guards
# This file must be included after project() declaration

function(check_execution_only_violations)
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/integration/)
        message(FATAL_ERROR
            "❌ CRITICAL: integration/ directory exists in execution-only build!\n"
            "Server-era code must be in archive/server-era/"
        )
    endif()

    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/include/websocket/)
        message(FATAL_ERROR
            "❌ CRITICAL: include/websocket/ exists in execution-only build!\n"
            "WebSocket headers must be in archive/server-era/headers/websocket/"
        )
    endif()

    message(STATUS "✅ Execution-only guards passed")
endfunction()

# Run checks for tvOS builds
if(SCHILLINGER_TVOS_LOCAL_ONLY)
    check_execution_only_violations()
endif()
```

**Add to CMakeLists.txt (after project() declaration):**
```cmake
# Load execution-only guards
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/cmake/ExecutionOnlyGuards.cmake)
    include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/ExecutionOnlyGuards.cmake)
endif()
```

---

## Phase 6: Documentation & Commit

### ✅ Step 6.1: Create Migration Summary

**Create:** `archive/server-era/MIGRATION_SUMMARY.md`

```markdown
# Server-Era Code Migration Summary

**Date:** 2026-01-01
**Purpose:** Enforce JUCE_EXECUTION_ONLY contract
**Action:** Moved all WebSocket/server code to archive/

## What Was Moved

### Headers (2 files)
- `include/websocket/` → `archive/server-era/headers/websocket/`

### Integration (25 files)
- `integration/` → `archive/server-era/integration/`

### Tests (15+ files)
- `tests/websocket/` → `archive/server-era/tests/websocket/`
- `tests/websocket_security/` → `archive/server-era/tests/websocket_security/`

## Build Impact

- ✅ tvOS builds: No impact (already excluded)
- ✅ Desktop builds: No impact (no references in execution code)
- ✅ Tests: WebSocket tests moved to archive/

## Verification

```bash
# Verify no websocket in execution code
grep -r "websocket" engine/ effects/ instruments/ platform/
# Expected: No results

# Verify archive location exists
ls archive/server-era/
# Expected: deployment/, headers/, integration/, tests/
```
```

---

### ✅ Step 6.2: Create Commit

**Commit Message:**
```bash
git commit -m "$(cat <<'EOF'
refactor: Move all WebSocket/server code to archive/server-era/

This enforces the JUCE_EXECUTION_ONLY contract by physically removing
all server-era code from the execution surface.

BREAKING CHANGE: include/websocket/ and integration/ no longer exist.
Server code is now in archive/server-era/ for historical reference only.

via [Happy](https://happy.engineering)

Co-Authored-By: Happy <yesreply@happy.engineering>
EOF
)"
```

---

## Phase 7: Verification & Testing

### ✅ Step 7.1: Pre-Move Verification

**Before executing moves:**
```bash
# 1. Ensure clean git state
git status

# 2. Create backup branch
git checkout -b backup/before-websocket-removal

# 3. Document current state
find . -name "*websocket*" -o -path "*/integration/*" | sort > /tmp/before_move.txt
```

---

### ✅ Step 7.2: Post-Move Verification

**After executing moves:**
```bash
# 1. Verify no websocket in execution paths
grep -r "websocket" engine/ effects/ instruments/ platform/ || echo "✅ Clean"

# 2. Verify archive structure
tree -L 3 archive/server-era/

# 3. Attempt tvOS build
cmake -DSCHILLINGER_TVOS_LOCAL_ONLY=ON -B build-tvos-test
cmake --build build-tvos-test

# 4. Check build logs for websocket references
grep -i "websocket" build-tvos-test/CMakeFiles/CMakeOutput.log || echo "✅ Clean"
```

---

### ✅ Step 7.3: Desktop Build Verification

```bash
# Ensure desktop builds still work
cmake -B build-test
cmake --build build-test

# Verify no link errors related to removed files
grep -i "undefined.*websocket\|missing.*websocket" build-test/CMakeFiles/*.log || echo "✅ Clean"
```

---

## Rollback Procedure

**If critical issues found:**
```bash
# 1. Abort current commit (if not pushed)
git reset --soft HEAD~1

# 2. Restore from backup branch
git checkout backup/before-websocket-removal -- include/websocket/ integration/

# 3. Document blocking issue
echo "BLOCKING ISSUE: <description>" > /tmp/websocket_rollback_blocker.txt

# 4. Notify team
# Create GitHub issue with rollback details
```

---

## Success Criteria

✅ **All Must Pass:**

1. [ ] Zero `#include.*websocket` in engine/, effects/, instruments/, platform/
2. [ ] No `integration/` directory in root
3. [ ] No `include/websocket/` directory
4. [ ] tvOS build completes without errors
5. [ ] Desktop build completes without errors
6. [ ] CI guardrails pass
7. [ ] CMake execution-only checks pass
8. [ ] All files preserved in archive/server-era/

---

## Estimated Effort

- **Execution Time:** 30-45 minutes
- **Verification Time:** 1-2 hours (full builds)
- **Total:** 2-3 hours with testing

---

## References

- `JUCE_EXECUTION_ONLY.md` (to be created in Task 2)
- `archive/server-era/MIGRATION_SUMMARY.md`
- Phase 8 Validation Report: 87.5% completion

---

**Next Step:** After completing this checklist, proceed to **Task 2: Write JUCE_EXECUTION_ONLY.md**
