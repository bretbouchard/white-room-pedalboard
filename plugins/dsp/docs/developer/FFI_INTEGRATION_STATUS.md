# FFI Bridge Integration Status

**Date:** 2025-01-15
**Issue:** white_room-308
**Status:** ✅ **FFI Bridge Complete - ProjectionEngine Integration Pending**

---

## Current Implementation Status

### ✅ What Works (COMPLETE)

1. **Swift ↔ JUCE Communication**
   - Swift can call C FFI functions
   - Type-safe interop via module map
   - Thread-safe operation
   - Memory-safe handle management
   - Error handling and validation

2. **FFI Functions Implemented**
   - `sch_engine_create()` - Initialize engine
   - `sch_engine_destroy()` - Cleanup engine
   - `sch_engine_audio_init()` - Configure audio
   - `sch_engine_audio_start()` - Start playback
   - `sch_engine_audio_stop()` - Stop playback
   - `sch_engine_set_performance_blend()` - **Set blend between performances**
   - `sch_engine_send_command()` - **Send JSON commands**

3. **Demo Audio Output**
   - SineWaveGenerator produces real audio
   - Frequency changes based on blend value (220Hz - 880Hz)
   - Amplitude changes based on blend value (0.1 - 0.3)
   - Real-time parameter updates
   - Cross-platform (macOS/iOS/tvOS)

4. **Swift Integration**
   - `JUCEEngine` class fully updated
   - No placeholder NSLog calls
   - All FFI functions properly called
   - `@Published` properties update UI
   - Thread-safe dispatch queues

---

## 🔜 ProjectionEngine Integration (PENDING)

### What Needs to Be Done

The **ProjectionEngine** is already implemented and has a `projectSongBlend()` function that does exactly what we need:

```cpp
ProjectionResultType ProjectionEngine::projectSongBlend(
    const SongState& songState,
    const PerformanceState& perfA,
    const PerformanceState& perfB,
    float t,  // Blend value 0.0-1.0
    const ProjectionConfig& config = ProjectionConfig()
);
```

This function:
- Takes a song and two performances
- Blends between them based on `t`
- Returns a `RenderedSongGraph` with blended notes, voices, buses
- Handles all the complexity of crossfading

### Why It's Not Integrated Yet

**Missing Data Structures:**

1. **SongState** - The song to project
   - Not yet loaded in engine
   - Needs to be populated from:
     - JSON file
     - SDK generation
     - User creation

2. **PerformanceState** - The performance lenses
   - Not yet loaded in engine
   - Needs to be populated from:
     - JSON file (PerformanceState_v1)
     - User creation
     - Preset library

3. **Adapter Layer** - Convert between FFI types and engine types
   - FFI uses: `sch_performance_t`, `sch_song_t` (C structs)
   - Engine uses: `PerformanceState`, `SongState` (C++ classes)
   - Need adapters to convert between them

### Integration Path

#### Phase 1: Add SongState Loading (HIGH PRIORITY)

**File:** `juce_backend/src/ffi/sch_engine.mm`

```cpp
// In Engine struct, add:
std::unique_ptr<SongState> currentSong;
std::unique_ptr<ProjectionEngine> projectionEngine;

// Add FFI function:
sch_result_t sch_engine_load_song_state(
    sch_engine_handle engine,
    const char* json  // SongState JSON
);

// Implementation:
sch_result_t sch_engine_load_song_state(
    sch_engine_handle engine,
    const char* json
) {
    auto* impl = get_engine_impl(engine);
    if (!impl->engine) return SCH_ERR_ENGINE_FAILED;

    // Parse JSON to SongState
    // TODO: Need SongState::fromJson() or similar
    // impl->engine->currentSong = SongState::parse(json);

    DBG("SchillingerEngine: SongState loaded");
    return SCH_OK;
}
```

**Required:** `SongState` JSON serialization

#### Phase 2: Add PerformanceState Loading (HIGH PRIORITY)

**File:** `juce_backend/src/ffi/sch_engine.mm`

```cpp
// In Engine struct, add:
std::map<std::string, std::shared_ptr<PerformanceState>> performances;

// Add FFI function:
sch_result_t sch_engine_load_performance(
    sch_engine_handle engine,
    const char* json  // PerformanceState_v1 JSON
);

// Implementation:
sch_result_t sch_engine_load_performance(
    sch_engine_handle engine,
    const char* json
) {
    auto* impl = get_engine_impl(engine);
    if (!impl->engine) return SCH_ERR_ENGINE_FAILED;

    // Parse JSON to PerformanceState_v1
    // Convert to PerformanceState (engine type)
    // auto perfV1 = PerformanceState_v1::fromJson(json);
    // auto perf = convertV1ToEngine(perfV1);
    // impl->engine->performances[perf->id] = perf;

    DBG("SchillingerEngine: PerformanceState loaded");
    return SCH_OK;
}
```

**Required:** `PerformanceState` adapter (v1 → engine type)

#### Phase 3: Update Blend Function (MEDIUM PRIORITY)

**File:** `juce_backend/src/ffi/sch_engine.mm`

