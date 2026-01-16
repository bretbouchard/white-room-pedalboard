# InstrumentPresetBrowser

**Status:** ✅ Complete - iOS Exclusive  
**Platform:** iOS (v17+)  
**Purpose:** Touch-friendly preset management and browsing interface

## Overview

InstrumentPresetBrowser is a **mobile-optimized preset library** that allows users to browse, audition, and manage performance presets. It features touch-optimized navigation, haptic feedback on selection, and integrates with iOS sharing features for easy preset distribution.

## File Location

```
swift_frontend/src/SwiftFrontendCore/iOS/Components/InstrumentPresetBrowser.swift
```

## Key Components

### Main Interface (Portrait iPhone)
```
┌──────────────────────────────────────────┐
│  ← Preset Browser              [Search 🔍] │
├──────────────────────────────────────────┤
│                                            │
│  Categories: [All ▼]                      │
│  ┌────────────────────────────────────┐   │
│  │ [All] [Piano] [Synth] [Strings]    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │            Grand Piano              │ │
│  │            "Classic acoustic"       │ │
│  │  ┌────────────────────────────────┐ │ │
│  │  │ [▶ Play]  [⭐ Save]  [↑ Load] │ │ │
│  │  └────────────────────────────────┘ │ │
│  │  Tags: #acoustic #classical         │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │           Electric Piano             │ │
│  │           "Rhodes electric"          │ │
│  │  ┌────────────────────────────────┐ │ │
│  │  │ [▶ Play]  [⭐ Save]  [↑ Load] │ │ │
│  │  └────────────────────────────────┘ │ │
│  │  Tags: #electric #rhodes #tines     │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │              Synth Pad                │ │
│  │              "Ambient pad"           │ │
│  │  ┌────────────────────────────────┐ │ │
│  │  │ [▶ Play]  [⭐ Save]  [↑ Load] │ │ │
│  │  └────────────────────────────────┘ │ │
│  │  Tags: #synth #ambient #pad         │ │
│  └──────────────────────────────────────┘ │
│                                            │
└──────────────────────────────────────────┘
```

### Search Interface
```
┌──────────────────────────────────────────┐
│  🔍 Search Presets                       │
│  ├──────────────────────────────────────┤
│  │ [─────────────────────────────]     │
│  │ "pia"                                 │
│  └──────────────────────────────────────┘
│                                            │
│  Recent Searches:                          │
│  • "piano"                               │
│  • "jazz trio"                           │
│  • [Clear]                               │
│                                            │
│  Suggested:                               │
│  • Grand Piano                           │
│  • Electric Piano                        │
│  • Jazz Ensemble                         │
└──────────────────────────────────────────┘
```

### Detail View (Tap preset)
```
┌──────────────────────────────────────────┐
│  ← Grand Piano                    [Done]   │
├──────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │            [Waveform Preview]        │ │
│  │            [▶ Play]  [⏸ Pause]       │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Preset Information                         │
│  ┌──────────────────────────────────────┐ │
│  │ Name: Grand Piano                      │ │
│  │ Type: Instrument Preset                │ │
│  │ Category: Piano                         │ │
│  │ Description: "Classic acoustic..."     │ │
│  │ Tags: #acoustic #classical             │ │
│  │ Created: Jan 10, 2026                  │ │
│  │ Used: 23 times                         │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Parameters                                 │
│  ┌──────────────────────────────────────┐ │
│  │ Density: 50%                           │ │
│  │ Motion: 30%                            │ │
│  │ Complexity: 50%                         │ │
│  │ Swing: +5%                              │ │
│  │ Groove: 60%                             │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Actions                                    │
│  ┌────────┬────────┬────────┬────────┐   │
│  │ [Load] │ [Edit] │[Share] │[Copy]  │   │
│  └────────┴────────┴────────┴────────┘   │
│                                            │
│  Related Presets                            │
│  ┌──────────────────────────────────────┐ │
│  │  • Electric Piano                       │ │
│  │  • Upright Piano                        │ │ │
│  │  • Jazz Ensemble                       │ │
│  └──────────────────────────────────────┘ │
│                                            │
└──────────────────────────────────────────┘
```

## Sections

### 1. Category Filter

**Purpose:** Filter presets by instrument type

**Categories**
```
┌─────────────────────────────────────┐
│ [All]                                  │  ← Show all (N presets)
│ [Piano]                                │  ← Piano presets (N/4)
│ [Synth]                                │  ← Synth presets (N/4)
│ [Strings]                              │  ← String presets (N/8)
│ [Ensemble]                             │  →  Multi-instrument
│ [Custom]                               │  →  User-created
└─────────────────────────────────────┘
```

**Category Badges**
- **All:** No badge
- **Piano:** 🎹
- **Synth:** 🎛️
- **Strings:** 🎻
- **Ensemble:** 🎼
- **Custom:** ⭐

### 2. Preset Cards

**Purpose:** Display preset information in touch-friendly cards

