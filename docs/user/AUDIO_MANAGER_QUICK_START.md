# Real AudioManager - Quick Start Guide

## Overview

The Real AudioManager provides professional-quality audio processing with real JUCE backend integration. No mock data - all operations use real audio engine.

## 5-Minute Setup

### 1. Import the Framework

```swift
import SwiftFrontendShared
```

### 2. Create AudioManager

```swift
let audioManager = AudioManager()
```

### 3. Check Ready State

```swift
if audioManager.isReady {
  print("Audio engine ready!")
}
```

### 4. Start Playback

```swift
do {
  try audioManager.startPlayback()
  print("Playing!")
} catch {
  print("Error: \(error)")
}
```

## Common Operations

### Playback Control

```swift
// Start
try audioManager.startPlayback()

// Stop
try audioManager.stopPlayback()

// Pause
try audioManager.pausePlayback()
```

### Get Current State

```swift
// Playback state
let state = audioManager.playbackState  // .stopped, .playing, .paused

// Position (samples)
let position = audioManager.currentPosition

// Tempo (BPM)
let tempo = audioManager.tempo
```

### Change Parameters

```swift
// Set tempo
try audioManager.setTempo(140.0)

// Seek to position
try audioManager.seek(to: 5000.0)
```

### Get Audio Levels

```swift
// Get level for channel
let level = audioManager.getAudioLevel(channel: 0)

// All channels
let levels = audioManager.channelLevels  // [Double]
```

### Emergency Stop

```swift
audioManager.panicStop()
```

## SwiftUI Integration

### Basic UI

```swift
struct AudioControlsView: View {
  @StateObject private var audioManager = AudioManager()

  var body: some View {
    VStack {
      // Status
      Text(audioManager.playbackState == .playing ? "Playing" : "Stopped")

      // Controls
      Button("Play") { try? audioManager.startPlayback() }
      Button("Stop") { try? audioManager.stopPlayback() }

      // Info
      Text("Tempo: \(audioManager.tempo, specifier: "%.1f") BPM")
    }
  }
}
```

### Level Meter

```swift
struct LevelMeterView: View {
  @StateObject private var audioManager = AudioManager()

  var body: some View {
    HStack {
      ForEach(0..<audioManager.channelLevels.count, id: \.self) { channel in
        let level = audioManager.getAudioLevel(channel: channel)
        LevelBar(level: level)
      }
    }
  }
}

struct LevelBar: View {
  let level: Double

  var body: some View {
    GeometryReader { geometry in
      ZStack(alignment: .bottom) {
        Rectangle()
          .fill(Color.gray.opacity(0.3))

        Rectangle()
          .fill(level > 0.8 ? Color.red :
                level > 0.5 ? Color.yellow :
                Color.green)
          .frame(height: geometry.size.height * CGFloat(level))
      }
      .cornerRadius(4)
    }
    .frame(width: 20, height: 150)
  }
}
```

## Combine Integration

### Observe State Changes

```swift
import Combine

class AudioViewModel: ObservableObject {
  @Published var isPlaying: Bool = false
  @Published var tempo: Double = 120.0

  private let audioManager = AudioManager()
  private var cancellables = Set<AnyCancellable>()

  init() {
    // Observe playback state
    audioManager.$playbackState
      .map { $0 == .playing }
      .assign(to: &$isPlaying)

    // Observe tempo
    audioManager.$tempo
      .assign(to: &$tempo)
  }
}
```

## Error Handling

### Handle Errors Gracefully

```swift
func safePlayback() {
  do {
    try audioManager.startPlayback()
  } catch AudioManagerError.engineNotReady {
    print("Engine not ready - try again")
  } catch AudioManagerError.playbackFailed(let message) {
    print("Playback failed: \(message)")
  } catch {
    print("Unknown error: \(error)")
  }
}
```

### Error Types

```swift
enum AudioManagerError: Error {
  case engineNotReady              // Engine not initialized
  case initializationFailed(String) // Init failed
  case playbackFailed(String)      // Playback error
  case invalidState(String)        // Invalid state
}
```

## Configuration

### Default Config

```swift
let audioManager = AudioManager()
// Uses: 48000 Hz, 512 samples
```

