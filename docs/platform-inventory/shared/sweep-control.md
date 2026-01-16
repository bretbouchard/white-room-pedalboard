# SweepControlView

**Status:** ✅ Complete - Available on all platforms  
**File:** `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Surface/SweepControlView.swift`

## Purpose

SweepControlView is the **core interaction component** for White Room's parallel performance universe system. It provides an intuitive slider-based interface for blending between two performances in real-time, creating smooth transitions between musical states.

## Components

### Performance Selectors
```
┌─────────────────────────────────────────┐
│ Performance A        Performance B      │
│ [Piano ▼]            [Techno ▼]         │
│ "Soft and melodic"   "Energetic beats"  │
└─────────────────────────────────────────┘
```

### Blend Control
```
┌─────────────────────────────────────────┐
│         ┌─────┬─────┬─────┬─────┐      │
│ Piano   │ 25% │ 50% │ 75% │     │Techno│
│         └─────┴─────┴─────┴─────┘      │
│            ↑ Blend Value              │
└─────────────────────────────────────────┘
```

### Visual Feedback
- Real-time blend percentage display
- Performance descriptions
- Active performance highlighting
- Smooth transition animations

## Platform Behavior

### macOS
- **Mouse Control:** Click and drag slider
- **Keyboard:** Arrow keys for fine adjustment
- **Hover:** Tooltip showing exact percentage
- **Shortcuts:** 
  - `A`: Select Performance A
  - `B`: Select Performance B
  - `←`/`→`: Adjust blend

### tvOS
- **Siri Remote:** Swipe to adjust blend
- **Focus:** Large touch targets (92pt)
- **Visual:** High-contrast focus indicators
- **Gestures:**
  - Swipe left/right: Adjust blend
  - Click: Select performance picker

### iOS
- **Touch:** Pan gesture on slider
- **Haptics:** Feedback at 0%, 50%, 100%
- **Orientation:** Portrait/landscape support
- **Gestures:**
  - Pan: Adjust blend
  - Tap: Open performance picker

## Properties

```swift
@Binding var blendValue: Double              // 0.0 - 1.0
@Binding var performanceA: PerformanceInfo   // Left performance
@Binding var performanceB: PerformanceInfo   // Right performance
let availablePerformances: [PerformanceInfo] // All available
let onBlendChanged: Callback                 // Blend change handler
```

## Callback Interface

```swift
onBlendChanged: (PerformanceInfo, PerformanceInfo, Double) -> Void
```

**Parameters:**
1. `performanceA` - Current left performance
2. `performanceB` - Current right performance
3. `blendValue` - Current blend position (0.0-1.0)

**Called When:**
- User drags blend slider
- User selects new performance A or B
- Programmatic blend value changes

## Visual States

### Blend States
- **0% (Left):** Pure Performance A
- **25%:** Mostly A, slight B influence
- **50%:** Equal blend of both
- **75%:** Mostly B, slight A influence
- **100% (Right):** Pure Performance B

### Selection States
- **Active:** Selected performance highlighted
- **Available:** Dropdown shows available options
- **Empty:** "No performance" placeholder

## Performance Info Structure

```swift
struct PerformanceInfo {
    let id: String              // Unique identifier
    let name: String            // Display name
    let description: String     // Short description
    // Future: icon, color, tags, etc.
}
```

## Interaction Patterns

### Primary Workflow
1. Select Performance A from dropdown
2. Select Performance B from dropdown
3. Drag slider to blend between them
4. Real-time audio feedback

### Advanced Workflow
1. Long-press performance name → Edit performance
2. Double-click blend slider → Snap to 50%
3. Right-click → Context menu (save as preset)

## Data Flow

```
User Interaction
    ↓
blendValue @State changes
    ↓
onBlendChanged callback triggered
    ↓
Parent view (SurfaceRootView)
    ↓
engine.setPerformanceBlend()
    ↓
JUCE Engine processes
    ↓
Audio morphing in real-time
```

## Accessibility

### VoiceOver Labels
- "Performance sweep control, slider"
- "Performance A, Piano, currently selected"
- "Performance B, Techno, currently selected"
- "Blend value, 50 percent"

### Keyboard Navigation
- Tab: Focus sweep control
- Arrow keys: Adjust blend
- Space: Open performance picker
- Enter: Confirm selection

### Dynamic Type
- Scales with system font size
- Maintains readability at large sizes
- Line breaks adjust automatically

## Performance Optimization

### Rendering
- **60 FPS:** Smooth slider animations
- **Metal-accelerated:** GPU rendering on supported devices
- **Reduced Motion:** Disables animations when requested

### Memory
- **Lazy Loading:** Performance images loaded on demand
- **Caching:** Frequently used performances cached
- **Cleanup:** Unused performances released

## Platform-Specific Code

```swift
#if os(macOS)
    // Keyboard shortcuts
    .keyboardShortcut("a", modifiers: .command)
    .hoverEffect()
    
#elseif os(tvOS)
    // Focus engine
    .focusable() { isFocused in ... }
    .tvosTouchTarget(minSize: 92)
    
#elseif os(iOS)
    // Haptic feedback
    .onChange(of: blendValue) { _, newValue in
        HapticFeedback.light()
    }
    .iosTouchTarget(minSize: 44)
#endif
```

## Testing

### Unit Tests
- Blend value calculation
- Performance selection logic
- Callback invocation
- State updates

### Integration Tests
- Engine communication
- Audio output changes
- Performance loading

### UI Tests
- Slider drag interaction
- Performance picker selection
- Platform-specific gestures

## Future Enhancements

- [ ] Performance preview (tap to hear)
- [ ] Blend curve presets (linear, exponential, etc.)
- [ ] Visual performance representation (waveform, spectrum)
- [ ] Blend automation recording
- [ ] Save favorite blends as presets
- [ ] Multi-performance blending (>2 performances)
- [ ] Visual transition animations

## Related Components

- **SurfaceRootView** - Parent container
- **JUCEEngine** - Audio backend
- **PerformanceInfo** - Data model
- **PerformanceEditor** - Performance editor (future)
