# ConsoleXMini

**Status:** ✅ Complete - iOS Exclusive  
**Platform:** iOS (v17+)  
**Purpose:** Compact console interface for mobile performance control

## Overview

ConsoleXMini is a **space-optimized control center** for iOS devices, providing quick access to essential performance controls without navigating away from the main interface. It's designed for one-handed use and provides immediate control over the most commonly adjusted parameters.

## File Location

```
swift_frontend/src/SwiftFrontendCore/iOS/Components/ConsoleXMini.swift
```

## Key Components

### Compact Interface (Portrait iPhone)
```
┌──────────────────────────────────────────┐
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  ← Drag handle
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Performance: Piano                     │ │
│  │  [Edit]           [Play/Pause] [Save] │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Density ━━━━━━━━●━━━━━━━━━━━━━       │ │
│  │  Motion  ━━━━━━━━━━━━━━●━━━━━━━━      │ │
│  │  Timing  ━━━━━━━━━━━━━━━━━━━●━━━      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌────────────────┬──────────────────────┐ │
│  │  Swing        │  Sustain              │ │
│  │  ──────●────── │  ────────●────────── │ │
│  └────────────────┴──────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  [Reset] [Random] [Save] [Presets...] │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  ← Drag handle
└──────────────────────────────────────────┘
```

### Expanded Interface (Drag or Tap)
```
┌──────────────────────────────────────────┐
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Performance: Piano                     │ │
│  │  "Soft and melodic"                     │ │
│  │  [Edit...] [Play] [Loop] [Share]      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Primary Controls                            │
│  ┌──────────────────────────────────────┐ │
│  │  Density ━━━━━━━━●━━━━━━━━━━━━━ 50%    │ │
│  │  Motion  ━━━━━━━━━━━━━━●━━━━━━━━ 30%    │ │
│  │  Complexity ━━━━━━━━━━━━━●━━━━━━━ 50%   │ │
│  │  Swing ──────●──────  +5%               │ │
│  │  Groove ━━━━━━━━━●━━━━━━━ 60%          │ │
│  │  Feel [Tight • Neutral • Loose]         │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Envelope                                   │
│  ┌──────────────────────────────────────┐ │
│  │  Attack  ────────●──────  50ms          │ │
│  │  Decay   ───●────────────  500ms        │ │
│  │  Sustain ━━━━━━━━━━━━━━━●━━━ 30%        │ │
│  │  Release ─────────────●────  200ms      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Quick Actions                              │
│  ┌────────────────┬──────────────────────┐ │
│  │  [Mute]        │  [Solo]               │ │
│  │  [Bypass]      │  [Freeze]             │ │
│  └────────────────┴──────────────────────┘ │
│                                            │
│  [Collapse ▲]                              │
│                                            │
└──────────────────────────────────────────┘
```

## Sections

### 1. Performance Header

**Purpose:** Quick performance identification and actions

**Compact Mode**
```
┌──────────────────────────────────────┐
│  Performance: Piano                     │
│  [Edit]           [Play/Pause] [Save] │
└──────────────────────────────────────┘
```

**Expanded Mode**
```
┌──────────────────────────────────────┐
│  Performance: Piano                     │
│  "Soft and melodic"                     │
│  [Edit...] [Play] [Loop] [Share]      │
└──────────────────────────────────────┘
```

**Actions:**
- **Edit:** Open PerformanceEditoriOS
- **Play/Pause:** Toggle playback
- **Loop:** Toggle loop region
- **Share:** Export/share preset

### 2. Primary Controls

**Purpose:** Most frequently adjusted parameters

**Density Slider**
```
Density Control
├── Range: 0.0 - 1.0
├── Current: 50%
├── Haptic: Light on change
└── Color: Green gradient
```

**Motion Slider**
```
Motion Control
├── Range: 0.0 - 1.0
├── Current: 30%
├── Haptic: Light on change
└── Color: Blue gradient
```

**Complexity Slider**
```
Complexity Control
├── Range: 0.0 - 1.0
├── Current: 50%
├── Haptic: Light on change
└── Color: Purple gradient
```

### 3. Timing Controls (Expanded Only)

**Purpose:** Rhythmic feel adjustments

**Swing Slider**
```
Swing Control
├── Range: -50% to +50%
├── Default: 0%
├── Haptic: Light on change
└── Visual: Center notch at 0%
```

