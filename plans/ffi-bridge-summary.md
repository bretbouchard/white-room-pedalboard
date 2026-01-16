# FFI Bridge Architecture - Design Summary

**Status:** ✅ Design Complete
**Created:** 2025-01-15
**Files Created:** 5

---

## Deliverables

### 1. Architecture Document
**File:** `plans/ffi-bridge-architecture.md` (comprehensive, 47 pages)

**Contents:**
- Executive summary
- Architecture overview (with diagrams)
- C ABI boundary definition
- Serialization layer design (JSON + binary)
- Real-time communication strategy (lock-free queues + atomic state)
- Complete type mapping (Swift ↔ C ↔ C++)
- Implementation roadmap (7 phases, 3-5 days)
- Testing strategy (unit, integration, performance)
- Common pitfalls and solutions

**Key Decisions:**
- **Serialization:** JSON for theory objects, binary for audio data
- **Communication:** Lock-free SPSC queue for commands, atomic state for polling
- **Threading:** Audio thread updates atomic state, Swift polls at 60Hz
- **Memory:** C++ allocates (malloc), Swift frees (sch_free_string)
- **Error Handling:** C++ exceptions → sch_result_t → Swift Error

### 2. C Header File
**File:** `juce_backend/src/ffi/sch_engine_ffi.h` (complete C API)

**Contents:**
- All FFI function signatures (extern "C")
- Type definitions (opaque handles, enums, structs)
- Memory management rules (documented in comments)
- Thread safety guarantees
- Complete API documentation

**Key Functions:**
- Engine lifecycle: `sch_engine_create`, `sch_engine_destroy`
- Song operations: `sch_engine_load_song`, `sch_engine_get_song`
- Audio control: `sch_engine_audio_init`, `sch_engine_audio_start/stop`
- Transport: `sch_engine_set_transport`, `sch_engine_set_tempo`, `sch_engine_set_position`
- MIDI: `sch_engine_send_note_on/off`, `sch_engine_all_notes_off`
- Performance blend: `sch_engine_set_performance_blend`, `sch_engine_push_command`
- State: `sch_engine_get_performance_state` (atomic read)
- Callbacks: `sch_engine_set_event_callback`

### 3. Swift Protocol
**File:** `swift_frontend/.../SchillingerFFIProtocol.swift` (type-safe interface)

**Contents:**
- `SchillingerFFIProtocol` protocol definition
- `SchResult` enum (error codes)
- `PerformanceState` struct (atomic state)
- `Command` struct (lock-free queue)
- `SchillingerFFI` default implementation
- Supporting types (AudioConfig, TransportState)
- UUID extensions (toFFI/fromFFI)

**Key Features:**
- Type-safe wrappers around C FFI
- Automatic memory management (free with defer)
- Error translation (sch_result_t → Swift Error)
- Thread-safe callbacks (dispatch to main thread)

### 4. C++ Struct Definitions
**File:** `juce_backend/src/ffi/sch_song_structs.hpp` (data structures)

**Contents:**
- Core types (sch_song_t, sch_song_model_t)
- Binary serialization format (sch_binary_header_t, sch_binary_note_entry_t)
- Performance state (sch_performance_state_t)
- System types (rhythm, melody, harmony, orchestration)
- Ensemble model (sch_voice_t, sch_ensemble_model_t)
- Bindings (role_rhythm_binding_t, etc.)
- Constraints (sch_constraint_t)
- Utility functions (uuid_is_empty, uuid_copy, uuid_equals)

**Design Principles:**
- Plain Old Data (POD) for C ABI compatibility
- Fixed-size arrays where possible
- Explicit lengths for strings
- Template-based generic arrays

### 5. Implementation Roadmap
**File:** `plans/ffi-implementation-roadmap.md` (step-by-step guide)

**Contents:**
- 7-phase implementation plan (3-5 days)
- Detailed task breakdown for each phase
- Code examples for all major functions
- Testing strategy (unit, integration, performance)
- Common issues & solutions
- Success metrics
- Next steps

