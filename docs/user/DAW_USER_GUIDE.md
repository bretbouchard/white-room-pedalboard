# White Room DAW - Complete User Guide

**Comprehensive guide to all DAW features and functionality in White Room.**

---

## Table of Contents

1. [Interface Overview](#interface-overview)
2. [Timeline Editing](#timeline-editing)
3. [Piano Roll](#piano-roll)
4. [Sheet Music](#sheet-music)
5. [Tablature](#tablature)
6. [Mixing Console](#mixing-console)
7. [Export Options](#export-options)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Troubleshooting](#troubleshooting)

---

## Interface Overview

### Main Window Layout

White Room's interface is designed for efficiency and clarity:

```
┌────────────────────────────────────────────────────┐
│  Menu Bar: File  Edit  View  Track  Region  Help  │
├────────────────────────────────────────────────────┤
│  Transport: ◀ ▶ ● ■ (Play, Stop, Record, Cycle)   │
├──────────────┬──────────────────────┬─────────────┤
│              │                      │             │
│  Tracks      │   Timeline Editor    │  Inspector  │
│  Panel       │   (Main Area)        │  Panel      │
│              │                      │             │
│  - Track 1   │   ┌──────────────┐   │  - Region   │
│  - Track 2   │   │  Region 1    │   │    Params   │
│  - Track 3   │   │  Region 2    │   │  - Track    │
│              │   └──────────────┘   │    Settings │
│              │                      │             │
├──────────────┴──────────────────────┴─────────────┤
│  Bottom Area: Piano Roll / Notation / Mixer       │
└────────────────────────────────────────────────────┘
```

### Menu Bar

**File Menu**
- New Project (**Cmd+N**)
- Open Project (**Cmd+O**)
- Close Project (**Cmd+W**)
- Save (**Cmd+S**)
- Save As (**Cmd+Shift+S**)
- Export Audio/MIDI
- Import Audio/MIDI
- Project Settings

**Edit Menu**
- Undo (**Cmd+Z**)
- Redo (**Cmd+Shift+Z**)
- Cut (**Cmd+X**)
- Copy (**Cmd+C**)
- Paste (**Cmd+V**)
- Delete (**Delete**)
- Select All (**Cmd+A**)
- Split (**Cmd+T**)
- Join (**Cmd+J**)

**View Menu**
- Show/Hide Tracks Panel (**Cmd+1**)
- Show/Hide Inspector (**Cmd+2**)
- Show/Hide Mixer (**Cmd+3**)
- Show/Hide Piano Roll (**Cmd+4**)
- Show/Hide Notation (**Cmd+5**)
- Zoom In (**Cmd+Plus**)
- Zoom Out (**Cmd+Minus**)
- Fit to Window (**Cmd+0**)

**Track Menu**
- New Track (**Cmd+Shift+N**)
- Delete Track
- Duplicate Track
- Freeze Track
- Track Settings

**Region Menu**
- Split Region (**Cmd+T**)
- Join Regions (**Cmd+J**)
- Quantize
- Transpose
- Reverse

**Help Menu**
- White Room Help
- Keyboard Shortcuts
- Interactive Tutorial
- Check for Updates
- Contact Support

### Transport Controls

Located at the top of the main window:

| Control | Shortcut | Function |
|---------|----------|----------|
| **Rewind** | [ (left bracket) | Jump to start |
| **Fast Forward** | ] (right bracket) | Jump to end |
| **Stop** | Space | Stop playback, return to playhead position |
| **Play/Pause** | Space | Start or pause playback |
| **Record** | R | Start recording |
| **Cycle** | C | Toggle loop region |

### LCD Display

Shows current project information:

- **Position** - Current playhead position (bar:beat:tick)
- **Tempo** - Project tempo in BPM
- **Time Signature** - Current time signature (e.g., 4/4)
- **Key Signature** - Project key (e.g., C Major)

Click any value to edit it directly.

### Tracks Panel

Left sidebar showing all tracks:

**Track Components**:
- **Track Header** - Track name and icon
- **M/S/R Buttons** - Mute, Solo, Record Arm
- **Volume Fader** - Track volume level
- **Pan Knob** - Stereo pan position
- **Input/Output** - Audio/MIDI routing
- **Automation Mode** - Read, Touch, Latch, Write

**Track Types**:
- **Software Instrument** - Virtual instruments (piano, synth, etc.)
- **Audio** - Recorded audio tracks
- **MIDI** - MIDI data only (no sound)
- **Bus** - Submix and effects routing
- **Master** - Final output

### Inspector Panel

Right sidebar showing context-sensitive information:

**Track Inspector** (when track selected):
- Instrument selection
- Volume and pan
- Sends and inserts
- Track settings

**Region Inspector** (when region selected):
- Region parameters
- Quantize settings
- Transpose
- Velocity
- MIDI channel

**Event Inspector** (when notes/events selected):
- Note pitch and position
- Duration and velocity
- MIDI channel

### Timeline Editor

Main editing area showing:

- **Time Ruler** - Bar numbers and time markers
- **Grid** - Snap grid for alignment
- **Regions** - MIDI or audio clips
- **Automation Lanes** - Volume, pan, parameters
- **Markers** - Section markers (verse, chorus, bridge)

---

## Timeline Editing

### Navigation

**Zoom**:
- **Zoom In**: **Cmd+Plus** or pinch gesture (trackpad)
- **Zoom Out**: **Cmd+Minus** or spread gesture (trackpad)
- **Fit to Window**: **Cmd+0**
- **Zoom to Selection**: **Cmd+Shift+F**

**Scroll**:
- **Horizontal**: Two-finger swipe (trackpad) or scroll wheel
- **Vertical**: **Shift + scroll** or use scrollbar
- **Jump to Playhead**: **Cmd+J**

**Go to**:
- **Start**: **Home** or **Cmd+Left Arrow**
- **End**: **End** or **Cmd+Right Arrow**
- **Specific Position**: Click in time ruler or LCD display

### Selecting Regions

**Single Region**:
- Click the region

**Multiple Regions**:
- **Contiguous**: Click first, **Shift+Click** last
- **Non-contiguous**: **Cmd+Click** each region
- **Marquee Selection**: Drag across timeline
- **Select All**: **Cmd+A**

**Select by Criteria**:
- **Same Track**: **Cmd+Option+A**
- **All in Cycle Range**: **Cmd+Shift+C**

### Moving Regions

**Drag Move**:
1. Click and hold region
2. Drag to new position
3. Release to place

**Nudge** (fine adjustment):
- **Nudge Left**: **Option+Left Arrow**
- **Nudge Right**: **Option+Right Arrow**
- **Nudge Up**: **Option+Up Arrow** (to different track)
- **Nudge Down**: **Option+Down Arrow** (to different track)

**Snap to Grid**:
- Enabled by default
- Disable hold: **Control** while dragging
- Toggle snap: **Control+Cmd+N**

### Copying Regions

**Duplicate**:
1. Select region(s)
2. **Option+Drag** to new position
3. Or **Cmd+C**, **Cmd+V** (paste at playhead)
4. Or **Cmd+D** (duplicate in place)

**Repeat**:
- Select region
- **Edit > Repeat** (**Cmd+R**)
- Enter number of repetitions

### Editing Regions

**Split Region**:
1. Position playhead at split point
2. Select region(s)
3. **Edit > Split** (**Cmd+T**)
4. Or use Scissor tool

**Join Regions**:
1. Select adjacent regions on same track
2. **Edit > Join** (**Cmd+J**)
3. Regions merge into one

**Trim Region**:
1. Drag region edge to resize
2. **Option+Drag** edge to trim content (non-destructive)

**Delete Region**:
1. Select region(s)
2. Press **Delete** or **Backspace**
3. Or **Edit > Delete**

### Region Parameters

Access via Inspector (**Cmd+2**):

**Basic**:
- **Name** - Region name
- **Track** - Which track region belongs to
- **Start Position** - Bar:beat:tick
- **Duration** - Length in bars:beats
- **Mute** - Silence region

**MIDI Regions**:
- **Quantize** - Align to grid
- **Transpose** - Shift pitch
- **Velocity** - Adjust note velocity
- **MIDI Channel** - MIDI channel (1-16)

**Audio Regions**:
- **Gain** - Volume offset (dB)
- **Reverse** - Playback direction
- **Fade In** - Length of fade in
- **Fade Out** - Length of fade out
- **Crossfade** - Overlap handling

### Markers

Mark important locations or sections:

**Add Marker**:
1. Position playhead
2. **Marker > Add Marker** (**M**)
3. Enter marker name

**Edit Marker**:
1. Double-click marker
2. Edit name, position, color
3. Press **Enter**

**Delete Marker**:
1. Select marker
2. Press **Delete**

**Jump to Marker**:
1. **Marker > Go to Marker**
2. Choose marker from list
3. Or click marker in timeline ruler

---

## Piano Roll

### Opening Piano Roll

**Double-click** a MIDI region, or:
- Select region
- **View > Show Piano Roll** (**Cmd+4**)

### Piano Roll Layout

```
┌────────────────────────────────────────────┐
│  Piano Keys (vertical)                     │
│  │                                          │
│  │  ┌────┐                                 │
│  │  │ C4 │  Note                          │
│  │  └────┘                                 │
│  │                                          │
│  ├──────────────────────────────────────────┤
│  │  Time Grid (horizontal)                 │
│  └──────────────────────────────────────────┘
```

- **Vertical Axis** - Pitch (C2 to C8 by default)
- **Horizontal Axis** - Time
- **Notes** - Rectangles showing pitch and duration
- **Velocity** - Note loudness (color intensity)

### Selecting Notes

**Single Note**: Click note
**Multiple Notes**:
- **Marquee**: Drag across notes
- **Shift+Click**: Add to selection
- **Cmd+A**: Select all in region

**Select by Pitch**:
- Click piano key to select all notes of that pitch
- **Shift+Click** piano keys for range

### Editing Notes

**Move Note**:
- Click and drag note horizontally (time) or vertically (pitch)
- Constrain to pitch: **Shift+Drag** vertical only
- Constrain to time: **Shift+Drag** horizontal only

**Resize Note**:
- Drag note edge to change duration
- **Option+Drag** edge to resize from opposite edge

**Change Velocity**:
- **Cmd+Drag** note up (louder) or down (softer)
- Or select note, adjust velocity slider in Inspector

**Delete Note**:
- Select note(s)
- Press **Delete** or **Backspace**

**Add Note**:
1. Select Pencil tool or **Cmd+Click**
2. Click in piano roll
3. Drag to set duration

### Note Operations

**Quantize Notes**:
1. Select note(s)
2. **Region > Quantize**
3. Choose quantize value (1/16, 1/8, 1/8 triplet, etc.)

**Transpose Notes**:
1. Select note(s)
2. **Region > Transpose**
3. Enter semitone offset (+12 = octave up, -12 = octave down)

**Change Velocity**:
1. Select note(s)
2. Adjust velocity in Inspector
3. Or use MIDI Draw tool

**Copy Notes**:
1. Select note(s)
2. **Option+Drag** to copy
3. Or **Cmd+C**, **Cmd+V**

**Repeat Notes**:
1. Select note(s)
2. **Region > Repeat**
3. Enter repeat count

### Piano Roll Tools

**Pointer Tool** (default):
- Select notes
- Move notes
- Resize notes

**Pencil Tool** (P):
- Draw new notes
- **Click** to add note
- **Drag** to set duration

**Eraser Tool** (E):
- Click note to delete
- Drag across multiple notes

**Scissors Tool** (T):
- Split notes at cursor position

**Glue Tool** (G):
- Join selected notes into one

### Piano Roll Display Options

**Keyboard**:
- **Show/Hide**: **View > Show Keyboard** (**K**)
- **Range**: C2-C8 (default), customizable in Preferences

**Grid**:
- **Snap to Grid**: **Control+Cmd+N**
- **Grid Value**: Right-click grid, choose value
- **Values**: 1/4, 1/8, 1/16, 1/32, 1/64, triplets

**Velocity Colors**:
- **Low velocity**: Light blue
- **Medium velocity**: Medium blue
- **High velocity**: Dark blue

**Note Labels**:
- **Show/Hide**: **View > Show Note Names** (**Shift+Cmd+N**)
- Display pitch names on notes

---

## Sheet Music

### Opening Sheet Music

**Double-click** MIDI region, then:
- **View > Show Sheet Music** (**Cmd+5**)
- Or click "Sheet Music" button in Piano Roll

### Sheet Music Display

```
┌────────────────────────────────────────────┐
│  Title: My Song    Tempo: 120 BPM          │
│                                             │
│     ┌───────────────────────────────────┐  │
│     │  Traditional music notation       │  │
│     │  Staff, treble/bass clefs         │  │
│     │  Notes, rests, dynamics           │  │
│     └───────────────────────────────────┘  │
│                                             │
│  [Page 1 of 3] ◀    ▶                      │
└────────────────────────────────────────────┘
```

### Sheet Music Features

**Automatic Notation**:
- MIDI data converts to standard notation
- Appropriate note values (quarter, eighth, etc.)
- Beam grouping follows music engraving rules
- Automatic page layout and formatting

**Notation Elements**:
- **Notes** - Quarter, half, whole, etc.
- **Rests** - Silent beats
- **Clefs** - Treble, bass, alto, tenor
- **Key Signature** - Sharps and flats
- **Time Signature** - 4/4, 3/4, 6/8, etc.
- **Dynamics** - p, mp, mf, f, etc.
- **Articulations** - Staccato, accent, tenuto
- **Slurs** - Phrase markings

**Multi-Instrument**:
- Grand piano (treble + bass clefs)
- Lead sheet (treble clef + chords)
- Ensemble arrangements
- Custom instrument configurations

### Editing in Sheet Music

**Add Note**:
1. Select note value from palette (quarter, half, etc.)
2. Click on staff
3. Note appears at that position

**Edit Note**:
1. Select note
2. Drag vertically to change pitch
3. Drag horizontally to move in time

**Add Rest**:
1. Select rest value from palette
2. Click on staff

**Dynamics**:
1. Select Dynamic tool
2. Click below note or measure
3. Choose dynamic (p, mp, mf, f, etc.)

**Articulations**:
1. Select note(s)
2. Double-click articulation in palette
3. Staccato, accent, tenuto, fermata

### Page Layout

**Page Navigation**:
- **Next Page**: Right arrow or swipe left
- **Previous Page**: Left arrow or swipe right
- **Jump to Page**: Click page number

**Zoom**:
- **Zoom In**: **Cmd+Plus**
- **Zoom Out**: **Cmd+Minus**
- **Fit to Page**: **Cmd+0**

**Print**:
- **File > Print Sheet Music** (**Cmd+P**)
- Choose page range
- Select printer or save as PDF

### Sheet Music Export

**Export as PDF**:
1. **File > Export > Sheet Music as PDF**
2. Choose page range
3. Select location
4. Click **Export**

**Export as MusicXML**:
1. **File > Export > MusicXML**
2. Select format (compressed .mxl or uncompressed .xml)
3. Export for use in other notation apps (Finale, Sibelius, etc.)

---

## Tablature

### Opening Tablature

**Double-click** MIDI region on guitar/bass track:
- **View > Show Tablature** (**Cmd+6**)
- Or click "Tab" button

### Tablature Display

```
┌────────────────────────────────────────────┐
│  E ───────────────3────────────────────── │
│  A ──────────2───────────────2─────────── │
│  D ──────2──────────────2──────────────── │
│  G ───2──────────2──────────────2──────── │
│  B ─────────────────────────────────────── │
│  e ─────────────────────────────────────── │
│                                             │
│     ┌───────────────────────────────────┐  │
│     │  Chord diagrams (optional)        │  │
│     └───────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**Tablature Elements**:
- **6 Lines** - Represent 6 strings (E A D G B e)
- **Numbers** - Fret positions (0 = open, 1 = 1st fret, etc.)
- **Rhythm** - Note stems show duration
- **Chord Diagrams** - Finger positions for chords

### Supported Instruments

**Guitar**:
- 6-string (standard tuning: E A D G B e)
- 7-string (add low B)
- 12-string
- Alternate tunings (DADGAD, Open G, etc.)

**Bass**:
- 4-string (E A D G)
- 5-string (add low B)
- 6-string
- Alternate tunings

### Editing Tablature

**Add Note**:
1. Select fret value from palette (0-24)
2. Click on string
3. Note appears at that position

**Edit Fret**:
1. Select note
2. Type new fret number (0-24)
3. Note updates

**Move Note**:
1. Select note
2. Drag vertically to different string
3. Drag horizontally to different time position

**Delete Note**:
1. Select note
2. Press **Delete**

**Chord Diagrams**:
1. Select notes in chord
2. **Edit > Create Chord Diagram**
3. Diagram appears above staff
4. Drag to reposition

### Tablature Options

**Tuning**:
- **Standard Tuning** (default)
- **Drop D** (D A D G B e)
- **Open G** (D G D G B d)
- **Open D** (D A D F# A d)
- **Custom**: **Track > Tuning > Custom Tuning**

**Fretboard Display**:
- **Show/Hide**: **View > Show Fretboard**
- Interactive fretboard shows note positions
- Click fretboard to add notes

**Rhythm Notation**:
- Note stems show duration
- Ties connect notes across beats
- Rests indicate silence

---

## Mixing Console

### Opening Mixer

**View > Show Mixer** (**Cmd+3**) or press **X**

### Mixer Layout

```
┌──────────────────────────────────────────────────────────┐
│  Track 1   Track 2   Track 3   Track 4   Master          │
│  ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐        │
│  │ M S │   │ M S │   │ M S │   │ M S │   │ M S │        │
│  ├─────┤   ├─────┤   ├─────┤   ├─────┤   ├─────┤        │
│  │Pan  │   │Pan  │   │Pan  │   │Pan  │   │Pan  │        │
│  │  ◉  │   │  ◉  │   │  ◉  │   │  ◉  │   │  ◉  │        │
│  ├─────┤   ├─────┤   ├─────┤   ├─────┤   ├─────┤        │
│  │ Vol │   │ Vol │   │ Vol │   │ Vol │   │ Vol │        │
│  │  ▃  │   │  ▃  │   │  ▃  │   │  ▃  │   │  ▃  │        │
│  └─────┘   └─────┘   └─────┘   └─────┘   └─────┘        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ VU Meter (peak/RMS levels)                          │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Channel Strip Components**:
- **M/S** - Mute/Solo buttons
- **Pan** - Stereo pan knob
- **Volume** - Fader (level control)
- **VU Meter** - Level meter
- **Inserts** - Effects slots
- **Sends** - Effects sends
- **Input/Output** - Routing

### Channel Strip Controls

**Mute (M)**:
- Silences track output
- Muted tracks don't output sound
- Multiple tracks can be muted

**Solo (S)**:
- Solos track (mutes all other tracks)
- Only soloed tracks are heard
- Multiple tracks can be soloed

**Pan**:
- Controls stereo placement
- **Center** (default): Equal left/right
- **Left**: Signal biased to left channel
- **Right**: Signal biased to right channel
- Drag knob or double-click for exact value (-64 to +63)

**Volume Fader**:
- Controls track output level
- Range: -∞ to +6 dB
- **Cmd+Click** to reset to 0 dB
- Drag for adjustment, **Option+Drag** for fine control

**VU Meter**:
- Visual level monitoring
- **Peak** - Highest level reached
- **RMS** - Average level
- Clip indicator (red) at 0 dBFS

### Inserts

Add effects directly to track:

**Insert Effect**:
1. Click empty insert slot
2. Choose effect type
3. Effect loads into slot
4. Adjust effect parameters

**Effect Types**:
- **Dynamics**: Compressor, Limiter, Gate
- **EQ**: Parametric EQ, Graphic EQ
- **Reverb**: Reverb spaces
- **Delay**: Delay, Echo
- **Modulation**: Chorus, Flanger, Phaser
- **Distortion**: Overdrive, Distortion
- **Filter**: Low-pass, High-pass, Band-pass

**Bypass Effect**:
- Click effect power button
- Or **Option+Click** insert slot

**Remove Effect**:
- **Control+Click** insert slot
- Select **Remove**

**Reorder Effects**:
- Drag effect to different slot
- Order matters (EQ before compressor, etc.)

### Sends

Send signal to effects (reverb, delay):

**Create Send**:
1. Click **"+"** button in Sends section
2. Choose destination bus
3. Adjust send level

**Send Controls**:
- **Level** - Amount sent to effect
- **Pan** - Stereo placement of send
- **Pre/Post Fader** - Send timing relative to volume

**Common Uses**:
- **Reverb** - Send multiple tracks to single reverb
- **Delay** - Send vocals to delay
- **Headphone Mix** - Custom mix for recording

### Routing

**Input Routing**:
- **Audio Tracks**: Select audio input
- **MIDI Tracks**: Select MIDI input
- **Instrument Tracks**: No input (software instrument)

**Output Routing**:
- Default to **Stereo Out**
- Can route to bus for submixing
- Master output to main outputs

**Submixing**:
1. Create **Bus Track**
2. Set track outputs to bus
3. Process bus track (EQ, compression)
4. Bus outputs to Stereo Out

### Mixing Workflow

**1. Set Initial Levels**:
- Start all faders at 0 dB
- Play project
- Adjust levels for balance

**2. Pan for Stereo Image**:
- Pan instruments left/right
- Common panning: Bass centered, drums spread, vocals centered
- Avoid hard panning (extreme left/right)

**3. Add EQ**:
- Cut frequencies that clash
- Boost character
- Common: High-pass filter on non-bass instruments (100 Hz)

**4. Add Compression**:
- Control dynamics
- Glue tracks together
- Common: Bass, vocals, drums

**5. Add Effects**:
- Reverb for space
- Delay for depth
- Use sends for time-based effects

**6. Automation**:
- Automate volume, pan, parameters
- Create dynamic mixes
- **View > Show Automation**

**7. Master Bus Processing**:
- Add EQ to master (tonal balance)
- Add limiter (prevent clipping)
- Reference commercial tracks

---

## Export Options

### Export Types

**Audio Export**:
- **WAV** - Uncompressed, highest quality
- **AIFF** - Mac standard, uncompressed
- **FLAC** - Compressed lossless
- **MP3** - Compressed lossy (smaller files)
- **AAC** - Apple's compressed format

**MIDI Export**:
- **MIDI File (.mid)** - Standard MIDI file
- Export regions, tracks, or entire project

**Sheet Music Export**:
- **PDF** - Print-ready sheet music
- **MusicXML** - For other notation apps

**Stem Export**:
- Export each track separately
- For mixing in other DAWs
- Same format options as audio export

### Audio Export Settings

**File > Export > Audio Export**

**Format Options**:
- **WAV/AIFF** (recommended for highest quality)
- **FLAC** (lossless compression, ~50% smaller)
- **MP3** (lossy, ~10x smaller, use for sharing)

**Quality Settings**:
- **Sample Rate**: 44.1kHz (CD), 48kHz (video), 96kHz (high-res)
- **Bit Depth**: 16-bit (CD), 24-bit (recommended), 32-bit float
- **Bit Rate** (MP3 only): 128 kbps (standard), 320 kbps (high quality)

**Export Range**:
- **Entire Project** - Export from start to end
- **Cycle Region** - Export loop region only
- **Selection** - Export selected regions only
- **Custom Range** - Set start and end points

**Normalization**:
- **Off** - No level adjustment
- **Peak** - Normalize to 0 dBFS (loudest without clipping)
- **RMS** - Normalize average level (perceived loudness)

### MIDI Export

**File > Export > MIDI File**

**Export Options**:
- **Format 0** - Single track (all MIDI on one track)
- **Format 1** - Multiple tracks (preserves track structure)

**Include**:
- **Notes** - Note events
- **Velocities** - Note loudness
- **Tempo Changes** - Tempo map
- **Time Signature** - Meter changes
- **Markers** - Section markers

### Stem Export

**File > Export > Export Stems**

Exports each track as separate file:

**Naming**:
- Pattern: `[Track Name]_[Project Name]_[Date].wav`
- Example: `Bass_My Song_2026-01-16.wav`

**Include**:
- All tracks in project
- Effects processing (optional)
- Automation

**Uses**:
- Archive individual tracks
- Send to mixing engineer
- Remix in other DAW
- Create alternate versions

### Export Presets

Save common export settings:

**Create Preset**:
1. Set export options
2. Click **"Save Preset"**
3. Enter preset name
4. Preset appears in preset list

**Use Preset**:
1. Choose preset from dropdown
2. All settings load automatically

**Default Presets**:
- **WAV 24-bit** - High-quality archive
- **MP3 320** - High-quality sharing
- **Stems** - Individual track exports

### Batch Export

Export multiple formats at once:

**File > Export > Batch Export**

1. Add formats to export queue
2. Configure each format's settings
3. Click **"Export All"**
4. All formats export simultaneously

---

## Keyboard Shortcuts

### Navigation

| Action | Shortcut |
|--------|----------|
| Play/Pause | Space |
| Stop | Space (returns to start) |
| Record | R |
| Cycle (Loop) | C |
| Rewind | [ (left bracket) |
| Fast Forward | ] (right bracket) |
| Go to Start | Home |
| Go to End | End |
| Jump to Playhead | Cmd+J |

### Editing

| Action | Shortcut |
|--------|----------|
| Undo | Cmd+Z |
| Redo | Cmd+Shift+Z |
| Cut | Cmd+X |
| Copy | Cmd+C |
| Paste | Cmd+V |
| Delete | Delete |
| Select All | Cmd+A |
| Deselect All | Shift+Cmd+A |
| Split Region | Cmd+T |
| Join Regions | Cmd+J |
| Repeat | Cmd+R |

### Views

| Action | Shortcut |
|--------|----------|
| Show/Hide Tracks | Cmd+1 |
| Show/Hide Inspector | Cmd+2 |
| Show/Hide Mixer | Cmd+3 |
| Show/Hide Piano Roll | Cmd+4 |
| Show/Hide Sheet Music | Cmd+5 |
| Show/Hide Tablature | Cmd+6 |
| Zoom In | Cmd+Plus |
| Zoom Out | Cmd+Minus |
| Fit to Window | Cmd+0 |

### Tools

| Action | Shortcut |
|--------|----------|
| Pointer Tool | 1 |
| Pencil Tool | 2 |
| Eraser Tool | 3 |
| Scissors Tool | 4 |
| Glue Tool | 5 |

### Files

| Action | Shortcut |
|--------|----------|
| New Project | Cmd+N |
| Open Project | Cmd+O |
| Close Project | Cmd+W |
| Save | Cmd+S |
| Save As | Cmd+Shift+S |
| Export Audio | Cmd+E |

### Tracks

| Action | Shortcut |
|--------|----------|
| New Track | Cmd+Shift+N |
| Delete Track | Cmd+Backspace |
| Duplicate Track | Cmd+D |
| Freeze Track | Cmd+F |
| Track Settings | Cmd+T |

### Regions

| Action | Shortcut |
|--------|----------|
| Nudge Left | Option+Left |
| Nudge Right | Option+Right |
| Nudge Up | Option+Up |
| Nudge Down | Option+Down |
| Quantize | Ctrl+Q |
| Transpose | Ctrl+T |

### Automation

| Action | Shortcut |
|--------|----------|
| Show Automation | Cmd+A |
| Toggle Automation Read | R |
| Toggle Automation Touch | T |
| Toggle Automation Latch | L |
| Toggle Automation Write | W |

---

## Troubleshooting

### Common Issues

**No Sound**:
1. Check system volume
2. Verify audio device (**Preferences > Audio**)
3. Check track volume faders
4. Ensure master isn't muted
5. Restart audio engine (**Cmd+Option+R**)

**Crackling Audio**:
1. Increase buffer size
2. Close other audio apps
3. Update audio drivers
4. Disable "Use High Precision"

**High CPU Usage**:
1. Increase buffer size
2. Freeze tracks with plugins
3. Disable unused tracks
4. Check plugin updates

**MIDI Not Recording**:
1. Check MIDI connections
2. Verify track is armed (**R** button)
3. Check MIDI input assignment
4. Test with MIDI Monitor app

**Application Crashed**:
1. Restart White Room
2. Reopen project (auto-saved)
3. Check for plugin updates
4. Contact support with crash report

### Error Messages

**"Audio Device Not Found"**:
- Audio interface disconnected
- Another app using the device
- Solution: Reconnect device or choose different device

**"Disk Too Slow"**:
- Hard drive can't keep up with recording
- Solution: Record to faster drive (SSD), close other apps

**"Out of Memory"**:
- Too many tracks/plugins
- Solution: Freeze tracks, close unused projects

**"Plugin Failed to Load"**:
- Plugin incompatible or corrupted
- Solution: Update plugin, reinstall, or remove plugin

### Performance Tips

**Optimize Performance**:
1. Increase buffer size (256-512 samples)
2. Freeze tracks with heavy plugins
3. Use sends for effects (one reverb for all tracks)
4. Disable unused tracks
5. Keep projects organized (delete unused takes)

**Reduce Latency**:
1. Decrease buffer size (64-128 samples)
2. Use Direct Monitoring (if available)
3. Enable Low Latency Mode
4. Disable plugins on record-enabled tracks

**Improve Audio Quality**:
1. Use higher sample rate (48kHz or 96kHz)
2. Use 24-bit or 32-bit float
3. Gain stage properly (avoid clipping)
4. Use high-quality cables and interfaces

---

**Last Updated**: January 16, 2026
**White Room Version**: 1.0.0
**Next**: [Features Guide](FEATURES.md)

---

*For the latest updates and community support, visit white-room.audio*
