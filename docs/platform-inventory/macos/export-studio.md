# ExportStudio

**Status:** ✅ Complete - macOS Exclusive  
**Platform:** macOS (v14+)  
**Purpose:** Multi-format audio export workflows with batch processing

## Overview

ExportStudio is the **professional export hub** for White Room, providing advanced audio export capabilities with format selection, quality control, metadata editing, and batch processing. It supports multiple audio formats and provides real-time encoding progress for large export jobs.

## File Location

```
swift_frontend/src/SwiftFrontendCore/Platform/macOS/Components/ExportStudio.swift
```

## Key Components

### Main Interface
```
┌──────────────────────────────────────────────────────────────────────┐
│  📤 Export Studio                               [Batch] [Settings] [Help] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Export Queue (3 jobs)                                          │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ Job 1: Symphony No. 5 [WAV 48kHz]                 │   │   │
│  │  │ Progress: ████████░░ 80% | Time: 0:45 remaining    │   │   │
│  │  │ [Pause] [Cancel]                                       │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ Job 2: Techno Set [MP3 320kbps]                    │   │   │
│  │  │ Progress: ███████████ 100% | Complete               │   │   │
│  │  │ [Open] [Reveal] [Remove]                              │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ Job 3: Jazz Trio [FLAC Lossless]                     │   │   │
│  │  │ Progress: ██░░░░░░░░ 20% | Time: 2:15 remaining    │   │   │
│  │  │ [Pause] [Cancel]                                       │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                                    [Add Export...] [Clear All] │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │   Format Selection          │  │   Quality Settings           │   │
│  │                             │  │                             │   │
│  │  ┌───────┐ ┌───────┐        │  │  ┌─────────────────────┐   │   │
│  │  │ WAV   │ │ MP3   │ FLAC   │  │  │ Sample Rate:        │   │   │
│  │  │       │ │       │ │       │  │  │ [48kHz ▼]          │   │   │
│  │  │ [128] │ [320] │ Lossless  │  │  │ Bit Depth:          │   │   │
│  │  │       │ │       │ │       │  │  │ [24-bit ▼]         │   │   │
│  │  └───────┘ └───────┘ └───────┘  │  │ Bitrate:             │   │   │
│  │                             │  │  │ [Variable ▼]       │   │   │
│  │  [More Formats...]           │  │  │ Channel:            │   │   │
│  │                             │  │  │ [Stereo ▼]          │   │   │
│  │                             │  │  └─────────────────────┘   │   │
│  └─────────────────────────────┘  │                             │   │
│                                     │  [Preset...] [Reset]       │   │
│                                     └─────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Metadata Editor                                                  │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ Title:       [Symphony No. 5 in C Minor]               │   │   │
│  │  │ Artist:      [Ludwig van Beethoven]                  │   │   │
│  │  │ Album:       [White Room Sessions]                   │   │   │
│  │  │ Year:        [2026]                                   │   │   │
│  │  │ Genre:       [Classical] [Orchestral] [+]           │   │   │
│  │  │ Comments:    [Live performance at Carnegie Hall]      │   │   │
│  │  │                                   [Auto-Fill] [Clear]    │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                                    [Save Preset] [Load Preset]   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Destination                                [Browse...]        │   │
│  │  /Users/Music/White Room Exports/Symphony_No_5.wav        │   │
│  │                                    [Open in Finder]         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  [Cancel] [Export] (⌘E)                                           │
└──────────────────────────────────────────────────────────────────────┘
```

## Sections

### 1. Export Queue

**Purpose:** Manage multiple export jobs

**Job Card**
```
Export Job
├── Song Info
│   ├── Title ("Symphony No. 5")
│   ├── Format badge ("WAV 48kHz")
│   └── Duration ("4:32")
├── Progress Bar
│   ├── Visual progress (██████░░)
│   ├── Percentage (80%)
│   └── Time remaining (0:45)
└── Actions
    ├── Pause/Resume
    ├── Cancel
    ├── Open (when complete)
    └── Remove
```

**Queue States**
- **Pending:** Waiting to start
- **Encoding:** Currently processing
- **Paused:** Temporarily stopped
- **Complete:** Finished successfully
- **Failed:** Error occurred

### 2. Format Selection

**Purpose:** Choose audio format and encoding

**Supported Formats**
```
┌─────────┬──────────┬─────────────┬──────────────┐
│ Format  │ Quality  │ File Size    │ Use Case     │
├─────────┼──────────┼─────────────┼──────────────┤
│ WAV     │ Lossless│ Large (10x)  │ Archival    │
│ MP3     │ Good     │ Medium (1x)   │ Distribution │
│ FLAC     │ Lossless│ Medium (2x)   │ Storage     │
│ AAC     │ Better   │ Small (0.8x) │ Streaming   │
│ OGG     │ Good     │ Small (0.9x) │ Web         │
└─────────┴──────────┴─────────────┴──────────────┘
```

