# White Room Swift Frontend

SwiftUI-based frontend for the White Room audio plugin, featuring performance sweep/crossfade controls.

## Overview

The Swift frontend provides the user interface for White Room, allowing users to blend between performances like parallel universes through an intuitive Sweep control.

## Architecture

### Core Components

#### 1. **SweepControlView**
Location: `Sources/SwiftFrontendCore/Surface/SweepControlView.swift`

The main UI component for performance blending.

**Features:**
- Single slider/knob controlling blend parameter t (0..1)
- Visual display of 'A ↔ B' with performance names
- Real-time blend percentage display
- Quick-select buttons for A, AB, and B positions
- Performance selector dropdowns for A and B
- Smooth animations and visual feedback

**Key Properties:**
- `blendValue`: Binding<Double> - Current blend value (0.0 = A, 1.0 = B)
- `performanceA`: Binding<PerformanceInfo> - Selected A performance
- `performanceB`: Binding<PerformanceInfo> - Selected B performance
- `availablePerformances`: [PerformanceInfo] - List of all available performances
- `onBlendChanged`: Callback - Triggered when blend value changes

**Visual Elements:**
- Gradient-filled track showing blend position
- Draggable thumb with smooth gesture handling
- Performance labels with names and descriptions
- Quick-select buttons for common blend positions
- Performance selector sheets for A and B

#### 2. **SurfaceRootView**
Location: `Sources/SwiftFrontendCore/Surface/SurfaceRootView.swift`

The root view for the White Room surface interface.

**Features:**
- Engine status indicator (running/stopped)
- Engine start/stop controls
- Sweep control integration
- Performance loading on startup

**Responsibilities:**
- Manages overall UI layout
- Coordinates with JUCEEngine
- Handles performance loading
- Manages engine lifecycle

#### 3. **JUCEEngine**
Location: `Sources/SwiftFrontendCore/Audio/JUCEEngine.swift`

Manages communication between Swift frontend and JUCE audio engine.

**Features:**
- Singleton pattern for shared instance
- Thread-safe engine operations
- Real-time blend state updates
- Performance management
- Error handling with descriptive messages

**Key Methods:**
- `setPerformanceBlend(_:_:blendValue:)` - Sets blend between two performances
- `fetchAvailablePerformances()` - Returns list of available performances
- `startEngine()` - Initializes the audio engine
- `stopEngine()` - Shuts down the audio engine
- `updatePerformanceA(_:)` - Updates performance A in current blend
- `updatePerformanceB(_:)` - Updates performance B in current blend

**State Management:**
- `@Published var isEngineRunning: Bool` - Engine running state
- `@Published var currentPerformances: (a: PerformanceInfo, b: PerformanceInfo)?` - Current blend performances
- `@Published var currentBlendValue: Double` - Current blend value

### Supporting Types

#### PerformanceInfo
```swift
public struct PerformanceInfo: Identifiable, Equatable {
    public let id: String
    public let name: String
    public let description: String?
}
```

Represents a performance that can be selected for blending.

#### JUCEEngineError
```swift
public enum JUCEEngineError: Error, LocalizedError {
    case engineNotInitialized
    case invalidPerformance(String)
    case invalidBlendValue(Double)
    case communicationFailed(String)
    case engineError(String)
}
```

Error types for engine operations with user-friendly descriptions.

## User Workflow

### Basic Usage

1. **Start the Engine**
   - User clicks "Start" button in EngineStatusView
   - JUCEEngine initializes audio engine
   - Status indicator turns green

2. **Select Performances**
   - User clicks on Performance A selector
   - Dropdown sheet appears with available performances
   - User selects "Piano" (for example)
   - Repeat for Performance B, selecting "Techno"

3. **Adjust Blend**
   - User drags the sweep slider
   - Visual feedback shows current blend position
   - Percentage display updates in real-time (e.g., "50%")
   - Audio crossfades smoothly between performances

4. **Quick Select**
   - User can click "A" to snap to 100% Performance A
   - User can click "AB" to snap to 50/50 blend
   - User can click "B" to snap to 100% Performance B

5. **Stop the Engine**
   - User clicks "Stop" button
   - Engine gracefully shuts down
   - Status indicator turns red

## Integration with JUCE Backend

The Swift frontend communicates with the JUCE backend through FFI (Foreign Function Interface).

### Communication Flow

```
Swift UI (SweepControlView)
    ↓
Swift Model (JUCEEngine)
    ↓
FFI Bridge (SchillingerFFI)
    ↓
JUCE Audio Engine (C++)
```

### Blend Command Format