**Groove Slider**
```
Groove Control
├── Range: 0.0 - 1.0
├── Default: 0.6
├── Haptic: Medium on change
└── Presets: Straight, Shuffle
```

**Feel Segmented Control**
```
Feel Control
├── Options: [Tight] [Neutral] [Loose]
├── Default: Neutral
├── Haptic: Selection change
└── Visual: Selected pill highlighted
```

### 4. Envelope Controls (Expanded Only)

**Purpose:** Note envelope shaping

**Attack Slider**
```
Attack Control
├── Range: 1ms - 2000ms (logarithmic)
├── Default: 50ms
├── Haptic: Light on change
└── Color: Yellow gradient
```

**Decay Slider**
```
Decay Control
├── Range: 10ms - 5000ms (logarithmic)
├── Default: 500ms
├── Haptic: Light on change
└── Color: Cyan gradient
```

**Sustain Slider**
```
Sustain Control
├── Range: 0.0 - 1.0
├── Default: 0.3
├── Haptic: Medium on change
└── Visual: Fill indicator
```

**Release Slider**
```
Release Control
├── Range: 10ms - 5000ms (logarithmic)
├── Default: 200ms
├── Haptic: Light on change
└── Color: Magenta gradient
```

### 5. Quick Actions

**Purpose:** Single-tap performance controls

**Mute Button**
- **Action:** Mute performance output
- **Visual:** Button turns red
- **Haptic:** Heavy on toggle
- **State:** Toggle on/off

**Solo Button**
- **Action:** Solo only this performance
- **Visual:** Button turns yellow
- **Haptic:** Heavy on toggle
- **State:** Toggle on/off

**Bypass Button**
- **Action:** Bypass all effects
- **Visual:** Button turns gray
- **Haptic:** Light on toggle
- **State:** Toggle on/off

**Freeze Button**
- **Action:** Freeze current state
- **Visual:** Button turns blue
- **Haptic:** Medium on toggle
- **State:** Toggle on/off

## State Management

```swift
@StateObject private var performance: Performance
@StateObject private var parameterStore: ParameterStore

@State private var isExpanded: Bool = false
@State private var isPlaying: Bool = false
@State private var isLooping: Bool = false
```

### Compact vs Expanded Mode

**Compact Mode (Default)**
- Shows performance header
- Shows 3 primary controls
- Quick actions visible
- Height: ~300pt

**Expanded Mode (Drag/Tap)**
- Shows all controls
- Envelope controls visible
- All quick actions visible
- Height: ~600pt
- Draggable handle for position

## Touch Gestures

### Expand/Collapse

**Downward Drag (Pull)**
```
┌─────────────────────┐
│  ━━━━━━━━━━━━━━━━━━ │  ← Drag handle
│                      │
│  [Compact Content]    │
└─────────────────────┘
         ↓
    Pull down
         ↓
┌─────────────────────┐
│  ━━━━━━━━━━━━━━━━━━ │  ← Expanded
│                      │
│  [Expanded Content]  │
│  [Collapse ▲]        │
└─────────────────────┘
```

**Tap Handle**
- Single tap: Toggle expand/collapse
- Double-tap: Maximize (full screen)
- Long press: Lock position

### Slider Interactions

**Pan Gesture**
```swift
DragGesture(minimumDistance: 0)
    .onChanged { value in
        parameterValue = value.location.x / width
        HapticFeedback.light()
    }
    .onEnded { _ in
        HapticFeedback.medium()
    }
```

**Tap Gesture**
- Single tap: Jump to position (0%, 50%, 100%)
- Double-tap: Reset to default
- Long press: Show value editor

## Haptic Feedback

### Feedback Patterns

**Slider Adjustment**
```
Value Change    Haptic    Intensity
0% → 25%       Light     Light
25% → 50%      Light     Light
50% → 75%      Medium   Medium
75% → 100%     Medium   Heavy
At 100%         Heavy    Heavy
```

**Button Actions**
```
Button          Haptic    Intensity
Mute/Unmute     Heavy    Heavy
Solo/Unsolo     Heavy    Heavy
Reset           Medium   Medium
Randomize       Medium   Medium
Save            Success  N/A
```

**State Changes**
```
Event           Haptic    Pattern
Expand          Medium   Rise
Collapse        Light    Fall
Play            Medium   Tap
Pause           Medium   Tap
Error           Error    Error
```

## Adaptive Layout

### Orientation Support

