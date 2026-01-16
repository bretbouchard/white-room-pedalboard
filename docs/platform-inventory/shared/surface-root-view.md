# SurfaceRootView

**Status:** ✅ Complete - Available on all platforms  
**File:** `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Surface/SurfaceRootView.swift`

## Purpose

SurfaceRootView is the **main interface** for the White Room audio plugin. It provides the primary control surface for performance manipulation, including the Sweep control that blends between two parallel performance universes.

## Components

### Header Section
```
HeaderView()
├── "White Room" (Large Title)
└── "Parallel Performance Universes" (Subtitle)
```

### Engine Status
```
EngineStatusView(engine: JUCEEngine)
├── Status Indicator (Green/Red circle)
├── "Engine Running" / "Engine Stopped" text
└── Start/Stop Button
```

### Performance Sweep Control
```
SweepControlSection()
├── "Performance Sweep" (Headline)
├── Description text
└── SweepControlView (Main control component)
    ├── Performance A selector
    ├── Performance B selector
    └── Blend slider (0.0 - 1.0)
```

## Platform Behavior

| Platform | Input Method | Touch Targets | Animations | Performance |
|----------|--------------|---------------|------------|-------------|
| **macOS** | Keyboard/Mouse | Standard (44pt) | Full | 60 FPS |
| **tvOS** | Siri Remote | Large (92pt) | Reduced | 60 FPS |
| **iOS** | Touch | Standard (44pt) | Full | 60 FPS |
| **Raspberry Pi** | GPIO/Mouse | Variable | Adaptive | 30-60 FPS |

## State Management

```swift
@StateObject private var engine = JUCEEngine.shared
@State private var blendValue: Double = 0.5
@State private var performanceA: PerformanceInfo
@State private var performanceB: PerformanceInfo
@State private var availablePerformances: [PerformanceInfo]
```

### State Objects

1. **engine** - Shared JUCE audio engine instance
2. **blendValue** - Current blend position (0.0 = Perf A, 1.0 = Perf B)
3. **performanceA** - Left side performance (default: "Piano")
4. **performanceB** - Right side performance (default: "Techno")
5. **availablePerformances** - List of all available performances

## Navigation

**Entry Point:** This is typically the root view accessed from app initialization.

**Modals From Here:** None (this is the root)

**Navigation To:** 
- Performance selector (modal picker)
- Settings (future)

## Actions

### Engine Control
- `startEngine()` - Starts the JUCE audio engine
- `stopEngine()` - Stops the JUCE audio engine

### Performance Management
- `loadAvailablePerformances()` - Fetches performances from engine
- `handleBlendChanged()` - Sends blend command to engine

## Data Flow

```
User Interaction
    ↓
SweepControlView (blendValue changes)
    ↓
handleBlendChanged()
    ↓
engine.setPerformanceBlend(perfA, perfB, blendValue)
    ↓
JUCE Engine processes
    ↓
Audio output updated in real-time
```

## Accessibility

- VoiceOver labels on all controls
- Keyboard navigation support (macOS)
- Focus engine support (tvOS)
- Minimum touch targets (44pt iOS, 92pt tvOS)

## Platform-Specific Enhancements

### macOS
- Keyboard shortcuts: Space (play/pause)
- Hover effects on controls
- Tooltips on buttons

### tvOS
- Focus engine integration
- 10-foot UI optimizations
- Siri Remote swipe gestures

### iOS
- Haptic feedback on blend changes
- Touch-optimized layout
- Swipe gestures for performance selection

## Performance Characteristics

- **Startup Time:** < 1 second
- **Memory Usage:** ~50 MB base
- **Frame Rate:** 60 FPS target
- **Audio Latency:** < 10ms (engine-dependent)

## Dependencies

- `JUCEEngine` - Audio engine backend
- `SweepControlView` - Blend control component
- `PerformanceInfo` - Performance data model

## Future Enhancements

- [ ] Transport controls (play/pause/stop/record)
- [ ] Mixer section
- [ ] Effect controls
- [ ] Performance editor access
- [ ] Preset management
- [ ] Settings panel
