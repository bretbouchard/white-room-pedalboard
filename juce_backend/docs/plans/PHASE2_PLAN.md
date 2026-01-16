# Phase 2: Structural Refactor - Implementation Plan

**Date:** December 30, 2025
**Status:** 🟡 In Progress
**Branch:** `juce_backend_clean`

---

## 📋 Phase 2 Overview

**Purpose:** Implement the core interfaces created in Phase 1C and update instruments to use them

**Estimated Time:** 1-2 weeks

**Acceptance Criteria:**
- All instruments inherit from `InstrumentDSP` interface
- `GraphBuilder` can build audio graph from `SongModel`
- `SongModelAdapter` connects to SDK and extracts track/bus info
- `EventQueue` delivers events to instruments with sample-accurate timing
- Integration test passes (load SongModel, build graph, schedule events, render audio)

---

## 🔧 Phase 2 Tasks

### Task 1: Update Instruments to Use InstrumentDSP (3-4 days)

#### 1.1 NexSynthDSP Refactor (1 day)
**File:** `instruments/Nex_synth/src/dsp/NexSynthDSP.h`

**Changes:**
```cpp
// Before:
class NexSynthDSP {
    // Custom interface
};

// After:
#include "instrument/dsp/InstrumentDSP.h"
class NexSynthDSP : public DSP::InstrumentDSP {
    // Implement all required virtual methods
public:
    bool prepare(double sampleRate, int blockSize) override;
    void reset() override;
    void process(float** outputs, int numChannels, int numSamples) override;
    void handleEvent(const DSP::ScheduledEvent& event) override;
    float getParameter(const char* paramId) const override;
    void setParameter(const char* paramId, float value) override;
    bool savePreset(char* jsonBuffer, int jsonBufferSize) const override;
    bool loadPreset(const char* jsonData) override;
    int getActiveVoiceCount() const override;
    int getMaxPolyphony() const override;
    const char* getInstrumentName() const override;
    const char* getInstrumentVersion() const override;
};
```

**Testing:**
- Verify all existing tests still pass
- Test parameter get/set
- Test preset save/load
- Test event handling

#### 1.2 SamSamplerDSP Refactor (1 day)
**File:** `instruments/Sam_sampler/src/dsp/SamSamplerDSP.h`

**Changes:** Same pattern as NexSynthDSP

**Testing:**
- Verify all existing tests still pass
- Test SF2 loading with new interface
- Test granular synthesis with events

#### 1.3 LocalGalDSP Refactor (1 day)
**File:** `instruments/LOCAL_GAL/src/dsp/LocalGalDSP.h`

**Changes:** Same pattern as NexSynthDSP

**Testing:**
- Verify all existing tests still pass
- Test 5D feel vector synthesis
- Test modulation system

#### 1.4 KaneMarcoDSP Refactor (1 day)
**Files:** `instruments/kane_marco/src/dsp/KaneMarcoAetherDSP.h`, `KaneMarcoAetherStringDSP.h`

**Changes:** Same pattern for both Aether and AetherString

**Testing:**
- Verify all existing tests still pass
- Test sympathetic string resonance
- Test string physics

---

### Task 2: Implement GraphBuilder (2 days)

**File:** `routing/GraphBuilder.cpp`

**Implementation Steps:**

#### 2.1 Parse SongModel.mixGraph (4 hours)
```cpp
AudioGraph GraphBuilder::buildFrom(const SongModel_v1& model) {
    AudioGraph graph;

    // Extract tracks
    for (int i = 0; i < model.trackCount; ++i) {
        GraphNode trackNode = createTrackNode(model, i);
        graph.nodes.push_back(trackNode);
    }

    // Extract buses
    for (int i = 0; i < model.busCount; ++i) {
        GraphNode busNode = createBusNode(model, i);
        graph.nodes.push_back(busNode);
    }

    // Create master
    GraphNode masterNode = createMasterNode(model);
    graph.masterId = masterNode.id;
    graph.nodes.push_back(masterNode);

    // Create connections
    for (auto& track : graph.nodes) {
        if (track.type == NodeType::TRACK) {
            // Connect to master or bus
            graph.connections.push_back(
                createConnection(track.id, masterNode.id)
            );

            // Add sends
            for (int sendIndex : model.tracks[trackIndex].sends) {
                graph.connections.push_back(
                    createSendConnection(track.id, buses[sendIndex].id)
                );
            }
        }
    }

    // Validate
    if (!validate(graph)) {
        lastError_ = "Graph validation failed";
        return AudioGraph(); // Return empty graph
    }

    return graph;
}
```

