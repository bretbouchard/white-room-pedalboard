# JUCE House Band - Audio Engine Performer

## Overview

The **House Band** is the pure audio rendering engine for White Room. It has **NO UI** - all controls live in the Swift frontend. JUCE is purely the performer: it receives orders (SongState), gets direction (PerformanceState), and makes sound (RenderedSongGraph).

**Analogy**: Think of the House Band as the actual musicians in a recording studio. The Swift frontend is the producer calling the shots from the control room. The House Band just plays what they're told.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Swift Frontend (Control Room)             │
│  - Order Song UI                                            │
│  - Performance Editor                                        │
│  - Orchestration Console                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ FFI Bridge
                       │ (SongState + PerformanceState)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   JUCE House Band (Performer)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HouseBand.cpp                                       │   │
│  │  - Load SongState                                    │   │
│  │  - Select PerformanceState                           │   │
│  │  - Project (ProjectionEngine)                        │   │
│  │  - Render RenderedSongGraph                          │   │
│  │  - Switch Performances (Crossfade)                   │   │
│  │  - Transport (Play/Pause/Seek/Loop)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ProjectionEngine.cpp                                │   │
│  │  - projectSong() → RenderedSongGraph                 │   │
│  │  - projectSongBlend() → Crossfade                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Instruments (LocalGal, NexSynth, etc.)              │   │
│  │  - Render notes from graph                           │   │
│  │  - Apply performance parameters                      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ Audio Output
                       ▼
                    (Speakers)
```

## Core Responsibilities

### 1. Load Song
- **Input**: `SongState` (from disk, loaded via FFI)
- **Action**: Validate song structure
- **Output**: Ready to project

```cpp
bool loadSong(const SongState& song, const juce::String& performanceId);
```

### 2. Select Performance
- **Input**: `PerformanceState` (one of many parallel realizations)
- **Action**: Choose which performance universe to play
- **Output**: Performance configuration applied

```cpp
bool loadPerformance(const PerformanceState& performance);
```

### 3. Project
- **Input**: `SongState` + `PerformanceState`
- **Action**: Call `ProjectionEngine::projectSong()`
- **Output**: `RenderedSongGraph` (audio-ready graph)

```cpp
auto result = projectionEngine->projectSong(songState, performance, config);
```

### 4. Render
- **Input**: `RenderedSongGraph`
- **Action**: Play in real-time via `processAudio()`
- **Output**: Audio buffer (to speakers)

```cpp
void processAudio(juce::AudioBuffer<float>& buffer,
                 juce::MidiBuffer& midiBuffer);
```

### 5. Switch Performances
- **Input**: Target performance ID + crossfade duration
- **Action**: Call `ProjectionEngine::projectSongBlend()`
- **Output**: Smooth crossfade between performances

```cpp
bool switchToPerformance(const juce::String& performanceId,
                        double crossfadeSeconds = 2.0);
```

### 6. Transport Controls
- **Play/Pause/Stop**: Control playback state
- **Seek**: Move to any position
- **Loop**: Repeat regions
- **Speed**: Variable playback speed

```cpp
void play();
void pause();
void stop();
void seekTo(double seconds);
void setLoop(bool enabled, double start, double end);
```

## Real-Time Safety

**CRITICAL**: All audio thread operations are **lock-free** and **non-blocking**.

### Thread Safety Model

```
┌─────────────────────┐
│   UI Thread         │  ← loadSong, switchToPerformance, seekTo
│   (Swift calls)     │     (Lock-free atomic writes)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Atomic State       │  ← Shared pointers (lock-free reads)
│  (currentSong,      │     (Audio thread never blocks)
│   currentPerformance,│
│   activeGraph)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Audio Thread      │  ← processAudio (real-time rendering)
│   (JUCE callback)   │     (Lock-free atomic reads)
└─────────────────────┘
```

### Atomic State Access

```cpp
// UI Thread: Update state (lock-free atomic write)
auto songCopy = std::make_shared<SongState>(song);
auto* oldSongPtr = currentSong.load();
delete oldSongPtr;
currentSong.store(new std::shared_ptr<SongState>(songCopy));

// Audio Thread: Read state (lock-free atomic read)
auto songPtr = currentSong.load();
if (*songPtr != nullptr) {
    // Use **songPtr
}
```

## Performance Switching

### Crossfade Architecture

```
Performance A (Current)         Performance B (Target)
        │                               │
        │                               │
        └───────────────┬───────────────┘
                        │
                   Equal-Power
                   Crossfade Curve
                        │
                        ▼
                 Output Audio
```

### Equal-Power Crossfade

Prevents volume dip when switching performances:

```cpp
double gainA = std::cos(blend * juce::MathConstants<double>::pi / 2.0);
double gainB = std::cos((1.0 - blend) * juce::MathConstants<double>::pi / 2.0);

// When blend = 0.0: gainA = 1.0, gainB = 0.0 (100% A)
// When blend = 0.5: gainA = 0.707, gainB = 0.707 (-3dB each)
// When blend = 1.0: gainA = 0.0, gainB = 1.0 (100% B)
```

### Switching Workflow

```cpp
// 1. Schedule switch
houseBand.switchToPerformance("ambient_techno", 2.0);  // 2-second crossfade

// 2. Audio thread automatically progresses crossfade
//    (blend factor: 0.0 → 1.0 over 2 seconds)

