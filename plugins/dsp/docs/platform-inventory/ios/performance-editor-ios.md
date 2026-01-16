# PerformanceEditoriOS

**Status:** ✅ Complete - iOS Exclusive  
**Platform:** iOS (v17+)  
**Purpose:** Touch-optimized performance editing interface for mobile devices

## Overview

PerformanceEditoriOS is a **touch-first performance editor** designed specifically for iPhone and iPad. It provides an intuitive gesture-based interface for editing performance parameters, with haptic feedback and adaptive layouts that respond to device orientation and screen size.

## File Location

```
swift_frontend/src/SwiftFrontendCore/iOS/Screens/PerformanceEditoriOS.swift
```

## Key Components

### Main Interface (Portrait)
```
┌──────────────────────────────────────┐
│  ← Performance Editor        [Save] │
├──────────────────────────────────────┤
│                                       │
│  ┌─────────────────────────────────┐ │
│  │     Performance Preview        │ │
│  │     [Waveform Visual]           │ │
│  │     Piano: Soft & Melodic      │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Density  ━━━━━●━━━━━━━━━━━━━━━━━  │
│  Motion   ━━━━━━━━━━━━━━━●━━━━━━  │
│  Complexity ━━━━━━━━━━━━●━━━━━━━━  │
│                                       │
│  Timing Controls                      │
│  ├─ Swing: ─────●────────            │
│  ├─ Groove: ━━━━━━━●━━━━━━          │
│  └─ Feel: ───────────●              │
│                                       │
│  Articulation                         │
│  ├─ Attack: ────────●───────        │
│  ├─ Decay: ───●────────────          │
│  └─ Sustain: ───────────●           │
│                                       │
│  [Reset] [Randomize] [Preset...]     │
└──────────────────────────────────────┘
```

### Main Interface (Landscape iPad)
```
┌─────────────────────────────────────────────────────────────┐
│  ← Performance Editor                           [Save] [Undo] │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌────────────────────────────────┐ │
│  │   Performance    │  │   Parameter Controls           │ │
│  │   Preview        │  │                                 │ │
│  │   [Waveform]     │  │  Density ━━━━━●━━━━━━━━━━━━    │ │
│  │   Piano          │  │  Motion  ━━━━━━━━━━━●━━━━━━    │ │
│  │   Soft & Melodic │  │  Timing                        │ │
│  │                  │  │  ├─ Swing  ─────●──────────     │ │
│  │   [Play/Stop]     │  │  ├─ Groove ━━━━━━━●━━━━━━      │ │
│  │   [Loop]          │  │  └─ Feel   ───────────●       │ │
│  └──────────────────┘  │                                 │ │
│                        │  Articulation                   │ │
│  ┌──────────────────┐  │  ├─ Attack  ───────●───────     │ │
│  │   Preset         │  │  ├─ Decay   ───●──────────     │ │
│  │   Browser        │  │  └─ Sustain ───────────●      │ │
│  │   [Piano ▼]      │  │                                 │ │
│  │   [Techno ▼]     │  │  [Reset] [Random] [Save Preset] │
│  │   [Jazz ▼]       │  └────────────────────────────────┘ │
│  │   [+ Add New]    │                                     │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

## Sections

### 1. Performance Preview

**Purpose:** Real-time visualization of performance

**Components:**
```
Performance Preview
├── Waveform Display
│   ├── Real-time rendering
│   ├── 60 FPS update rate
│   └── Zoom/pinch support
├── Performance Name
│   ├── "Piano"
│   ├── "Soft & Melodic" (subtitle)
│   └── Edit button (rename)
└── Playback Controls
    ├── Play/Pause
    ├── Loop (A-B)
    └── Stop
