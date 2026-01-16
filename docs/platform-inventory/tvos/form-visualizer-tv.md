# FormVisualizerTV

**Status:** ✅ Complete - tvOS Exclusive  
**Platform:** tvOS (v17+)  
**Purpose:** Large-scale form structure visualization for 10-foot TV viewing

## Overview

FormVisualizerTV provides **enhanced visual representation** of song form structure, optimized for viewing from a couch. It displays section relationships, ratios, and hierarchy with large, clear visuals and smooth animations that work well with Siri Remote navigation.

## File Location

```
swift_frontend/src/SwiftFrontendCore/Platform/tvOS/Components/FormVisualizerTV.swift
```

## Key Components

### Main Interface
```
┌──────────────────────────────────────────────────────────────────┐
│  🎵 Form Visualizer                                    [Menu] [Siri] │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│           Symphony No. 5 (4:32 • 8 sections)                    │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │    ┌──────────────────────────────────────────────┐      │  │
│  │    │                                               │      │  │
│  │    │           EXPOSITION (0:00 - 0:45)           │      │  │
│  │    │            [━━━━━━━━━━━━━━━━━━]             │      │  │
│  │    │                                               │      │  │
│  │    └───────────────────────────────────────────────┘      │  │
│  │                        ↓                                 │      │  │
│  │    ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐          │  │
│  │    │ Theme │  │ Theme │  │ Theme │  │ Theme │          │  │
│  │    │ 1A    │  │ 1A    │  │ 2     │  │ 3     │          │  │
│  │    │ 1:00  │  │ 1:00  │  │ 0:30  │  │ 1:30  │          │  │
│  │    └───────┘  └───────┘  └───────┘  └───────┘          │  │
│  │         ↓          ↓          ↓          ↓              │  │
│  │    ┌───────────────────────────────────────────────┐     │  │
│  │    │         EXPOSITION (REPEAT) (0:45 - 2:45)    │     │  │
│  │    │            [━━━━━━━━━━━━━━━━━━]            │     │  │
│  │    └───────────────────────────────────────────────┘     │  │
│  │                        ↓                                 │      │  │
│  │    ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐          │  │
│  │    │ Theme │  │ Theme │  │ Theme │  │ Theme │          │  │
│  │    │ 1A    │  │ 1B    │  │ 2     │  │ 3     │          │  │
│  │    │ 1:00  │  │ 1:00  │  │ 0:30  │  │ 1:30  │          │  │
│  │    └───────┘  └───────┘  └───────┘  └───────┘          │  │
│  │         ↓          ↓          ↓          ↓              │      │  │
│  │    ┌───────────────────────────────────────────────┐     │  │
│  │    │              DEVELOPMENT (2:45 - 3:15)       │     │  │
│  │    │            [━━━━━━━━━━━━]                  │     │  │
│  │    └───────────────────────────────────────────────┘     │  │
│  │                        ↓                                 │      │  │
│  │    ┌───────────────────────────────────────────────┐     │  │
│  │    │                RECAPITULATION (3:15 - 4:32)   │     │  │
│  │    │            [━━━━━━━━━━━━━━━━━━]            │     │  │
│  │    └───────────────────────────────────────────────┘     │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Overall Form: 1 : 1 : 0.5 : 0.25                               │
│                                                                    │
│  [Focus to expand section details]                               │
└──────────────────────────────────────────────────────────────────┘
```

## Visual Components

### Section Blocks

**Section Representation**
```
Section Block
├── Title ("EXPOSITION")
├── Duration ("0:00 - 0:45")
├── Timeline bar (filled progress)
├── Sub-sections (4 themes)
│   ├── Theme card
│   ├── Duration badge
│   └── Focus indicator
└── Connection lines (to next section)
```

**Section States**
- **Unfocused:** Normal size, single border
- **Focused:** Enlarged (1.1x), thick border (3pt), shadow
- **Playing:** Highlighted border, pulse animation
- **Past:** Dimmed opacity (0.6)

### Theme Cards

