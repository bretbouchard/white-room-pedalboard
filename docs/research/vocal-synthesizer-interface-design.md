# Vocal Synthesizer Interface Design Research Report

**Project:** Choir v2.0 - Lyric-Based Vocal Synthesis
**Date:** 2025-01-17
**Research Focus:** Interface patterns for lyric input, timing control, and workflow in vocal synthesizers

---

## Executive Summary

This report analyzes existing vocal synthesizer interfaces to inform the design of Choir v2.0's lyric-based synthesis system. Based on comprehensive research of market-leading products (Vocaloid, Synthesizer V, Emvoice), DAW integration patterns, and academic tools, I've identified key interface patterns, architectural approaches, and workflow considerations for both live performance and studio recording scenarios.

**Key Findings:**
- **Lyric Input**: Text box below notes is the dominant pattern (Vocaloid, Synthesizer V, Emvoice)
- **Timing Control**: Two-tier approach - note-level timing + phoneme-level timing (20-180% range)
- **Data Architecture**: Lyrics stored as note metadata in proprietary formats; MIDI uses meta-events
- **Live Performance**: Limited support in existing products; most are studio-focused
- **Visual Representation**: Phonetic breakdown shown with waveform preview + color-coded timing

---

## Table of Contents

1. [Product-by-Product Analysis](#product-analysis)
2. [Common Interface Patterns](#common-patterns)
3. [Timing Control Architecture](#timing-architecture)
4. [Visual Representation Approaches](#visual-representation)
5. [DAW Integration Patterns](#daw-integration)
6. [Live Performance Considerations](#live-performance)
7. [Data Architecture Proposal](#architecture-proposal)
8. [Workflow Scenarios](#workflow-scenarios)
9. [UI Mockup Concepts](#ui-mockups)
10. [Recommendations](#recommendations)

---

## 1. Product-by-Product Analysis <a name="product-analysis"></a>

### 1.1 Vocaloid (Yamaha)

**Interface Overview:**
- Piano roll-based editor with integrated lyric input
- Cubase integration offers full piano roll support
- Mobile version (2025 subscription model) with Dark Mode improvements

**Lyric Input Method:**
- **Direct Entry**: Type lyrics directly into each note on the piano roll
- **Dual Editing**: Support for editing both lyrics and phonetic symbols
- **Text Boxes Below Notes**: Each note has an associated text input area

**Timing Control:**
- Note-level timing primary
- Phoneme editing available but not prominent
- Manual phoneme adjustment requires specialized mode

**Strengths:**
- Industry-standard interface
- Proven workflow adopted by most users
- Mobile accessibility improvements

**Weaknesses:**
- Phoneme timing control is complex
- Limited live performance capabilities
- DAW integration inconsistent (Cubase = full, others = limited)

**Screenshots/Visuals:**
- Piano roll with notes colored by type (green = singing, red = rap)
- Text input boxes positioned directly below each note
- Phonetic symbols displayed when in edit mode

---

### 1.2 Synthesizer V (Dreamtonics)

**Interface Overview:**
- Most advanced piano roll in vocal synthesis
- Visibility toggles for multiple layers (pitch, waveform, phonemes)
- Tool/Mode linking for efficient editing

**Lyric Input Method:**
- Text box below notes (similar to Vocaloid)
- Automatic phoneme conversion from text
- Syllable splitting with `+` character for multi-syllable words

**Timing Control:**
- **Note Offset Slider**: Move note start ±0.1 seconds with auto-adjustment of neighbors
- **Phoneme Timing**: Individual phoneme duration control (20-180% of default)
- **Preutterance Support**: Consonants can start before note onset
- **Even Split Mode**: Multi-syllable words automatically split across equal durations

**Advanced Features:**
- **Manual Pitch Mode**: Triangle indicator in upper-right of note
- **Target vs Actual Pitch**: Separate lines for AI vs non-AI singers
- **Retake Indicators**: Shows which AI take is active
- **Waveform Preview**: Shows rendered audio with phoneme timing markers

**Strengths:**
- Most sophisticated phoneme timing control
- Excellent visual feedback
- Multiple editing modes (note vs pitch)
- Clear visual hierarchy

**Weaknesses:**
- Complex interface may overwhelm beginners
- Primarily studio-focused
- No live performance mode

**Key Innovation:**
- **Phoneme Timing Panel**: Dedicated controls for adjusting consonant/vowel balance
- **Visibility Toggles**: Show/hide pitch, waveform, phonemes independently
- **Tool/Mode Link**: Automatically switch tool when changing mode

---

### 1.3 Emvoice

**Interface Overview:**
- Browser-based DAW integration
- Focus on simplicity for songwriters
- Dictionary-based phoneme breakdown

**Lyric Input Method:**
- Draw notes with pencil tool first
- Type lyrics into text boxes below notes
- Automatic phoneme conversion via dictionary

**Timing Control:**
- Note-level timing primary
- Custom pronunciation controls
- Phoneme adjustment available but less prominent than Synthesizer V

**Strengths:**
- Simple, accessible interface
- Fast workflow for songwriters
- Cloud-based collaboration

**Weaknesses:**
- Less precise phoneme control
- Limited advanced features
- Browser-based latency concerns

---

### 1.4 Alter/Ego & Chipspeech (Plogue)

**Interface Overview:**
- Real-time singing synthesizer (Alter/Ego: free, Chipspeech: paid)
- Vintage-focused (Chipspeech: 1980s chips, Alter/Ego: 90s+)
- Plugin format (VST/AU/AAX)

**Lyric Input Method:**
- Less documented in research
- Likely text-based input similar to other products

**Timing Control:**
- Real-time parameter control emphasized
- Vintage synthesis limitations

**Strengths:**
- Free (Alter/Ego)
- Real-time performance focus
- Unique vintage aesthetic (Chipspeech)

**Weaknesses:**
- Limited documentation on lyric workflow
- Less realistic than modern competitors
- Small voicebank selection

---

## 2. Common Interface Patterns <a name="common-patterns"></a>

### 2.1 Lyric Input Patterns

**Dominant Pattern: Text Box Below Notes**
```
┌─────────────────────────────────────────┐
│ Piano Roll View                          │
│                                          │
│  ┌───┐  ┌───┐  ┌───┐  ┌───┐            │
│  │   │  │   │  │   │  │   │  Notes     │
│  └───┘  └───┘  └───┘  └───┘            │
│  [We]  [don't] [need] [an-]             │
│   └─┘    └─┘    └─┘    └─┐             │
│  [other] [hero]                         │
│    └─┘    └─┘                          │
└─────────────────────────────────────────┘
```

**Advantages:**
- Direct visual association between note and lyric
- Standard pattern users expect
- Easy to scan lyrics horizontally
- Supports syllable splitting with special characters

**Implementation Notes:**
- Text input activates when note is selected
- Auto-advance to next note after entry
- Special character `+` for syllable breaks: "an- + other"
- Space bar creates new notes in some products

---

### 2.2 Tool Selection Patterns

**Standard Toolset:**
1. **Pointer Tool** (`Alt+1`): Select and modify notes
2. **Pencil Tool** (`Alt+2`): Draw notes and freehand pitch
3. **Eraser Tool**: Delete notes/lyrics
4. **Text Tool**: Direct lyric editing (sometimes merged with pencil)

**Mode Switching:**
- Note Editing Mode vs Pitch Editing Mode
- Some products link tool selection to mode (Synthesizer V)
- Visibility toggles for different layers

---

### 2.3 Color Coding Systems

**Note Type Coding:**
- **Green**: Singing mode (automatic pitch)
- **Red**: Rap mode (different synthesis)
- **Triangle Indicator**: Manual pitch mode override

**Phoneme Coding:**
- Research didn't reveal standard color coding for phoneme types
- Praat uses spectrogram coloring for frequency analysis
- Meta (VR) defines viseme-to-phoneme mappings but not colors

---

## 3. Timing Control Architecture <a name="timing-architecture"></a>

### 3.1 Two-Tier Timing System

**Tier 1: Note-Level Timing**
```
┌────────────────────────────────────────┐
│ Note: "hero"                           │
│ Duration: 1.5 beats                    │
│ ┌────┬────┬────┐                      │
│ │ h  │ e  │ r-o │                    │
│ │ i  │    │     │                     │
│ └────┴────┴────┘                      │
│ ↑    ↑    ↑                          │
│ C    V    V                          │
│ onso-owelowel                        │
│ nant                                   │
└────────────────────────────────────────┘
```

**Controls:**
- **Note Offset Slider**: ±0.1 second adjustment
- **Duration Drag**: Resize note in piano roll
- **Grid Snap**: Quantize to beat/subdivisions

**Tier 2: Phoneme-Level Timing**

**Range:** 20-180% of default duration
- **20%**: Very short (staccato consonant)
- **100%**: Default duration
- **180%**: Extended (held vowel)

**Implementation:**
- Sliders for each phoneme in selected note
- Visual indicators in piano roll (vertical lines)
- Preutterance: Consonants can start before note onset

---

### 3.2 Consonant-Vowel Balance

**Natural Speech Pattern:**
```
Word: "synthesizer"

Default Timing:
  [s] [ɪ] [n] [θ] [ə] [t] [aɪ] [z] [ə] [r]
  ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓
  5% 15%  5% 10% 15%  5% 25% 10%  5%  5%
  ↑                            ↑
C                          Middle vowel
                          determines length
```

**Key Principles:**
1. **Middle Vowel Dominance**: Primary timing determinant
2. **Consonant Economy**: Beginning/end consonants remain short
3. **Preutterance**: Leading consonants start before note
4. **Transition Blending**: Consonant-vowel transitions split

**Advanced Control:**
- Separate consonants and vowels into individual notes for extreme control
- Use "Evenly Split" mode for equal syllable timing
- Disable even split for ambiguous syllable boundaries ("fire" = 1 or 2 syllables)

---

### 3.3 Syllable Stress Control

**Methods:**
1. **Duration**: Primary indicator of stress (longer = stressed)
2. **Pitch Accent**: Higher pitch for stressed syllables
3. **Intensity**: Louder volume for stressed syllables
4. **Manual Phoneme Separation**: Split stressed vowel into own note

---

## 4. Visual Representation Approaches <a name="visual-representation"></a>

### 4.1 Phonetic Breakdown Display

**Synthesizer V Approach:**
```
┌──────────────────────────────────────────┐
│ Note: "hero"                             │
│ ┌───┬───┬───┬───┐  Waveform Preview    │
│ │ h │ i │ r │ o │  ▁▃▅▇▅▃▁            │
│ └───┴───┴───┴───┘  └─────────────────┘  │
│ │   │   │   │                          │
│ └───┴───┴───┴─── Phoneme Timing Lines   │
└──────────────────────────────────────────┘
```

**Components:**
- **Phoneme Labels**: Individual phoneme symbols
- **Timing Lines**: Vertical markers showing boundaries
- **Waveform Preview**: Rendered audio visualization
- **Duration Indicators**: Proportional width per phoneme

---

### 4.2 Waveform vs Piano Roll Views

**Piano Roll (Primary):**
- Notes displayed as colored rectangles
- Vertical position = pitch
- Horizontal position = time
- Phoneme timing shown as vertical markers

**Waveform Preview (Secondary):**
- Shows rendered audio
- Helps identify consonant vs vowel regions
- Useful for debugging pronunciation

**Hybrid Approach:**
- Overlap both views (Synthesizer V)
- Show waveform inside note rectangle
- Maintain piano roll as primary interface

---

### 4.3 Color Coding Opportunities

**Phoneme Type Coding (Proposed):**
- **Vowels**: Blue (dominant, sustained)
- **Stops**: Red (p, b, t, d, k, g)
- **Fricatives**: Yellow (f, v, s, z, th)
- **Nasals**: Green (m, n, ng)
- **Glides**: Purple (w, y, l, r)

**Rationale:**
- Helps identify phoneme classes visually
- Useful for debugging pronunciation
- Aligns with linguistic conventions

**Note:** Existing products don't prominently use color coding for phonemes, so this would be innovative.

---

## 5. DAW Integration Patterns <a name="daw-integration"></a>

### 5.1 MIDI File Format (Lyric Meta Events)

**Standard MIDI File Structure:**
```
MTrk Chunk
├── Event 1: Note On (C4)
├── Event 2: Lyric Meta Event (FF 05 len "We")
├── Event 3: Note Off (C4)
├── Event 4: Note On (D4)
├── Event 5: Lyric Meta Event (FF 05 len "don't")
└── ...
```

**Lyric Meta Event (MIDI RP-017):**
- **Status**: `FF 05` (Meta event, Lyric type)
- **Length**: Variable
- **Data**: ASCII text string
- **Placement**: Immediately after Note On event

**Limitations:**
- Only ASCII characters (no Unicode)
- No phoneme timing information
- No pronunciation guides
- One lyric per note (syllable-level only)

---

### 5.2 Proprietary Formats

**Vocaloid (VSQ/VSQX):**
- XML-based format (VSQX)
- Stores phoneme breakdown
- Stores timing parameters
- Stores expression parameters

**Synthesizer V:**
- Proprietary format (documented but not open)
- Stores AI model parameters
- Stores phoneme timing (20-180% values)
- Stores retake information

**Implication for Choir v2.0:**
- MIDI for basic DAW compatibility
- Custom format for full feature set
- Export/import both formats

---

### 5.3 Real-Time Sync

**Tempo Tracking:**
- Lyrics follow DAW timeline
- Tempo changes adjust timing
- Measure boundaries maintained

**Automation Integration:**
- Lyrics linked to note events
- Not separate automation track
- Can be automated via plugin parameters

---

## 6. Live Performance Considerations <a name="live-performance"></a>

### 6.1 Current State (Limited)

**Research Finding:**
- Most vocal synths are studio-focused
- Limited real-time lyric triggering
- Emvoice recently added MIDI keyboard input

**Existing Approaches:**
1. **Pre-programmed Sequences**: Trigger entire phrases
2. **Sample Triggering**: Playback pre-rendered vocal samples
3. **Real-time Synthesis**: Limited to basic vowel sounds

---

### 6.2 Latency Challenges

**Audio Buffer Requirements:**
- **Studio**: 256-512 samples (5-11ms @ 48kHz)
- **Live**: 64-128 samples (1-3ms @ 48kHz)

**MIDI Latency:**
- **Note On → Sound**: 1-5ms acceptable
- **Lyric Processing**: Add 1-10ms for phoneme conversion
- **Total Budget**: < 10ms for feel of "instant" response

**Optimization Strategies:**
- Pre-convert lyrics to phonemes on load
- Cache phoneme sequences
- Use SIMD for parallel processing
- Avoid dynamic allocation in audio thread

---

### 6.3 Live Performance Controls

**Essential Controls:**
1. **Phrase Selection**: Switch between pre-programmed lyrics
2. **Transpose**: Shift pitch of current phrase
3. **Vowel Morph**: Blend between vowel sounds
4. **Formant Shift**: Adjust timbre in real-time

**Nice-to-Have:**
- **Syllable Trigger**: Individual phoneme triggering
- **Randomization**: Generative lyric variations
- **MIDI Learn**: Map controls to hardware

---

### 6.4 What Happens When You Miss a Note?

**Studio Workflow:**
- Quantize after recording
- Manual adjustment in piano roll
- Multiple takes with AI retakes

**Live Performance Challenge:**
- Option 1: Skip missed note (breaks lyric flow)
- Option 2: Trigger next available note (shifts timing)
- Option 3: Repeat previous note (stutters)
- Option 4: Silence/filler sound

**Recommendation:**
- Studio: Quantize and edit
- Live: Pre-programmed sequences only
- Hybrid: Allow "trigger mode" where next MIDI note triggers next syllable

---

## 7. Data Architecture Proposal <a name="architecture-proposal"></a>

### 7.1 Option A: Note Metadata (Recommended)

**Structure:**
```swift
struct Note {
    var pitch: MIDINoteNumber
    var velocity: UInt8
    var startTime: Float
    var duration: Float
    var lyric: LyricData

    struct LyricData {
        var text: String              // "hero"
        var phonemes: [Phoneme]       // ["h", "i", "r", "o"]
        var timing: [Float]           // [0.1, 0.4, 0.3, 0.2]
        var stress: [Float]           // [0.5, 1.0, 0.8, 0.5]
    }

    struct Phoneme {
        var symbol: String            // "i"
        var type: PhonemeType         // .vowel
        var timingOffset: Float       // -0.05 (preutterance)
        var durationMultiplier: Float // 1.2 (120%)
    }
}
```

**Advantages:**
- Tight integration between notes and lyrics
- Standard MIDI export (with lyric meta events)
- Intuitive editing in piano roll
- Matches user mental model

**Disadvantages:**
- Large note objects (but not performance-critical)
- MIDI export loses phoneme timing

---

### 7.2 Option B: Separate Track

**Structure:**
```swift
struct LyricTrack {
    var lyrics: [LyricEvent]

    struct LyricEvent {
        var text: String
        var phonemes: [Phoneme]
        var startTime: Float
        var duration: Float
        var noteReference: NoteID?  // Link to note
    }
}
```

**Advantages:**
- Separation of concerns
- Can exist without notes
- Easier to manage independently

**Disadvantages:**
- Breaks mental model (lyrics go with notes)
- Sync issues between tracks
- Complex editing (must modify both tracks)
- Non-standard

---

### 7.3 Option C: Custom Data Structure

**Structure:**
```swift
struct VocalPerformance {
    var sections: [PerformanceSection]

    struct PerformanceSection {
        var notes: [Note]
        var lyrics: [LyricPhrase]
        var timing: Timeline
    }
}
```

**Advantages:**
- Maximum flexibility
- Can represent complex structures
- Future-proof

**Disadvantages:**
- Reinventing the wheel
- Complex implementation
- Poor interoperability
- Difficult to reason about

---

### 7.4 Recommendation: Option A (Note Metadata)

**Rationale:**
1. **User Mental Model**: Users think "this note sings this lyric"
2. **Standard MIDI**: Easy export with lyric meta events
3. **Visual Editing**: Natural fit for piano roll interface
4. **Simplicity**: Single source of truth

**Implementation Details:**
```swift
// Internal representation (full feature set)
struct Note {
    // ... standard MIDI properties ...
    var lyric: LyricData?
}

// MIDI export (lossy)
func toMIDIEvents() -> [MIDIEvent] {
    var events: [MIDIEvent] = []

    // Note On
    events.append(MIDIEvent.noteOn(pitch, velocity, startTime))

    // Lyric (text only, no phoneme details)
    if let lyric = lyric {
        events.append(MIDIEvent.meta(
            type: .lyric,
            data: lyric.text.data(using: .ascii)!,
            time: startTime
        ))
    }

    // Note Off
    events.append(MIDIEvent.noteOff(pitch, startTime + duration))

    return events
}

// Custom format export (full feature set)
func toJSON() -> JSON {
    return [
        "pitch": pitch,
        "velocity": velocity,
        "startTime": startTime,
        "duration": duration,
        "lyric": lyric?.toJSON() ?? JSON.null
    ]
}
```

---

## 8. Workflow Scenarios <a name="workflow-scenarios"></a>

### 8.1 Use Case 1: Live Performance

**Scenario:** Keyboard player wants Choir to sing "We don't need another hero" live

**Workflow:**

**Setup (Pre-Show):**
1. **Create Phrase** in Studio Mode:
   ```
   - Draw notes for melody
   - Type lyrics: "We", "don't", "need", "an-", "-other", "he-", "-ro"
   - Adjust phoneme timing for natural delivery
   - Save as preset: "Hero Chorus"
   ```

2. **MIDI Learn** (Optional):
   ```
   - Map Program Change 1 to "Hero Chorus" preset
   - Map CC 20 to transpose (-12 to +12 semitones)
   - Map CC 21 to formant shift (bright to dark)
   ```

**Performance:**
1. **Select Phrase** (via MIDI learn or UI)
2. **Trigger Playback**:
   - Method A: Hit "Play" on phrase (starts immediately)
   - Method B: Play first note on keyboard (starts from first syllable)
3. **Live Manipulation**:
   - Transpose melody in real-time
   - Adjust formant for different choir sections
   - Switch phrases for different sections

**If You Miss a Note:**
- Phrase mode: Continues from next syllable automatically
- Trigger mode: Waits for next note to trigger next syllable
- Fallback: Plays silence/filler sound

**Controls:**
```
┌─────────────────────────────────────┐
│ LIVE MODE                            │
├─────────────────────────────────────┤
│ Phrase: [Hero Chorus ▼]              │
│                                      │
│ ▶ Play  ■ Stop                      │
│                                      │
│ Transpose: [0]    Formant: [0]      │
│    ────●────          ─────●───     │
│   -12  +12          -100  0   +100  │
│                                      │
│ Next Phrase: [Verse 1 ▼]            │
└─────────────────────────────────────┘
```

---

### 8.2 Use Case 2: Studio Recording

**Scenario:** Producer wants to record choir vocals for a song

**Workflow:**

**Step 1: Setup**
1. Create Choir track in DAW
2. Insert Choir plugin
3. Set tempo and time signature

**Step 2: Input Melody**
1. **Method A: MIDI Keyboard Record**
   - Arm track for recording
   - Play melody on keyboard
   - Piano roll captures notes

2. **Method B: Draw in Piano Roll**
   - Use pencil tool to draw notes
   - Adjust pitch and duration
   - Quantize to grid if desired

**Step 3: Add Lyrics**
1. Click first note
2. Type "We" in text box below note
3. Press Tab to advance to next note
4. Type "don't"
5. Continue for all notes

**Step 4: Refine Timing**
1. Listen to playback
2. Select note with awkward delivery
3. Adjust phoneme timing sliders
4. Fine-tune note offset if needed
5. Repeat for all problematic notes

**Step 5: Polish**
1. Switch to pitch editing mode
2. Draw pitch curves for expressive delivery
3. Adjust dynamics/velocity
4. Add vibrato if desired

**Step 6: Multiple Takes**
1. Duplicate track for alternate takes
2. Adjust lyrics/timing per take
3. Use AI retakes (Synthesizer V style) for variation
4. Choose best take or blend

**UI Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Choir - DAW Integration                              │
├──────────────────────────────────────────────────────┤
│ ┌────┬────┬────┬────┬────┐  ┌────────────────────┐ │
│ │We  │don't│need│an- │-ther│  │ Phoneme Timing    │ │
│ │    │     │    │    │    │  │ Selected: "hero"  │ │
│ └────┴────┴────┴────┴────┘  │ ┌────┬────┬────┐  │ │
│                            │ │ h  │ i-r│ o   │  │ │
│ [Piano Roll]              │ └────┴────┴────┘  │ │
│                            │ [20% ▲▼ 180%]     │ │
│ [Waveform Preview]         └────────────────────┘ │
│                            │                        │
│ [Pitch Editor]             │ [AI Retakes]          │
│                            │ Take: [1 ▼]           │
└────────────────────────────┴────────────────────────┘
```

---

### 8.3 Use Case 3: Multi-Track Arrangement (SATB)

**Scenario:** Arranger wants 4 choir parts (SATB) singing different lyrics

**Workflow:**

**Step 1: Create Voice Tracks**
1. Create 4 instrument tracks in DAW
2. Insert Choir plugin on each
3. Label: Soprano, Alto, Tenor, Bass

**Step 2: Define Lyrics**

**Option A: Shared Lyrics**
```
Soprano: "Glo-", "-ry", "to", "the", "new-", "-born", "King"
Alto:    "Glo-", "-ry", "to", "the", "new-", "-born", "King"
Tenor:   "Glo-", "-ry", "to", "the", "new-", "-born", "King"
Bass:    "Glo-", "-ry", "to", "the", "new-", "-born", "King"
```

**Option B: Independent Lyrics**
```
Soprano: "An-", "-gel", "cho-", "-rus"
Alto:    "Glo-", "-ry", "in", "ex-", "-cel-", "-sis"
Tenor:   "Glo-", "-ry", "to", "God"
Bass:    "Et", "in", "ter-", "-ra", "pax"
```

**Step 3: Input Notes & Lyrics**
1. For each track:
   - Draw notes for voice part
   - Type lyrics into text boxes
   - Adjust timing per part

**Step 4: Ensure Timing Alignment**
1. Use DAW's grid to align syllables
2. Check vertical alignment in piano roll
3. Adjust individual phoneme timing if needed
4. Listen for ensemble blend

**Step 5: Edit & Refine**
1. Select all tracks (multi-track edit)
2. Apply global timing adjustments
3. Adjust section balance (volume/pan)
4. Add formant variation per part

**Challenges & Solutions:**

**Challenge 1: Timing Alignment**
- **Solution:** Use DAW's groove templates or quantize
- **Solution:** Select all tracks and adjust timing simultaneously

**Challenge 2: Lyric Sync**
- **Solution:** Copy lyrics between tracks (with Option A)
- **Solution:** Create lyric template, paste per track

**Challenge 3: Phonetic Blending**
- **Solution:** Adjust phoneme timing per voice to match
- **Solution:** Use "even split" mode for uniform syllables

**UI Layout:**
```
┌────────────────────────────────────────────────────┐
│ SATB Arrangement - Choir v2.0                      │
├────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐  │
│ │ Soprano: [Glo-][-ry][to][the][new-][-born][King]│  │
│ └──────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────┐  │
│ │ Alto:    [Glo-][-ry][to][the][new-][-born][King]│  │
│ └──────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────┐  │
│ │ Tenor:   [Glo-][-ry][to][the][new-][-born][King]│  │
│ └──────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────┐  │
│ │ Bass:    [Glo-][-ry][to][the][new-][-born][King]│  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ [Align Syllables] [Copy Lyrics] [Blend Timing]    │
└────────────────────────────────────────────────────┘
```

---

## 9. UI Mockup Concepts <a name="ui-mockups"></a>

### 9.1 Primary Interface (Piano Roll)

```
┌─────────────────────────────────────────────────────────────────┐
│ Choir v2.0 - Lyric-Based Vocal Synthesis                        │
├─────────────────────────────────────────────────────────────────┤
│ File  Edit  View  Timing  Lyrics  Performance  Help             │
├─────────────────────────────────────────────────────────────────┤
│ ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐                   │
│ │ ● │   │   │   │   │   │   │   │   │   │  Tool Selection    │
│ │Pointer │Pencil│Eraser│Text│Score│                    │
│ └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘                   │
│                                                                  │
│ ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐  Visibility Toggles              │
│ │♩│🎵│🎼│📊│⏱️│   │   │   │   │  │ Pitch │Wave │Phoneme│Timing │
│ └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘                                      │
│                                                                  │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┐                     │
│  │    │    │    │    │    │    │    │    │  Notes (Green=Sing) │
│  │ C4 │    │ D4 │    │ E4 │    │ F4 │    │                     │
│  │ ┌──┐│    │ ┌──┐│    │ ┌──┐│    │ ┌──┐│                     │
│  │ │We││    │ │don't│    │ │need│    │ │an-││                 │
│  │ └──┘│    │ └──┘│    │ └──┘│    │ └──┘│                     │
│  │    │    │    │    │    │    │    │    │                     │
│  │    │    │    │    │ ┌──┐│    │ ┌──┐│                     │
│  │    │    │    │    │ │-other│ │he-││                     │
│  │    │    │    │    │ └──┘│    │ └──┘│                     │
│  │    │    │    │    │    │    │ ┌──┐│                     │
│  │    │    │    │    │    │    │ │-ro││                    │
│  │    │    │    │    │    │    │ └──┘│                     │
│  └────┴────┴────┴────┴────┴────┴────┴────┘                     │
│   │    │    │    │    │    │    │    │                        │
│   └────┴────┴────┴────┴────┴────┴────┘  Phoneme Timing Lines  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Selected Note: "hero"                                    │ │
│  │ ┌────┬────┬────┐  Phoneme Breakdown                     │ │
│  │ │ h  │ i-r│ o  │  ┌────┬────┬────┐                     │ │
│  │ │ 5% │70% │25% │  │[20%│100%│180%]  Duration (%)       │ │
│  │ └────┴────┴────┘  └────┴────┴────┘                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Waveform Preview                    │                    │   │
│ │ ▁▃▅▇▅▃▁  ▃▅▇▅▃▁  ▃▅▇▅▃▁  ▃▅▇▅▃▁              │                    │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Target Pitch ─────────  Actual Pitch ──                 │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ 1.1.1          ▶             ●  ◐  BPM: 120  │ 4/4            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9.2 Lyric Input Interface

```
┌─────────────────────────────────────────────────────────────────┐
│ Lyric Input Mode - Choir v2.0                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Instructions: Type lyrics below each note. Use '+' for         │
│  syllable breaks. Press Tab to advance to next note.            │
│                                                                  │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐           │
│  │    │    │    │    │    │    │    │    │    │    │           │
│  │ C4 │    │ D4 │    │ E4 │    │ F4 │    │ G4 │    │  Notes    │
│  │ ┌──┐│    │ ┌──┐│    │ ┌──┐│    │ ┌──┐│    │ ┌──┐│           │
│  │ │We││    │ │don't│    │ │need│    │ │an-││    │ │-the-││    │
│  │ └──┘│    │ └──┘│    │ └──┘│    │ └──┘│    │ └──┘│           │
│  │    │    │    │    │    │    │    │    │    │    │           │
│  │    │    │    │    │ ┌──┐│    │ ┌──┐│    │ ┌──┐│            │
│  │    │    │    │    │ │-other│ │ro-││    │ │-man││           │
│  │    │    │    │    │ └──┘│    │ └──┘│    │ └──┘│           │
│  │    │    │    │    │    │    │    │    │    │    │           │
│  │    │    │    │    │    │    │    │    │    │ ┌──┐│           │
│  │    │    │    │    │    │    │    │    │    │ │-ther││       │
│  │    │    │    │    │    │    │    │    │    │ └──┘│           │
│  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘           │
│   │    │    │    │    │    │    │    │    │    │              │
│   └────┴────┴────┴────┴────┴────┴────┴────┴────┘  Text Input  │
│                                                                  │
│  Selected Note: "another"                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Syllables: 3                                           │     │
│  │ [an-] [-the-] [-ther]                                  │     │
│  │                                                         │     │
│  │ Phoneme Breakdown:                                     │     │
│  │ [æn] [ð] [ə] [ðər]                                     │     │
│  │                                                         │     │
│  │ Timing:                                                │     │
│  │ ┌─────┬─────┬─────┬─────┐                             │     │
│  │ │ æn  │  ð  │  ə  │ ðər │                            │     │
│  │ │ 15% │ 10% │ 25% │ 50% │                            │     │
│  │ └─────┴─────┴─────┴─────┘                             │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  [Auto-Split Syllables]  [Even Timing]  [Custom Timing]        │
│                                                                  │
│  [Apply to Selection]  [Apply to All Notes]                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9.3 Phoneme Timing Editor

```
┌─────────────────────────────────────────────────────────────────┐
│ Phoneme Timing Editor - "hero"                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Note Duration: 1.5 beats (1000ms @ 120 BPM)                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Total: 1000ms                                         │      │
│  │ ┌────┬──────┬────┐                                   │      │
│  │ │ h  │ i-r  │ o  │  Phoneme Timeline                │      │
│  │ │50ms│700ms │250ms│                                 │      │
│  │ └────┴──────┴────┘                                   │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  Individual Phoneme Timing                                      │
│  ┌────────────────────────────────────────────────────┐        │
│  │                                                      │        │
│  │ [h]  Consonant (Stop)                               │        │
│  │ Default: 50ms  Current: 50ms (100%)                 │        │
│  │ ─────────────────●─────────                         │        │
│  │ 20%        100%        180%                         │        │
│  │                                                      │        │
│  │ [ɪr]  Vowel Cluster                                │        │
│  │ Default: 700ms  Current: 700ms (100%)               │        │
│  │ ─────────────────●─────────                         │        │
│  │ 20%        100%        180%                         │        │
│  │                                                      │        │
│  │ [oʊ]  Vowel (Diphthong)                            │        │
│  │ Default: 250ms  Current: 250ms (100%)               │        │
│  │ ─────────────────●─────────                         │        │
│  │ 20%        100%        180%                         │        │
│  │                                                      │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                  │
│  Preutterance: [5ms]  Consonant starts before note onset       │
│                                                                  │
│  Stress Pattern: [0.5] [1.0] [0.8]  (Middle vowel stressed)    │
│                                                                  │
│  [Reset to Defaults]  [Apply to Word]  [Apply to Selection]    │
│                                                                  │
│  Preview: ▶ Play  ■ Stop  ↻ Loop                               │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9.4 Live Performance Interface

```
┌─────────────────────────────────────────────────────────────────┐
│ LIVE PERFORMANCE MODE - Choir v2.0                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Status: READY  ●  MIDI: Connected  Latency: 3ms         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Current Phrase                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ 🎵 Hero Chorus                    Key: C Major        │       │
│  │ "We don't need another hero"          BPM: 120        │       │
│  │                                              │       │
│  │ ┌───┬────┬────┬────┬────┬────┬────┬───┐        │       │
│  │ │We │don't│need│an- │-the-│ro- │-man│-ther│         │       │
│  │ └───┴────┴────┴────┴────┴────┴────┴───┘        │       │
│  │                                              │       │
│  │ [◀ Prev]  [▶ Play]  [■ Stop]  [Next ▶]      │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
│  Real-Time Controls                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │ Transpose              Formant Shift     Dynamics        │   │
│  │ ─────────●───────      ──────●──────      ─────●────     │   │
│  │ -12   0   +12         -100  0  +100       -∞   0  +6dB  │   │
│  │                                                           │   │
│  │ [Reset]                 [Reset]          [Reset]         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Phrase Library                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [🎵 Hero Chorus]           [🎵 Verse 1]    [🎵 Bridge]  │   │
│  │ [🎵 Pre-Chorus]           [🎵 Outro]      [🎵 Ad-lib]   │   │
│  │ [➕ New Phrase...]                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  MIDI Learn                                                      │
│  [🎹 Learn Transpose]  [🎹 Learn Formant]  [🎹 Learn Phrase]    │
│                                                                  │
│  Performance Settings                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Trigger Mode: [Phrase ▼]  (Phrase/Trigger/Hybrid)        │   │
│  │ Loop Mode: [✓] On                                      │   │
│  │ Auto-Advance: [ ] Off                                   │   │
│  │ Quantize: [✓] On  (Snap to beat)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Output Level                                             │   │
│  │ ────────────────────────●───                            │   │
│  │                      75%                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Recommendations <a name="recommendations"></a>

### 10.1 Essential Features (Must Have)

**Lyric Input:**
- [x] Text box below notes (standard pattern)
- [x] Syllable splitting with `+` character
- [x] Auto-advance to next note (Tab key)
- [x] Automatic phoneme conversion

**Timing Control:**
- [x] Note offset slider (±0.1s)
- [x] Phoneme timing sliders (20-180%)
- [x] Preutterance support (consonants start early)
- [x] Visual phoneme timing indicators

**Visual Representation:**
- [x] Piano roll as primary interface
- [x] Phoneme breakdown displayed in notes
- [x] Waveform preview (toggleable)
- [x] Target vs actual pitch lines

**Data Architecture:**
- [x] Note metadata approach (lyrics attached to notes)
- [x] MIDI export with lyric meta events
- [x] Custom format for full feature set

---

### 10.2 Nice-to-Have Features

**Advanced Timing:**
- [ ] Even split mode for equal syllable timing
- [ ] Manual phoneme separation (one phoneme per note)
- [ ] Stress pattern controls
- [ ] Consonant/vowel balance presets

**Workflow Enhancements:**
- [ ] Multi-track lyric copy/paste
- [ ] Lyric templates (common phrases)
- [ ] Bulk phoneme timing adjustment
- [ ] Undo/redo for lyric edits

**Visual Enhancements:**
- [ ] Color coding for phoneme types
- [ ] Spectrogram view (Praat-style)
- [ ] Viseme animation preview
- [ ] Formant visualization

---

### 10.3 Features to Avoid (Based on Research)

**Over-Engineering:**
- [ ] Separate lyric track (breaks mental model)
- [ ] Custom data structure (unnecessary complexity)
- [ ] Browser-based interface (latency concerns)
- [ ] Exclusive real-time lyric typing (users expect pre-programmed)

**Anti-Patterns:**
- [ ] Phonetic symbols required input (should be automatic)
- [ ] No visual feedback for phoneme timing
- [ ] Inconsistent DAW integration (Cubase-only like Vocaloid)
- [ ] No MIDI export capability

---

### 10.4 Implementation Priorities

**Phase 1: Core Functionality**
1. Piano roll with lyric input
2. Automatic phoneme conversion
3. Note-level timing control
4. MIDI export with lyric meta events

**Phase 2: Phoneme Control**
1. Phoneme timing sliders (20-180%)
2. Preutterance support
3. Visual phoneme indicators
4. Manual phoneme editing

**Phase 3: Workflow Polish**
1. Multi-track support (SATB)
2. Lyric templates
3. Bulk editing tools
4. AI retakes (if applicable)

**Phase 4: Live Performance**
1. Phrase library
2. Real-time controls (transpose, formant)
3. MIDI learn
4. Low-latency optimization

---

## 11. Conclusion

### 11.1 Key Insights

1. **Standard Pattern Exists**: Text box below notes is the de facto standard (Vocaloid, Synthesizer V, Emvoice)

2. **Two-Tier Timing**: Note-level timing + phoneme-level timing provides the right balance of simplicity and control

3. **Data Architecture**: Note metadata approach aligns with user mental model and MIDI standards

4. **Live Performance Gap**: Existing products are studio-focused; Choir v2.0 can differentiate with strong live performance features

5. **Visual Feedback Critical**: Phonetic breakdown, waveform preview, and timing indicators are essential for user confidence

### 11.2 Competitive Advantages for Choir v2.0

1. **Live Performance**: Most vocal synths ignore this; we can own it
2. **Multi-Track Workflow**: SATB support is painful in existing products
3. **JUCE Integration**: Native plugin format vs standalone application
4. **Swift UI**: Modern, responsive interface vs dated competitors
5. **Real-Time Controls**: Low-latency synthesis for live manipulation

### 11.3 Next Steps

1. **Prototype Lyric Input**: Build piano roll with text boxes
2. **Implement Phoneme Engine**: Convert text to phonemes
3. **Design Timing System**: Two-tier architecture
4. **Test with Users**: Validate workflow assumptions
5. **Build Live Mode**: Phrase library + real-time controls

---

## References

### Products Analyzed
- **Vocaloid** (Yamaha) - https://www.vocaloid.com/
- **Synthesizer V** (Dreamtonics) - https://dreamtonics.com/synthesizerv/
- **Emvoice** - https://www.emvoiceapp.com/
- **Alter/Ego & Chipspeech** (Plogue) - https://www.plogue.com/

### DAWs Referenced
- **Logic Pro** - Apple
- **Cubase** - Steinberg
- **FL Studio** - Image-Line
- **Ableton Live** - Ableton

### Academic Tools
- **Praat** - https://www.fon.hum.uva.nl/praat/
- **MaryTTS** - https://marytts.github.io/

### Standards & Specifications
- **MIDI Lyric Meta Events** (RP-017) - https://midi.org/smf-lyric-meta-event-definition
- **Standard MIDI File Format** - https://midi.org/standard-midi-files

### Community Resources
- **Synthesizer V Wiki** - https://synthv.fandom.com/
- **Vocaloid Forums** - https://vocaverse.network/

---

**Document Version:** 1.0
**Last Updated:** 2025-01-17
**Researcher:** Claude Code (Anthropic)
**Project:** Choir v2.0 - White Room
