# tvOS Order Song UI - Implementation Guide

## Overview

This document describes the tvOS-optimized Order Song interface with Siri Remote integration and 10-foot UI design.

## Files Created

### 1. OrderSongScreen_tvOS.swift
**Location:** `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/UI/Screens/OrderSongScreen_tvOS.swift`

Main tvOS-optimized interface for ordering songs with:
- Siri Remote navigation (D-pad, swipe gestures)
- Focus engine with visual feedback
- 10-foot UI design (large text, high contrast)
- Template quick apply
- Voice command feedback

### 2. SiriOrderingIntents_tvOS.swift
**Location:** `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/UI/Screens/SiriOrderingIntents_tvOS.swift`

Complete Siri integration system:
- Natural language intent parsing
- Voice command validation
- Template shortcuts
- Voice feedback generation

## Key Features

### 1. Siri Remote Navigation

**D-Pad Navigation:**
- Arrow keys move focus between sections
- Visual focus indicators (blue outline, shadow)
- Automatic scroll to focused element

**Swipe Gestures:**
- Continuous scrolling through long lists
- Swipe on certainty slider for adjustment
- Natural momentum scrolling

**Button Actions:**
- Select button (tap center) activates focused item
- Play/Pause toggles certainty (certain ↔ volatile)
- Menu button dismisses screens

**Digital Crown (Apple Watch Remote):**
- Fine-grained parameter adjustment
- Rotary control for certainty slider
- Smooth precision control

### 2. Focus Engine

**Visual Feedback:**
- Blue outline on focused elements
- Parallax effect on cards
- Scale animation on focus
- Shadow depth changes

**Focus Management:**
```swift
@FocusState private var focusedField: Field?

enum Field: Hashable {
    case name
    case intent
    case motion
    case harmony
    case certainty
    case identityLocks
    case evolution
    case templates
}
```

**Custom Focus Modifier:**
```swift
.focusable()
.tvFocusable()  // Adds tvOS-specific focus behavior
```

### 3. 10-Foot UI Design

**Typography Scale:**
- Headers: 48pt bold (vs 28pt on iOS)
- Body text: 28pt (vs 17pt on iOS)
- Captions: 22pt (vs 12pt on iOS)
- **1.5x-2x larger than iOS for couch viewing**

**Touch Targets:**
- Minimum 80pt height (vs 44pt on iOS)
- 32pt padding on cards
- Large focusable areas
- **Optimized for remote navigation**

**Color & Contrast:**
- High contrast text (WCAG AAA compliant)
- Gradient backgrounds on selected items
- Color-coded categories:
  - Intent: Blue/Purple gradients
  - Motion: Blue gradients
  - Harmony: Green gradients
  - Evolution: Purple gradients

**Layout:**
- 60pt horizontal padding
- 32-40pt vertical spacing
- Grid layouts (2 columns)
- Generous whitespace

### 4. Siri Voice Commands

**Natural Language Parsing:**

Users can say:
- "Order a tense accelerating cue"
- "Create an ambient loop"
- "Make it more volatile"
- "Use HBO template"
- "Create a ritual collage"

**Intent Detection:**

```swift
// Intent parsing
if lowercased.contains("cue") → Intent.cue
if lowercased.contains("loop") → Intent.loop
if lowercased.contains("ritual") → Intent.ritual

// Motion parsing
if lowercased.contains("accelerating") → Motion.accelerating
if lowercased.contains("oscillating") → Motion.oscillating

// Certainty parsing
if lowercased.contains("volatile") → certainty: 1.0
if lowercased.contains("tense") → certainty: 0.4
if lowercased.contains("certain") → certainty: 0.0
```

**Template Shortcuts:**
- "HBO Cue" → hboCue template
- "Ambient Loop" → ambientLoop template
- "Ritual Collage" → ritualCollage template
- "Performance Piece" → performancePiece template

**Voice Feedback:**
```swift
// Confirmation overlay
siriTranscript = "Created tense accelerating cue with revealed harmony"

// Auto-dismisses after 2 seconds
// Shows waveform icon + transcript
```

**Intent Validation:**
```swift
// Detects conflicts
if motion == .static && certainty > 0.7 {
    warning: "Static motion with volatile certainty may not create interesting results"
}
```

### 5. Certainty Slider (tvOS-Optimized)

**Visual Design:**
- Large track (16pt height)
- Gradient fill (green → yellow → red)
- White thumb indicator (32pt circle)
- Shadow for depth

**Interaction:**
- Swipe on Siri Remote to adjust
- Digital Crown for fine control
- Tap to jump to position
- Play/Pause for quick toggle (certain ↔ volatile)

**Visual Feedback:**
```swift
LinearGradient(
    colors: [.green, .yellow, .red],
    startPoint: .leading,
    endPoint: .trailing
)
```

### 6. Template Cards

**Design:**
- Grid layout (2 columns)
- Large icons (36pt)
- Color-coded by category
- Selected state with gradient background

**Animation:**
```swift
withAnimation(.easeInOut(duration: 0.2)) {
    contract.intent = intent
    markChanged()
}
```

**Quick Apply:**
- Single press to apply template
- Immediate visual feedback
- Voice confirmation overlay

### 7. Identity Locks

**Toggle Design:**
- Large icon (48pt) in colored box
- Checkmark circle when locked
- 80pt minimum touch target
- Focusable with D-pad