**Theme Representation**
```
Theme Card
├── Name ("Theme 1A")
├── Duration badge ("1:00")
├── Color coding (by role)
├── Focus ring (when focused)
└── Details (on focus)
    ├── Role: "Violin"
    ├── Key: "C Major"
    └── Tempo: "120 BPM"
```

**Color Coding**
- **Red:** Strings (violin, cello)
- **Blue:** Winds (flute, clarinet)
- **Green:** Brass (trumpet, trombone)
- **Yellow:** Percussion
- **Purple:** Full ensemble

### Ratio Display

**Form Ratio Visualization**
```
Overall Form: 1 : 1 : 0.5 : 0.25

┌────┬────┬────┬────┬────┐
│    │    │    │    │    │
│ 1  │ 1  │0.5 │0.25│    │
│    │    │    │    │    │
└────┴────┴────┴────┴────┘

Visual proportion of form structure
```

**Ratio Calculation**
- **Base unit:** Smallest section duration
- **Display:** As multiples of base
- **Animation:** Bars grow from zero
- **Label:** "1 : 1 : 0.5 : 0.25"

## Navigation Patterns

### Focus Movement

**Vertical Navigation** (D-Pad Up/Down)
- Focus moves between sections
- Smooth scrolling animation
- Focus sound effect on change

**Horizontal Navigation** (D-Pad Left/Right)
- Focus moves between sub-sections (themes)
- Cyclic navigation (wraps around)
- Quick navigation to adjacent section

**Section Expansion** (Click/Select)
- Focused section expands to show details
- Other sections compress
- Smooth animation (200ms)
- Press Menu to collapse

**Quick Jump** (Long Press)
- Jump to first section
- Jump to last section
- Jump to currently playing
- Jump to specific section (voice)

## State Management

```swift
@StateObject private var form: Form
@StateObject private var focusEngine: TVFocusEngine
@StateObject private var playbackEngine: PlaybackEngine

@State private var focusedSection: SectionID?
@State private var isExpanded: Bool = false
@State private var showDetails: Bool = false
```

### State Objects

1. **form** - Form structure and data
2. **focusEngine** - Custom focus management
3. **playbackEngine** - Playback state tracking

### Focus State
- **focusedSection:** Currently focused section
- **focusedTheme:** Currently focused theme
- **focusHistory:** Stack of previous focus positions
- **predictedFocus:** Next likely focus target

## Animations

### Focus Animation
```swift
.scaleEffect(isFocused ? 1.1 : 1.0)
.shadow(radius: isFocused ? 20 : 0)
.animation(.easeInOut(duration: 0.2), value: isFocused)
```

**Timing:**
- **Scale:** 200ms ease-in-out
- **Shadow:** 200ms ease-in-out
- **Border:** 150ms ease-out

### Playback Animation
```
┌────────────────────────────────────┐
│ EXPOSITION [━━━━━━━━━━━━━━━━━━] │  ← Playhead moves
└────────────────────────────────────┘
         ↑
    Red line moves right to left
    60 FPS smooth animation
```

### Transition Animation
- **Section transition:** Fade out (100ms) → Pan → Fade in (100ms)
- **Expansion:** 200ms spring
- **Collapse:** 150ms ease-in

## 10-Foot UI Design

### Typography
- **Section Title:** 36pt (large), Bold
- **Duration:** 28pt (medium), Regular
- **Theme Name:** 24pt (medium), Regular
- **Ratio:** 32pt (medium), Semibold

### Spacing
- **Section Padding:** 48pt
- **Section Gap:** 36pt
- **Theme Gap:** 24pt
- **Edge Margin:** 60pt

### Visual Hierarchy
1. **Song Title** (largest, top)
2. **Section Blocks** (medium, prominent)
3. **Theme Cards** (small, details)
4. **Ratio Display** (bottom, subtle)

### Color Contrast
- **Background:** #1C1C1E (dark gray)
- **Surface:** #2C2C2E (lighter gray)
- **Accent:** #0A84FF (iOS blue)
- **Text:** #FFFFFF (white)
- **Playing:** #30D158 (green)

## Siri Integration

### Voice Commands

**Navigation Commands**
- "Siri, go to exposition"
- "Siri, show me the development"
- "Siri, jump to recapitulation"
- "Siri, next section"
- "Siri, previous section"