**Card Layout**
```
┌──────────────────────────────────────┐
│                                        │
│  [Waveform/Icon]                    │  ← Visual preview
│                                        │
│  Preset Name                          │  ← Bold, 20pt
│  "Short description"                  │  ← Regular, 16pt
│                                        │
│  ┌────────────────────────────────┐  │
│  │ [▶ Play]  [⭐ Save]  [↑ Load] │  │  ← Action buttons
│  └────────────────────────────────┘  │
│                                        │
│  Tags: #piano #acoustic               │  ← Scrollable tags
│                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │  ← Swipe actions
└──────────────────────────────────────┘
```

**Card Actions**
- **Tap:** Open detail view
- **Play Button:** Preview preset (15 second preview)
- **Star Button:** Save to favorites
- **Load Button:** Load preset into editor
- **Swipe Left:** Delete
- **Swipe Right:** Duplicate

### 3. Search Bar

**Purpose:** Find presets by name, tag, or description

**Search Features**
- **Text Search:** Name, description
- **Tag Search:** Filter by tags
- **Fuzzy Search:** Typo tolerance
- **Recent Searches:** Quick re-search
- **Suggestions:** Auto-complete

**Search Interface**
```
┌──────────────────────────────────────┐
│ 🔍 [____________]              [Cancel] │
├──────────────────────────────────────┤
│  Filters:                               │
│  ☑ Names                                │
│  ☑ Tags                                 │
│  ☑ Descriptions                         │
└──────────────────────────────────────┘
```

### 4. Detail View

**Purpose:** Comprehensive preset information and actions

**Preview Section**
```
┌──────────────────────────────────────┐
│  ┌────────────────────────────────┐  │
│  │  [Waveform Visualization]    │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━   │  │  │  │
│  │  [▶ Play]  [⏸ Pause]  [■ Stop]  │  │
│  └────────────────────────────────┘  │
│  Duration: 0:00 / 0:15               │
└──────────────────────────────────────┘
```

**Information Section**
```
┌──────────────────────────────────────┐
│  Name: Grand Piano                     │
│  Type: Instrument Preset               │
│  Category: Piano                        │
│  Created: January 10, 2026           │
│  Modified: January 12, 2026           │
│  Used: 23 times                       │
│  Rating: ⭐⭐⭐⭐⭐ (5/5)           │
└──────────────────────────────────────┘
```

**Parameters Section**
```
┌──────────────────────────────────────┐
│  Parameters                             │
│  ┌──────────────────────────────┐   │
│  │ Density:  ━━━━━━━━━━●━━━━  │   │
│  │ Motion:   ━━━━━━━━━━━━━●━━━  │   │
│  │ Timing:   ━━━━━━━━━━━━━●━━━  │   │
│  └──────────────────────────────┘   │
│  See all parameters...                  │
└──────────────────────────────────────┘
```

**Actions Section**
```
┌──────────────────────────────────────┐
│  Actions                                │
│  ┌────────┬────────┬────────┬────────┐│
│  │ [Load] │ [Edit] │[Share] │[Copy] ││
│  └────────┴────────┴────────┴────────┘│
└──────────────────────────────────────┘
```

## State Management

```swift
@StateObject private var presetLibrary: PresetLibrary
@StateObject private var searchManager: SearchManager
@StateObject private var playbackEngine: PlaybackEngine

@State private var selectedCategory: Category = .all
@State private var searchQuery: String = ""
@State private var isPlaying: Bool = false
@State private var selectedPreset: Preset?
```

### State Objects

1. **presetLibrary** - Preset collection management
2. **searchManager** - Search and filter logic
3. **playbackEngine** - Preview playback

### Search State
- **searchQuery:** Current search text
- **selectedCategory:** Filter category
- **searchResults:** Matching presets
- **isSearching:** Search in progress

## Touch Gestures

### List Gestures

**Vertical Scroll**
```swift
ScrollView {
    LazyVStack {
        ForEach(presets) { preset in
            PresetCard(preset: preset)
        }
    }
}
```
- **Swipe Up/Down:** Scroll list
- **Fling:** Fast scroll with momentum
- **Tap:** Select item

**Swipe Actions**
```swift
.swipeActions(edge: .trailing) {
    Button(role: .destructive) {
        presetLibrary.delete(preset)
    } label: {
        Label("Delete", systemImage: "trash")
    }
}
```
- **Swipe Left:** Delete action
- **Swipe Right:** Duplicate action
- **Tap:** Reveal actions

### Card Gestures

**Tap**
- **Single Tap:** Open detail view
- **Double-Tap:** Load preset
- **Long Press:** Show context menu

**Preview Gesture**
```swift
.gesture(
    LongPressGesture(minimumDuration: 0.5)
        .onEnded { _ in
            isPlaying.toggle()
            if isPlaying {
                playbackEngine.preview(preset)
            } else {
                playbackEngine.stop()
            }
        }
)
```

## Haptic Feedback

### Selection Feedback
```
Event              Haptic    Intensity
Card focused      Light     Light
Card selected    Medium   Medium
Preset loaded      Heavy    Heavy
Delete action      Error    Error
```

### Scroll Feedback
```
Event              Haptic    Intensity
Scroll start       Light    Light
Bounce hit         Light    Light
End reached       Medium   Medium
```

