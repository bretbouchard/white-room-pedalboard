# Engine Execution Language

**Audio Engine Terminology - Architectural Boundary**

**Purpose:** Prevent drift from "execution engine" back to "DAW backend"
**Status:** Enforced in all new JUCE code
**Audience:** All engine developers

---

## Core Principle

The JUCE backend is an **audio execution engine** - not a DAW, not a server, not a composition tool.

**We execute schedules. We do not manage songs.**

---

## Approved Terminology ✅

**Use these terms in ALL new code:**

| Concept | Approved Term | Examples |
|---------|---------------|----------|
| Audio path | `lane` | `lane_`, `voiceBusLane`, `inputLane` |
| Audio events | `event` | `noteEvent_`, `automationEvent_` |
| Audio data | `buffer` | `audioBuffer_`, `processBuffer()` |
| Parameter changes | `parameter` | `setParameter()`, `parameter_` |
| Time management | `schedule` | `schedule_`, `eventSchedule` |
| Audio source | `voiceBus` | `voiceBus_`, `voiceBusCount` |
| Host integration | `audioHost` | `audioHost_`, `hostCallback` |

---

## Deprecated Terminology ❌

**Do NOT use these terms in new code:**

| Deprecated Concept | Deprecated Term | Why |
|-------------------|-----------------|-----|
| Audio path | `track` | Implies DAW timeline |
| Audio events | `note`, `midi` | Too specific, use `event` |
| Composition | `song`, `composition` | We execute, we don't compose |
| Timeline | `timeline`, `arrangement` | DAW concept |
| Transport | `transport`, `playhead` | Host's job, not engine's |
| Music theory | `harmony`, `rhythm` | Schillinger's domain |
| Server-era | `backendServer`, `client` | No longer a server |

---

## Code Examples

### ✅ Correct: Execution Language

```cpp
class ExecutionLane {
public:
    void processBuffer(AudioBuffer<float>& buffer);
    void scheduleEvent(const Event& event, int sampleOffset);
    void setParameter(const Parameter& param);

private:
    int laneIndex_;
    std::vector<Event> eventSchedule_;
};
```

### ❌ Wrong: DAW Language

```cpp
class Track {  // ❌ Use "ExecutionLane" instead
public:
    void process(AudioBuffer<float>& buffer);  // ❌ Use "processBuffer"
    void addNote(const MIDINote& note);  // ❌ Use "scheduleEvent"
    void setTransportState(bool playing);  // ❌ Host controls this

private:
    int trackNumber_;  // ❌ Use "laneIndex"
    std::vector<MIDINote> noteList_;  // ❌ Use "eventSchedule"
};
```

---

## Common Patterns

### 1. Lane Processing

```cpp
// ✅ Correct
void VoiceBusLane::processBuffer(AudioBuffer<float>& buffer) {
    for (const auto& event : eventSchedule_) {
        if (event.sampleOffset == currentSample) {
            applyEvent(event);
        }
    }
}
```

### 2. Parameter Handling

```cpp
// ✅ Correct
void Engine::setParameter(const ParameterID& id, float value) {
    parameters_[id] = value;
    scheduleParameterUpdate(id, value);
}
```

### 3. Event Scheduling

```cpp
// ✅ Correct
void scheduleEvent(int voiceBusIndex, const Event& event, int sampleOffset) {
    lanes_[voiceBusIndex].scheduleEvent(event, sampleOffset);
}
```

---

## Schillinger Integration

**Schillinger uses its own terminology.** This is correct.

```cpp
// Schillinger domain (frontend)
int density = schillingerSystem.getDensity();
Articulation articulation = schillingerSystem.getArticulation();

// Engine domain (execution)
LaneConfig config;
config.eventSchedule = convertDensityToSchedule(density);
config.parameters_ = convertArticulationToParams(articulation);
```

**Key:** Schillinger speaks Schillinger, engine speaks execution.
**Bridge layer converts between domains.**

---

## Host Integration

**The audio host ( Reaper, Logic, etc.) is the authority.**

