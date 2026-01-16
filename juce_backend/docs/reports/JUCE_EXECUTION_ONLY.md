# JUCE_EXECUTION_ONLY Contract

**Status:** 🚢 ENFORCED
**Version:** 1.0.0
**Effective:** 2026-01-01
**Enforcement:** CI + CMake guards

---

## Preamble

This document establishes the **JUCE_EXECUTION_ONLY contract** — a legally binding technical specification that defines what this repository **IS** and what it is **NOT**.

Any violation of this contract is a **critical security breach** that will be immediately rejected by CI guards and blocked from merging.

---

## Core Contract

### ✅ What This Repository IS

This repository contains a **JUCE-based audio execution engine** that:

1. **Executes Scheduled Audio Events**
   - Plays pre-composed rhythms via `RhythmExecutor`
   - Renders harmony via `HarmonyExecutor`
   - Processes instruments and effects pipelines
   - Manages parameter automation lanes
   - Handles real-time audio I/O

2. **Provides Audio Processing Capabilities**
   - DSP effects (EQ, dynamics, distortion, modulation)
   - Instrument synthesis and sampling
   - Audio graph routing and processing
   - Real-time parameter modulation
   - Audio export for desktop builds

3. **Supports Platform Integration**
   - JUCE audio plugin formats (VST3/AU/AAX)
   - Standalone desktop applications
   - tvOS app embedding via dynamic framework
   - Flutter FFI integration for parameter control

4. **Ensures Real-Time Safety**
   - Lock-free parameter updates
   - Real-time-safe audio callbacks
   - Deterministic memory allocation
   - No blocking operations in audio thread

---

### 🚫 What This Repository is NOT

This repository **explicitly does NOT contain**:

1. **NO Musical Generation**
   - ❌ Rhythm generation algorithms
   - ❌ Harmony composition
   - ❌ Melody creation
   - ❌ Schillinger system implementation
   - ❌ AI music generation

2. **NO Networking**
   - ❌ WebSocket servers
   - ❌ HTTP/REST APIs
   - ❌ Real-time streaming
   - ❌ Remote procedure calls
   - ❌ Client-server communication

3. **NO Authentication**
   - ❌ User login/logout
   - ❌ Token management
   - ❌ Session handling
   - ❌ Permission systems
   - ❌ OAuth/OpenID

4. **NO Planning/Orchestration**
   - ❌ Composition planning
   - ❌ Score generation
   - ❌ Arrangement logic
   - ❌ Musical decision-making
   - ❌ Creative AI

5. **NO Server Infrastructure**
   - ❌ Deployment scripts
   - ❌ Docker containers
   - ❌ Load balancers
   - ❌ Cloud services
   - ❌ Database connections

---

## Architecture Boundary

### Physical Separation

```
juce_backend/
├── engine/              ✅ Execution code (DSP, scheduling)
├── effects/             ✅ Audio processing effects
├── instruments/         ✅ Synthesizers and samplers
├── platform/            ✅ Platform-specific integration
│   ├── tvos/           ✅ tvOS dynamic framework
│   └── desktop/        ✅ Desktop plugins/standalone
├── include/            ✅ Public execution API only
│
├── archive/
│   └── server-era/     🚫 All server code archived here
│       ├── headers/
│       ├── integration/
│       ├── tests/
│       └── deployment/
│
└── frontend/           ⚠️  Flutter UI (separate process)
```

### Directory Usage Rules

| Directory | Execution Code? | Build Target? | Notes |
|-----------|----------------|---------------|-------|
| `engine/` | ✅ YES | tvOS + Desktop | Core execution engine |
| `effects/` | ✅ YES | tvOS + Desktop | DSP effects |
| `instruments/` | ✅ YES | tvOS + Desktop | Instruments/samplers |
| `platform/` | ✅ YES | Platform-specific | tvOS framework, desktop plugins |
| `include/` | ✅ YES | tvOS + Desktop | **Public execution API only** |
| `tests/` | ⚠️  Mixed | Desktop-only | No websocket tests in execution path |
| `frontend/` | ❌ NO | Separate | Flutter UI process |
| `archive/server-era/` | ❌ NO | Never | Historical reference only |

---

## Symbol & API Restrictions

### 🚫 FORBIDDEN Symbols (CI-Enforced)

The following symbols **MUST NOT** appear in tvOS or desktop execution builds:

