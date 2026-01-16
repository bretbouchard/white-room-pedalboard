# tvOS Platform Pages

This directory contains documentation for tvOS-exclusive pages and features.

## tvOS-Exclusive Pages

### 1. OrderSongScreenTV
**Status:** ✅ Complete  
**File:** `swift_frontend/src/SwiftFrontendCore/Platform/tvOS/Screens/OrderSongScreenTV.swift`

**Purpose:** Large-format song ordering interface optimized for 10-foot TV viewing

### 2. FormVisualizerTV
**Status:** ✅ Complete  
**File:** `swift_frontend/src/SwiftFrontendCore/Platform/tvOS/Components/FormVisualizerTV.swift`

**Purpose:** Form structure visualization with enhanced visuals for TV display

## tvOS-Specific Features

### Siri Remote Integration
- **D-Pad Navigation:** Directional focus movement
- **Swipe Gestures:** Horizontal/vertical scrolling
- **Click:** Select focused item
- **Menu Button:** Dismiss modals/go back
- **Long Press:** Context menu
- **Double Click:** Zoom/expand

### Focus Engine
- **Automatic Focus:** Native tvOS focus management
- **Focus Visuals:** Scale (1.05x) + shadow effects
- **Focus Sound:** Subtle audio feedback
- **Focus Guide:** Custom focus movement patterns

### 10-Foot UI Optimizations
- **Large Touch Targets:** 92pt minimum (Apple HIG)
- **High Contrast:** Enhanced visual separation
- **Text Scaling:** Large, readable fonts
- **Simplified Layout:** Reduced clutter for distant viewing

### Siri Integration
- **Voice Search:** "Siri, find song X"
- **Voice Commands:** "Play the chorus", "Go to bridge"
- **Dictation:** Text input via voice
- **Ordering Intents:** "Siri, order this song first"

## File Location

```
swift_frontend/src/SwiftFrontendCore/Platform/tvOS/
├── tvOSOptimizations.swift (550+ lines)
├── Components/
│   └── FormVisualizerTV.swift
├── Screens/
│   └── OrderSongScreenTV.swift
├── Siri/
│   └── SiriOrderingIntents.swift
└── Intents/
    └── OrderSongIntent.swift
```

## Performance

- **Target Frame Rate:** 60 FPS
- **Memory Usage:** ~120 MB
- **Startup Time:** < 2 seconds
- **Focus Response:** < 50ms
- **Audio Latency:** AppleAudioEngine (mock)

## Design Considerations

### Visibility
- All text must be readable from 10 feet away
- Minimum font size: 32pt
- High contrast ratios (WCAG AAA)
- Large icons and buttons

### Interaction
- No multi-touch gestures
- No hover states
- No keyboard input
- Simplified navigation paths

### Performance
- Optimized for TV hardware constraints
- Reduced animation complexity
- Lightweight rendering
- Memory-efficient caching