```cpp
sch_result_t sch_engine_set_performance_blend(
    sch_engine_handle engine,
    const char* performance_a_id,
    const char* performance_b_id,
    double blend_value
) {
    auto* impl = get_engine_impl(engine);
    if (!impl->engine) return SCH_ERR_ENGINE_FAILED;

    // Check if we have SongState and Performances
    if (!impl->engine->currentSong) {
        // Fall back to demo mode (sine wave)
        DBG("SchillingerEngine: No SongState, using demo mode");
        updateDemoBlend(impl, blend_value);
        return SCH_OK;
    }

    auto& perfA = impl->engine->performances[performance_a_id];
    auto& perfB = impl->engine->performances[performance_b_id];

    if (!perfA || !perfB) {
        invoke_error_callback(impl, "Performance not found");
        return SCH_ERR_NOT_FOUND;
    }

    // Use ProjectionEngine for real blend
    if (!impl->engine->projectionEngine) {
        impl->engine->projectionEngine = std::make_unique<ProjectionEngine>();
    }

    auto result = impl->engine->projectionEngine->projectSongBlend(
        *impl->engine->currentSong,
        *perfA,
        *perfB,
        static_cast<float>(blend_value),
        ProjectionConfig::realtime()  // Fast, no validation
    );

    if (!result.isOk()) {
        auto error = result.getError();
        invoke_error_callback(impl, error->userMessage.toUTF8());
        return SCH_ERR_INTERNAL;
    }

    // Get blended graph
    auto graph = result.getResult()->renderGraph;

    // TODO: Convert RenderedSongGraph to audio output
    // This requires an AudioSource that can play the graph

    DBG("SchillingerEngine: Real projection blend complete");
    return SCH_OK;
}
```

**Required:** `RenderedSongGraph` → `AudioSource` adapter

#### Phase 4: Create AudioGraphSource (LOW PRIORITY)

**File:** `juce_backend/src/audio/AudioGraphSource.h` (new)

```cpp
struct AudioGraphSource : public juce::AudioSource {
    std::shared_ptr<RenderedSongGraph> graph;

    void prepareToPlay(int samplesPerBlock, double sampleRate) override;
    void releaseResources() override;
    void getNextAudioBlock(const juce::AudioSourceChannelInfo& buffer) override;

private:
    void playGraph(const RenderedSongGraph& graph, juce::AudioBuffer<float>& buffer);
    // Synthesize notes from graph->assignedNotes
};
```

**Required:** Full audio synthesis engine

---

## Immediate Next Steps

### Option A: Use Demo Mode (CURRENT - WORKS)

Keep the current SineWaveGenerator demo. It's perfect for:
- ✅ Testing FFI bridge functionality
- ✅ Verifying Swift-C++ communication
- ✅ Validating thread safety
- ✅ Demonstrating blend control works

**Pros:**
- Works right now
- Simple and reliable
- Good enough for UI testing

**Cons:**
- Doesn't use real ProjectionEngine
- No actual performance blending

### Option B: Integrate ProjectionEngine (REQUIRES WORK)

Follow the integration path above to connect ProjectionEngine.

**Pros:**
- Real performance blending
- Full Schillinger engine
- Production-ready audio

**Cons:**
- Requires SongState loading
- Requires PerformanceState loading
- Requires AudioSource adapter
- More complex = more potential bugs

---

## Recommendation

### Short Term (Now)
**Keep demo mode for testing.** The FFI bridge is the critical part, and it works perfectly. Use the demo to verify Swift UI can control JUCE backend.

### Medium Term (Next Sprint)
**Implement SongState and PerformanceState loading.**
1. Add JSON serialization for both types
2. Add FFI functions to load them
3. Test that loading works

### Long Term (Following Sprint)
**Integrate ProjectionEngine.**
1. Create AudioGraphSource to play RenderedSongGraph
2. Update blend function to use ProjectionEngine
3. Test real audio output

---

## Testing Current Implementation

### Test Demo Mode (Works Now)

```swift
// In Swift
let engine = JUCEEngine.shared
engine.startEngine()

let perfA = PerformanceInfo(id: "piano", name: "Piano", description: "")
let perfB = PerformanceInfo(id: "techno", name: "Techno", description: "")

// You'll hear frequency change!
engine.setPerformanceBlend(perfA, perfB, blendValue: 0.0)  // Low pitch (220Hz)
engine.setPerformanceBlend(perfA, perfB, blendValue: 1.0)  // High pitch (880Hz)
```

**Expected Output:**
- ✅ Audio plays
- ✅ Frequency changes with blend
- ✅ No crashes
- ✅ Thread-safe

---

## Summary

**Current Status:**
- ✅ FFI bridge: COMPLETE
- ✅ Swift integration: COMPLETE
- ✅ Demo audio: WORKING
- ⏳ ProjectionEngine: PENDING data loading

**What Works:**
- Swift can control JUCE backend in real-time
- Blend commands sent successfully
- Audio output demonstrates blend is working
- Thread-safe, memory-safe, error-handled

**What's Needed for Full Integration:**
1. SongState loading from JSON
2. PerformanceState loading from JSON
3. Type adapters (FFI ↔ Engine)
4. AudioSource for RenderedSongGraph

**Recommendation:** Use demo mode now, integrate ProjectionEngine incrementally over next 2-3 sprints.

---

**Last Updated:** 2025-01-15
**Status:** FFI Bridge Complete, ProjectionEngine Integration Path Documented