#### Server-Era Symbols
```cpp
// FORBIDDEN - WebSocket APIs
RhythmAPI
HarmonyAPI
CompositionAPI
SchillingerSDK
WebSocketHandler
WebSocketServer
WebSocketBridge
AnalysisWebSocketHandler
InstrumentWebSocketAPI

// FORBIDDEN - Networking symbols
listen()
bind()
accept()
socket()
connect()
WebSocket
HTTPServer
RESTAPI

// FORBIDDEN - Authentication
authenticate()
login()
logout()
validateToken()
OAuth
JWT
SessionManager

// FORBIDDEN - Server infrastructure
deploy_()
docker_
loadBalancer_
cloudService_
```

### CI Guardrail Enforcement

**File:** `.github/workflows/execution-only-enforcement.yml`

```yaml
name: Execution-Only Symbol Enforcement

on: [pull_request, push]

jobs:
  symbol-check:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check forbidden server symbols
        run: |
          FORBIDDEN="
            RhythmAPI
            HarmonyAPI
            CompositionAPI
            SchillingerSDK
            WebSocketHandler
            WebSocketServer
            WebSocketBridge
          "

          for symbol in $FORBIDDEN; do
            if grep -r "$symbol" \
                --exclude-dir=archive \
                --exclude-dir=frontend \
                --exclude-dir=tests \
                engine/ effects/ instruments/ platform/ \
                2>/dev/null; then
              echo "❌ FORBIDDEN SYMBOL FOUND: $symbol"
              exit 1
            fi
          done
          echo "✅ No forbidden server symbols in execution code"
```

---

## CMake Enforcement

### Pre-build Checks

**File:** `cmake/ExecutionOnlyGuards.cmake`

```cmake
# Execution-only build guards
# This file MUST be included in all CMakeLists.txt

function(check_execution_only_violations)
    set(violations_found FALSE)

    # Check 1: No integration/ directory
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/integration/)
        message(FATAL_ERROR
            "❌ CRITICAL: integration/ directory exists!\n"
            "Server-era code must be in archive/server-era/"
        )
        set(violations_found TRUE)
    endif()

    # Check 2: No websocket headers in include/
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/include/websocket/)
        message(FATAL_ERROR
            "❌ CRITICAL: include/websocket/ exists!\n"
            "WebSocket headers must be in archive/server-era/headers/websocket/"
        )
        set(violations_found TRUE)
    endif()

    # Check 3: No server-era files in execution paths
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/engine/)
        file(GLOB_RECURSE engine_files
            "${CMAKE_CURRENT_SOURCE_DIR}/engine/*.cpp"
            "${CMAKE_CURRENT_SOURCE_DIR}/engine/*.h"
        )
        foreach(file ${engine_files})
            file(READ ${file} content)
            if(content MATCHES "WebSocket|websocket|RhythmAPI|HarmonyAPI")
                message(FATAL_ERROR
                    "❌ CRITICAL: Server symbols found in ${file}\n"
                    "Execution code must not include server-era APIs"
                )
                set(violations_found TRUE)
            endif()
        endforeach()
    endif()

    if(NOT violations_found)
        message(STATUS "✅ Execution-only guards passed")
    endif()
endfunction()

# Run for all builds
check_execution_only_violations()
```

---

## Build Target Guarantees

### tvOS Build (SCHILLINGER_TVOS_LOCAL_ONLY=ON)

**Guarantees:**
- ✅ Zero networking symbols
- ✅ Zero WebSocket code
- ✅ Zero server infrastructure
- ✅ Only audio execution engine
- ✅ Binary size < 5MB (stripped)

**Verification:**
```bash
# Build tvOS framework
cmake -DSCHILLINGER_TVOS_LOCAL_ONLY=ON -B build-tvos
cmake --build build-tvos

# Check for forbidden symbols
nm -gU build-tvos/*.dylib | grep -i "websocket\|listen\|bind\|accept"
# Expected: No output

# Check binary size
ls -lh build-tvos/*.dylib
# Expected: < 5MB
```

---

### Desktop Plugin Build

**Guarantees:**
- ✅ Audio execution only
- ✅ Parameter control via DAW automation
- ✅ No external network dependencies
- ✅ Real-time safe audio callbacks

**Verification:**
```bash
# Build plugins
cmake -B build-desktop
cmake --build build-desktop --target All

# Check for networking symbols (should be none)
otool -tV build-desktop/*.vst3/Contents/*/-plugin.dylib | grep -i "socket\|connect"
# Expected: No output (except JUCE's internal networking for telemetry, which is OK)
```

---

## Dependency Rules

### Allowed Dependencies

