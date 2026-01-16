# Transport Control Implementation Guide

## Overview

The Transport Control feature provides comprehensive playback controls for White Room, including play/pause/stop, position seeking, tempo adjustment, and loop controls. This document describes the implementation architecture, API usage, and integration points.

## Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Swift UI Layer                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  TransportControlsView.swift                     │  │
│  │  - SwiftUI interface components                  │  │
│  │  - TransportManager (ObservableObject)           │  │
│  │  - Keyboard shortcuts integration                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    SDK Layer                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  TransportManager.ts                             │  │
│  │  - TypeScript/JavaScript API                     │  │
│  │  - Event-driven state management                 │  │
│  │  - State polling from audio engine               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  JUCE Backend (FFI)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  transport_control.cpp                           │  │
│  │  - C API transport control functions             │  │
│  │  - Atomic state operations                       │  │
│  │  - Lock-free command queue                       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. SDK: TransportManager.ts

**Location:** `/Users/bretbouchard/apps/schill/white_room/sdk/src/transport/TransportManager.ts`

**Features:**
- Event-driven state management using EventTarget
- Real-time state polling from audio engine (~60fps)
- Thread-safe atomic operations
- Comprehensive error handling
- Event dispatching for all state changes

**API:**

```typescript
// Create transport manager
const transport = new TransportManager(audioEngine);

// Playback controls
transport.play();
transport.pause();
transport.stop();
const isPlaying = transport.togglePlay();

// Position controls
transport.setPosition(16.5); // Set to beat 16.5
transport.seekTo(32.0);      // Alias for setPosition
transport.moveBy(4.0);       // Move forward 4 beats
const position = transport.getPosition();

// Tempo controls
transport.setTempo(140.0);   // Set to 140 BPM
transport.adjustTempo(10);   // Increase by 10 BPM
const tempo = transport.getTempo();

// Loop controls
transport.setLoopEnabled(true);
transport.setLoopRange(0, 32); // Loop beats 0-32
const isLooping = transport.toggleLoop();

// Time signature
transport.setTimeSignature(3, 4); // 3/4 time

// State accessors
const state = transport.getState();
const isPlaying = transport.isPlaying();
const isStopped = transport.isStopped();
const isPaused = transport.isPaused();
```

**Events:**

```typescript
// Listen to state changes
transport.addEventListener('play', (event) => {
  console.log('Started playing');
});

transport.addEventListener('pause', (event) => {
  console.log('Paused');
});

transport.addEventListener('stop', (event) => {
  console.log('Stopped');
});

transport.addEventListener('seek', (event) => {
  console.log('Position changed');
});

transport.addEventListener('tempo', (event) => {
  console.log('Tempo changed');
});

transport.addEventListener('loop', (event) => {
  console.log('Loop state changed');
});

transport.addEventListener('timeSignature', (event) => {
  console.log('Time signature changed');
});

transport.addEventListener('state', (event) => {
  console.log('Previous:', event.previousState);
  console.log('Current:', event.currentState);
  console.log('Changes:', event.changes);
});
```

### 2. JUCE Backend: transport_control.cpp

**Location:** `/Users/bretbouchard/apps/schill/white_room/juce_backend/src/transport/transport_control.cpp`

**FFI Functions:**

```cpp
// Playback controls
sch_result_t sch_transport_play(sch_engine_handle engine);
sch_result_t sch_transport_pause(sch_engine_handle engine);
sch_result_t sch_transport_stop(sch_engine_handle engine);
sch_result_t sch_transport_toggle_play(sch_engine_handle engine);

// Position controls
sch_result_t sch_transport_set_position(sch_engine_handle engine, double position);
sch_result_t sch_transport_get_position(sch_engine_handle engine, double* out_position);
sch_result_t sch_transport_move_by(sch_engine_handle engine, double delta);

// Tempo controls
sch_result_t sch_transport_set_tempo(sch_engine_handle engine, double tempo);
sch_result_t sch_transport_get_tempo(sch_engine_handle engine, double* out_tempo);
sch_result_t sch_transport_adjust_tempo(sch_engine_handle engine, double delta);

// Loop controls
sch_result_t sch_transport_set_loop_enabled(sch_engine_handle engine, bool enabled);
sch_result_t sch_transport_set_loop_range(sch_engine_handle engine, double start, double end);
sch_result_t sch_transport_toggle_loop(sch_engine_handle engine, bool* out_enabled);

// Time signature
sch_result_t sch_transport_set_time_signature(sch_engine_handle engine, int numerator, int denominator);
sch_result_t sch_transport_get_time_signature(sch_engine_handle engine, int* out_numerator, int* out_denominator);

// State query
sch_result_t sch_transport_get_state(sch_engine_handle engine, sch_performance_state_t* out_state);
```

**Design Principles:**
- All functions are `extern "C"` for C ABI compatibility
- Thread-safe atomic operations for transport state
- Lock-free command queue for real-time control
- Comprehensive error handling with result codes
- State persisted to song JSON for non-volatile storage