```

**Interactions:**
- **Pinch:** Zoom waveform in/out
- **Pan:** Drag to scroll waveform
- **Double-tap:** Reset zoom
- **Long-press:** Loop region

### 2. Parameter Controls

**Purpose:** Edit performance parameters with touch sliders

**Density Control**
```
Density Slider (Continuous)
├── Range: 0.0 to 1.0
├── Default: 0.5
├── Haptic: Light tap at 0%, Medium at 50%, Heavy at 100%
├── Color: Green gradient (→)
└── Value Display: "50%"
```

**Motion Control**
```
Motion Slider (Continuous)
├── Range: 0.0 to 1.0
├── Default: 0.3
├── Haptic: Medium on change
├── Color: Blue gradient (→)
└── Value Display: "30%"
```

**Complexity Control**
```
Complexity Slider (Continuous)
├── Range: 0.0 to 1.0
├── Default: 0.5
├── Haptic: Light on change
├── Color: Purple gradient (→)
└── Value Display: "50%"
```

**Slider Behavior:**
- **Touch:** Drag thumb to adjust
- **Tap:** Jump to position
- **Haptic:** Feedback at 0%, 25%, 50%, 75%, 100%
- **Animation:** 150ms spring

### 3. Timing Controls

**Purpose:** Adjust rhythmic feel and groove

**Swing Control**
```
Swing Slider (Bipolar)
├── Range: -50% to +50%
├── Default: 0%
├── Haptic: Light on change
├── Color: Red gradient (←→)
└── Zero indicator: Center notch
```

**Groove Control**
```
Groove Slider (Continuous)
├── Range: 0.0 to 1.0
├── Default: 0.5
├── Haptic: Medium on change
├── Color: Orange gradient (→)
└── Presets: Straight, Shuffle, Push
```

**Feel Control**
```
Feel Segmented Control
├── Options: [Tight] [Neutral] [Loose]
├── Default: Neutral
├── Haptic: Selection change
└── Visual: Selected pill highlighted
```

### 4. Articulation Controls

**Purpose:** Shape note envelope characteristics

**Attack Control**
```
Attack Slider (Logarithmic)
├── Range: 1ms to 2000ms
├── Default: 50ms
├── Haptic: Light on change
├── Color: Yellow gradient (→)
└── Scale: Logarithmic (fine at low end)
```

**Decay Control**
```
Decay Slider (Logarithmic)
├── Range: 10ms to 5000ms
├── Default: 500ms
├── Haptic: Light on change
├── Color: Cyan gradient (→)
└── Scale: Logarithmic (fine at low end)
```

**Sustain Control**
```
Sustain Slider (Linear)
├── Range: 0.0 to 1.0
├── Default: 0.3
├── Haptic: Medium on change
├── Color: Magenta gradient (→)
└── Visual: Fill indicator
```

### 5. Preset Browser

**Purpose:** Load and save performance presets

**Preset List**
```
Preset Browser (Modal)
├── Categories
│   ├── Piano (8 presets)
│   ├── Synth (12 presets)
│   ├── Strings (6 presets)
│   └── Custom (user presets)
├── Preset Cards
│   ├── Name ("Grand Piano")
│   ├── Description ("Classic acoustic")
│   ├── Tags (["acoustic", "classical"])
│   └── Favorite button (heart)
└── Actions
    ├── Preview (tap to hear)
    ├── Load (double-tap)
    ├── Save as...
    └── Delete (swipe)
```

**Gesture Actions:**
- **Tap:** Select preset
- **Double-tap:** Load preset
- **Swipe left:** Delete
- **Long-press:** Show options
- **Haptic:** Medium on load

## State Management

```swift
@StateObject private var performance: Performance
@StateObject private var parameterStore: ParameterStore
@StateObject private var presetManager: PresetManager

@State private var isEditing: Bool = false
@State private var hasChanges: Bool = false
@State private var selectedParameter: Parameter?
```

### State Objects

1. **performance** - Current performance being edited
2. **parameterStore** - Parameter value storage
3. **presetManager** - Preset library management

### Edit State
- **isEditing** - True when editor is active
- **hasChanges** - True when unsaved changes exist
- **canSave** - Derived validation
- **canUndo** - Undo stack available

## Touch Gestures

### Primary Gestures

**Pan (Drag)**
- **Purpose:** Adjust slider values
- **Implementation:** `DragGesture(minimumDistance: 0)`
- **Haptic:** Continuous light feedback during drag
- **Visual:** Real-time value update

**Pinch**
- **Purpose:** Zoom waveform preview
- **Implementation:** `MagnificationGesture()`
- **Haptic:** Medium when zoom starts/ends
- **Visual:** Scale transformation

**Long Press**
- **Purpose:** Context menu / loop region
- **Implementation:** `LongPressGesture(minimumDuration: 0.5)`
- **Haptic:** Heavy when menu appears
- **Visual:** Context menu popup

**Double Tap**
- **Purpose:** Reset parameter to default
- **Implementation:** `TapGesture(count: 2)`
- **Haptic:** Selection feedback
- **Visual:** Animate to default value

**Swipe Actions**
- **Purpose:** Delete preset / quick actions
- **Implementation:** `.swipeActions()`
- **Haptic:** Light on reveal
- **Visual:** Action buttons slide in

### Gesture Exclusivity
```swift
.simultaneousGesture(
    PanGesture(),
    MagnificationGesture()
)
.exclusively(before:
    LongPressGesture()
)
```

## Haptic Feedback

### Haptic Types

**UIImpactFeedbackGenerator**
```swift
// Light - Subtle interactions
HapticFeedback.light()  // Slider drag start

// Medium - Standard interactions
HapticFeedback.medium()  // Parameter change

// Heavy - Significant actions
HapticFeedback.heavy()  // Preset loaded
```

**UINotificationFeedbackGenerator**
```swift
// Success - Completed action
HapticFeedback.success()  // Preset saved

// Warning - Caution state
HapticFeedback.warning()  // Unsaved changes

