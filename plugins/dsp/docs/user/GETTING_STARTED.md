# White Room - Getting Started

**Welcome to White Room!** This guide will help you install, configure, and start using White Room for music composition, notation, and production.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start Tutorial](#quick-start-tutorial)
3. [Your First Project](#your-first-project)
4. [Basic Concepts](#basic-concepts)
5. [Common Tasks](#common-tasks)
6. [Next Steps](#next-steps)
7. [Troubleshooting](#troubleshooting)

---

## Installation

### System Requirements

**macOS**
- macOS 14.0 (Sonoma) or later
- Apple Silicon (M1/M2/M3) or Intel Mac
- 8GB RAM minimum (16GB recommended)
- 500MB free disk space

**iPadOS**
- iPadOS 17.0 or later
- iPad Pro, iPad Air, or iPad mini (6th generation or later)
- 4GB RAM minimum

**iOS**
- iOS 17.0 or later
- iPhone 12 or later
- Companion app for remote control

**tvOS**
- Apple TV 4K (2nd generation or later)
- tvOS 17.0 or later
- For large-screen visualization and control

### Download and Install

#### macOS App Store

1. Open the **App Store** on your Mac
2. Search for **"White Room"**
3. Click **Get** or **Install**
4. Wait for download and installation to complete

#### Direct Download (Alternative)

1. Visit **white-room.audio/downloads**
2. Download the latest `.dmg` file
3. Open the disk image
4. Drag **White Room.app** to your **Applications** folder
5. Launch from Applications or Spotlight

#### iPad/iOS Companion App

1. Open the **App Store** on your iPad/iPhone
2. Search for **"White Room Companion"**
3. Install the companion app
4. Pair with your Mac via Bluetooth or Wi-Fi

### First Launch

When you first launch White Room:

1. **Welcome Screen** - Click "Get Started"
2. **Permissions** - Grant audio and MIDI permissions
3. **Audio Setup** - Configure your audio interface (or use default)
4. **MIDI Setup** - Configure MIDI devices (optional)
5. **Tutorial** - Complete the interactive tutorial (recommended)

---

## Quick Start Tutorial

### Step 1: Create Your First Project

1. Launch **White Room**
2. Click **"New Project"** in the welcome window
3. Enter a project name: "My First Song"
4. Choose a location (defaults to `~/Music/White Room/`)
5. Select a tempo (default: 120 BPM)
6. Select a time signature (default: 4/4)
7. Click **"Create"**

### Step 2: Add an Instrument

1. Click the **"+"** button in the Tracks panel (left sidebar)
2. Select **"Software Instrument"**
3. Choose an instrument:
   - **Piano** (default)
   - **Synth Lead**
   - **Strings**
   - Or any installed AUv3 plugin
4. Click **"Add Track"**

### Step 3: Record a Melody

1. Click the **Record** button (red circle) or press **R**
2. Play some notes on your MIDI keyboard
3. Click **Stop** (square) or press **Spacebar**
4. Your melody appears in the Piano Roll

**No MIDI keyboard?** Use the on-screen keyboard:
- Press **K** to toggle the on-screen keyboard
- Click keys with your mouse or trackpad

### Step 4: Edit in Piano Roll

1. Double-click your recorded region
2. The **Piano Roll** opens showing your notes
3. **Edit notes**:
   - **Drag** notes to move them
   - **Drag edges** to resize (change duration)
   - **Right-click** to delete
   - **Cmd+Click** to add new notes
4. Close the Piano Roll when done

### Step 5: Add More Tracks

1. Click **"+"** to add another instrument track
2. Choose a different instrument (e.g., Bass)
3. Record or draw notes
4. Repeat as needed

### Step 6: Export Your Song

1. Click **"Share"** in the toolbar
2. Select **"Export Audio"**
3. Choose format:
   - **WAV** (uncompressed, highest quality)
   - **AIFF** (Mac standard)
   - **FLAC** (compressed lossless)
4. Select quality (44.1kHz, 24-bit recommended)
5. Click **"Export"**
6. Choose a location and save

**Congratulations!** You've created your first song in White Room!

---

## Your First Project

### Project Structure

When you create a project, White Room organizes it like this:

```
My First Song.wr/
├── Project Data          # Project settings and metadata
├── Audio Files          # Recorded audio (if any)
├── MIDI Files           # MIDI regions and patterns
├── Automation           # Parameter automation data
├── Takes                # Alternate takes (if recording multiple)
└── Project Backup       # Auto-saved versions
```

### Project Settings

Access project settings via **File > Project Settings**:

- **Tempo**: 20-300 BPM
- **Time Signature**: Common, compound, or complex meters
- **Key Signature**: C major through C sharp minor
- **Sample Rate**: 44.1kHz, 48kHz, 96kHz
- **Buffer Size**: 128, 256, 512 samples (lower = less latency, higher CPU)

### Saving and Auto-Save

- **Manual Save**: **Cmd+S** or **File > Save**
- **Auto-Save**: Every 30 seconds (default)
- **Auto-Save Interval**: Change in **Preferences > General**
- **Backups**: Kept for 7 days (default)

---

## Basic Concepts

### The Main Window

White Room's main window consists of several areas:

```
+----------------------------------+
|  Menu Bar                        |
+----------------------------------+
|  Transport Controls (Play/Stop)  |
+----------------------------------+
|          |                 |      |
|  Tracks  |    Timeline     |  Ins |
|  Panel   |    Editor       |  pec |
|          |                 |  tor |
|          |                 |      |
+----------------------------------+
|  Piano Roll / Notation Views     |
+----------------------------------+
|  Mixer / Console                 |
+----------------------------------+
```

### Tracks Panel (Left Sidebar)

Displays all tracks in your project:

- **Software Instrument Tracks** - Virtual instruments
- **Audio Tracks** - Recorded audio
- **MIDI Tracks** - MIDI only (no sound)
- **Bus Tracks** - For submixing and effects
- **Master Track** - Final output

### Timeline Editor

Center area showing:

- **Timeline Ruler** - Time markers and grid
- **Regions** - MIDI or audio clips
- **Automation Lanes** - Volume, pan, and parameters
- **Markers** - Song sections (verse, chorus, etc.)

### Inspector (Right Sidebar)

Context-sensitive panel showing:

- **Track Settings** - Instrument, volume, pan
- **Region Parameters** - Quantize, transpose, velocity
- **Event Details** - Note position, duration, pitch

### Transport Controls

Top toolbar with:

- **Play/Pause** - Spacebar
- **Stop** - Spacebar (returns to start)
- **Record** - R
- **Cycle** - C (loop playback)
- **Metronome** - M (toggle click track)

### Views

Switch between different editing views:

- **Piano Roll** - MIDI note editing
- **Sheet Music** - Standard notation
- **Tablature** - Fretted instruments (guitar, bass)
- **Event List** - Numerical MIDI event editing
- **Automation** - Parameter automation curves

---

## Common Tasks

### Recording Audio

1. Create an **Audio Track** (**File > New Track > Audio**)
2. Select your audio interface input
3. Arm the track for recording (click **"R"** button on track)
4. Click **Record** in transport
5. Perform your audio
6. Click **Stop**
7. Your audio appears as a region on the timeline

### Quantizing MIDI

Automatically align notes to the grid:

1. Select MIDI regions
2. Open **Inspector**
3. Choose quantize value:
   - **1/16 Note** - Standard pop/rock
   - **1/8 Note** - More swing
   - **1/8 Triplet** - Shuffle feel
4. Click **"Apply"**

### Adding Effects

1. Select a track
2. Click **"Effects"** button in Inspector
3. Choose effect type:
   - **Compressor** - Dynamics control
   - **EQ** - Tone shaping
   - **Reverb** - Space and depth
   - **Delay** - Echo effects
4. Adjust parameters to taste

### Mixing

Use the **Mixer** (**View > Show Mixer**):

- **Volume Faders** - Track levels
- **Pan Knobs** - Stereo placement
- **Mute/Solo** - Isolate tracks
- **VU Meters** - Visual level monitoring
- **Sends** - Effects sends (reverb, delay)

### Keyboard Shortcuts

Essential shortcuts for faster workflow:

| Action | Shortcut |
|--------|----------|
| Play/Pause | Space |
| Stop | Space (return to start) |
| Record | R |
| Cycle (Loop) | C |
| Metronome | M |
| Undo | Cmd+Z |
| Redo | Cmd+Shift+Z |
| Save | Cmd+S |
| Save As | Cmd+Shift+S |
| Open Project | Cmd+O |
| New Project | Cmd+N |
| Close Window | Cmd+W |
| Quit | Cmd+Q |
| Zoom In | Cmd+Plus |
| Zoom Out | Cmd+Minus |
| Toggle On-Screen Keyboard | K |
| Toggle Mixer | X |
| Toggle Inspector | I |
| Split Region | Cmd+T |
| Join Regions | Cmd+J |
| Delete Selection | Delete |
| Select All | Cmd+A |
| Deselect All | Shift+Cmd+A |

---

## Next Steps

### Learn More Features

- **[User Guide](USER_GUIDE.md)** - Comprehensive feature documentation
- **[Features Guide](FEATURES.md)** - Complete feature list
- **[Tutorials](../tutorials/)** - Step-by-step tutorials

### Advanced Topics

- **Notation Systems** - Sheet music, tablature, and more
- **Schillinger Integration** - Advanced composition theory
- **Automation** - Parameter automation and control
- **Plugins** - Using third-party audio plugins (AUv3)
- **Export Options** - Different formats and uses

### Community

- **Forum**: community.white-room.audio
- **Discord**: discord.gg/white-room
- **Twitter**: @whiteroomapp
- **YouTube**: youtube.com/@whiteroomapp

---

## Troubleshooting

### Audio Issues

**No Sound Output**

1. Check system volume is up
2. Verify audio device is selected (**Preferences > Audio**)
3. Ensure track volume fader is up
4. Check master output isn't muted
5. Try restarting audio engine (**Cmd+Option+R**)

**Crackling or Popping**

1. Increase buffer size (**Preferences > Audio**)
2. Close other apps using audio
3. Update audio interface drivers
4. Try different sample rate
5. Disable "Use High Precision" if enabled

**Latency Too High**

1. Decrease buffer size (256 → 128 → 64)
2. Use Direct Monitoring (if audio interface supports)
3. Enable Low Latency Mode (**Preferences > Audio**)

### MIDI Issues

**MIDI Keyboard Not Working**

1. Check keyboard is powered on
2. Verify USB connection
3. Check MIDI device is recognized (**Preferences > MIDI**)
4. Test MIDI Monitor (Mac: **Applications > Utilities > Audio MIDI Setup**)
5. Try different USB port

**MIDI Notes Not Recording**

1. Ensure track is armed for recording (click **"R"**)
2. Check keyboard is transmitting MIDI (MIDI LED flashes)
3. Verify MIDI input is assigned to track
4. Check MIDI filter settings (**Preferences > MIDI**)

### Performance Issues

**Application Lag**

1. Increase buffer size
2. Reduce number of tracks
3. Freeze tracks (**Track > Freeze**)
4. Close unused plugins
5. Restart White Room

**High CPU Usage**

1. Increase buffer size
2. Disable plugins on unused tracks
3. Freeze tracks with heavy plugins
4. Reduce automation resolution
5. Check for plugin updates

### Crashes and Freezes

**Application Crashed**

1. Restart White Room
2. Reopen project (auto-saved)
3. Check for plugin updates
4. Try creating new project (rule out corrupt project)
5. Contact support with crash report

**Application Frozen**

1. Wait 30 seconds (might be processing)
2. Force quit (**Option+Cmd+Esc**)
3. Restart and reopen project
4. Check for corrupt audio files
5. Reduce plugin load

### File Issues

**Project Won't Open**

1. Check for auto-saved backup
2. Try **"Revert to Saved"**
3. Open on different Mac (rule out hardware)
4. Contact support with project file

**Can't Export Audio**

1. Check disk space (need 2x project size)
2. Try different export location
3. Verify export permissions
4. Check sample rate matches project
5. Try different export format

---

## Getting Help

### Built-in Help

- **Help Menu** - Access built-in documentation
- **Interactive Tutorial** - **Help > Show Tutorial**
- **Keyboard Shortcuts** - **Help > Keyboard Shortcuts**
- **Tips** - **Help > Show Tip of the Day**

### Online Resources

- **Knowledge Base**: support.white-room.audio
- **Video Tutorials**: youtube.com/@whiteroomapp
- **FAQ**: white-room.audio/faq
- **Community Forum**: community.white-room.audio

### Contact Support

Email: support@white-room.audio
Include:
- White Room version (**White Room > About White Room**)
- macOS version (**Apple Menu > About This Mac**)
- Steps to reproduce issue
- Screenshots or screen recordings (if applicable)

---

**Last Updated**: January 16, 2026
**White Room Version**: 1.0.0
**Next**: [User Guide](USER_GUIDE.md)

---

*Welcome to White Room! We're excited to have you creating music with us.*
