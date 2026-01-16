# White Room Schillinger DAW - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Creating Your First Song](#creating-your-first-song)
4. [Performance Switching](#performance-switching)
5. [Advanced Features](#advanced-features)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Getting Started

### System Requirements

**macOS:**
- macOS 13.0 (Ventura) or later
- Apple Silicon (M1/M2/M3) recommended
- 8GB RAM minimum (16GB recommended)
- 500MB free disk space

**tvOS:**
- Apple TV 4K (2nd generation or later)
- tvOS 16.0 or later
- Wireless keyboard recommended (for advanced features)

**iOS:**
- iPhone 12 or later
- iOS 16.0 or later
- Companion app for remote control

### Installation

#### macOS Installation
1. Download the latest `.dmg` file from [white-room.io/downloads](https://white-room.io/downloads)
2. Open the disk image and drag White Room to Applications
3. Launch White Room from Applications folder
4. Grant necessary permissions (microphone, disk access for plugins)

#### tvOS Installation
1. On Apple TV, open App Store
2. Search for "White Room"
3. Install and launch
4. Follow on-screen setup prompts

### First Launch

When you first launch White Room, you'll see:

1. **Welcome Screen**: Brief introduction to White Room
2. **Song Library**: Empty library ready for your first composition
3. **Quick Start Tutorial**: Optional guided tour (recommended for first-time users)

---

## Core Concepts

### What is White Room?

White Room is a next-generation DAW based on Joseph Schillinger's System of Musical Composition. Unlike traditional DAWs that focus on recording and editing, White Room focuses on **generative composition** and **parallel performance universes**.

### Key Concepts

#### SongContract
A SongContract defines **what your song is** - its emotional intent, motion, harmonic behavior, and certainty. Think of it as the DNA of your composition.

**SongContract Parameters:**
- **Intent**: What is this music for?
  - `Identity` - Establishing a character or mood
  - `Song` - Standalone piece with verse/chorus structure
  - `Cue` - Film/TV/game underscore
  - `Ritual` - Long-form ambient/meditative
  - `Loop` - Repeating pattern for production music

- **Motion**: How does the music evolve?
  - `Static` - Steady, unchanging energy
  - `Accelerating` - Building tension over time
  - `Oscillating` - Ebbing and flowing energy
  - `Colliding` - Contrasting elements in conflict
  - `Dissolving` - Gradually transforming into something new

- **Harmonic Behavior**: How does harmony function?
  - `Static` - Stable, repetitive harmony
  - `Revealed` - Progressions that unfold logically
  - `Cyclic` - Circular harmonic patterns
  - `Expanding` - Harmony that grows in complexity
  - `Collapsing` - Simplifying toward resolution

- **Certainty**: How predictable is the music?
  - `Certain` - Clear, predictable patterns
  - `Tense` - Expected outcomes with slight variations
  - `Unstable` - Frequent surprises
  - `Volatile` - Highly unpredictable

#### Performance State
A PerformanceState defines **how your song is realized** - instrumentation, density, groove, mix. One Song can have many Performances.

**Example Performance Universes:**
- **Solo Piano** - Minimal, intimate
- **SATB Choir** - 4-part harmony
- **Ambient Techno** - Electronic, textural
- **String Quartet** - Classical ensemble
- **Full Orchestra** - Complete orchestration

#### The Renderer
The Renderer takes your Song (SongState) and Performance (PerformanceState) and generates playable audio in real-time. No traditional "tracks" or "clips" - the music flows continuously like a "moving sidewalk."

---

## Creating Your First Song

### Step 1: Create a New Song

1. Click **+ New Song** in the Song Library
2. Name your song (e.g., "First Composition")
3. Click **Create**

### Step 2: Define Your SongContract

You'll see the SongContract editor with 4 dimensions:

**Example: "Tense Accelerating Cue"**
```
Intent: Cue
Motion: Accelerating
Harmonic Behavior: Revealed
Certainty: Tense
```

This creates:
- Film/TV underscore (Intent)
- Building tension over time (Motion)
- Logical harmonic progressions (Harmonic Behavior)
- Mostly predictable with some surprises (Certainty)

### Step 3: Choose Your Performance

1. Click **Performance** tab
2. Select a starting performance (e.g., "Solo Piano")
3. Adjust density slider (0.0 = sparse, 1.0 = dense)
4. Choose groove profile (e.g., "Straight", "Swing", "Push")

### Step 4: Play and Explore

1. Click **Play** in transport controls
2. Listen as White Room generates your composition
3. Use the **Timeline** to navigate through different sections
4. Adjust **Density Minimap** to see/edit density changes over time

### Step 5: Save Your Song

1. Click **Save** (or Cmd+S)
2. Your song is saved as a `.wrs` file (White Room Song)
3. Automatically synced via iCloud (if enabled)

---

## Performance Switching

### Discrete Switching

Switch instantly between performances without stopping playback:

1. Click **Performance** tab
2. Click any performance card (e.g., "SATB Choir")
3. Music immediately continues in new performance

**Use Case:** A/B compare different orchestrations in real-time.

### Performance Sweep (Crossfade)

Gradually morph between two performances:

1. Click **Sweep** tab
2. Select **Performance A** (start)
3. Select **Performance B** (end)
4. Drag sweep slider (0 = A, 1 = B, 0.5 = blend)

**Use Case:** Create smooth transitions between contrasting moods.

### Creating New Performances

1. Click **+ New Performance** in Performance tab
2. Name it (e.g., "Ambient Techno")
3. Choose arrangement style
4. Configure instrumentation matrix (which instruments play which roles)
5. Adjust density and groove
6. Save

---

## Advanced Features

### ConsoleX Mixing

ConsoleX is White Room's built-in mixing console:

1. Click **ConsoleX** tab
2. See channel strips for each role (melody, bass, harmony, etc.)
3. Adjust:
   - **Level** faders
   - **Pan** knobs
   - **Mute/Solo** buttons
   - **Insert effects** (EQ, compression, reverb)
   - **Send effects** (reverb, delay)

### Timeline Editing

Visualize and edit your song's structure:

1. Click **Timeline** tab
2. See sections (intro, verse, chorus, bridge, etc.)
3. Click section to jump there
4. Right-click for section editing options
5. Drag section boundaries to resize

### Density Minimap

See and edit density changes over time:

1. Click **Density Minimap** below timeline
2. See density curve (low = sparse, high = dense)
3. Click to add density control points
4. Drag points to adjust density trajectory

### Keyboard Shortcuts (macOS)

**Transport:**
- `Space` - Play/Pause
- `Cmd+.` - Stop
- `Cmd+S` - Save
- `Cmd+Shift+S` - Save As
- `Cmd+Z` - Undo
- `Cmd+Shift+Z` - Redo

**Navigation:**
- `Cmd+1` - Song Contract
- `Cmd+2` - Performance
- `Cmd+3` - Timeline
- `Cmd+4` - ConsoleX
- `Cmd+5` - Settings

**Editing:**
- `Cmd+N` - New Song
- `Cmd+O` - Open Song
- `Cmd+W` - Close Song
- `Delete` - Delete selected
- `Cmd+C` - Copy
- `Cmd+V` - Paste

---

## Troubleshooting

### No Sound Output

**Symptoms:** Playhead moves but no audio

**Solutions:**
1. Check System Audio Output (System Settings → Sound)
2. Verify White Room audio output device (Settings → Audio)
3. Check master volume in ConsoleX
4. Ensure channel strips are not muted
5. Restart White Room

### Playback Stuttering/Crackling

**Symptoms:** Audio glitches during playback

**Solutions:**
1. Increase buffer size (Settings → Audio → Buffer Size)
2. Close other CPU-intensive applications
3. Reduce number of active instruments
4. Disable unnecessary background services

### Song Won't Load

**Symptoms:** Error opening `.wrs` file

**Solutions:**
1. Verify file is not corrupted (try opening another song)
2. Check iCloud sync status (if using iCloud)
3. Ensure White Room has disk access permissions
4. Reinstall White Room if problem persists

### Performance Switching Not Working

**Symptoms:** Clicking performance does nothing

**Solutions:**
1. Ensure playback is stopped or playing (not in error state)
2. Verify performance is properly configured
3. Check ConsoleX for routing issues
4. Restart playback engine (Settings → Advanced → Restart Engine)

---

## FAQ

### General Questions

**Q: Is White Room a replacement for my existing DAW?**
A: White Room is complementary. It excels at generative composition and real-time performance switching. You can export MIDI/audio from White Room and import into Logic, Pro Tools, Ableton, etc. for further production.

**Q: Can I use my own VST/AU plugins?**
A: Yes! White Room supports VST3, AU, and CLAP plugins. See Settings → Plugins to scan and manage your plugin library.

**Q: Does White Room work offline?**
A: Yes, White Room works completely offline. No internet connection required for composition, playback, or rendering.

**Q: Can I collaborate with other users?**
A: Not directly in v1.0, but you can share `.wrs` files via email, cloud storage, etc. Collaboration features are planned for v1.2.

### Technical Questions

**Q: What audio format does White Room use internally?**
A: White Room uses 32-bit float audio processing at your project sample rate (44.1kHz, 48kHz, 88.2kHz, 96kHz, or 192kHz).

**Q: Can I export MIDI from White Room?**
A: Yes, export MIDI via File → Export → MIDI. You can choose to export all roles or specific roles.

**Q: How many performances can I have per song?**
A: There's no hard limit. We've tested up to 100 performances per song without issues.

**Q: Does White Room support MPE (MIDI Polyphonic Expression)?**
A: Yes, White Room has full MPE support for compatible controllers (Seaboard, LinnStrument, etc.).

### Schillinger System Questions

**Q: Do I need to understand Schillinger's system to use White Room?**
A: No! White Room hides the complexity. SongContract provides an intuitive interface to Schillinger concepts. Advanced users can dive deeper into SongState parameters if desired.

**Q: Can I manually edit Schillinger generators?**
A: In v1.0, generators are auto-generated from SongContract. Direct editing is planned for v1.3.

**Q: What Schillinger books are implemented?**
A: White Room implements concepts from Books I, II, III, and IV of Schillinger's system:
- Book I: Rhythm (resultants, permutations, density)
- Book II: Melody (pitch cycles, intervals, contours)
- Book III: Harmony (chord classes, progressions, voice-leading)
- Book IV: Form (ratio trees, sections, symmetry)

### Performance Questions

**Q: What are the system requirements for real-time rendering?**
A: For smooth real-time rendering:
- **Minimum**: M1 Mac with 8GB RAM
- **Recommended**: M2/M3 Mac with 16GB RAM
- **CPU Usage**: Typically 10-30% on M2 for full orchestra

**Q: Can I render offline at higher quality?**
A: Yes, use File → Render → Offline Render to export at maximum quality (up to 192kHz, 32-bit float).

**Q: How do I reduce CPU usage?**
A: Try these optimizations:
- Increase buffer size (Settings → Audio)
- Reduce number of active instruments
- Disable unused ConsoleX effects
- Freeze rendered audio (right-click track → Freeze)

---

## Getting Help

### Resources

- **Documentation**: [white-room.io/docs](https://white-room.io/docs)
- **Video Tutorials**: [white-room.io/tutorials](https://white-room.io/tutorials)
- **Community Forum**: [community.white-room.io](https://community.white-room.io)
- **Bug Reports**: [github.com/white-room/white-room/issues](https://github.com/white-room/white-room/issues)
- **Email Support**: support@white-room.io

### Keyboard Shortcuts Reference

See [Keyboard Shortcuts](#keyboard-shortcuts) section above for complete list.

### Accessibility

White Room is designed to be accessible to all users:
- **VoiceOver**: Full VoiceOver support on macOS and iOS
- **Keyboard Navigation**: Complete keyboard control on macOS
- **High Contrast**: Supports high contrast mode (System Settings → Accessibility → Display)
- **Reduced Motion**: Supports reduce motion mode (System Settings → Accessibility → Display)

If you encounter accessibility issues, please report them at accessibility@white-room.io

---

## Version History

### Version 1.0.0 (Current)
- Initial release
- Core generative composition engine
- Performance switching (discrete and sweep)
- ConsoleX mixing console
- Timeline and density minimap
- macOS, tvOS, iOS support

### Upcoming Features (v1.1+)
- Collaboration features
- Direct Schillinger generator editing
- Advanced automation
- Plugin hosting improvements
- More instrument presets

---

**Last Updated**: January 15, 2026
**Version**: 1.0.0