**Format Details**

**WAV (Waveform Audio File)**
- **Sample Rate:** 44.1kHz, 48kHz, 96kHz
- **Bit Depth:** 16-bit, 24-bit, 32-bit float
- **Channels:** Mono, Stereo, 5.1, 7.1
- **File Size:** ~10 MB per minute
- **Use Case:** Archival, mastering

**MP3 (MPEG Audio Layer 3)**
- **Bitrate:** 128, 192, 256, 320 kbps
- **Quality:** VBR, CBR, ABR
- **Channels:** Mono, Stereo, Joint Stereo
- **File Size:** ~1 MB per minute (at 320)
- **Use Case:** Distribution, streaming

**FLAC (Free Lossless Audio Codec)**
- **Compression:** Level 0-8
- **Sample Rate:** Up to 192kHz
- **Bit Depth:** Up to 24-bit
- **File Size:** ~2 MB per minute
- **Use Case:** Storage, archival

### 3. Quality Settings

**Purpose:** Configure encoding quality

**Sample Rate**
```
Options: [44.1kHz] [48kHz] [96kHz] [192kHz]
Default: 48kHz (CD quality)
Recommendation: Match source rate
```

**Bit Depth**
```
Options: [16-bit] [24-bit] [32-bit float]
Default: 24-bit (professional quality)
Recommendation: 24-bit for most uses
```

**Bitrate (MP3/AAC)**
```
Options: [128] [192] [256] [320] kbps
Default: 320 kbps (highest quality)
Variable: [VBR] [CBR] [ABR]
```

**Channel Mode**
```
Options: [Mono] [Stereo] [Joint Stereo] [5.1 Surround]
Default: Stereo
Recommendation: Stereo for music
```

### 4. Metadata Editor

**Purpose:** Edit audio file metadata

**ID3 Tags (MP3/AAC)**
```
Standard Tags:
├── Title (TIT2)
├── Artist (TPE1)
├── Album (TALB)
├── Year (TYER)
├── Genre (TCON)
├── Track Number (TRCK)
├── Album Artist (TPE2)
└── Comments (COMM)
```

**Vorbis Comments (FLAC/OGG)**
```
Custom Tags:
├── TITLE
├── ARTIST
├── ALBUM
├── DATE
├── GENRE
├── TRACKNUMBER
└── DESCRIPTION
```

**RIFF Info (WAV)**
```
Chunks:
├── INAM (Name)
├── IART (Artist)
├── IPRD (Product/Album)
├── ICRD (Creation Year)
├── IGNR (Genre)
└── ICMT (Comments)
```

**Auto-Fill**
- Extract from song metadata
- Use performance name
- Use performance description
- Include date/time stamp

### 5. Destination Selection

**Purpose:** Choose export location

**Options**
- **Desktop:** Quick access
- **Documents:** Organized storage
- **Music:** iTunes integration
- **Custom:** Browse to location

**Filename Templates**
```
{song_title} - {performance_name}.{ext}
{song_title} ({performance_id}).{ext}
{artist} - {song_title} - {date}.{ext}
Custom: [________________]
```

**Placeholders**
- `{song_title}` - Song name
- `{performance_name}` - Performance name
- `{performance_id}` - Performance UUID
- `{artist}` - Artist name
- `{date}` - Export date (YYYY-MM-DD)
- `{ext}` - File extension

## State Management

```swift
@StateObject private var exportQueue: ExportQueue
@StateObject private var formatManager: FormatManager
@StateObject private var metadataEditor: MetadataEditor

@State private var selectedFormat: AudioFormat = .wav
@State private var qualityPreset: QualityPreset = .high
@State private var exportPath: URL = defaultExportPath
```

### State Objects

1. **exportQueue** - Job queue management
2. **formatManager** - Format and quality settings
3. **metadataEditor** - Metadata editing state

## Keyboard Shortcuts

### Export Operations
- **⌘E** - Start export
- **⌘.** - Stop all exports
- **⌘, ** - Pause selected
- **⌘⇧E** - Batch export

### Navigation
- **⌘1** - Export queue
- **⌘2** - Format selection
- **⌘3** - Quality settings
- **⌘4** - Metadata editor
- **⌘5** - Destination

### Quick Actions
- **⌘N** - New export job
- **⌘O** - Open in Finder
- **⌘S** - Save preset
- **⌘L** - Load preset