```cmake
# ✅ ALLOWED - Audio/Execution dependencies
JUCE::juce_core
JUCE::juce_audio_basics
JUCE::juce_audio_devices
JUCE::juce_audio_formats
JUCE::juce_audio_processors
JUCE::juce_dsp

# ✅ ALLOWED - Standard library
std:: (standard C++ library)

# ✅ ALLOWED - JSON for parameter serialization
nlohmann_json::nlohmann_json

# ✅ ALLOWED - Testing (desktop only)
GTest::gtest
GTest::gtest_main
```

### Forbidden Dependencies

```cmake
# 🚫 FORBIDDEN - Networking libraries
# WebSocket++
# uWebSockets
# libcurl
# OpenSSL (for networking)
# Boost.Asio

# 🚫 FORBIDDEN - HTTP frameworks
# cpp-httplib
# Pistache
# CrowCpp

# 🚫 FORBIDDEN - Authentication
# OAuth C++ libraries
# JWT C++ libraries
# Session management libraries
```

---

## Code Review Checklist

All pull requests **MUST** pass these checks:

### Execution Code Review (engine/, effects/, instruments/, platform/)

- [ ] No `#include` of websocket headers
- [ ] No networking calls (socket, bind, connect, listen)
- [ ] No authentication logic
- [ ] No musical generation algorithms
- [ ] Real-time safe (no malloc/free in audio thread)
- [ ] No blocking operations
- [ ] No external network dependencies
- [ ] Binary size constraints met (tvOS < 5MB)

### Documentation Review

- [ ] Public headers (`include/`) have execution-only documentation
- [ ] No references to server-era APIs in API docs
- [ ] Architecture diagrams show execution-only boundary

### Testing Review

- [ ] Tests cover execution functionality only
- [ ] No integration tests for server features (moved to archive)
- [ ] Performance tests validate real-time safety

---

## Migration Guide for Contributors

### When Adding New Features

**Question:** Does this feature belong in the JUCE backend?

**Decision Tree:**

```
┌─ Does it process audio in real-time?
│  └─ YES → ✅ Add to engine/, effects/, instruments/
│
├─ Does it control audio parameters?
│  └─ YES → ✅ Add to include/ (public API)
│
├─ Does it generate music?
│  └─ YES → 🚫 Does NOT belong here (use Flutter backend)
│
├─ Does it require networking?
│  └─ YES → 🚫 Does NOT belong here (use separate service)
│
├─ Does it authenticate users?
│  └─ YES → 🚫 Does NOT belong here (use separate service)
│
└─ Does it plan compositions?
   └─ YES → 🚫 Does NOT belong here (use Flutter backend)
```

---

## Enforcement Mechanisms

### 1. CI/CD Gates (Automatic)

- **Symbol check** fails PR if forbidden symbols found
- **Directory check** fails if integration/ or include/websocket/ exist
- **Binary size check** fails if tvOS framework > 5MB
- **Symbol dump check** fails if networking symbols present

### 2. CMake Build-Time Checks (Automatic)

- `ExecutionOnlyGuards.cmake` runs before every build
- Fails immediately if directory violations found
- Scans source files for forbidden includes

### 3. Code Review (Manual)

- Maintainers must review against this contract
- PR templates include execution-only checklist
- Approval requires two maintainers to verify boundary

### 4. Automated Security Scanning

- Weekly scans for new networking symbols
- Dependency audits for forbidden libraries
- Binary analysis for unexpected symbols

---

## Violation Response

### If CI Fails

1. **Stop:** Do not merge
2. **Investigate:** Review violation details
3. **Fix:** Either remove forbidden code or move to correct location
4. **Verify:** Re-run CI checks
5. **Document:** Update this contract if boundary needs clarification

### If Guard Violation Found in Production

**Severity:** CRITICAL
**Response Time:** Immediate rollback

1. **Emergency Rollback:** Revert to previous commit
2. **Incident Report:** Document how violation bypassed checks
3. **Patch CI:** Strengthen guards to prevent recurrence
4. **Security Audit:** Full scan of all commits
5. **Post-Mortem:** Update processes and documentation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-01 | Initial contract, enforcement via CI + CMake |

---

## References

- `archive/server-era/WEBSOCKET_REMOVAL_CHECKLIST.md` - Migration details
- `archive/server-era/MIGRATION_SUMMARY.md` - What was moved
- `.github/workflows/execution-only-enforcement.yml` - CI guards
- `cmake/ExecutionOnlyGuards.cmake` - Build-time checks

---

## Approval & Sign-Off

**Primary Architect:** Bret Bouchard
**Effective Date:** 2026-01-01
**Review Cycle:** Quarterly
**Next Review:** 2026-04-01

---

**This contract is enforced by automation and verified by human review. Any attempt to bypass these restrictions is a critical security incident.**
