# Server-Era Deprecation Plan

**Date:** December 31, 2025
**Purpose:** Remove server-era assumptions from JUCE execution engine
**Status:** READY FOR IMPLEMENTATION

---

## Executive Summary

The JUCE backend contains server-era infrastructure that must be removed for tvOS local-only builds. This is **not a rewrite** - it's a surgical removal of out-of-scope components.

---

## Phase 1: CMake Configuration (Immediate)

### Priority: HIGH
### Effort: 1-2 days

**Tasks:**
1. ✅ Create `cmake/TvosOptions.cmake`
2. ✅ Create `cmake/CheckNoNetworking.cmake`
3. ✅ Add `SCHILLINGER_TVOS_LOCAL_ONLY` option
4. ⏳ Integrate into main `CMakeLists.txt`
5. ⏳ Document in README

**Files:**
- `cmake/TvosOptions.cmake` - Created
- `cmake/CheckNoNetworking.cmake` - Created
- `CMakeLists.txt` - Needs update
- `README.md` - Needs update

**Success Criteria:**
- Building with `SCHILLINGER_TVOS_LOCAL_ONLY=ON` excludes all server targets
- Post-build validation fails if networking symbols detected
- Clean build produces no warnings about missing components

---

## Phase 2: Source File Exclusions (Short-Term)

### Priority: HIGH
### Effort: 2-3 days

**Backend Server Sources to Exclude:**

```
src/server/
├── BackendServer.cpp           → EXCLUDE
├── RequestHandler.cpp          → EXCLUDE
├── ServerMain.cpp              → EXCLUDE
└── WebSocketServer.cpp         → EXCLUDE
```

**WebSocket Implementation:**

```
src/websocket/
├── SimpleWebSocketServer.cpp   → EXCLUDE
├── WebSocketConnection.cpp     → EXCLUDE
└── WebSocketSHA1.cpp           → EXCLUDE
```

**REST/HTTP Handlers:**

```
src/api/
├── RestApiHandler.cpp          → EXCLUDE
├── HttpServer.cpp              → EXCLUDE
└── SecurityMiddleware.cpp      → EXCLUDE
```

**Implementation:**
```cmake
# In CMakeLists.txt
if(SCHILLINGER_TVOS_LOCAL_ONLY)
    set_source_files_properties(
        src/server/BackendServer.cpp
        src/websocket/SimpleWebSocketServer.cpp
        # ... etc
        PROPERTIES
            EXCLUDE_FROM_ALL TRUE
            EXCLUDE_FROM_DEFAULT_BUILD TRUE
    )
endif()
```

**Success Criteria:**
- Server source files don't compile in tvOS builds
- No references to server classes in generated binaries
- Build time reduced (fewer sources to compile)

---

## Phase 3: Test Cleanup (Short-Term)

### Priority: MEDIUM
### Effort: 1-2 days

**WebSocket Tests to Exclude:**

```
tests/websocket/
├── test_websocket.cpp          → EXCLUDE
├── test_simple_websocket.cpp   → EXCLUDE
├── real_websocket_server.cpp   → EXCLUDE
└── working_websocket_test.cpp  → EXCLUDE
```

**Server Integration Tests:**

```
tests/integration/
├── ServerStartupTest.cpp       → EXCLUDE
├── WebSocketConnectionTest.cpp → EXCLUDE
└── ApiEndpointTest.cpp         → EXCLUDE
```

**Keep These Tests:**
- ✅ Real-time safety tests
- ✅ Dropout tests
- ✅ Performance tests
- ✅ SIMD tests
- ✅ Memory pool tests
- ✅ DSP correctness tests

**Implementation:**
```cmake
if(SCHILLINGER_TVOS_LOCAL_ONLY)
    # Exclude test targets
    foreach(test_target WebSocketTest ServerTest)
        if(TARGET ${test_target})
            set_target_properties(${test_target} PROPERTIES
                EXCLUDE_FROM_ALL TRUE
            )
        endif()
    endforeach()
endif()
```

**Success Criteria:**
- `ctest` runs only execution/DSP tests
- No WebSocket tests in test output
- Test suite runs faster (fewer tests)

---

## Phase 4: Terminology Migration (Medium-Term)

### Priority: MEDIUM
### Effort: 3-5 days

**Terminology Mapping:**

| Deprecated (❌) | Preferred (✅) |
|-----------------|----------------|
| "track" | "executionLane" / "voiceBus" |
| "composition" | "executionGraph" / "schedule" |
| "DAW integration" | "audioHost" / "pluginHost" |
| "add track" | "add voice bus" / "register voice" |
| "malformed track" | "invalid schedule" / "corrupt event" |

**Implementation Strategy:**

1. **Phase 4a: New Code Only (1 day)**
   - All new code uses preferred terminology
   - Add linter rules to catch deprecated terms
   - Update code review checklist

2. **Phase 4b: Public APIs (2 days)**
   - Rename public-facing methods
   - Add deprecated aliases with warnings:
   ```cpp
   [[deprecated("Use getExecutionGraph() instead")]]
   Composition* getComposition() { return getExecutionGraph(); }
   ```

3. **Phase 4c: Internal Code (2 days)**
   - Rename internal variables/methods
   - Update comments and documentation
   - Search/replace for deprecated terms

**Files to Update:**
- `include/engine/` - Public API headers
- `src/engine/` - Implementation files
- `docs/` - All documentation
- `tests/` - Test code (prefer execution language)