```json
{
    "type": "setPerformanceBlend",
    "performanceA": {
        "id": "piano",
        "name": "Piano"
    },
    "performanceB": {
        "id": "techno",
        "name": "Techno"
    },
    "blendValue": 0.5
}
```

## Testing

### Unit Tests

Location: `Tests/SwiftFrontendCoreTests/Surface/SweepControlTests.swift`

**Test Coverage:**

1. **SweepControlTests**
   - Blend value initialization and range validation
   - Performance selection and equality
   - UI state management
   - Quick select button functionality
   - Percentage display formatting

2. **JUCEEngineTests**
   - Engine singleton pattern
   - Initial state verification
   - Performance fetching
   - Blend state management
   - Performance updates
   - Engine start/stop lifecycle

3. **JUCEEngineErrorTests**
   - Error description formatting
   - Invalid blend value handling

4. **SweepControlIntegrationTests**
   - SurfaceRootView initialization
   - SweepControl integration
   - Full engine integration

### Running Tests

```bash
# Run all tests
swift test

# Run specific test suite
swift test --filter SweepControlTests
swift test --filter JUCEEngineTests

# Run with verbose output
swift test --verbose
```

## Building

### Prerequisites

- Xcode 14.0 or later
- iOS 15.0+ / macOS 12.0+
- Swift 5.7+

### Build Commands

```bash
# Build as Swift Package
swift build

# Build for iOS
swift build -Xswiftc "-target" -Xswiftc "arm64-apple-ios15.0"

# Build for macOS
swift build -Xswiftc "-target" -Xswiftc "x86_64-apple-macos12.0"

# Build in Xcode
open Package.swift
# Then use Xcode's build command (⌘B)
```

## File Structure

```
swift_frontend/WhiteRoomiOS/
├── Package.swift                           # Swift Package manifest
├── README.md                               # This file
├── Sources/
│   └── SwiftFrontendCore/
│       ├── Surface/
│       │   ├── SurfaceRootView.swift      # Root surface view
│       │   └── SweepControlView.swift     # Sweep control component
│       └── Audio/
│           └── JUCEEngine.swift           # Audio engine integration
└── Tests/
    └── SwiftFrontendCoreTests/
        └── Surface/
            └── SweepControlTests.swift    # Comprehensive tests
```

## Dependencies

Currently, this package uses only SwiftUI and Foundation from the standard library.

Future dependencies may include:
- Async/await for improved concurrency
- Combine for advanced reactive patterns
- Custom FFI bridge for JUCE communication

## Performance Considerations

### Threading
- Engine operations run on dedicated `engineQueue` (QoS: userInitiated)
- UI updates always dispatched to main queue
- Blend state updates are asynchronous to avoid blocking UI

### Memory Management
- Weak references used to prevent retain cycles
- Proper cleanup in engine shutdown
- Efficient state management with @Published properties

### Real-time Safety
- No blocking operations on main thread
- Smooth 60fps animations
- Immediate visual feedback for user interactions

## Future Enhancements

### Planned Features
1. **Performance Presets**
   - Save/load performance blend configurations
   - Quick access to common blends

2. **Automation**
   - Record blend sweeps
   - Playback automation
   - MIDI learn for blend control

3. **Advanced Visualization**
   - Real-time waveform display
   - Frequency spectrum analysis
   - Performance comparison view

4. **Touch/Gesture Support**
   - Swipe gestures for blend control
   - Multi-touch for dual control
   - Haptic feedback

5. **Accessibility**
   - VoiceOver support
   - High contrast mode
   - Keyboard shortcuts

## Troubleshooting

### Common Issues

**Issue: Engine won't start**
- Check if JUCE backend is running
- Verify FFI bridge is initialized
- Check system logs for error messages

**Issue: Blend control not responsive**
- Verify engine is running
- Check if performances are loaded
- Look for error messages in console

**Issue: Performance selector empty**
- Ensure performances are loaded
- Check engine connection
- Verify performance data format

### Debug Logging

Enable debug logging in Console.app:
```
filter: sender == "JUCEEngine" OR sender == "SurfaceRootView"
```

## Contributing

When adding new features:
1. Update tests to cover new functionality
2. Ensure all existing tests pass
3. Update this README with new capabilities
4. Follow SwiftUI best practices
5. Maintain SLC principles (Simple, Lovable, Complete)

## License

Part of the White Room project. See main project LICENSE file.

## Contact

For questions or issues:
- Create an issue in the main White Room repository
- Check existing issues and documentation
- Consult the development team

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0
**Status:** Complete - white_room-207