#### 2.2 Implement Validation (2 hours)
```cpp
bool GraphBuilder::validate(const AudioGraph& graph) const {
    if (!checkMasterExists(graph)) {
        lastError_ = "Master node not found";
        return false;
    }

    if (!checkAllConnectionsValid(graph)) {
        lastError_ = "Invalid connection (node not found)";
        return false;
    }

    if (checkForCycles(graph)) {
        lastError_ = "Cycle detected in graph";
        return false;
    }

    return true;
}

bool GraphBuilder::checkForCycles(const AudioGraph& graph) const {
    std::set<std::string> visited;
    std::set<std::string> recStack;
    bool hasCycle = false;

    for (const auto& node : graph.nodes) {
        if (visited.find(node.id) == visited.end()) {
            dfsCycleDetect(graph, node.id, visited, recStack, hasCycle);
            if (hasCycle) return true;
        }
    }

    return false;
}
```

#### 2.3 Implement Hot Reload (2 hours)
```cpp
AudioGraph GraphBuilder::rebuildFrom(const SongModel_v1& model,
                                     const AudioGraph& previousGraph) {
    // Build new graph
    AudioGraph newGraph = buildFrom(model);

    // Preserve DSP processors where possible
    for (auto& newNode : newGraph.nodes) {
        auto oldNode = previousGraph.getNode(newNode.id);
        if (oldNode && oldNode->dspProcessor) {
            newNode.dspProcessor = oldNode->dspProcessor; // Reuse
        }
    }

    return newGraph;
}
```

**Testing:**
- Unit tests for graph building
- Unit tests for cycle detection
- Unit tests for validation
- Integration test with real SongModel

---

### Task 3: Implement SongModelAdapter (1 day)

**File:** `integration/SongModelAdapter.cpp`

**Implementation Steps:**

#### 3.1 Load SongModel (2 hours)
```cpp
bool SongModelAdapter::loadSongModel(const SongModel_v1& model) {
    // Validate first
    if (!validate(model)) {
        lastError_ = "SongModel validation failed";
        return false;
    }

    // Extract data
    extractTracks(model);
    extractBuses(model);
    extractMasterBus(model);
    extractTempo(model);
    extractTimeSignature(model);
    extractDuration(model);

    loaded_ = true;
    return true;
}
```

#### 3.2 Extract Tracks (2 hours)
```cpp
void SongModelAdapter::extractTracks(const SongModel_v1& model) {
    tracks_.clear();

    for (int i = 0; i < model.trackCount; ++i) {
        const Track& track = model.tracks[i];

        TrackInfo info;
        info.id = track.id;
        info.name = track.name;
        info.trackIndex = i;
        info.isMuted = track.isMuted;
        info.isSoloed = track.isSoloed;
        info.volume = track.volume;
        info.pan = track.pan;
        info.instrumentId = track.instrumentId;
        info.instrumentPreset = track.presetName;

        // Extract sends
        for (const auto& send : track.sends) {
            TrackInfo::SendInfo sendInfo;
            sendInfo.busIndex = send.busIndex;
            sendInfo.amount = send.amount;
            sendInfo.preFader = send.preFader;
            info.sends.push_back(sendInfo);
        }

        tracks_.push_back(info);
    }
}
```

**Testing:**
- Unit tests with mock SongModel
- Integration test with real SongModel from SDK
- Verify all track data extracted correctly

---

### Task 4: Implement EventQueue (1 day)

**File:** `integration/EventQueue.cpp`

**Implementation Steps:**

#### 4.1 Schedule Events (2 hours)
```cpp
bool EventQueue::scheduleEvent(const QueuedEvent& event) {
    // Quantize if enabled
    double scheduledTime = quantization_ > 0.0
        ? quantizeTime(event.time)
        : event.time;

    QueuedEvent queuedEvent = event;
    queuedEvent.time = scheduledTime;
    queuedEvent.sampleIndex = static_cast<uint64_t>(scheduledTime * sampleRate_);

    events_.push(queuedEvent);
    return true;
}
```

