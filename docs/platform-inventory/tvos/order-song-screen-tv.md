# OrderSongScreenTV

**Status:** ✅ Complete - tvOS Exclusive  
**Platform:** tvOS (v17+)  
**Purpose:** Large-format song ordering interface optimized for 10-foot viewing

## Overview

OrderSongScreenTV is the **primary entry point** for the tvOS app, providing a living room-friendly interface for browsing, selecting, and ordering songs. It leverages the Siri Remote for intuitive navigation and supports voice commands for hands-free operation.

## File Location

```
swift_frontend/src/SwiftFrontendCore/Platform/tvOS/Screens/OrderSongScreenTV.swift
```

## Key Components

### Main Interface
```
┌──────────────────────────────────────────────────────────┐
│  🎵 White Room                            [Menu] [Siri]   │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────┐     │
│  │           Search: "Siri, find jazz songs"      │     │
│  └────────────────────────────────────────────────┘     │
│                                                            │
│  ┌────────────────┐  ┌────────────────┐               │
│  │   Symph No. 5  │  │   Techno Set   │               │
│  │   [Focused]    │  │                │               │
│  │   Classical    │  │   Electronic   │               │
│  │   4:32         │  │   6:15         │               │
│  │   8 sections   │  │   12 sections  │               │
│  └────────────────┘  └────────────────┘               │
│                                                            │
│  ┌────────────────┐  ┌────────────────┐               │
│  │   Jazz Trio    │  │   Ambient Pad  │               │
│  │                │  │                │               │
│  └────────────────┘  └────────────────┘               │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Focus State
- **Scale:** 1.05x when focused
- **Shadow:** 20pt shadow radius
- **Border:** 3pt accent color border
- **Animation:** 200ms ease-in-out

## Sections

### 1. Search Bar

**Purpose:** Voice and text-based song search

**Features:**
```
Search Interface
├── Text Input
│   ├── On-screen keyboard
│   ├── Dictation (Siri)
│   └── Search history
├── Voice Search
│   ├── "Siri, find [song name]"
│   ├── "Siri, show [genre] songs"
│   └── "Siri, play the chorus"
└── Filters
    ├── Genre (Orchestral, Electronic, Jazz, etc.)
    ├── Duration (Short, Medium, Long)
    ├── Section Count (Few, Many)
    └── Date Added (Recent, Old)
```

**Voice Commands:**
- **"Siri, find jazz songs"** - Filter by genre
- **"Siri, show long songs"** - Filter by duration
- **"Siri, play Symphony No. 5"** - Play specific song
- **"Siri, shuffle my songs"** - Randomize order

### 2. Song Grid

**Purpose:** Browse and select songs

**Features:**
```
Song Grid (3x2 layout)
├── Song Cards
│   ├── Thumbnail (form visualization)
│   ├── Title ("Symphony No. 5")
│   ├── Metadata (duration, sections, genre)
│   └── Focus Indicator
├── Organization
│   ├── Recently Added (default)
│   ├── Alphabetical
│   ├── Genre
│   └── Favorites
└── Grid Size
    ├── 2x2 (Default)
    ├── 3x2
    └── 3x3 (Dense)
```

**Focus Navigation:**
- **D-Pad:** Move focus up/down/left/right
- **Swipe:** Navigate grid (alternative to D-Pad)
- **Click:** Select focused song
- **Long Press:** Context menu

**Card Layout:**
```
┌─────────────────────┐
│                     │
│   [Form Visual]     │  40% height
│                     │
├─────────────────────┤
│  Symphony No. 5      │  Title: 25pt
│  Classical • 4:32    │  Meta: 18pt
│  8 sections          │  Detail: 16pt
└─────────────────────┘
```

### 3. Order Controls

**Purpose:** Reorder songs in setlist

**Features:**
```
Order Interface
├── Drag & Drop (Siri Remote)
│   ├── Long press to grab
│   ├── Swipe to move
│   └── Click to drop
├── Quick Actions
│   ├── "Move to top"
│   ├── "Move to bottom"
│   ├── "Shuffle all"
│   └── "Reset order"
└── Setlist Management
    ├── Save setlist
    ├── Load setlist
    ├── Clear setlist
    └── Share setlist
```

**Reorder Gesture:**
1. **Long Press** on song card (1 second)
2. **Card lifts** (scale: 1.1x, shadow: 30pt)
3. **Swipe** to new position
4. **Click** to drop

## State Management

```swift
@StateObject private var songLibrary: SongLibrary
@StateObject private var focusEngine: TVFocusEngine
@StateObject private var voiceSearch: VoiceSearchManager