### 3. Swift UI: TransportControlsView.swift

**Location:** `/Users/bretbouchard/apps/schill/white_room/swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Components/TransportControlsView.swift`

**Components:**

#### TransportManager (Swift)

```swift
public class TransportManager: ObservableObject {
    public static let shared = TransportManager()

    @Published public var isPlaying: Bool = false
    @Published public var isStopped: Bool = true
    @Published public var isPaused: Bool = false
    @Published public var position: Double = 0.0
    @Published public var tempo: Double = 120.0
    @Published public var timeSignature: TimeSignature = .fourFour
    @Published public var loopEnabled: Bool = false
    @Published public var loopStart: Double = 0.0
    @Published public var loopEnd: Double = 32.0

    // Playback controls
    public func play()
    public func pause()
    public func stop()
    @discardableResult public func togglePlay() -> Bool

    // Position controls
    public func setPosition(_ position: Double)
    public func moveBy(_ delta: Double)

    // Tempo controls
    public func setTempo(_ tempo: Double)
    public func adjustTempo(_ delta: Double)

    // Loop controls
    public func setLoopEnabled(_ enabled: Bool)
    public func setLoopRange(start: Double, end: Double)
    @discardableResult public func toggleLoop() -> Bool

    // Time signature
    public func setTimeSignature(_ timeSignature: TimeSignature)
}
```

#### TransportControlsView

```swift
struct TransportControlsView: View {
    @StateObject private var transport = TransportManager.shared

    var body: some View {
        VStack(spacing: 20) {
            // Playback controls (play/pause/stop, forward/backward, loop)
            playbackControlsSection

            // Position display and slider
            positionSection

            // Tempo control
            tempoSection

            // Time signature picker
            timeSignatureSection
        }
    }
}
```

#### TransportPositionSlider

```swift
struct TransportPositionSlider: View {
    @ObservedObject var transport: TransportManager

    var body: some View {
        Slider(
            value: Binding(
                get: { transport.position },
                set: { transport.setPosition($0) }
            ),
            in: 0...Double(transport.loopEnd),
            step: 0.01
        )
    }
}
```

## Keyboard Shortcuts

### Integration

```swift
struct ContentView: View {
    var body: some View {
        VStack {
            // Main content
            TimelineView()

            // Transport controls
            TransportControlsView()
        }
        .transportShortcuts() // Add keyboard shortcuts
    }
}
```

### Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `Escape` | Stop |
| `L` | Toggle Loop |

## Testing

### SDK Tests

**Location:** `/Users/bretbouchard/apps/schill/white_room/sdk/tests/transport/TransportManager.test.ts`

**Run tests:**
```bash
cd sdk
npm test
```

**Coverage:**
- Initialization and state management
- Playback controls (play/pause/stop/toggle)
- Position controls (set/seek/move)
- Tempo controls (set/adjust/clamping)
- Loop controls (enable/range/toggle)
- Time signature validation
- Event handling
- Edge cases and integration workflows

### Swift Tests

**Location:** `/Users/bretbouchard/apps/schill/white_room/swift_frontend/WhiteRoomiOS/Tests/TransportControlsViewTests.swift`

**Run tests:**
```bash
cd swift_frontend/WhiteRoomiOS
swift test
```

**Coverage:**
- TransportManager state and methods
- TimeSignature equality and hashing
- UI component creation
- Complete playback workflows
- Keyboard shortcut workflows

## Usage Examples

### Basic Playback

```typescript
// Create transport manager
const transport = new TransportManager(audioEngine);

// Start playback
transport.play();

// Pause
transport.pause();

// Stop and reset
transport.stop();
```

### Seeking

```typescript
// Seek to specific position
transport.setPosition(16.5); // Beat 16.5

// Move by delta
transport.moveBy(4);  // Forward 4 beats
transport.moveBy(-2); // Backward 2 beats

// Get current position
const currentPos = transport.getPosition();
console.log(`Current position: ${currentPos} beats`);
```

### Tempo Control

```typescript
// Set specific tempo
transport.setTempo(140.0); // 140 BPM

// Adjust gradually
transport.adjustTempo(10); // Increase by 10 BPM
transport.adjustTempo(-5); // Decrease by 5 BPM

// Tempo is automatically clamped to 1-999 BPM
```

### Loop Control

```typescript
// Enable looping
transport.setLoopEnabled(true);

// Set loop range (beats 8-24)
transport.setLoopRange(8.0, 24.0);

// Toggle loop
const isLooping = transport.toggleLoop();
console.log(`Loop is ${isLooping ? 'enabled' : 'disabled'}`);
```

### Event Handling