### Custom Config

```swift
let config = AudioConfig(
  sampleRate: 44100.0,
  bufferSize: 256
)

let customManager = AudioManager(config: config)
```

## Best Practices

### 1. Always Check Ready State

```swift
guard audioManager.isReady else {
  print("Audio engine not ready")
  return
}
```

### 2. Handle Errors

```swift
do {
  try audioManager.startPlayback()
} catch {
  // Handle error
}
```

### 3. Use Main Thread for UI

```swift
audioManager.$playbackState
  .receive(on: DispatchQueue.main)
  .sink { state in
    // Update UI safely
  }
  .store(in: &cancellables)
```

### 4. Cleanup Properly

```swift
class AudioController {
  private var audioManager: AudioManager?

  init() {
    audioManager = AudioManager()
  }

  deinit {
    // Automatic cleanup
    audioManager = nil
  }
}
```

## Troubleshooting

### Engine Not Ready

**Problem**: `AudioManagerError.engineNotReady`

**Solution**: Wait for initialization
```swift
DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
  if audioManager.isReady {
    // Ready now
  }
}
```

### Playback Fails

**Problem**: `AudioManagerError.playbackFailed`

**Solution**: Check audio device availability
```swift
do {
  try audioManager.startPlayback()
} catch {
  print("Check audio device settings")
}
```

### High CPU Usage

**Problem**: CPU usage >40%

**Solution**: Increase buffer size
```swift
let config = AudioConfig(
  sampleRate: 48000.0,
  bufferSize: 1024  // Larger buffer
)
```

## Testing

### Unit Tests

```swift
import XCTest
@testable import SwiftFrontendShared

final class AudioManagerTests: XCTestCase {
  var audioManager: AudioManager!

  override func setUp() {
    audioManager = AudioManager()
  }

  func testStartPlayback() throws {
    try audioManager.startPlayback()
    XCTAssertEqual(audioManager.playbackState, .playing)
  }

  func testSetTempo() throws {
    try audioManager.setTempo(140.0)
    XCTAssertEqual(audioManager.tempo, 140.0)
  }
}
```

## Performance Tips

### 1. Minimize Polling

Don't poll faster than 60 FPS (default is optimal).

### 2. Use Efficient Observations

Prefer `@Published` over manual polling.

### 3. Batch Operations

```swift
// Good
try audioManager.setTempo(140.0)
try audioManager.seek(to: 5000.0)

// Avoid tight loops
for i in 0..<1000 {
  try audioManager.setTempo(Double(i))  // Bad!
}
```

## API Reference

### Core Methods

| Method | Purpose |
|--------|---------|
| `startPlayback()` | Start playback |
| `stopPlayback()` | Stop playback |
| `pausePlayback()` | Pause playback |
| `setTempo(_:)` | Set tempo (BPM) |
| `seek(to:)` | Seek to position |
| `getAudioLevel(channel:)` | Get RMS level |
| `panicStop()` | Emergency stop |

### Published Properties

| Property | Type | Description |
|----------|------|-------------|
| `playbackState` | `PlaybackState` | Current state |
| `isReady` | `Bool` | Ready status |
| `currentPosition` | `Double` | Position (samples) |
| `tempo` | `Double` | Tempo (BPM) |
| `channelLevels` | `[Double]` | RMS levels |

### Enums

```swift
enum PlaybackState {
  case stopped
  case playing
  case paused
}

enum AudioManagerError: Error {
  case engineNotReady
  case initializationFailed(String)
  case playbackFailed(String)
  case invalidState(String)
}
```

## Next Steps

- Read [Technical Documentation](AUDIO_MANAGER_TECHNICAL_DOCUMENTATION.md)
- Review [Implementation Report](REAL_AUDIO_MANAGER_IMPLEMENTATION_REPORT.md)
- Check [Unit Tests](../../swift_frontend/SwiftFrontendShared/Tests/AudioManagerTests.swift)

## Support

**Issues**: Report via bd (Beads task management)
**Documentation**: See `docs/user/` directory
**Examples**: See test files for usage examples

---

**Version**: 1.0
**Updated**: January 15, 2026