**Information Commands**
- "Siri, how long is this song?"
- "Siri, what's the form structure?"
- "Siri, show me the theme breakdown"
- "Siri, what's the ratio?"

**Playback Commands**
- "Siri, play from the exposition"
- "Siri, jump to the development"
- "Siri, loop this section"
- "Siri, stop playback"

### Voice Feedback
- **Confirmation:** "Going to exposition"
- **Error:** "I couldn't find that section"
- **Information:** "The form is 1-1-0.5-0.25"

## Data Flow

### Section Focus Flow
```
User swipes down on D-Pad
    ↓
focusEngine.moveFocus(.down)
    ↓
form.getNextSection(currentSection)
    ↓
focusedSection = nextSection
    ↓
UI updates:
├── Previous section loses focus
├── Next section gains focus
├── Focus animation plays
└── Focus sound plays
```

### Section Expansion Flow
```
User clicks on focused section
    ↓
form.expandSection(focusedSection)
    ↓
isExpanded = true
    ↓
UI updates:
├── Focused section grows (55% height)
├── Other sections shrink (8% height each)
├── Theme cards reveal details
└── Smooth animation (200ms)
```

## Performance Optimization

### Rendering
- **60 FPS:** Smooth animations
- **Metal:** GPU-accelerated
- **Lazy Loading:** Load section details on expand
- **Caching:** Cache section renderings

### Memory
- **Memory Limit:** 2GB (tvOS constraint)
- **Section Cache:** 8 sections max
- **Image Cache:** 20 images max
- **Automatic Cleanup:** Release unused resources

### Animation Quality
- **Reduced Motion:** Disable animations
- **Quality Scaling:** Auto-adjust based on performance
- **Frame Skipping:** Drop frames if needed

## Integration Points

### Used By
- **OrderSongScreenTV** - Inline component
- **SiriOrderingIntents** - Voice command visualization

### Related Components
- **Form** - Form data model
- **Section** - Section data model
- **PlaybackEngine** - Playback state

## Accessibility

### VoiceOver
- **Section Announcements:** "Exposition, 45 seconds, 4 themes"
- **Theme Announcements:** "Theme 1A, 1 minute, violin"
- **Navigation Announcements:** "Now focused: Development section"
- **State Changes:** "Section expanded", "Playing exposition"

### Guided Access
- **Single App Mode:** Lock to White Room
- **Control Remotes:** Limit Siri Remote functions
- **Touch Accommodations:** Adjust touch sensitivity

### High Contrast
- **Enhanced Borders:** Thicker borders (5pt)
- **Increased Contrast:** WCAG AAA compliance
- **Color Blind:** Pattern + color coding

## Error Handling

### Voice Recognition Errors
- **No Match:** "I didn't understand. Try again."
- **Multiple Matches:** "Did you mean [list]?"
- **Section Not Found:** "That section doesn't exist"

### Display Errors
- **Corrupt Data:** "Form structure unavailable"
- **Missing Duration:** "Duration unknown"
- **Invalid Ratio:** "Form ratio calculation failed"

## Persistence

### State Restoration
- **Focused Section:** Restore on relaunch
- **Expanded State:** Remember expanded section
- **Scroll Position:** Restore scroll position

### Auto-Save
- **Preferences:** Save immediately on change
- **Custom Views:** Save user customization
- **Voice Commands:** Save frequent commands

## Future Enhancements

- [ ] Playhead scrubbing (Siri Remote swipe)
- [ ] Section looping (voice command)
- [ ] Theme solo/mute (click to isolate)
- [ ] Form editing (reorder sections)
- [ ] Form comparison (show two forms side-by-side)
- [ ] Historical forms (show previous versions)
- [ ] Form overlay (compare performance to form)
- [ ] Beat grid overlay (show measures)
- [ ] Lyric display (sync with playback)
- [ ] Concert visuals (background imagery)

## Related Components

- **OrderSongScreenTV** - Parent container
- **Form** - Form data model
- **Section** - Section data model
- **SiriOrderingIntents** - Voice command handling
