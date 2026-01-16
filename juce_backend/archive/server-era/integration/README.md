# Integration - SDK Adapter & Event Ingestion

**Purpose:** Bridge between Schillinger SDK and JUCE backend audio engine

## Responsibilities

The integration layer is responsible for:
- Accepting SongModel from SDK
- Accepting ScheduledEvents from SDK
- Translating SDK events to audio engine commands
- Managing event queues and timing
- Providing SDK-facing API

## Architecture

```
SDK (Swift/Dart)
    ↓ SongModel_v1
    ↓ ScheduledEvent[]
Integration Layer (C++)
    ↓ Instrument commands
    ↓ Parameter changes
    ↓ Transport control
Audio Engine
    ↓ Audio output
```

## Core Components

### SongModelAdapter

```cpp
namespace Integration {

struct SongModelAdapter {
    // Load SongModel from SDK
    bool loadSongModel(const SongModel_v1& model);

    // Extract song structure
    size_t getTrackCount() const;
    size_t getBusCount() const;
    size_t getTempoChanges() const;

    // Get track info
    TrackInfo getTrackInfo(size_t trackIndex);

    // Validate SongModel
    bool validate(const SongModel_v1& model);
};

} // namespace Integration
```

### EventQueue

```cpp
struct EventQueue {
    // Queue events for playback
    void scheduleEvent(const ScheduledEvent& event);

    // Process events for current time
    void processEvents(double currentTime);

    // Clear all events
    void clear();

    // Timing accuracy
    void setQuantization(double quantization);

private:
    std::priority_queue<ScheduledEvent> events_;
    double currentQuantization_;
};

struct ScheduledEvent {
    double time;              // Absolute time in seconds
    EventType type;           // NOTE_ON, NOTE_OFF, PARAM_CHANGE, etc.
    size_t targetTrack;       // Track index
    size_t targetBus;         // Bus index (if applicable)
    union {
        struct {
            int noteNumber;
            float velocity;
        } note;
        struct {
            const char* parameterId;
            float value;
        } parameter;
        struct {
            bool playing;
            double tempo;
        } transport;
    } data;
};
```

### EngineController

```cpp
struct EngineController {
    // Lifecycle
    bool initialize(double sampleRate, size_t bufferSize);
    void shutdown();

    // Song loading
    bool loadSong(const SongModel_v1& model);

    // Transport control
    void play();
    void stop();
    void pause();
    void seek(double timeInSeconds);

    // Real-time control
    void setTempo(double tempo);
    void setTimeSignature(int upper, int lower);

    // Processing
    void process(float** outputs, size_t numChannels, size_t numSamples);

    // State queries
    bool isPlaying() const;
    double getCurrentTime() const;
    double getTempo() const;

private:
    AudioGraph graph_;
    EventQueue eventQueue_;
    std::vector<std::unique_ptr<InstrumentDSP>> instruments_;
    std::vector<std::unique_ptr<ConsoleChannelDSP>> consoles_;
    double currentTime_;
    bool isPlaying_;
};

} // namespace Integration
```

## File Organization

```
integration/
├── SongModelAdapter.h         # SDK SongModel translation
├── SongModelAdapter.cpp
├── EventQueue.h               # Event scheduling and timing
├── EventQueue.cpp
├── EngineController.h         # Main engine API
├── EngineController.cpp
├── EventType.h                # Event type definitions
├── TrackInfo.h                # Track information structures
└── README.md
```

## Event Types

```cpp
enum class EventType {
    NOTE_ON,           // Start a note
    NOTE_OFF,          // Stop a note
    PARAM_CHANGE,      // Change parameter value
    TEMPO_CHANGE,      // Change tempo
    TIME_SIGNATURE,    // Change time signature
    TRANSPORT_START,   // Start playback
    TRANSPORT_STOP,    // Stop playback
    TRANSPORT_SEEK,    // Seek to time
    BANK_SELECT,       // Select preset bank
    PROGRAM_CHANGE,    // Change program/preset
    PITCH_BEND,        // Pitch bend
    CHANNEL_PRESSURE,  // Aftertouch
    CONTROL_CHANGE     // MIDI CC
};
```

## SDK Integration Flow

### 1. Initialization
```swift
// SDK side (Swift/Dart)
let engine = EngineController()
engine.initialize(sampleRate: 48000, bufferSize: 512)
```

### 2. Load Song
```swift
// SDK provides SongModel
let songModel = SongModel_v1(...) // from SDK
engine.loadSong(songModel)
```

### 3. Schedule Events
```swift
// SDK schedules events
events = [
    ScheduledEvent(time: 0.0, type: .TRANSPORT_START),
    ScheduledEvent(time: 0.0, type: .NOTE_ON, note: 60, velocity: 0.8),
    ScheduledEvent(time: 1.0, type: .NOTE_OFF, note: 60),
    // ...
]
engine.scheduleEvents(events)
```

### 4. Playback
```swift
// SDK controls transport
engine.play()
// Audio processing happens in real-time
engine.stop()
```

## Rules

- **Deterministic playback** - Same SongModel = same audio output
- **No UI in integration layer** - Pure data translation
- **Real-time safe** - No allocations in audio thread
- **Sample-accurate timing** - Events scheduled at sample precision
- **No platform code** - Platform-specifics in platform/ layer
- **Thread-safe** - SDK calls from main thread, audio from audio thread

## Testing

Required tests:
- SongModel loading validation
- Event scheduling accuracy (sample precision)
- Event queue performance (1000+ events)
- Deterministic playback (same input = same output)
- Transport control (play, stop, seek)
- Tempo changes (smooth transitions)
- Thread safety (concurrent SDK calls + audio thread)

## Status

- [ ] Folder structure created
- [ ] SongModelAdapter interface designed
- [ ] EventQueue implemented
- [ ] EngineController implemented
- [ ] SDK bridge tested
- [ ] SongModel-driven playback verified
- [ ] Headless render tests passing

## Notes

Integration layer is NOT:
- DSP implementation (that's in instruments/, effects/, console/)
- Routing topology (that's in routing/)
- Platform specifics (that's in platform/)
- UI logic (that's in SDK or Flutter app)

Integration layer IS:
- SDK ↔ Audio Engine bridge
- SongModel translation
- Event scheduling and timing
- Transport control
- Parameter mapping

Created: December 30, 2025
Source: JUCE Backend Handoff Directive