```cpp
// ✅ Correct: We respond to host
void AudioEngine::processBlock(AudioBuffer<float>& buffer, MidiBuffer& midiMessages) {
    // Host provides transport state
    bool isPlaying = getPlayHeadState()->isPlaying();

    // Host provides timeline position
    int64 currentPosition = getPlayHeadState()->positionInSamples;

    // We execute accordingly
    if (isPlaying) {
        processScheduledEvents(currentPosition, buffer);
    }
}
```

**We don't control transport. We execute based on transport state.**

---

## PR Review Checklist

**Before merging any PR, reviewers must check:**

### Code Review
- [ ] No `track` variables or methods
- [ ] No `song` or `composition` terminology
- [ ] No `transport` control logic
- [ ] No `harmony` or `rhythm` in engine code
- [ ] No `backendServer` or `client` references

### Terminology Check
- [ ] Uses `lane` instead of `track`
- [ ] Uses `event` instead of `note`/`midi`
- [ ] Uses `buffer` instead of `audio`
- [ ] Uses `parameter` for controls
- [ ] Uses `schedule` for timing
- [ ] Uses `voiceBus` for audio sources
- [ ] Uses `audioHost` for host integration

### Architecture Check
- [ ] Engine code doesn't manage songs
- [ ] Engine code doesn't control transport
- [ ] Engine code doesn't do music theory
- [ ] Schillinger code stays in frontend
- [ ] Bridge layer clearly defined

---

## Migration Guide (Existing Code)

**Old code using deprecated terms:** Don't rename it.

**New code:** Must use execution terminology.

**Refactoring existing code:** Only if touching it for other reasons.

**Example:**
```cpp
// If fixing a bug in TrackProcessor.cpp, rename to ExecutionLaneProcessor.cpp
// If just reading TrackProcessor.cpp to understand it, leave it alone
```

---

## Quick Reference

| I want to... | Use term... | NOT...
|--------------|-------------|--------
| Process audio | `processBuffer()` | `process()`, `processAudio()`
| Add audio | `scheduleEvent()` | `addNote()`, `addMIDI()`
| Control parameters | `setParameter()` | `setValue()`, `setControl()`
| Reference audio path | `lane` | `track`, `channel`
| Reference audio source | `voiceBus` | `track`, `instrument`
| Get time info | `schedule`, `timelinePosition` | `playhead`, `transport`
| Integrate with plugin | `audioHost` | `DAW`, `host`
| Store audio data | `buffer` | `audio`, `samples`

---

## One-Sentence Rule

**"We execute schedules of events in buffers across lanes - we don't compose songs, manage tracks, or control transport."**

---

## Enforcements

### Code Review
All PRs touching engine code MUST pass terminology checklist.

### Onboarding
New engineers MUST read this document before writing engine code.

### Architecture Review
Major features MUST review terminology before implementation.

---

## Exceptions

**Schillinger System:** Uses own terminology (density, articulation, etc.) - this is correct.

**Plugin Formats:** VST3/AU terminology (`track`, `parameter`) is OK in plugin wrappers.

**Tests:** Test names can use any terminology for clarity.

**Documentation:** Historical references to deprecated terms are OK in docs/comments.

---

## Rationale

**Why this matters:**

1. **Architectural Clarity**
   - Engine = execution
   - Schillinger = composition
   - Host = transport

2. **Mental Model**
   - Prevents confusion about responsibilities
   - Clear boundaries between domains
   - Predictable code organization

3. **Future-Proofing**
   - Engine stays execution-focused
   - Easy to integrate with new hosts
   - Easy to integrate with new frontends

---

## Next Steps

**For New Code:**
1. Read this document before writing
2. Use approved terminology
3. Pass PR review checklist

**For Existing Code:**
1. Don't rename unless touching it
2. Fix terminology when refactoring
3. Update docs when changing behavior

---

**End of Execution Language Guide**
**Status:** Enforced
**Last Updated:** December 31, 2025
**Maintainer:** Tech Lead