**Phases:**
1. Core Bridge (Day 1) - Basic communication
2. Song Loading (Day 1.5) - JSON serialization
3. Audio Control (Day 2) - Transport, MIDI
4. Performance Blend (Day 2.5) - Lock-free queues
5. SongModel Binary (Day 3) - Realized notes
6. Real-Time Callbacks (Day 3.5) - Event callbacks
7. Polish & Testing (Day 4-5) - Production-ready

---

## Architecture Highlights

### Communication Pattern

```
Swift (UI Thread)
    ↓ (commands)
Lock-Free SPSC Queue
    ↓ (audio thread processing)
C++ Engine (Real-Time Audio)
    ↓ (atomic state updates)
Swift (Polling @ 60Hz)
```

### Data Flow

```
TypeScript SDK (npm package)
    ↓ (JSON string)
Swift Frontend (SchillingerSong_v1)
    ↓ (JSON via FFI)
C++ Bridge (sch_engine_load_song)
    ↓ (parse & validate)
JUCE Engine (internal types)
```

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Command latency | <10ms | Real-time audio control |
| State polling | 60Hz | Matches UI refresh rate |
| Song serialization | <100ms | Fast enough for UX |
| Binary serialization | <10ms | 10k notes in 10ms |
| Memory overhead | <10MB | Mobile-friendly |

---

## Key Design Decisions

### 1. Hybrid Serialization (JSON + Binary)

**Rationale:**
- JSON for theory objects (infrequent, large, need validation)
- Binary for audio data (frequent, small, performance-critical)
- Balances debuggability and performance

### 2. Lock-Free Queue + Atomic State

**Rationale:**
- Commands: Lock-free SPSC queue (no blocking)
- State: Atomic variables (wait-free reads)
- Polling: 60Hz matches UI refresh
- Simpler than callbacks for frequent updates

### 3. Memory Ownership Rules

**Rationale:**
- Input strings: Borrowed (no ownership transfer)
- Output strings: C++ allocates (malloc), Swift frees
- Clear ownership prevents leaks and double-frees

### 4. Thread Safety Model

**Rationale:**
- Audio thread: Update atomic state, process commands
- Swift main thread: Poll state, push commands
- Callbacks: Dispatch to main thread (no crashes)
- Simple, predictable threading model

---

## Implementation Priority

### Critical Path (must complete in order):

1. **Phase 1:** Core bridge (create/destroy engine)
2. **Phase 2:** Song loading (JSON serialization)
3. **Phase 3:** Audio control (start/stop, transport)
4. **Phase 4:** Performance blend (real-time control)

### Can defer to later:

5. **Phase 5:** SongModel binary (optimization)
6. **Phase 6:** Real-time callbacks (nice-to-have)
7. **Phase 7:** Polish (documentation, testing)

### Minimum Viable Product (MVP):

Phases 1-4 (2.5 days) enable:
- Load songs
- Start/stop audio
- Real-time blend control
- Basic transport control

---

## Testing Strategy

### Unit Tests

- **C++:** Catch2 framework
  - Serialization/deserialization
  - Lock-free queue behavior
  - Memory management

- **Swift:** XCTest framework
  - FFI function calls
  - Type conversions
  - Error handling

### Integration Tests

- End-to-end workflows
- Load song → Start audio → Blend → Stop
- Round-trip serialization
- Memory leak detection

### Performance Tests

- Latency measurement (<10ms target)
- Serialization benchmark (<10ms for 10k notes)
- Memory profiling (<10MB overhead)

---

## Common Pitfalls (Avoid These!)

### 1. Memory Ownership Confusion
**Solution:** Document ownership in function headers

### 2. Thread Safety Violations
**Solution:** Always dispatch callbacks to main thread

### 3. C++ Exceptions Across FFI
**Solution:** Catch all exceptions in bridge layer

### 4. String Encoding Mismatches
**Solution:** Explicit UTF-8 conversion

