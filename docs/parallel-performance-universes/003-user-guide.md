# Parallel Performance Universes - User Guide

## Welcome to Parallel Performance Universes

**Parallel Performance Universes** is a revolutionary feature that lets you experience the same song in infinite different ways. Switch from Solo Piano to SATB Choir to Ambient Techno with a single tap, or smoothly blend between performances like moving through parallel universes.

### What You Can Do

- **Create Performances**: Define how your song sounds (instruments, density, groove, mixing)
- **Switch Universes**: Instantly transform your song between different performances
- **Sweep Control**: Smoothly blend between two performances like parallel universes
- **Customize Everything**: Instruments, density, groove, register, ConsoleX mixing, and more

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding Performances](#understanding-performances)
3. [Creating Your First Performance](#creating-your-first-performance)
4. [Switching Between Performances](#switching-between-performances)
5. [Using the Sweep Control](#using-the-sweep-control)
6. [Performance Best Practices](#performance-best-practices)
7. [ConsoleX Profile Configuration](#consolex-profile-configuration)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Getting Started

### Quick Start Guide

1. **Open Your Song**
   - Load any song in White Room
   - The song will have at least one performance (default: Solo Piano)

2. **View Performances**
   - Look for the "Performances" strip at the bottom of the screen
   - You'll see performance cards like "Solo Piano", "SATB Choir", "Ambient Techno"

3. **Switch Performance**
   - Tap any performance card to switch to that universe
   - The song will transform at the next bar boundary
   - No audio glitches - smooth transitions guaranteed

4. **Experiment**
   - Try different performances to hear your song in new ways
   - Use the Sweep control to blend between performances
   - Create custom performances for unique sounds

### The Performances Strip

```
┌─────────────────────────────────────────────────────────────┐
│  SONG: "My Composition"                    [+] New Performance│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Solo Piano  │  │ SATB Choir  │  │Ambient Techno│         │
│  │   ● Active  │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Sweep Control:  Piano ━━━━━━━━━━●━━━━━━━━━━━ Techno│   │
│  │                    t = 0.65                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**UI Elements**:
- **Performance Cards**: Tap to switch to that performance
- **Active Indicator**: Shows currently active performance (●)
- **New Performance Button**: Create custom performances
- **Sweep Control**: Blend between two performances (future feature)

---

## Understanding Performances

### What is a Performance?

A **Performance** (or **Performance Realization**) defines **how your song sounds**. It's separate from **what your song is** (the musical notes, rhythm, harmony).

Think of it like this:
- **SongState** = The sheet music (what the song is)
- **Performance** = The orchestra and how they play (how it sounds)

### Performance Components

Every performance has these components:

#### 1. Arrangement Style

The category of performance:
- **Solo Piano**: Single instrument, minimal density
- **SATB Choir**: Four-part harmony (Soprano, Alto, Tenor, Bass)
- **Chamber Ensemble**: Small group (3-8 instruments)
- **Full Orchestra**: Large ensemble with many instruments
- **Jazz Combo**: Rhythm section + lead instruments
- **Rock Band**: Drums, bass, guitar, keyboards
- **Ambient Techno**: Electronic synths with effects
- **Electronic**: Synthesizers and drum machines
- **A Cappella**: Voices only, no instruments
- **Custom**: Your own unique arrangement

#### 2. Density

How many notes play (0.0 to 1.0):
- **0.0 - 0.3**: Sparse (minimal notes, lots of space)
- **0.3 - 0.6**: Medium (balanced note density)
- **0.6 - 1.0**: Dense (full, rich texture)

**Example**:
- Solo Piano: density = 0.3 (sparse, elegant)
- SATB Choir: density = 0.6 (moderate, harmonious)
- Ambient Techno: density = 0.8 (dense, layered)

#### 3. Instrumentation

Which instruments play which roles:

```
Role → Instrument + Preset

Primary Role → NexSynth (Grand Piano preset)
Secondary Role → KaneMarco (Pad preset)
Tertiary Role → DrumMachine (Techno beat preset)
```

#### 4. Groove Profile

Timing and feel characteristics:
- **Timing Variance**: How much timing varies (0.0 = perfect, 1.0 = very human)
- **Velocity Variance**: How much volume varies (0.0 = consistent, 1.0 = dynamic)
- **Swing Amount**: Swing feel (0.0 = straight, 1.0 = heavy swing)
- **Humanization**: Micro-timing deviations for natural feel

#### 5. Register Map

Pitch range for each role (MIDI note numbers 0-127):
- **Primary Role**: 48-84 (C3 to C6)
- **Secondary Role**: 24-60 (C1 to C1)
- **Tertiary Role**: 60-96 (C4 to C6)

#### 6. ConsoleX Profile

Mixing configuration:
- **Gain**: Volume per role (dB)
- **Pan**: Stereo position (-1.0 left to +1.0 right)
- **Effects**: Reverb, delay, etc.
- **Routing**: Bus sends and returns

### Preset Performances

White Room comes with three preset performances:

#### Solo Piano
```
Arrangement: SOLO_PIANO
Density: 0.3 (sparse)
Instruments: 1x NexSynth (Grand Piano)
Register: C3 to C7
ConsoleX: Simple stereo, slight reverb
```

#### SATB Choir
```
Arrangement: SATB
Density: 0.6 (moderate)
Instruments: 4x KaneMarcoAetherString (Choir presets)
Register: SATB ranges (Bass to Soprano)
ConsoleX: Stereo spread (4 voices panned), reverb
```

#### Ambient Techno
```
Arrangement: AMBIENT_TECHNO
Density: 0.8 (dense)
Instruments: 6x synths (NexSynth, KaneMarco, KaneMarcoAether)
Register: Full spectrum (24-120)
ConsoleX: Wide stereo, heavy effects, bus sends
```

---

## Creating Your First Performance

### Step-by-Step Guide

#### Step 1: Open Performance Editor

1. Tap the **[+] New Performance** button in the Performances strip
2. The Performance Editor will open

#### Step 2: Basic Settings

```
┌─────────────────────────────────────────────────────────────┐
│  CREATE PERFORMANCE                                         │
├─────────────────────────────────────────────────────────────┤
│  Name: [Jazz Trio_________________________]                 │
│  Description: [Piano, bass, drums________________]          │
│                                                              │
│  Arrangement Style: [Jazz Combo ▼]                          │
│                                                              │
│  Density: [━━━━━●━━━━] 0.5                                  │
│                                                              │
│  Groove Profile: [Medium Swing ▼]                           │
│                                                              │
│  ConsoleX Profile: [Jazz Club ▼]                            │
└─────────────────────────────────────────────────────────────┘
```

**Fill in**:
- **Name**: "Jazz Trio"
- **Description**: "Piano, upright bass, drums"
- **Arrangement Style**: Jazz Combo
- **Density**: 0.5 (medium)
- **Groove Profile**: Medium Swing
- **ConsoleX Profile**: Jazz Club

#### Step 3: Instrumentation

```
┌─────────────────────────────────────────────────────────────┐
│  INSTRUMENTATION                                            │
├─────────────────────────────────────────────────────────────┤
│  Role → Instrument → Preset → Bus                           │
│                                                              │
│  [Primary] [NexSynth ▼] [Jazz Piano ▼] [Bus 1 ▼]            │
│  [+ Add Instrument Assignment]                              │
│                                                              │
│  [Secondary] [LocalGal ▼] [Upright Bass ▼] [Bus 2 ▼]        │
│  [+ Add Instrument Assignment]                              │
│                                                              │
│  [Tertiary] [DrumMachine ▼] [Brush Kit ▼] [Bus 3 ▼]        │
│  [+ Add Instrument Assignment]                              │
└─────────────────────────────────────────────────────────────┘
```

**Add Instruments**:
1. Tap **[+ Add Instrument Assignment]**
2. Select **Role**: Primary
3. Select **Instrument**: NexSynth
4. Select **Preset**: Jazz Piano
5. Select **Bus**: Bus 1

Repeat for Secondary (LocalGal - Upright Bass) and Tertiary (DrumMachine - Brush Kit).

#### Step 4: Register Map

```
┌─────────────────────────────────────────────────────────────┐
│  REGISTER MAP (Pitch Ranges)                                │
├─────────────────────────────────────────────────────────────┤
│  Role → Min Pitch → Max Pitch                               │
│                                                              │
│  [Primary] [48 (C3)____] [84 (C6)____]                      │
│  [+ Add Register Range]                                     │
│                                                              │
│  [Secondary] [28 (C1)____] [60 (C2)____]                    │
│  [+ Add Register Range]                                     │
│                                                              │
│  [Tertiary] [0 (C0)______] [127 (G9)__]                    │
│  [+ Add Register Range]                                     │
└─────────────────────────────────────────────────────────────┘
```

**Set Ranges**:
- **Primary**: 48 to 84 (Piano range)
- **Secondary**: 28 to 60 (Bass range)
- **Tertiary**: 0 to 127 (Full drum range)

#### Step 5: Mix Targets

```
┌─────────────────────────────────────────────────────────────┐
│  MIX TARGETS (Gain and Pan)                                 │
├─────────────────────────────────────────────────────────────┤
│  Role → Gain (dB) → Pan                                     │
│                                                              │
│  [Primary] [-3.0___] [━●━] 0.0 (Center)                    │
│  [+ Add Mix Target]                                         │
│                                                              │
│  [Secondary] [-6.0___] [━●━━] -0.2 (Left)                  │
│  [+ Add Mix Target]                                         │
│                                                              │
│  [Tertiary] [-9.0___] [━●━] 0.0 (Center)                   │
│  [+ Add Mix Target]                                         │
└─────────────────────────────────────────────────────────────┘
```

**Set Levels**:
- **Primary**: -3.0 dB gain, 0.0 pan (center)
- **Secondary**: -6.0 dB gain, -0.2 pan (slightly left)
- **Tertiary**: -9.0 dB gain, 0.0 pan (center)

#### Step 6: Save and Test

1. Tap **[Save Performance]**
2. Your new "Jazz Trio" performance appears in the Performances strip
3. Tap it to switch and hear your song with this performance
4. Make adjustments if needed (tap the performance card to edit)

### Tips for Creating Great Performances

#### Start with Presets
- Duplicate an existing preset (Solo Piano, SATB, Techno)
- Tweak parameters to understand how they affect sound
- Learn by experimentation

#### Consider Instrument Characteristics
- **LocalGal**: Physical modeling string (realistic, expressive)
- **KaneMarco**: Wavetable synth (rich, evolving)
- **KaneMarcoAether**: Additive synth (ethereal, atmospheric)
- **NexSynth**: FM synth (bell-like, metallic)
- **SamSampler**: Sampler (any sound you want)
- **DrumMachine**: Drum synthesis (electronic drums)

#### Density Guidelines
- **Sparse (0.0-0.3)**: Solo instruments, minimal arrangements
- **Medium (0.3-0.6)**: Small groups, balanced arrangements
- **Dense (0.6-1.0)**: Large ensembles, full arrangements

#### Register Tips
- Keep roles in separate ranges to avoid mud
- Higher notes for lead instruments
- Lower notes for bass and pads
- Middle range for chords and comping

#### Mix Balance
- Start with all gains at 0 dB
- Lower instruments that are too loud
- Pan similar instruments apart for stereo width
- Use bus sends for effects (reverb, delay)

---

## Switching Between Performances

### How Performance Switching Works

When you tap a performance card:
1. White Room schedules the switch at the **next bar boundary**
2. This prevents audio glitches (clicks, pops)
3. At the bar boundary:
   - Instrumentation changes
   - Density updates
   - Groove profile applies
   - ConsoleX reconfigures
   - Audio output transforms

### Timeline Example

```
Bar 1       Bar 2       Bar 3       Bar 4
┌──────────┬──────────┬──────────┬──────────┐
│ Piano    │ Piano    │ Switch   │ Techno   │
│ 100%     │ 100%     │  ↓       │ 100%     │
└──────────┴──────────┴──────────┴──────────┘
            ↑
       User taps "Techno"
       at Bar 1.5

Switch happens at Bar 3 boundary
(transition point at 2.0, waits for next bar)
```

### Switching Performances

#### Method 1: Quick Switch

1. Locate the **Performances strip** at the bottom of the screen
2. Find the performance you want to switch to
3. **Tap the performance card**
4. Wait for the bar boundary (usually < 1 second)
5. Your song transforms!

#### Method 2: From Performance Editor

1. Tap the active performance card to open editor
2. Tap **[Switch to...]** button
3. Select target performance from list
4. Confirm switch

#### Method 3: Keyboard Shortcut (Future)

- **Cmd+1**: Switch to first performance
- **Cmd+2**: Switch to second performance
- **Cmd+3**: Switch to third performance
- etc.

### What Changes When You Switch?

When you switch from "Solo Piano" to "Ambient Techno":

| Parameter | Solo Piano | Ambient Techno |
|-----------|------------|----------------|
| **Instruments** | 1x Piano | 6x Synths |
| **Density** | 0.3 (sparse) | 0.8 (dense) |
| **Groove** | Straight | Swing 0.5 |
| **Register** | C3-C7 | Full spectrum |
| **Mix** | Simple stereo | Wide stereo + effects |
| **CPU Usage** | 5% | 25% |

The **musical notes stay the same**, but the **realization transforms completely**.

### Performance Switching Best Practices

#### DO:
- ✅ Switch at bar boundaries (automatic)
- ✅ Wait for transition to complete
- ✅ Use contrasting performances for dramatic effect
- ✅ Test performances before live use

#### DON'T:
- ❌ Switch rapidly (can confuse audio engine)
- ❌ Switch during critical passages (wait for breaks)
- ❌ Switch to CPU-heavy performances on slow machines
- ❌ Switch without saving your work

---

## Using the Sweep Control

### What is the Sweep Control?

The **Sweep Control** is a slider that lets you smoothly blend between two performances, like moving between parallel universes.

**Note**: This feature is coming in **Milestone 2**. Currently, only discrete switching is available.

### How It Works

```
Piano (t=0.0) ━━━━━━━━━━━━━━━━━━━━━━ Techno (t=1.0)
                  ━━━━●━━━━
                     t=0.65

t = 0.0: 100% Piano, 0% Techno
t = 0.5: 50% Piano, 50% Techno
t = 1.0: 0% Piano, 100% Techno
```

### Using the Sweep Control

#### Step 1: Select A and B Performances

1. Tap the **Sweep Control** to open configuration
2. Select **Performance A** (e.g., "Solo Piano")
3. Select **Performance B** (e.g., "Ambient Techno")

#### Step 2: Adjust Sweep Parameter

1. Drag the slider to blend between performances
2. t = 0.0 → 100% Performance A
3. t = 0.5 → 50/50 blend
4. t = 1.0 → 100% Performance B

#### Step 3: Lock to Endpoints (Optional)

- Tap **[Lock to A]** to stay at 100% Performance A
- Tap **[Lock to B]** to stay at 100% Performance B

### What Gets Blended?

| Parameter | Blending Method |
|-----------|-----------------|
| **Audio Output** | Linear crossfade (equal power) |
| **Density** | Linear (0.3 → 0.8) |
| **Groove Swing** | Linear (0.0 → 0.5) |
| **Mix Targets** | Linear (gain, pan) |
| **Instrumentation** | Staged swap at bar boundaries |
| **ConsoleX Profile** | Linear (strip parameters) |

### Creative Uses

#### Morphing Transitions
- Start with Piano (t=0.0)
- Slowly sweep to Techno (t=1.0) over 8 bars
- Creates evolving, cinematic transition

#### Rhythmic Sweeping
- Sweep back and forth rhythmically
- t=0.0 → t=1.0 → t=0.0 (synced to LFO)
- Creates pulsing, breathing effect

#### Performance Exploration
- Sweep slowly to find sweet spots
- Pause at interesting blend ratios
- Discover new sounds between performances

### Sweep Control Tips

#### Smooth Transitions
- Use slow sweeps for dramatic effect
- Match sweep rate to song tempo
- Sweep during breakdowns or bridges

#### Avoid Audio Artifacts
- Don't sweep too fast (can cause phase issues)
- Avoid sweeping during transient-heavy passages
- Use bar-synced sweeping for musical timing

#### CPU Considerations
- Sweeping requires **dual rendering** (2x CPU)
- Be careful on slower machines
- Lock to endpoints when not sweeping

---

## Performance Best Practices

### Creating Great Performances

#### 1. Start with a Clear Vision

Before creating a performance, ask yourself:
- What mood do I want? (e.g., "melancholy jazz")
- What instrumentation fits? (e.g., "piano trio")
- What density works? (e.g., "sparse and intimate")
- What groove feel? (e.g., "lazy swing")

#### 2. Use Reference Tracks

Listen to similar music:
- "I want it to sound like [artist/song]"
- Analyze the instrumentation
- Note the density and texture
- Match the mix balance

#### 3. Build Incrementally

Start simple, add complexity:
1. **Basic**: One instrument, simple density
2. **Add**: Second instrument, adjust balance
3. **Refine**: Add effects, adjust register
4. **Polish**: Fine-tune mix, groove, timing

#### 4. Test and Iterate

- Switch between performances frequently
- Compare your custom performance to presets
- Make small adjustments based on what you hear
- Save multiple versions (e.g., "Jazz Trio v1", "Jazz Trio v2")

### Performance Organization

#### Naming Conventions

Use descriptive names:
- ✅ "Jazz Trio - Piano Upright Bass Drums"
- ✅ "Ambient Techno - Dense Wide Stereo"
- ❌ "My Performance 1"
- ❌ "Test"

#### Categorization

Group similar performances:
- **Acoustic**: Solo Piano, Chamber Ensemble, SATB Choir
- **Electronic**: Ambient Techno, Electronic, Synthwave
- **Jazz**: Jazz Combo, Jazz Trio, Big Band
- **Orchestral**: Chamber Ensemble, Full Orchestra

#### Versioning

Keep iterations:
- "Jazz Trio v1" (initial)
- "Jazz Trio v2" (adjusted mix)
- "Jazz Trio v3" (added drums)

### Performance Switching Strategies

#### Musical Transitions

Switch at musically appropriate moments:
- **Section changes**: Verse → Chorus
- **Key changes**: Modulation points
- **Breakdowns**: Before drops/buildups
- **End of phrases**: Natural pause points

#### Dramatic Effect

Use contrasting performances:
- Solo Piano → Full Orchestra (dramatic swell)
- Ambient Techno → A Cappella (surprising reveal)
- Jazz Combo → Rock Band (genre transformation)

#### Subtle Evolution

Use similar performances:
- Jazz Trio v1 → Jazz Trio v2 (gradual evolution)
- Chamber Ensemble → Full Orchestra (adding voices)
- Ambient Techno → Electronic (increasing intensity)

### CPU Optimization

#### Monitor CPU Usage

Each performance shows estimated CPU usage:
- **Solo Piano**: ~5% CPU (light)
- **SATB Choir**: ~15% CPU (moderate)
- **Ambient Techno**: ~25% CPU (heavy)

#### Optimize Heavy Performances

If CPU usage is too high:
1. **Reduce voice count**: Fewer instruments
2. **Lower density**: Fewer notes playing
3. **Simplify effects**: Fewer ConsoleX effects
4. **Optimize register**: Constrain pitch ranges

#### Machine-Specific Considerations

- **Fast machines** (M1/M2 Mac, powerful PC): Any performance
- **Moderate machines** (Intel i5, older Mac): Avoid dense performances
- **Slow machines** (older hardware): Stick to Solo Piano, SATB

---

## ConsoleX Profile Configuration

### What is ConsoleX?

**ConsoleX** is White Room's built-in mixing console. Each performance can reference a **ConsoleX Profile** that defines:

- **Channel strip settings**: Gain, pan, inserts, sends
- **Bus configuration**: Voice buses, mix buses, master bus
- **Effects**: Reverb, delay, compression, EQ
- **Routing**: Signal flow and sends

### ConsoleX Profile Structure

```
ConsoleX Profile
├── Voice Buses (per instrument)
│   ├── Bus 1 (Piano)
│   │   ├── Gain: -3.0 dB
│   │   ├── Pan: 0.0 (center)
│   │   ├── Insert: Reverb
│   │   └── Send: Mix Bus 1 (-6 dB)
│   ├── Bus 2 (Bass)
│   └── Bus 3 (Drums)
├── Mix Buses (effects returns)
│   ├── Mix Bus 1 (Reverb)
│   └── Mix Bus 2 (Delay)
└── Master Bus (final output)
    ├── Gain: 0.0 dB
    └── Limiter: On
```

### Preset ConsoleX Profiles

#### ConsoleX Piano Solo
```
Type: Simple stereo
Voice Buses: 1 (Piano)
Mix Buses: 0
Effects: Light reverb
Gain: -3.0 dB
Pan: Center
```

#### ConsoleX SATB
```
Type: Stereo spread
Voice Buses: 4 (SATB)
Mix Buses: 1 (Reverb)
Effects: Hall reverb
Gain: -6.0 dB per voice
Pan: Spread (-0.3, -0.1, +0.1, +0.3)
```

#### ConsoleX Techno
```
Type: Wide stereo + effects
Voice Buses: 6 (Synths)
Mix Buses: 3 (Reverb, Delay, Distortion)
Effects: Heavy processing
Gain: Variable per voice
Pan: Wide stereo spread
```

### Creating Custom ConsoleX Profiles

#### Step 1: Open ConsoleX Editor

1. In Performance Editor, tap **ConsoleX Profile**
2. Tap **[+] Create New Profile**
3. ConsoleX Editor opens

#### Step 2: Configure Voice Buses

```
┌─────────────────────────────────────────────────────────────┐
│  VOICE BUS 1 (Piano)                                        │
├─────────────────────────────────────────────────────────────┤
│  Gain: [-3.0 dB_____]                                       │
│  Pan:  [━●━] 0.0 (Center)                                  │
│  Mute: [ ] Solo: [ ]                                       │
│                                                              │
│  INSERT EFFECTS                                              │
│  [+] Add Insert                                              │
│  [✓] Reverb (Hall) [Bypass]                                 │
│  [ ] Compressor [Bypass]                                    │
│                                                              │
│  SENDS                                                       │
│  [+] Add Send                                                │
│  [Reverb Bus] [-6.0 dB] [━●━]                              │
└─────────────────────────────────────────────────────────────┘
```

**Configure**:
- **Gain**: Volume level (dB)
- **Pan**: Stereo position (-1.0 to +1.0)
- **Insert Effects**: Reverb, delay, compression, EQ
- **Sends**: Send levels to mix buses

#### Step 3: Configure Mix Buses

```
┌─────────────────────────────────────────────────────────────┐
│  MIX BUS 1 (Reverb Return)                                  │
├─────────────────────────────────────────────────────────────┤
│  Gain: [0.0 dB_____]                                       │
│  Pan:  [━●━] 0.0 (Center)                                  │
│                                                              │
│  INSERT EFFECTS                                              │
│  [✓] Reverb (Hall) [Edit] [Bypass]                          │
│    └─ Pre-delay: 20ms                                       │
│    └─ Decay time: 2.5s                                      │
│    └─ Wet/Dry: 30%                                          │
└─────────────────────────────────────────────────────────────┘
```

**Configure**:
- **Return level**: How much reverb to add
- **Pan**: Stereo position of reverb tail
- **Effect parameters**: Pre-delay, decay, wet/dry mix

#### Step 4: Configure Master Bus

```
┌─────────────────────────────────────────────────────────────┐
│  MASTER BUS                                                 │
├─────────────────────────────────────────────────────────────┤
│  Gain: [0.0 dB_____]                                       │
│                                                              │
│  INSERT EFFECTS                                              │
│  [✓] Limiter [Edit] [Bypass]                                │
│    └─ Threshold: -0.1 dB                                    │
│    └─ Release: 10ms                                         │
└─────────────────────────────────────────────────────────────┘
```

**Configure**:
- **Master gain**: Overall output level
- **Limiter**: Prevent clipping (always on)

#### Step 5: Save Profile

1. Tap **[Save Profile]**
2. Enter profile name (e.g., "My Jazz Club")
3. Profile is now available for all performances

### ConsoleX Best Practices

#### Mixing Levels
- Start with all gains at 0 dB
- Lower instruments that are too loud
- Aim for peaks around -6 dB to -3 dB
- Leave headroom for mastering

#### Stereo Imaging
- Pan similar instruments apart
- Keep bass and kick centered (mono)
- Spread stereo instruments (pads, synths)
- Create space with panning, not just volume

#### Effects Usage
- Use reverb for depth and space
- Use delay for rhythmic interest
- Use compression for control
- Use EQ for tonal balance

#### Signal Flow
```
Instrument → Voice Bus (gain, pan, inserts) → Mix Bus (effects) → Master Bus
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Performance Switching Doesn't Work

**Symptoms**:
- Tapping performance card does nothing
- Song doesn't transform
- No audio change

**Solutions**:
1. Check if audio is playing (switching only works during playback)
2. Wait for bar boundary (may take up to 1 second)
3. Check performance is valid (no validation errors)
4. Restart audio engine (stop/start playback)

#### Issue: Audio Glitches During Switch

**Symptoms**:
- Clicks or pops when switching
- Brief silence or dropout
- Distortion artifacts

**Solutions**:
1. Ensure you're waiting for bar boundary (automatic)
2. Check CPU usage (may be overloaded)
3. Reduce performance complexity (fewer instruments)
4. Update audio drivers

#### Issue: Performance Won't Save

**Symptoms**:
- Error when saving performance
- Validation errors
- "Invalid data" message

**Solutions**:
1. Check all required fields are filled (name, arrangement, etc.)
2. Ensure instrumentation map has at least one entry
3. Verify density is between 0.0 and 1.0
4. Check register ranges are valid (0-127, min < max)
5. Ensure mix targets have valid gain (-60 to +20 dB) and pan (-1 to +1)

#### Issue: Can't Delete Performance

**Symptoms**:
- Delete button is disabled
- "Cannot delete active performance" error
- "Cannot delete last performance" error

**Solutions**:
1. Switch to a different performance first (if active)
2. Create a new performance before deleting (if last)
3. Check performance is not referenced elsewhere

#### Issue: ConsoleX Profile Not Applied

**Symptoms**:
- Mix settings don't match profile
- Effects not audible
- Wrong gain/pan values

**Solutions**:
1. Verify ConsoleX profile ID is correct
2. Check profile exists in ConsoleX manager
3. Re-save performance to re-apply profile
4. Restart audio engine

#### Issue: High CPU Usage

**Symptoms**:
- Audio stutters or glitches
- CPU meter in red zone
- Fan runs loudly

**Solutions**:
1. Switch to lighter performance (e.g., Solo Piano)
2. Reduce density in current performance
3. Remove heavy effects from ConsoleX profile
4. Close other applications
5. Use faster machine or offline rendering

### Getting Help

If you're still stuck:

1. **Check Documentation**
   - [Design Documentation](./001-design-documentation.md)
   - [API Documentation](./002-api-documentation.md)
   - [Developer Guide](./004-developer-guide.md)

2. **Search Issues**
   - GitHub Issues: https://github.com/bretbouchard/white-room/issues
   - Search for similar problems

3. **Ask Community**
   - Discord server (if available)
   - Forums (if available)

4. **Report Bugs**
   - Create GitHub issue with details
   - Include steps to reproduce
   - Attach error logs

---

## FAQ

### General Questions

**Q: What is Parallel Performance Universes?**

A: It's a feature that separates "what the song is" (musical notes) from "how it sounds" (instruments, density, groove), letting you have infinite realizations of the same song.

**Q: How many performances can I have?**

A: As many as you want! There's no limit. Create performances for every mood, genre, or instrumentation you can imagine.

**Q: Can I share performances with others?**

A: Not yet, but it's planned for a future update. You'll be able to export performances as presets and share them with the White Room community.

**Q: Do performances change my original song?**

A: No! Performances are non-destructive. Your original SongState (musical notes) stays exactly the same. Performances only change how it's rendered.

### Technical Questions

**Q: What's the difference between SongState and PerformanceRealization?**

A:
- **SongState**: The invariant musical logic (what the song is)
- **PerformanceRealization**: The realization lens (how it sounds)

Think of it like sheet music vs. orchestra performance.

**Q: Can I automate performance switching?**

A: Not in v1, but it's planned for future updates. You'll be able to create automation curves that switch performances at specific times.

**Q: What's the CPU impact of performance switching?**

A: Minimal for discrete switching (just reconfigures audio engine). The Sweep Control (continuous blending) requires dual rendering, which is ~2x CPU.

**Q: Can I use performances in real-time performances?**

A: Absolutely! Performance switching is designed for live use. Transitions happen at bar boundaries, so they're always musical.

### Creative Questions

**Q: How do I make a performance sound "sad"?**

A:
- Choose sparse density (0.2-0.4)
- Use minor-compatible instruments (piano, strings)
- Slow tempo, little or no swing
- Add reverb for space
- Lower overall dynamics

**Q: How do I make a performance sound "energetic"?**

A:
- Choose high density (0.7-1.0)
- Use many instruments (6-8 voices)
- Fast tempo, heavy groove
- Wide stereo spread
- Bright register (high pitches)

**Q: Can I mix acoustic and electronic instruments?**

A: Yes! Create a "CUSTOM" arrangement style and mix any instruments you want. For example, piano + synth pad + electronic drums.

**Q: What's the best way to learn performance creation?**

A:
1. Start with preset performances (Solo Piano, SATB, Techno)
2. Duplicate them and tweak parameters
3. Listen to how each parameter affects the sound
4. Experiment with extreme values to understand ranges
5. Create small variations and compare

### Future Features

**Q: When will the Sweep Control be available?**

A: Planned for Milestone 2. Discrete switching (Milestone 1) is currently available.

**Q: Will there be AI-assisted performance creation?**

A: Yes! We're planning a feature where you can describe a sound in natural language ("make it sound like a sad jazz ballad") and AI will create the performance for you.

**Q: Can I morph between more than two performances?**

A: Not yet, but we're exploring multi-performance morphing for future updates.

**Q: Will there be performance presets I can download?**

A: Yes! We're building a community library of performances that you can browse and download.

---

## Summary

Parallel Performance Universes gives you:

✅ **Infinite Realizations** - Same song, infinite performances
✅ **Instant Switching** - Transform your song with one tap
✅ **Smooth Blending** - Sweep between performances (coming soon)
✅ **Complete Control** - Instruments, density, groove, mixing
✅ **Non-Destructive** - Never changes your original song

**Next Steps**:
1. Try the preset performances (Solo Piano, SATB, Techno)
2. Create your first custom performance
3. Switch between performances to hear the difference
4. Experiment with the Sweep Control (when available)

**Resources**:
- [Design Documentation](./001-design-documentation.md) - Architecture and algorithms
- [API Documentation](./002-api-documentation.md) - Developer reference
- [Developer Guide](./004-developer-guide.md) - Integration and extension

Happy music making! 🎵