**Visual States:**
- Unlocked: Gray circle
- Locked: Accent color checkmark
- Icon background changes color

## Architecture

### View Hierarchy

```
OrderSongScreen_tvOS
├── Header (title + Siri instructions)
├── ScrollView
│   ├── BasicInfoSection
│   │   ├── Song Name TextField
│   │   └── Description TextField
│   ├── IntentSection
│   │   └── IntentCard_tvOS (grid)
│   ├── MotionSection
│   │   └── MotionCard_tvOS (grid)
│   ├── HarmonySection
│   │   └── HarmonyCard_tvOS (grid)
│   ├── CertaintySection
│   │   └── CertaintySlider_tvOS
│   ├── IdentityLocksSection
│   │   └── LockToggle_tvOS
│   ├── EvolutionSection
│   │   └── EvolutionCard_tvOS (grid)
│   └── TemplatesSection
│       └── TemplateCard_tvOS (grid)
└── Footer Actions
    ├── Cancel Button
    └── Save Song Button
```

### State Management

```swift
@State private var contract: SongOrderContract
@State private var isLoading: Bool = false
@State private var saveError: Error?
@State private var showingSaveError: Bool = false
@State private var hasChanges: Bool = false
@State private var showingTemplatePicker: Bool = false
@State private var focusedSection: Section? = nil
@State private var siriTranscript: String? = nil

@FocusState private var focusedField: Field?
```

### Siri Integration Flow

```
1. User speaks: "Order a tense accelerating cue"
2. INVoiceShortcut triggers OrderSongIntent
3. OrderSongIntentHandler.parseIntent() extracts parameters
4. validate() checks for conflicts
5. generateFeedback() creates confirmation message
6. OrderSongScreen receives voice command notification
7. Updates contract state
8. Shows siriTranscript overlay
9. Auto-dismisses after 2 seconds
```

## Testing

### Unit Testing

Test intent parsing:
```swift
let handler = OrderSongIntentHandler()
let intent = handler.parseIntent(from: "Order a tense accelerating cue")
assert(intent.intent == .cue)
assert(intent.motion == .accelerating)
assert(intent.certainty == 0.6)
```

Test validation:
```swift
let errors = handler.validate(intent)
assert(errors.isEmpty, "Should not have conflicts")
```

### Manual Testing Checklist

**Remote Navigation:**
- [ ] Arrow keys move focus correctly
- [ ] Swipe gestures scroll smoothly
- [ ] Select button activates items
- [ ] Play/Pause toggles certainty
- [ ] Menu button dismisses

**Focus Engine:**
- [ ] Visual feedback on focus
- [ ] Smooth focus transitions
- [ ] Parallax effects on cards
- [ ] Auto-scroll to focused item

**Voice Commands:**
- [ ] "Order a tense accelerating cue"
- [ ] "Create an ambient loop"
- [ ] "Use HBO template"
- [ ] "Make it more volatile"
- [ ] Voice confirmation appears

**10-Foot UI:**
- [ ] Text readable from couch (10 feet)
- [ ] High contrast (WCAG AAA)
- [ ] Large touch targets (80pt minimum)
- [ ] Grid layouts work well
- [ ] Color coding is clear

**Templates:**
- [ ] All 4 templates apply correctly
- [ ] Template browser navigation works
- [ ] Quick apply from main screen

### Demo Commands

```swift
#if DEBUG
VoiceCommandSimulator.shared.simulateVoiceCommand("Order a tense accelerating cue")
VoiceCommandSimulator.shared.simulateVoiceCommand("Create an ambient loop")
VoiceCommandSimulator.shared.simulateVoiceCommand("Make it more volatile")
#endif
```

## Platform Comparison

| Feature | iOS | tvOS | macOS |
|---------|-----|------|-------|
| Navigation | Touch swipe | Siri Remote D-pad | Mouse/keyboard |
| Text Size | 17pt body | 28pt body | 13pt body |
| Touch Targets | 44pt minimum | 80pt minimum | 32pt minimum |
| Focus | Tap highlight | Focus engine | Hover state |
| Voice | Siri (optional) | Siri (primary) | Not supported |
| Layout | Vertical stack | Grid (2 columns) | Compact list |

## Known Limitations

1. **Siri Authorization:** Requires user to grant Siri permissions in Settings
2. **Voice Recognition Accuracy:** Dependent on Siri's natural language understanding
3. **No Haptic Feedback:** tvOS remote doesn't provide haptic feedback
4. **Limited Text Input:** On-screen keyboard is cumbersome, prefer voice

## Future Enhancements

1. **Visual Form Preview:** Show how parameters affect song structure
2. **Performance Integration:** Direct link to Performance Editor
3. **Batch Operations:** Apply template to multiple songs
4. **Custom Templates:** User-created templates
5. **Voice Learning:** Adapt to user's voice patterns

## References

- [Apple TV Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/tvos)
- [SiriKit Intent Reference](https://developer.apple.com/documentation/sirikit)
- [Focus Engine Guide](https://developer.apple.com/documentation/uikit/focus_engine)
- [tvOS Design Principles](https://developer.apple.com/design/human-interface-guidelines/tvos/overview/design-principles)

## Support

For issues or questions:
1. Check BD issue white_room-228
2. Review implementation in OrderSongScreen_tvOS.swift
3. Test with VoiceCommandSimulator in DEBUG mode
4. Verify focus engine behavior in Xcode tvOS simulator