### 5. ABI Incompatibility
**Solution:** Always use `extern "C"`

### 6. Atomic State Races
**Solution:** Use proper memory ordering (acquire/release)

### 7. Callback Lifetime Issues
**Solution:** Use `[weak self]` in closures

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Latency | <10ms | Benchmark: slider to audio |
| Memory | No leaks | ASan, Instruments |
| Reliability | 99.9% uptime | Crash-free testing |
| Performance | <5% CPU | Profiler during playback |
| Coverage | >80% | Unit + integration tests |

---

## Next Steps

### Immediate Actions

1. **Review architecture** with team
2. **Create implementation branch:**
   ```bash
   git checkout -b feature/ffi-bridge-implementation
   ```
3. **Track work in bd:**
   ```bash
   bd create "Phase 1: Core Bridge Implementation" \
     --labels "ffi,phase-1,critical" \
     --description "Implement sch_engine_ffi.cpp with basic lifecycle and error handling"
   ```
4. **Begin Phase 1:** Create `sch_engine_ffi.cpp`

### Daily Workflow

1. **Check bd status:**
   ```bash
   bd ready --json
   ```
2. **Update current task:**
   ```bash
   bd update [task-id] --status "doing"
   ```
3. **Implement according to roadmap**
4. **Test each phase before moving on**
5. **Close task when complete:**
   ```bash
   bd close [task-id]
   ```

---

## File Locations

### Architecture Documents
```
plans/
├── ffi-bridge-architecture.md        # Main architecture doc
└── ffi-implementation-roadmap.md     # Step-by-step guide
```

### C++ Implementation
```
juce_backend/src/ffi/
├── sch_engine_ffi.h                  # C header (NEW - create this)
├── sch_engine_ffi.cpp                # C++ implementation (NEW - create this)
├── sch_song_structs.hpp              # Data structures (NEW - created)
├── sch_types.hpp                     # Existing types
└── sch_engine.hpp                    # Existing declarations
```

### Swift Implementation
```
swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/
├── Audio/
│   ├── JUCEEngine.swift              # Existing (UPDATE with real FFI calls)
│   └── SchillingerFFIProtocol.swift  # NEW (created)
└── Models/
    └── SchillingerSong.swift         # NEW (create this)
```

---

## Questions?

### Common Questions

**Q: Why hybrid serialization (JSON + binary)?**
A: JSON for debuggability and validation, binary for performance. Theory objects are infrequent but need validation. Audio data is frequent and needs speed.

**Q: Why lock-free queue instead of callbacks?**
A: Commands are frequent (every UI interaction), callbacks would flood main thread. Lock-free queue is faster and simpler. Callbacks reserved for rare events (errors).

**Q: Why polling instead of callbacks for state?**
A: State changes are frequent (60Hz UI refresh). Polling atomic variables is wait-free (<100ns) and simpler than callback-based streams.

**Q: How do I handle C++ exceptions across FFI?**
A: Catch all exceptions in bridge layer, translate to `sch_result_t`, Swift converts to `Error`. Never let exceptions escape `extern "C"` boundary.

**Q: What about thread safety?**
A: Audio thread updates atomic state, Swift polls. Commands go through lock-free queue. Callbacks dispatch to main thread. All documented in headers.

---

## Summary

This architecture provides:

✅ **Clean separation:** Swift UI → C bridge → C++ engine
✅ **Type safety:** Well-defined FFI types with validation
✅ **Performance:** Lock-free queues, atomic state, binary serialization
✅ **Maintainability:** Clear ownership, documented errors
✅ **Testability:** Unit, integration, performance tests defined
✅ **Production-ready:** 3-5 day implementation plan with clear phases

**Estimated implementation time:** 3-5 days
**Priority:** CRITICAL (blocking real audio)
**Next action:** Review and approve, then create implementation branch

---

**Document Version:** 1.0
**Status:** Design Complete, Ready for Implementation
**Last Updated:** 2025-01-15
