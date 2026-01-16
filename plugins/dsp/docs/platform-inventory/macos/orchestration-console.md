# OrchestrationConsole

**Status:** ✅ Complete - macOS Exclusive  
**Platform:** macOS (v14+)  
**Purpose:** Song orchestration and batch operations dashboard

## Overview

OrchestrationConsole is the **central command center** for macOS users to manage multiple songs, performances, and large-scale operations. It provides a professional workspace for organizing, analyzing, and exporting musical content at scale.

## File Location

```
swift_frontend/src/SwiftFrontendCore/Platform/macOS/Screens/OrchestrationConsole.swift
```

## Key Components

### Main Workspace
```
┌──────────────────────────────────────────────────────────┐
│  🎵 Orchestration Console                    [⌘W] [⌘,] [⌘.] │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Song Library   │  │ Performance     │              │
│  │   (32 songs)     │  │ Matrix          │              │
│  │                 │  │                 │              │
│  │  [Song List]     │  │  [8x8 Grid]      │              │
│  │                 │  │                 │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                            │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Template       │  │  Export Queue    │              │
│  │  Manager        │  │                 │              │
│  │                 │  │  [3 exports]     │              │
│  │  [12 templates] │  │  Progress bars   │              │
│  │                 │  │                 │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Toolbar Actions
- **⌘O** - Open song
- **⌘S** - Save all
- **⌘W** - Close console
- **⌘,** - Open preferences
- **⌘.** - Stop all playback

## Sections

### 1. Song Library Panel

**Purpose:** Browse and manage song collection

**Features:**
```
Song List View
├── Song Cards (horizontal scroll)
│   ├── Thumbnail (form visualization)
│   ├── Title ("Symphony No. 5")
│   ├── Duration ("4:32")
│   ├── Section count ("8 sections")
│   └── Tags (["orchestral", "classical"])
├── Search Bar
│   ├── Filter by name
│   ├── Filter by tags
│   └── Filter by date
└── Bulk Actions Toolbar
    ├── Select All (⌘A)
    ├── Duplicate (⌘D)
    ├── Delete (⌘⌫)
    └── Export (⌘E)
```

**Interactions:**
- **Double-click:** Open song in editor
- **Right-click:** Context menu
- **⌘+Click:** Multi-select
- **Shift+Click:** Range select
- **Drag:** Reorder songs

### 2. Performance Matrix Panel

**Purpose:** Visual performance editor grid

**Features:**
```
Performance Matrix (8x8 grid)
├── Rows: Songs (8 songs)
├── Columns: Sections per song
├── Cells: Performance assignments
│   ├── Performance dropdown
│   ├── Density slider
│   └── Solo/Mute buttons
└── Matrix Operations
    ├── Fill down (⌘⇧D)
    ├── Fill right (⌘⇧R)
    ├── Clear all (⌘⌫)
    └── Randomize (⌘⇧R)
```

**Cell States:**
- **Empty:** No performance assigned
- **Active:** Performance selected and enabled
- **Muted:** Performance selected but muted
- **Solo:** Only this performance playing
- **Conflict:** Overlapping assignments

### 3. Template Manager Panel

**Purpose:** Create and manage song templates

**Features:**
```
Template Library
├── Template Categories
│   ├── Orchestral (4 templates)
│   ├── Electronic (3 templates)
│   ├── Jazz (2 templates)
│   └── Custom (3 templates)
├── Template Cards
│   ├── Name ("32-Bar Form")
│   ├── Description ("Standard AABA")
│   ├── Section count
│   └── Usage count
└── Template Actions
    ├── Create new (⌘N)
    ├── Duplicate
    ├── Edit
    └── Delete
```

**Template Structure:**
```json
{
  "id": "template-uuid",
  "name": "32-Bar Form",
  "description": "Standard AABA form",
  "sections": [
    { "label": "A", "ratio": 1 },
    { "label": "A", "ratio": 1 },
    { "label": "B", "ratio": 1 },
    { "label": "A", "ratio": 1 }
  ],
  "defaultPerformances": {}
}
```

### 4. Export Queue Panel

**Purpose:** Batch export operations

**Features:**
```
Export Queue
├── Active Exports
│   ├── Progress bars
│   ├── Time remaining
│   ├── Cancel button
│   └── Pause/Resume
├── Completed Exports
│   ├── Success indicators
│   ├── File locations
│   ├── Open in Finder
│   └── Re-export button
└── Export Settings
    ├── Format (WAV, MP3, FLAC, etc.)
    ├── Quality (bitrate, sample rate)
    ├── Metadata
    └── Folder selection
```

## State Management

```swift
@StateObject private var songLibrary: SongLibrary
@StateObject private var performanceMatrix: PerformanceMatrix
@StateObject private var templateManager: TemplateManager
@StateObject private var exportQueue: ExportQueue