// 3. When complete, target becomes new current
//    (graphB becomes graphA, crossfade disabled)
```

## Transport System

### Position Tracking

```cpp
struct TransportState {
    std::atomic<bool> isPlaying;
    std::atomic<bool> isLooping;
    std::atomic<double> currentPosition;  // seconds
    std::atomic<double> loopStart;        // seconds
    std::atomic<double> loopEnd;          // seconds
    std::atomic<double> playbackSpeed;    // 1.0 = normal
};
```

### Loop Handling

```cpp
void updatePosition(int samplesToProcess) {
    double position = transport.currentPosition.load();
    double speed = transport.playbackSpeed.load();
    double secondsDelta = (samplesToProcess / sampleRate) * speed;

    if (transport.isLooping.load()) {
        position += secondsDelta;
        if (position >= transport.loopEnd.load()) {
            position = transport.loopStart.load();  // Wrap
        }
    } else {
        position += secondsDelta;
        if (position >= songDuration) {
            transport.isPlaying.store(false);  // Stop at end
        }
    }

    transport.currentPosition.store(position);
}
```

## Integration with Projection Engine

### Single Performance Projection

```cpp
ProjectionConfig config;
config.validateGraph = false;  // Skip validation for realtime
config.includeAutomation = true;

auto result = projectionEngine->projectSong(songState, performance, config);
if (result.isOk()) {
    RenderedSongGraph* graph = result.getResult()->renderGraph.get();
    // Use graph for rendering
}
```

### Blended Performance Projection

```cpp
auto result = projectionEngine->projectSongBlend(
    songState,
    performanceA,  // t = 0
    performanceB,  // t = 1
    blendFactor,   // 0.0 to 1.0
    config
);
```

## Error Handling

### Error State

```cpp
// Thread-safe error reporting
void setError(const juce::String& error) {
    auto* errorPtr = lastError.load();
    delete errorPtr;
    lastError.store(new juce::String(error));
}

// Check for errors
juce::String error = houseBand.getLastError();
if (error.isNotEmpty()) {
    // Handle error
}
```

## Usage Example

```cpp
// Initialize
HouseBandConfig config;
config.sampleRate = 44100.0;
config.maxSamplesPerBlock = 512;
config.numOutputChannels = 2;

HouseBand houseBand(config);
houseBand.initialize(config);
houseBand.prepareToPlay(44100.0, 512);

// Load song
SongState song = loadSongFromFile("song.json");
houseBand.loadSong(song, "solo_piano");

// Play
houseBand.play();

// Switch performance (crossfade over 2 seconds)
houseBand.switchToPerformance("ambient_techno", 2.0);

// Seek to middle
houseBand.seekTo(song.duration / 2.0);

// Enable loop
houseBand.setLoop(true, 30.0, 60.0);

// Audio callback (called by JUCE)
void processAudio(juce::AudioBuffer<float>& buffer) {
    houseBand.processAudio(buffer, midiBuffer);
}
```

## File Structure

```
juce_backend/
├── include/audio/
│   ├── HouseBand.h           # Header file
│   ├── ProjectionEngine.h    # Projection engine
│   └── PerformanceRenderer.h  # Bar-boundary switching
├── src/audio/
│   ├── HouseBand.cpp         # Implementation
│   └── ProjectionEngine.cpp  # Projection implementation
└── docs/
    └── HOUSE_BAND.md         # This file
```

## Design Decisions

### Why No UI in JUCE?

1. **Separation of Concerns**: JUCE does audio, Swift does UI
2. **Code Sharing**: Swift UI runs on iOS/tvOS/macOS, JUCE is platform-agnostic
3. **Real-Time Safety**: UI code on audio thread causes glitches
4. **Modern UX**: SwiftUI provides better UX than JUCE GUI

### Why Lock-Free Atomics?

1. **Real-Time Safety**: Audio thread never blocks
2. **Performance**: Atomic reads are faster than locks
3. **Correctness**: No deadlock risk
4. **Scalability**: Multiple readers, single writer

### Why Equal-Power Crossfade?

1. **No Volume Dip**: Linear crossfade causes -6dB dip at midpoint
2. **Smooth Transitions**: Constant power during crossfade
3. **Professional Standard**: Used in all professional DAWs

## Future Enhancements

- [ ] Sample-accurate rendering (currently note-level)
- [ ] Automation playback
- [ ] Plugin hosting (VST3/AU)
- [ ] Stem export
- [ ] MIDI learn
- [ ] Performance profiling

## Related Documentation

- `ProjectionEngine.h` - Core projection engine
- `PerformanceRenderer.h` - Bar-boundary switching
- `UndoState.h` - Thread-safe state management
- `SongState` - Song data structure
- `PerformanceState_v1.h` - Performance data structure

## Summary

The House Band is the **heart of White Room's audio engine**. It's a pure, focused, real-time audio rendering engine with no UI distractions. It does one thing extremely well: **perform songs**.

**Key Points**:
- ✅ Pure audio engine (NO UI)
- ✅ Real-time safe (lock-free atomics)
- ✅ Performance switching with crossfade
- ✅ Complete transport controls
- ✅ Integrates with ProjectionEngine
- ✅ Swift frontend via FFI bridge

**House Band Philosophy**: "We're the band. Just tell us what to play."