```typescript
// Listen to play events
transport.addEventListener('play', () => {
  console.log('Playback started');
  updateUIState();
});

// Listen to position changes
transport.addEventListener('seek', (event) => {
  const position = transport.getPosition();
  updatePositionDisplay(position);
});

// Listen to tempo changes
transport.addEventListener('tempo', (event) => {
  const tempo = transport.getTempo();
  updateTempoDisplay(tempo);
});

// Listen to all state changes
transport.addEventListener('state', (event) => {
  console.log('State changed:', event.changes);
  updateUI(event.currentState);
});
```

### Swift UI Integration

```swift
struct ContentView: View {
    @StateObject private var transport = TransportManager.shared

    var body: some View {
        VStack {
            // Your main content
            TimelineView()

            // Transport controls
            TransportControlsView()
        }
        .transportShortcuts()
    }
}
```

## State Management

### State Structure

```typescript
interface TransportState {
  isPlaying: boolean;      // Currently playing
  isStopped: boolean;      // Stopped (position reset)
  isPaused: boolean;       // Paused (position maintained)
  position: number;        // Current position in beats
  tempo: number;           // Tempo in BPM (1-999)
  timeSignature: {
    numerator: number;     // Beats per measure (1-32)
    denominator: number;   // Beat unit (1,2,4,8,16,32)
  };
  loopEnabled: boolean;    // Loop state
  loopStart: number;       // Loop start in beats
  loopEnd: number;         // Loop end in beats
}
```

### State Updates

- **SDK Layer**: Polls audio engine at ~60fps for atomic state reads
- **Swift Layer**: Uses `@Published` properties for automatic UI updates
- **JUCE Backend**: Uses `std::atomic` for thread-safe state access

### Event Flow

```
User Action (Swift UI)
    │
    ▼
TransportManager Method (Swift)
    │
    ▼
FFI Function Call (C++)
    │
    ▼
Atomic State Update (JUCE)
    │
    ▼
Event Callback (C++)
    │
    ▼
State Polling (SDK)
    │
    ▼
Event Dispatch (TypeScript)
    │
    ▼
UI Update (Swift)
```

## Performance Considerations

### Memory

- **TransportManager**: Single instance (singleton pattern in Swift)
- **State updates**: Immutable state objects prevent unintended mutations
- **Event listeners**: Clean up with `removeEventListener` when done

### CPU

- **State polling**: 60fps (~16ms intervals) for smooth UI updates
- **Atomic operations**: Lock-free reads prevent audio thread blocking
- **Command queue**: Lock-free SPSC queue for real-time control

### Thread Safety

- **Audio thread**: Atomic state writes (real-time priority)
- **UI thread**: State polling and event dispatch (main thread)
- **Command queue**: Lock-free for thread-safe communication

## Troubleshooting

### Issue: Transport not responding

**Solution:**
1. Check if audio engine is initialized
2. Verify FFI calls are succeeding
3. Check console for error messages
4. Ensure state update timer is running

### Issue: Position not updating

**Solution:**
1. Verify state polling is active (60fps timer)
2. Check atomic state reads in audio engine
3. Ensure position is being updated on audio thread
4. Check event listeners are properly attached

### Issue: Tempo changes not applying

**Solution:**
1. Verify tempo is within valid range (1-999 BPM)
2. Check FFI call is succeeding
3. Ensure atomic store is happening
4. Verify state polling is reading updated value

### Issue: Loop not working

**Solution:**
1. Verify loop range is valid (start < end)
2. Check loop is enabled
3. Ensure position is within loop range
4. Verify FFI calls are storing loop state

## Future Enhancements

### Planned Features

1. **Tap Tempo**: Calculate tempo from user taps
2. **Punch In/Out**: Automated recording regions
3. **Cycle Modes**: Different loop behaviors (repeat, ping-pong, etc.)
4. **Markers**: Named position markers for quick navigation
5. **Count-in**: Configurable count-in before recording
6. **Metronome**: Audible click track
7. **Time Display**: Show time in addition to beats
8. **Nudge**: Fine position adjustment (±1 sample)

### Performance Optimizations

1. **Adaptive polling**: Reduce frequency when idle
2. **Delta compression**: Only send changed state
3. **Batch updates**: Coalesce multiple rapid changes
4. **Predictive UI**: Interpolate between updates

## References

- **JUCE FFI**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/src/ffi/sch_engine_ffi.cpp`
- **Keyboard Navigation**: `/Users/bretbouchard/apps/schill/white_room/swift_frontend/SwiftFrontendShared/Accessibility/KeyboardNavigation.swift`
- **JUCE Transport Component**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/include/ui/TransportControlsComponent.h`

## Summary

The Transport Control feature provides a complete, professional transport system for White Room with:

- ✅ Play/pause/stop controls
- ✅ Sample-accurate position seeking
- ✅ Tempo adjustment (1-999 BPM)
- ✅ Loop range controls
- ✅ Time signature management
- ✅ Keyboard shortcuts
- ✅ Comprehensive testing
- ✅ Thread-safe atomic operations
- ✅ Event-driven state management
- ✅ Real-time performance

All requirements from issue white_room-321 have been successfully implemented.