## Data Flow

### Export Process Flow
```
User configures export
    ↓
exportStudio.validateConfiguration()
    ↓
exportStudio.addToQueue()
    ↓
exportQueue.processJobs()
    ↓
For each job:
    ├── Load song data
    ├── Render audio (real-time or faster)
    ├── Encode to format
    ├── Write metadata
    ├── Write to file
    └── Update progress
    ↓
All jobs complete
    ↓
Show completion notification
```

### Progress Tracking
```
Encoding Engine
    ↓
progress: 0% → 10% → 20% → ... → 100%
    ↓
exportQueue.updateProgress()
    ↓
UI refreshes (60 FPS)
    ↓
Time remaining calculated
    ↓
User sees live updates
```

## Batch Export

### Batch Operations
```
┌─────────────────────────────────────┐
│  Batch Export Configuration         │
├─────────────────────────────────────┤
│  Source: [32 Songs ▼]              │
│  Format: [MP3 320kbps ▼]            │
│  Quality: [High Quality Preset ▼]   │
│  Metadata: [Auto-fill from songs]   │
│  Destination: [/Music/Exports]      │
│                                     │
│  Filename Template:                 │
│  [{song_title} - {performance_name}]│
│                                     │
│  [Export] [Cancel]                  │
└─────────────────────────────────────┘
```

**Batch Features**
- **Multi-threading:** Encode 4 simultaneous jobs
- **Priority:** Queue prioritization
- **Progress:** Overall batch progress
- **Error Handling:** Continue on failure
- **Report:** Summary when complete

## Integration Points

### Opens From
- **OrchestrationConsole** - Export queue button
- **MainMenu** - File → Export
- **Keyboard Shortcut** - ⌘E

### Opens To
- **File Browser** - Destination selection
- **Preset Manager** - Save/load export presets

### Related Components
- **OrchestrationConsole** - Export queue management
- **TemplateManager** - Export templates
- **JUCE Engine** - Audio rendering and encoding

## Performance Characteristics

### Encoding Speed
- **Real-time:** 1× (same as playback duration)
- **Fast:** 2-4× (faster than real-time)
- **Ultra:** 8-16× (for batch exports)

**Example Times (4:32 song)**
- **WAV (48kHz):** 4:32 (real-time)
- **MP3 (320kbps):** 1:08 (4× speed)
- **FLAC (lossless):** 2:16 (2× speed)

### Resource Usage
- **CPU:** 50-80% during encoding
- **Memory:** ~200 MB per active job
- **Disk I/O:** High during write phase
- **Thermal:** Can trigger thermal throttling

## Quality Presets

### Preset Options

**Low Quality (128 kbps)**
- Fast encoding
- Small file size
- Lower audio quality
- Use case: Preview, draft

**Medium Quality (192 kbps)**
- Good encoding speed
- Moderate file size
- Good audio quality
- Use case: Distribution

**High Quality (320 kbps)**
- Slower encoding
- Larger file size
- Excellent audio quality
- Use case: Final release

**Lossless (FLAC/WAV)**
- Slowest encoding
- Largest file size
- Perfect audio quality
- Use case: Archival

## Error Handling

### Export Errors
- **Disk Full:** Pause queue, show error
- **Permission Denied:** Show error, suggest fix
- **Invalid Path:** Browse to new location
- **Encode Failed:** Retry with different settings

### Validation
- **Format Support:** Check codec availability
- **Quality Settings:** Validate combination
- **Disk Space:** Check available space
- **File Access:** Verify write permissions

## Metadata Standards

### ID3v2.4 (MP3)
- Text frames (TIT2, TPE1, etc.)
- URL frames (WOAF, WCOM)
- Comments (COMM)
- Embedded images (APIC)

### Vorbis Comments (FLAC)
- Standard tags
- Custom fields
- Cover art
- Lyrics

### RIFF INFO (WAV)
- INFO chunk
- ID3 tag
- BWF chunk (Broadcast Wave)

## Future Enhancements

- [ ] CD burning (Red Book standard)
- [ ] DVD-Audio authoring
- [ ] Cloud upload (SoundCloud, YouTube)
- [ ] FTP upload (automatic)
- [ ] Email export (send file)
- [ ] Network streaming (Shoutcast/Icecast)
- [ ] Normalization (loudness matching)
- [ ] Dithering (noise shaping)
- [ ] Sample rate conversion
- [ ] Format conversion (transcoding)

## Related Components

- **OrchestrationConsole** - Export queue management
- **TemplateManager** - Export templates
- **AnalysisDashboard** - Export statistics
- **JUCE Engine** - Audio encoding backend