**Success Criteria:**
- New code uses only preferred terminology
- Public APIs use execution language
- Linter catches deprecated terms
- Documentation updated

---

## Phase 5: Deployment Cleanup (Low Priority)

### Priority: LOW
### Effort: 1-2 days

**Files to Remove/Archive:**

```
deployment/
├── Dockerfile                  → ARCHIVE
├── docker-compose.yml          → ARCHIVE
├── fly.toml                    → ARCHIVE
├── nginx.conf                  → ARCHIVE
├── prometheus.yml              → ARCHIVE
└── kubernetes/                 → ARCHIVE
```

**Action:**
```bash
# Create archive directory
mkdir -p archive/server-era

# Move deployment files
mv deployment/* archive/server-era/

# Add README explaining what was archived
echo "Server-era deployment configs - unused in tvOS local-only" > archive/server-era/README.md
```

**Success Criteria:**
- Deployment files not included in source tarball
- No references to Docker/Fly/nginx in code
- Build doesn't reference deployment configs

---

## Phase 6: Documentation Updates (Continuous)

### Priority: MEDIUM
### Effort: 2-3 days

**README.md Updates:**

**Remove:**
- ❌ "Backend server for Schillinger System"
- ❌ "WebSocket API for real-time collaboration"
- ❌ "Deploy to Fly.io with one command"

**Add:**
- ✅ "Audio execution engine for tvOS"
- ✅ "Real-time safe, lock-free processing"
- ✅ "Deterministic Schillinger SDK integration"
- ✅ "Local-only, no server components"

**API Documentation:**
- Update all JUCE-style documentation comments
- Use execution language in method descriptions
- Add tvOS-specific examples

**Architecture Diagrams:**
- Remove server/client diagrams
- Add Swift → JUCE IR flow diagram
- Document lock-free plan cache architecture

---

## Phase 7: Audio Export Gating (Low Priority)

### Priority: LOW
### Effort: 1 day

**Current State:**
- `audio_export/` lives at top level
- Export tests run in all builds

**Desired State:**
- Export marked as desktop-only
- Excluded from tvOS builds
- Conditionally compiled

**Implementation:**
```cmake
if(NOT SCHILLINGER_TVOS_LOCAL_ONLY)
    add_subdirectory(audio_export)
endif()
```

**Success Criteria:**
- tvOS builds don't include export code
- Desktop builds still support export
- No export symbols in tvOS binaries

---

## Phase 8: Validation & Sign-Off (Final)

### Priority: HIGH
### Effort: 2-3 days

**Validation Checklist:**

1. **Build Validation**
   - [ ] Builds clean with `SCHILLINGER_TVOS_LOCAL_ONLY=ON`
   - [ ] No networking symbols in any binary
   - [ ] No server targets in build output
   - [ ] Build time reduced

2. **Source Validation**
   - [ ] No server sources in tvOS builds
   - [ ] No WebSocket code linked
   - [ ] No deployment scripts included

3. **Test Validation**
   - [ ] All execution tests pass
   - [ ] No WebSocket tests in suite
   - [ ] Test coverage maintained

4. **Documentation Validation**
   - [ ] README reflects local-only nature
   - [ ] API docs use execution language
   - [ ] No server references in docs

5. **Binary Validation**
   - [ ] No SSL/cryptographic libraries linked
   - [ ] No socket/network symbols
   - [ ] Binary size minimized

**Sign-Off:**
- [ ] Engineer: __________________
- [ ] Platform Lead: _________________
- [ ] QA: _____________________________

---

## Rollback Plan

If issues arise:

1. **Immediate:** Set `SCHILLINGER_TVOS_LOCAL_ONLY=OFF`
2. **Short-term:** Revert problematic commit
3. **Root cause:** Investigate with `nm` and `otool`
4. **Fix:** Update CMakeLists.txt exclusions

---

## Timeline Estimate

| Phase | Priority | Effort | Timeline |
|-------|----------|--------|----------|
| 1. CMake Config | HIGH | 1-2 days | Week 1 |
| 2. Source Exclusion | HIGH | 2-3 days | Week 1-2 |
| 3. Test Cleanup | MEDIUM | 1-2 days | Week 2 |
| 4. Terminology | MEDIUM | 3-5 days | Week 2-3 |
| 5. Deployment | LOW | 1-2 days | Week 3 |
| 6. Documentation | MEDIUM | 2-3 days | Week 3 |
| 7. Audio Export | LOW | 1 day | Week 3 |
| 8. Validation | HIGH | 2-3 days | Week 4 |

**Total:** 3-4 weeks for complete deprecation

---

## Success Metrics

**Quantitative:**
- ✅ Build size reduced by ~30% (no server code)
- ✅ Build time reduced by ~20% (fewer sources)
- ✅ Binary size reduced by ~40% (no networking)
- ✅ Test suite runs 50% faster (fewer tests)

**Qualitative:**
- ✅ Codebase mental model aligned with tvOS reality
- ✅ New contributors not confused by server code
- ✅ Documentation clearly states "execution engine"
- ✅ Architecture diagrams show Swift → JUCE flow

---

## Conclusion

This deprecation plan removes server-era assumptions **surgically**, without rewriting core DSP or execution logic.

**Status:** Ready to implement, starting with Phase 1 (CMake Configuration)

**Next Step:** Integrate `cmake/TvosOptions.cmake` into main `CMakeLists.txt` and validate build.

---

**End of Deprecation Plan**