**Portrait (iPhone)**
- Compact mode: 3 controls visible
- Expanded mode: All controls visible
- Bottom sheet positioning
- One-handed use optimized

**Landscape (iPhone)**
- Compact mode: 5 controls visible
- Expanded mode: All controls visible
- Side sheet positioning
- Two-handed use

**iPad (All orientations)**
- Always shows all controls (no compact mode)
- Larger touch targets
- Split view compatible
- Keyboard shortcuts available

### Size Classes

**Compact (iPhone)**
```swift
@Environment(\.horizontalSizeClass) var hClass

if hClass == .compact {
    // iPhone portrait
    isCompactMode = true
} else {
    // iPhone landscape / iPad
    isCompactMode = false
}
```

## Data Flow

### Parameter Update Flow
```
User drags slider
    ↓
Gesture recognizer detects drag
    ↓
Calculate new value (0.0 - 1.0)
    ↓
HapticFeedback.light()
    ↓
parameterStore.update(parameter, value)
    ↓
performance.applyParameter(parameter, value)
    ↓
JUCE Engine processes
    ↓
Audio output updated
    ↓
UI refreshes (60 FPS)
```

### Quick Action Flow
```
User taps "Mute" button
    ↓
HapticFeedback.heavy()
    ↓
performance.setMute(true)
    ↓
Button style updates (red color)
    ↓
Audio engine mutes output
    ↓
Other buttons disable (if applicable)
```

## Integration Points

### Presented From
- **SurfaceRootView** - Quick control button
- **PerformanceEditoriOS** - Collapse to mini
- **SweepControlView** - Quick edit A/B

### Opens To
- **PerformanceEditoriOS** - Expand to full editor
- **InstrumentPresetBrowser** - Browse presets

### Related Components
- **PerformanceEditoriOS** - Full editor
- **SweepControlView** - Performance selection
- **InstrumentPresetBrowser** - Preset management

## Performance Optimization

### Metrics
- **Startup Time:** < 100ms
- **Response Time:** < 16ms (60 FPS)
- **Memory Usage:** ~50 MB
- **Battery:** Minimal impact (optimized refresh)

### Optimization
- **Lazy Loading:** Expanded controls load on demand
- **Reduced Refresh:** Update only when visible
- **Throttled Haptics:** Limit haptic frequency
- **Background Mode:** Disable updates when hidden

## Accessibility

### VoiceOver
- **Slider Announcements:** "Density, 50 percent"
- **Button Labels:** "Mute button, currently off"
- **State Changes:** "Console expanded", "Playing"
- **Progress Updates:** "Density adjusted to 75"

### Dynamic Type
- **Scaling:** Supports up to 200%
- **Layout:** Adapts to font size
- **Line Breaks:** Adjusts automatically
- **Minimum Readable:** 11pt at 200%

### Touch Accommodations
- **Hold Duration:** Adjustable
- **Tap Assistance:** Larger touch targets
- **Touch Accommodations:** Ignore repeat touches

### Reduce Motion
- **Animations:** Disabled when requested
- **Transitions:** Fade instead of slide
- **Haptics:** Reduced intensity

## Error Handling

### Validation Errors
- **Out of Range:** Clamp to valid range
- **Invalid Parameter:** Show error message
- **Save Failed:** Show error, offer retry

### State Errors
- **Engine Disconnected:** Show warning, disable controls
- **Performance Corrupt:** Show error, offer reset
- **Network Error:** Local fallback

## Persistence

### Auto-Save
- **Frequency:** Every parameter change
- **Location:** Local CoreData
- **Cloud:** iCloud (optional)
- **Conflict:** Last write wins

### State Restoration
- **Expanded State:** Remember expand/collapse
- **Position:** Remember sheet position
- **Last Preset:** Restore on launch

## Future Enhancements

- [ ] Widget support (home screen widget)
- [ ] Apple Watch companion (remote control)
- [ ] MIDI learn mode (assign hardware controls)
- [ ] Macro recording (record sequence of changes)
- [ ] Touch Bar support (MacBook Pro)
- [ ] Quick Actions (3D Touch/Haptic Touch)
- [ ] Drag-and-drop (reorder controls)
- [ ] Custom themes (color schemes)
- [ ] Performance graphs (show parameter changes)

## Related Components

- **PerformanceEditoriOS** - Full editor
- **SweepControlView** - Performance selection
- **InstrumentPresetBrowser** - Preset browsing
- **HapticDensitySlider** - Custom slider component