// Error - Failed action
HapticFeedback.error()  // Save failed
```

**UISelectionFeedbackGenerator**
```swift
// Selection - Selection changed
HapticFeedback.selection()  // Tab change
```

### Feedback Triggers

| Event | Haptic Type | Intensity |
|-------|-------------|----------|
| Slider drag starts | Light | Light |
| Slider crosses 25% | Light | Light |
| Slider crosses 50% | Medium | Medium |
| Slider crosses 75% | Light | Light |
| Slider at 100% | Heavy | Heavy |
| Preset loaded | Heavy | Heavy |
| Preset saved | Success | N/A |
| Error occurred | Error | N/A |
| Parameter reset | Selection | N/A |

## Adaptive Layout

### Orientation Support

**Portrait (iPhone)**
- Single column layout
- Full-width sliders
- Stacked controls
- Bottom preset button

**Landscape (iPhone)**
- Two column layout (preview + controls)
- Side-by-side sliders
- Preset sidebar
- Top toolbar

**Landscape (iPad)**
- Three column layout (preview | controls | presets)
- Larger touch targets
- Enhanced waveform
- Split view compatible

### Size Classes

**Compact (iPhone)**
```swift
@Environment(\.horizontalSizeClass) var hClass

if hClass == .compact {
    // Single column, portrait iPhone
} else {
    // Two column, landscape iPhone
}
```

**Regular (iPad)**
```swift
if hClass == .regular {
    // Multi-column, iPad
}
```

## Data Flow

### Parameter Change Flow
```
User drags slider
    ↓
DragGesture.onChanged
    ↓
handleParameterChange(parameter, value)
    ↓
parameterStore.updateValue(parameter, value)
    ↓
HapticFeedback.medium()
    ↓
performance.updateParameter(parameter, value)
    ↓
JUCE Engine processes
    ↓
Audio output updated
    ↓
Waveform preview refreshes
```

### Preset Load Flow
```
User double-taps preset
    ↓
presetManager.loadPreset(presetID)
    ↓
Show loading indicator
    ↓
Fetch preset from library
    ↓
Update all UI controls
    ↓
performance.loadFromPreset(preset)
    ↓
HapticFeedback.heavy()
    ↓
Audio engine updates
    ↓
Hide loading indicator
```

## Undo/Redo Support

### Undoable Operations
- Parameter changes
- Preset loads
- Preset saves
- Bulk operations

### Undo Stack
```swift
undoManager.registerUndo(withTarget: self) { target in
    target.restorePreviousState()
}
```

### Limitations
- Maximum 50 operations (memory constraint)
- Clears on app background
- Persists across edit sessions

## Performance Optimization

### Rendering
- **60 FPS:** Smooth animations
- **Metal:** GPU-accelerated waveform
- **Reduced Motion:** Disable animations when requested

### Memory
- **Waveform Cache:** 10 waveforms max
- **Preset Cache:** 20 presets max
- **Automatic Cleanup:** Release unused resources

### Battery
- **Haptic Throttling:** Limit haptic frequency
- **Background Refresh:** Disable when app backgrounded
- **Low Power Mode:** Reduce animation complexity

## Accessibility

### VoiceOver
- Slider announcements: "Density, 50 percent"
- Button labels: "Reset parameters button"
- Progress updates: "Preset saved"
- Navigation order: Logical tab order

### Dynamic Type
- **Scaling:** Supports up to 200%
- **Layout:** Adapts to font size
- **Line Breaks:** Adjusts automatically
- **Minimum Readable:** 11pt at 200%

### Touch Accommodations
- **Hold Duration:** Adjustable
- **Tap Assistance:** Prevent accidental taps
- **Touch Accommodations:** Larger touch targets

### Reduce Motion
- **Animations:** Disabled when requested
- **Transitions:** Fade instead of slide
- **Haptics:** Reduced intensity

## Error Handling

### Validation Errors
- **Out of Range:** Parameter value clamped
- **Invalid Preset:** Show error, offer recovery
- **Save Failed:** Disk full, permission denied

### Network Errors
- **Cloud Sync Failed:** Local fallback
- **Download Failed:** Retry option
- **Authentication:** Show login prompt

## Persistence

### Auto-Save
- **Frequency:** Every 30 seconds
- **Trigger:** Parameter change
- **Location:** Local CoreData
- **Cloud:** iCloud (optional)

### State Restoration
- **Foreground:** Restore editor state
- **Crash:** Recover unsaved changes
- **App Launch:** Restore last preset

## Integration Points

### Presented From
- **SurfaceRootView** - Edit performance button
- **ConsoleXMini** - Quick edit action
- **SweepControlView** - Edit performance A/B

### Opens Modals
- **InstrumentPresetBrowser** - Browse presets

## Future Enhancements

- [ ] MIDI learn mode
- [ ] Automation recording
- [ ] A/B comparison
- [ ] Morphing between presets
- [ ] Performance randomizer
- [ ] AI suggestions
- [ ] Collaboration (share presets)
- [ ] Version history
- [ ] Cloud backup
- [ ] Performance analytics

## Related Components

- **ConsoleXMini** - Quick parameter access
- **InstrumentPresetBrowser** - Preset management
- **SweepControlView** - Performance selection