@State private var selectedSongs: Set<SongID> = []
@State private var filterState: FilterState = .all
@State private var isReordering: Bool = false
```

### State Objects

1. **songLibrary** - Song collection and search
2. **focusEngine** - Custom focus management
3. **voiceSearch** - Siri integration

### Focus State
- **focusedSong:** Currently focused song ID
- **focusDirection:** Last focus movement
- **focusHistory:** Stack of previous focus positions

## Siri Remote Integration

### D-Pad Navigation
- **Swipe Up/Down:** Move focus between rows
- **Swipe Left/Right:** Move focus within row
- **Click:** Select focused song
- **Long Press:** Enter reorder mode

### Gesture Recognition
```swift
.gesture(
    DragGesture(minimumDistance: 0)
        .onChanged { value in
            if isReordering {
                handleReorderDrag(value)
            }
        }
        .onEnded { _ in
            if isReordering {
                commitReorder()
            }
        }
)
```

### Menu Button
- **Single Press:** Go back/exit mode
- **Double Press:** Home screen
- **Long Press:** Sleep/apple tv app switcher

### Siri Button
- **Hold:** Activate Siri voice search
- **Click:** Same as Menu button

## Voice Commands

### Built-in Intents
```swift
INIntent(OrderSongIntent)
├── "Order [song] first"
├── "Order [song] last"
├── "Order [song] after [song]"
├── "Move [song] to position [N]"
└── "Shuffle all songs"
```

### Custom Vocabulary
- **Song names** - Must be in song library
- **Genre names** - Classical, Electronic, Jazz, etc.
- **Action words** - Order, move, shuffle, play, stop

### Feedback
- **Voice acknowledgment:** "Okay, ordering Symphony No. 5 first"
- **Visual confirmation:** Card animation to new position
- **Error handling:** "I couldn't find that song"

## 10-Foot UI Design

### Typography
- **Title Font:** 28pt (large), Bold
- **Body Font:** 20pt (medium), Regular
- **Detail Font:** 18pt (small), Regular
- **Minimum readable:** 16pt at 10 feet

### Touch Targets
- **Minimum Size:** 92pt × 92pt (Apple HIG)
- **Spacing:** 24pt between cards
- **Padding:** 48pt around edges
- **Focus Ring:** 3pt border

### Color & Contrast
- **Background:** #1C1C1E (dark gray)
- **Surface:** #2C2C2E (lighter gray)
- **Accent:** #0A84FF (iOS blue)
- **Text:** #FFFFFF (white)
- **Contrast Ratio:** WCAG AAA (7:1 minimum)

### Animation Timing
- **Focus:** 200ms ease-in-out
- **Selection:** 150ms ease-out
- **Page Transition:** 300ms ease-in-out
- **Reorder:** 250ms spring

## Performance Optimization

### Rendering
- **60 FPS Target:** Smooth animations
- **Metal Acceleration:** GPU rendering
- **Lazy Loading:** Load images on demand
- **Image Caching:** Cache thumbnails

### Memory
- **Memory Limit:** 2GB (tvOS constraint)
- **Song Cache:** 20 songs max
- **Image Cache:** 50 images max
- **Automatic Cleanup:** Release unused resources

### Power
- **Low Power Mode:** Reduce animation complexity
- **Idle Timeout:** Dim screen after 5 minutes
- **Sleep Mode:** After 30 minutes inactivity

## Data Flow

### Song Selection Flow
```
User focuses song + clicks
    ↓
orderSongScreenTV.selectSong(songID)
    ↓
focusEngine.updateFocus(songID)
    ↓
Song details panel slides in
    ↓
FormVisualizerTV loads form
    ↓
Play preview (optional)
```

### Reorder Flow
```
User long-presses song
    ↓
Enter reorder mode (isReordering = true)
    ↓
User swipes to new position
    ↓
Handle drag gesture
    ↓
Update UI with new position
    ↓
User clicks to drop
    ↓
Commit reorder (songLibrary.reorder())
    ↓
Exit reorder mode
    ↓
Save new order
```

## Integration Points

### Navigation To
- **FormVisualizerTV** - Song form visualization (inline)
- **Playback Controls** - Play/pause/stop (future)

### Triggered From
- **App Launch** - Root view
- **MainMenu** - Browse Songs

### Modals
- **Song Details** - Extended song info
- **Setlist Management** - Save/load setlists
- **Settings** - App preferences

## Accessibility

### VoiceOver
- **Focus Announcements:** "Symphony No. 5, focused"
- **Status Updates:** "Moved to position 3"
- **Error Messages:** "Can't reorder, only one song"

### Guided Access
- **Single App Mode:** Lock to White Room
- **Control Remotes:** Limit Siri Remote functions
- **Touch Accommodations:** Adjust touch sensitivity

### Closed Captions
- **Visual Feedback:** Text for all sounds
- **Speaker Labels:** "Siri", "System"
- **Sound Effects:** Described in text

## Error Handling

### Voice Recognition Errors
- **No Match:** "I didn't understand. Try again."
- **Multiple Matches:** "Did you mean [list]?"
- **Network Error:** "Voice search unavailable. Use text."

### Song Load Errors
- **File Not Found:** "Song not available. Remove from library?"
- **Corrupt Data:** "Song damaged. Redownload?"

### Reorder Errors
- **Invalid Position:** "Can't move there. Try again."
- **Already There:** "Song already in that position."

## Persistence

### Auto-Save
- Setlist order saved immediately on reorder
- Filter preferences saved on change
- Focus position restored on relaunch

### Sync
- CloudKit sync across Apple TVs
- Handoff to iPhone/iPad (future)
- Family Sharing (future)

## Future Enhancements

- [ ] Up Next queue (auto-play next song)
- [ ] Music video background
- [ ] Karaoke mode (lyrics display)
- [ ] Party mode (shuffle + vote)
- [ ] Radio mode (smart recommendations)
- [ ] Multi-user profiles
- [ ] Game Center integration (challenges)
- [ ] AirPlay streaming (to other devices)
- [ ] Background video support
- [ ] Concert visuals

## Related Components

- **FormVisualizerTV** - Form visualization component
- **SiriOrderingIntents** - Voice command handling
- **OrderSongIntent** - Custom intent definition

## tvOS Guidelines Compliance

### Apple TV Human Interface Guidelines
- ✅ 92pt minimum touch targets
- ✅ High contrast (7:1 ratio)
- ✅ Large, readable fonts
- ✅ Simplified navigation
- ✅ Focus engine integration
- ✅ Voice search support
- ✅ 10-foot UI layout
- ✅ Single hand operation
- ✅ Landscape-only orientation
- ✅ No multi-touch gestures