### Action Feedback
```
Event              Haptic    Pattern
Play preview       Medium   Tap (0.05s)
Stop preview       Medium   Tap (0.05s)
Save favorite      Success  Success
Share             Success  Success
Error occurred     Error    Error
```

## Data Flow

### Preset Load Flow
```
User taps "Load" on preset card
    ↓
HapticFeedback.heavy()
    ↓
presetLibrary.loadPreset(presetID)
    ↓
Fetch preset data
    ↓
Update PerformanceEditoriOS
    ↓
engine.applyPreset(preset)
    ↓
Show success notification
```

### Preview Playback Flow
```
User taps "▶ Play" on preset card
    ↓
HapticFeedback.medium()
    ↓
playbackEngine.preview(preset, duration: 15s)
    ↓
Preset plays for 15 seconds
    ↓
Auto-stops at end
    ↓
HapticFeedback.light()
```

### Search Flow
```
User types in search bar
    ↓
searchManager.search(query)
    ↓
Filter presets by name/tags/desc
    ↓
Update preset list (live)
    ↓
HapticFeedback.selection() on each keystroke
```

## Adaptive Layout

### Orientation Support

**Portrait (iPhone)**
- Single column layout
- Full-width cards
- Bottom tab bar
- Search bar on top

**Landscape (iPhone)**
- Two column layout
- Compact cards
- Side tab bar
- Search bar on side

**iPad**
- Three column layout (all categories)
- Large cards
- Split view compatible
- Search bar in sidebar

### Size Classes

**Compact (iPhone)**
```swift
@Environment(\.horizontalSizeClass) var hClass

if hClass == .compact {
    // Single column layout
    columns = 1
} else {
    // Multi-column layout
    columns = 3
}
```

## Performance Optimization

### Metrics
- **Startup Time:** < 200ms
- **Search Response:** < 100ms
- **Preview Load:** < 500ms
- **Memory Usage:** ~75 MB
- **Frame Rate:** 60 FPS

### Optimization
- **Lazy Loading:** Load presets on scroll
- **Image Caching:** Cache waveform images
- **Search Debouncing:** 300ms delay
- **Preview Streaming:** Stream preview audio

## Integration Points

### Opens From
- **SurfaceRootView** - Browse presets button
- **PerformanceEditoriOS** - Load preset button
- **ConsoleXMini** - Presets button

### Opens To
- **PerformanceEditoriOS** - Load selected preset
- **Share Sheet** - Share preset via AirDrop/Messages

### Related Components
- **PerformanceEditoriOS** - Preset editing
- **ConsoleXMini** - Quick preset access
- **SweepControlView** - Performance A/B selection

## Accessibility

### VoiceOver
- **Card Announcements:** "Grand Piano, Classic acoustic, Piano preset"
- **Button Labels:** "Play button", "Load button", "Delete button"
- **State Changes:** "Searching", "Found 5 presets", "No results"
- **Progress Updates:** "Loading presets", "Preview playing"

### Dynamic Type
- **Scaling:** Supports up to 200%
- **Layout:** Adapts to font size
- **Line Breaks:** Adjusts automatically
- **Minimum Readable:** 11pt at 200%

### Touch Accommodations
- **Hold Duration:** Adjustable
- **Tap Assistance:** Larger touch targets
- **Touch Accommodations:** Ignore repeat touches
- **Assistive Touch:** Enable Touch adjustments

### Reduce Motion
- **Animations:** Disabled when requested
- **Transitions:** Fade instead of slide
- **Preview:** No visualizer (audio only)

## Error Handling

### Validation Errors
- **Preset Not Found:** "Preset unavailable. Removed from library?"
- **Load Failed:** "Couldn't load preset. Try again."
- **Save Failed:** "Couldn't save preset. Check permissions."

### Network Errors
- **Download Failed:** "Network unavailable. Using offline cache."
- **Sync Failed:** "Cloud sync failed. Will retry later."
- **Authentication:** "Please sign in to access cloud presets."

## Persistence

### Auto-Save
- **Favorites:** Save immediately on change
- **Recent Searches:** Save last 10 searches
- **View State:** Save scroll position, filters
- **Sort Order:** Save user preference

### Cloud Sync
- **iCloud Sync:** Automatic across devices
- **Conflict Resolution:** Most recent wins
- **Backup:** Automatic daily backup
- **Restore:** Restore from any backup

## Future Enhancements

- [ ] AI recommendations ("Similar presets")
- [ ] Cloud library (community presets)
- [ ] Preset packs (bundle presets)
- [ ] Rating system (user ratings)
- [ ] Download count (popularity)
- [ ] Preset versioning (track changes)
- [ ] Collaboration (share presets with team)
- [ ] Import/Export (preset file format)
- [ ] Preset marketplace (sell presets)
- [ ] Preset analytics (usage statistics)

## Related Components

- **PerformanceEditoriOS** - Preset editing
- **ConsoleXMini** - Quick preset access
- **SweepControlView** - Performance selection
- **PresetLibrary** - Preset data model