@State private var selectedSongs: Set<SongID> = []
@State private var activePanel: Panel = .songs
@State private var isProcessing: Bool = false
```

### State Objects

1. **songLibrary** - Song collection management
2. **performanceMatrix** - Grid state and operations
3. **templateManager** - Template library
4. **exportQueue** - Export job queue

### Derived State

- **totalSongs** - Count of all songs
- **selectedCount** - Number of selected songs
- **exportProgress** - Overall export progress
- **canExport** - Validation state for export

## Keyboard Shortcuts

### Navigation
- **⌘1** - Song Library panel
- **⌘2** - Performance Matrix panel
- **⌘3** - Template Manager panel
- **⌘4** - Export Queue panel
- **⌘`** - Cycle through panels

### Song Operations
- **⌘O** - Open song
- **⌘S** - Save selected songs
- **⌘⇧S** - Save all songs
- **⌘D** - Duplicate selected
- **⌘⌫** - Delete selected

### Matrix Operations
- **⌘⇧D** - Fill down
- **⌘⇧R** - Fill right
- **⌘⇧C** - Clear selection
- **⌘R** - Randomize cells

### Export Operations
- **⌘E** - Export selected
- **⌘⇧E** - Export all
- **⌘.** - Stop all exports
- **⌘,** - Export settings

## Context Menus

### Song Card Context Menu
```
Right-click on song card:
├── Open
├── Duplicate
├── Rename
├── Add to Setlist
├── Export →
│   ├── As WAV
│   ├── As MP3
│   └── Batch Export
├── Get Info
├── Reveal in Finder
└── Delete
```

### Matrix Cell Context Menu
```
Right-click on matrix cell:
├── Assign Performance →
│   ├── [Performance List]
├── Copy Assignment
├── Paste Assignment
├── Clear Cell
├── Solo Cell
├── Mute Cell
└── Cell Info
```

## Data Flow

### Song Loading Flow
```
User double-clicks song
    ↓
orchestrationConsole.openSong(songID)
    ↓
songLibrary.loadSong(songID)
    ↓
JUCE Engine loads song data
    ↓
Performance Matrix updates
    ↓
UI displays song details
```

### Batch Export Flow
```
User selects songs + presses ⌘E
    ↓
orchestrationConsole.exportSelected()
    ↓
exportQueue.addToQueue(selectedSongs)
    ↓
For each song:
    ├── Render audio
    ├── Encode to format
    ├── Write metadata
    └── Update progress
    ↓
All exports complete
    ↓
Show completion notification
```

## Integration Points

### Opens In Modal
- **AnalysisDashboard** - View performance analytics
- **ExportStudio** - Advanced export options
- **SongOrchestrator** - Advanced reordering
- **TemplateManager** - Template editing (can be standalone)
- **PerformanceMatrix** - Detailed editing

### Triggered From
- **SurfaceRootView** - Orchestration menu item
- **MainMenu** - Window → Orchestration Console
- **Keyboard Shortcut** - ⌘⇧O

## Performance Characteristics

### Metrics
- **Startup Time:** < 500ms
- **Song Load Time:** < 100ms per song
- **Export Speed:** Real-time encoding
- **Memory Usage:** ~200 MB (with 32 songs)
- **Frame Rate:** 60 FPS during operations

### Optimization
- **Lazy Loading:** Songs loaded on demand
- **Caching:** Recently used songs cached
- **Background Processing:** Exports run in background
- **Incremental Updates:** UI updates during long operations

## Accessibility

### VoiceOver
- Panel navigation with VO keys
- Song card descriptions
- Matrix cell announcements
- Progress updates during export

### Keyboard Navigation
- Full keyboard control
- Tab order: Toolbar → Panels → Grid
- Arrow keys: Navigate within panels
- Space/Enter: Activate focused item

### Visual
- High contrast mode support
- Reduced motion support
- Customizable font sizes
- Color blind friendly palettes

## Error Handling

### Song Load Errors
- **File Not Found:** Show error, offer to locate
- **Corrupt Data:** Show error, offer recovery
- **Version Mismatch:** Show warning, offer migration

### Export Errors
- **Disk Full:** Pause queue, show error
- **Permission Denied:** Show error, suggest fix
- **Encoding Failed:** Retry with different settings

## Undo/Redo Support

### Undoable Operations
- Song deletion
- Template changes
- Matrix cell assignments
- Export settings changes

### Undo Stack
- Maximum 100 operations
- Persists across sessions
- Clearable via menu

## Persistence

### Auto-Save
- Song library state saved every 30s
- Template library saved immediately on change
- Export queue saved every 10s
- Panel layout saved immediately

### Recovery
- Automatic recovery on crash
- Session restore on relaunch
- Manual save points (⌘S)

## Future Enhancements

- [ ] AI-assisted song organization
- [ ] Cloud sync for song library
- [ ] Collaborative editing
- [ ] Advanced search filters
- [ ] Smart playlists
- [ ] Performance recommendations
- [ ] Batch processing scripts
- [ ] Custom workflows
- [ ] Plugin integration
- [ ] MIDI mapping for matrix

## Related Components

- **AnalysisDashboard** - Performance analytics
- **ExportStudio** - Advanced export
- **SongOrchestrator** - Batch operations
- **TemplateManager** - Template CRUD
- **PerformanceMatrix** - Grid editing