#### 4.2 Process Events (2 hours)
```cpp
void EventQueue::processEvents(
    double currentTime,
    const std::map<std::string, DSP::InstrumentDSP*>& instruments)
{
    // Process all events with time <= currentTime
    while (!events_.empty() && events_.top().time <= currentTime) {
        QueuedEvent queuedEvent = events_.top();
        events_.pop();

        // Find target instrument
        auto it = instruments.find(queuedEvent.targetTrackId);
        if (it != instruments.end()) {
            DSP::InstrumentDSP* instrument = it->second;

            // Convert to DSP event and deliver
            DSP::ScheduledEvent dspEvent = convertToDSPEvent(queuedEvent);
            instrument->handleEvent(dspEvent);
        }
    }

    currentTime_ = currentTime;
}
```

**Testing:**
- Unit tests for event scheduling
- Unit tests for event processing
- Test timing accuracy (sample-accurate)
- Test quantization
- Integration test with instruments

---

### Task 5: Integration Testing (2-3 days)

#### 5.1 End-to-End Test (1 day)
**File:** `tests/integration/SongModelPlaybackTest.cpp`

**Test Steps:**
1. Load SongModel from SDK
2. Build graph using GraphBuilder
3. Instantiate instruments for each track
4. Schedule events using EventQueue
5. Render audio offline
6. Verify output matches expected

```cpp
TEST(SongModelPlayback, BasicPlayback) {
    // Load SongModel
    SongModelAdapter adapter;
    ASSERT_TRUE(adapter.loadSongModel(testSongModel));

    // Build graph
    GraphBuilder builder;
    AudioGraph graph = builder.buildFrom(testSongModel);
    ASSERT_TRUE(graph.isValid());

    // Create instruments
    std::map<std::string, DSP::InstrumentDSP*> instruments;
    for (const auto& trackInfo : adapter.getTracks()) {
        DSP::InstrumentDSP* instrument = createInstrument(trackInfo.instrumentId);
        instrument->prepare(48000.0, 512);
        instruments[trackInfo.id] = instrument;
    }

    // Schedule events
    EventQueue queue;
    queue.initialize(48000.0);
    for (const auto& event : testEvents) {
        queue.scheduleEvent(event);
    }

    // Render audio
    float** outputBuffers = allocateAudioBuffers(2, 48000);
    for (int sample = 0; sample < 48000; sample += 512) {
        double currentTime = sample / 48000.0;
        queue.processEvents(currentTime, instruments);

        for (auto& [trackId, instrument] : instruments) {
            instrument->process(outputBuffers, 2, 512);
        }
    }

    // Verify output
    EXPECT_TRUE(verifyAudioOutput(outputBuffers, expectedOutput));
}
```

#### 5.2 Determinism Test (1 day)
**Test:** Same SongModel + same events = same audio output (bit-accurate)

#### 5.3 Performance Test (1 day)
**Test:** CPU usage < 20% per instrument, no memory leaks

---

## 📊 Phase 2 Success Criteria

Phase 2 is complete when:
- [ ] All 4 instruments inherit from `InstrumentDSP`
- [ ] All instrument tests pass with new interface
- [ ] `GraphBuilder` builds valid graphs from `SongModel`
- [ ] `SongModelAdapter` loads and validates `SongModel`
- [ ] `EventQueue` schedules and delivers events accurately
- [ ] Integration test passes (load SongModel, build graph, render audio)
- [ ] Determinism test passes (same input = same output)
- [ ] Performance test passes (< 20% CPU, no leaks)

---

## 🎯 Next: Phase 3 (SDK Integration) & Phase 4 (Apple TV Hardening)

Phase 2 completes the structural foundation. Phases 3 and 4 will:
- Connect to real SDK (Swift/Dart)
- Implement actual event ingestion from SDK
- Apple TV performance testing
- Stability testing
- Headless render tests
- Golden audio output comparison

---

**Status:** Phase 2 plan ready, starting implementation

**Estimated Timeline:** 7-12 days total (Task 1-5)

**Priority Order:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5

**First Step:** Update NexSynthDSP to inherit from InstrumentDSP
