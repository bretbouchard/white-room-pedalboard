# ProjectionEngine Implementation Guide

## Overview

The `ProjectionEngine` is the central component that transforms abstract song representations into concrete audio render graphs. It combines `SongState` (what the song is) with `PerformanceState` (how it sounds) to create a `RenderedSongGraph` ready for audio playback.

## Core Functions

### 1. `buildVoices()`

**Purpose**: Maps song roles to instrument voices with appropriate polyphony and bus assignments.

**Implementation**:
- Reads `SongState.instrumentIds` to determine available instruments
- Creates `VoiceAssignment` for each instrument
- Assigns instruments to appropriate buses:
  - `DrumMachine` → `bus_drums` (32 voice polyphony)
  - `KaneMarcoAether*` → `bus_bass` (8 voice polyphony)
  - Others → `bus_primary` (16 voice polyphony)
- Applies density scaling to polyphony (0.5x to 1.5x based on `PerformanceState.currentDensity`)

**Future Enhancements**:
- Extract instrumentation from `PerformanceState.instrumentationMap`
- Support custom preset assignments per role
- Apply register mappings for transposition

**Example**:
```cpp
// 4 instruments in song state
song.instrumentIds = {"LocalGal", "NexSynth", "KaneMarcoAether", "DrumMachine"};

// Creates 4 voices
voices[0] = {id: "voice_0", roleId: "role_0", instrumentType: "LocalGal", busId: "bus_primary", polyphony: 16};
voices[1] = {id: "voice_1", roleId: "role_1", instrumentType: "NexSynth", busId: "bus_primary", polyphony: 16};
voices[2] = {id: "voice_2", roleId: "role_2", instrumentType: "KaneMarcoAether", busId: "bus_bass", polyphony: 8};
voices[3] = {id: "voice_3", roleId: "role_3", instrumentType: "DrumMachine", busId: "bus_drums", polyphony: 32};
```

### 2. `assignNotes()`

**Purpose**: Generates note events from Schillinger rhythm, melody, and harmony systems.

**Implementation**:
- **Rhythm**: Uses default 4/4 pattern (1,1,1,1 = quarter notes)
  - TODO: Integrate with SDK rhythm generation (Book I)
  - TODO: Generate resultant rhythms from generators (a, b)
  - TODO: Apply rhythm variations (permutation, rotation, fractioning)

- **Melody**: Uses C major scale ascending (60, 62, 64, 65, 67, 69, 71, 72)
  - TODO: Integrate with SDK melody generation (Book II)
  - TODO: Generate pitch sequences from scales
  - TODO: Apply melodic transformations

- **Harmony**: Uses C major chord tones (60, 64, 67 = C-E-G)
  - TODO: Integrate with SDK harmony generation (Book III)
  - TODO: Generate chord progressions
  - TODO: Apply harmonic transformations

**Role-based Note Assignment**:
- Role 0 (Primary): Melody line from melody pattern
- Role 1 (Secondary): Harmony from chord tones
- Role 2 (Bass): Root notes (C2 = 36)
- Role 3+ (Drums/Percussion): Percussive sounds

**Density Filtering**:
- Probability = 0.3 + (density × 0.7)
- Low density (0.0) = 30% note probability
- High density (1.0) = 100% note probability

**Example**:
```cpp
// Density = 0.8, 4/4 time, 120 BPM
// Generates notes with 86% probability (0.3 + 0.8 × 0.7)
// 8 bars × 4 beats = 32 beats per role
// Role 0 (melody): ~27 notes from C major scale
// Role 1 (harmony): ~27 notes from C-E-G chord tones
// Role 2 (bass): ~27 notes at C2
// Role 3 (drums): ~27 percussive notes
```

### 3. `buildTimeline()`

**Purpose**: Creates song form structure with sections from Schillinger Book IV.

**Implementation**:
- Uses 32-bar AABA form by default:
  - A1: 8 bars
  - A2: 8 bars
  - B: 8 bars (bridge)
  - A3: 8 bars
- Calculates section durations based on tempo and time signature
- Supports tempo changes per section (multiplier)

**Section Structure**:
```cpp
TimelineSection {
    id: "section_0",
    name: "A1",
    startTime: 0,
    duration: 882000 samples (8 bars at 120 BPM),
    tempo: 120.0,
    timeSignatureNum: 4,
    timeSignatureDenom: 4
}
```

**Future Enhancements**:
- Extract form from `SongState` when available
- Integrate with Schillinger Book IV (Form)
- Support arbitrary form structures (AB, ABCA, rondo, etc.)
- Apply phrase balancing algorithms

**Example**:
```cpp
// 120 BPM, 4/4 time
// Beat duration = 44100 × 60 / 120 = 22050 samples
// Bar duration = 22050 × 4 = 88200 samples
// Section duration = 88200 × 8 = 705600 samples

Total duration = 4 sections × 8 bars × 88200 samples = 2,822,400 samples
```

### 4. `applyPerformanceToSong()`

**Purpose**: Applies performance transformations to song state.

**Implementation**:
- **Tempo**: Preserves original tempo (TODO: add tempo multiplier)
- **Density**: Applies to note generation (density filtering in `assignNotes()`)
- **Groove**: Stored for timing/velocity offsets (TODO: implement groove profiles)
- **ConsoleX**: Stored for mixing/effects
- **Instrument Reassignments**: TODO (extract from `PerformanceState`)
- **Mix Targets**: TODO (extract from `PerformanceState`)
- **Register Mappings**: TODO (extract from `PerformanceState`)

**Transformation Pipeline**:
1. Copy song state
2. Apply tempo transformations
3. Apply density scaling
4. Apply groove profile
5. Apply ConsoleX profile
6. Apply instrument reassignments
7. Apply mix transformations
8. Apply register mappings

**Example**:
```cpp
// Input song
song.tempo = 120.0;
song.density = 0.5;
song.grooveProfileId = "default";

// Performance state
perf.currentDensity = 0.8;
perf.grooveProfileId = "swing";

// Applied song
appliedSong.tempo = 120.0;  // Unchanged
appliedSong.density = 0.8;  // Applied from performance
appliedSong.grooveProfileId = "swing";  // Applied from performance
```

## Schillinger SDK Integration

### Current State
- **Rhythm (Book I)**: Placeholder implementation with basic patterns
- **Melody (Book II)**: Placeholder with C major scale
- **Harmony (Book III)**: Placeholder with C major chord
- **Form (Book IV)**: Basic AABA form implemented

### TODO: Full SDK Integration

#### Rhythm Generation (Book I)
```cpp
// TODO: Integrate with SDK rhythm API
const auto rhythmAPI = sdk.rhythm();

// Generate resultant from generators
auto resultant = await rhythmAPI.generateResultant(3, 4);
// Returns: {durations: [1, 0, 1, 0], complexity: 0.5}

// Apply variations
auto permutation = await rhythmAPI.generateVariation(
    pattern, "permutation", {order: [2, 0, 3, 1]}
);
```

#### Melody Generation (Book II)
```cpp
// TODO: Integrate with SDK melody API
const auto melodyAPI = sdk.melody();

// Generate scale sequence
auto melody = await melodyAPI.generateFromScale(
    "C-major", 8, "ascending"
);

// Apply transformations
auto inverted = await melodyAPI.applyInversion(melody);
```

#### Harmony Generation (Book III)
```cpp
// TODO: Integrate with SDK harmony API
const auto harmonyAPI = sdk.harmony();

// Generate chord progression
auto progression = await harmonyAPI.generateProgression(
    "I-IV-V-I", "C-major"
);

// Apply voice leading
auto voiced = await harmonyAPI.applyVoiceLeading(progression);
```

#### Form Generation (Book IV)
```cpp
// TODO: Integrate with SDK form API
const auto formAPI = sdk.form();

// Generate balanced form
auto form = await formAPI.generateBalancedForm(
    "AABA", 32, 4  // type, total bars, phrases
);

// Apply transformations
varied = await formAPI.applyVariation(form, "extension");
```

## Audio Graph Structure

### Nodes
- **Voice nodes**: One per instrument assignment
- **Bus nodes**: Instrument groups + master
- **Effect nodes**: TODO (from ConsoleX profiles)

### Connections
- **Voice → Bus**: Each voice connects to its assigned bus
- **Bus → Master**: All buses connect to master
- **Sends/Effects**: TODO (from ConsoleX profiles)

### Example Graph
```
voice_0 (LocalGal) ──┐
voice_1 (NexSynth) ──┤
                     ├──> bus_primary ──┐
voice_2 (KaneMarcoAether) ──> bus_bass ──┤
                                         ├──> master
voice_3 (DrumMachine) ──> bus_drums ─────┘
```

## Performance Considerations

### Memory Usage
- **Voice assignments**: ~1 KB per voice
- **Assigned notes**: ~64 bytes per note
- **Timeline sections**: ~256 bytes per section

**Example**:
- 4 voices: 4 KB
- 1000 notes: 64 KB
- 4 sections: 1 KB
- **Total**: ~69 KB per render graph

### CPU Usage
- **Projection**: ~10-50ms for typical song
- **Validation**: ~1-5ms
- **Graph generation**: ~5-20ms

**Optimization Strategies**:
1. Cache projection results by (songId, perfId)
2. Lazy load note patterns (generate on demand)
3. Use lock-free data structures for audio thread
4. Batch graph construction operations

## Testing

### Unit Tests
- `buildVoices()`: Voice creation, density scaling, bus assignment
- `assignNotes()`: Note generation, density filtering, role assignment
- `buildTimeline()`: Section creation, form structure, tempo handling
- `applyPerformanceToSong()`: Transformation application

### Integration Tests
- `projectSong()`: Full projection pipeline
- Render graph validation
- Performance benchmarks

### Test Coverage
```bash
# Run all ProjectionEngine tests
cd juce_backend
./build/tests/ProjectionEngineTest

# Expected output:
// ✓ 20+ test cases passing
// ✓ All integration tests passing
// ✓ Performance tests passing
```

## Future Enhancements

### Phase 1: SDK Integration
- [ ] Integrate rhythm generation (Book I)
- [ ] Integrate melody generation (Book II)
- [ ] Integrate harmony generation (Book III)
- [ ] Integrate form generation (Book IV)

### Phase 2: Performance Features
- [ ] Groove profile system (timing/velocity offsets)
- [ ] Instrument reassignment from PerformanceState
- [ ] Mix targets (gain, pan, stereo/mono)
- [ ] Register mappings (transposition)

### Phase 3: Advanced Features
- [ ] ConsoleX effect integration
- [ ] Automation parameter generation
- [ ] Real-time projection caching
- [ ] Projection result streaming

## Troubleshooting

### Common Issues

**Issue**: Empty notes array
- **Cause**: Density too low (< 0.3)
- **Fix**: Increase density or adjust probability threshold

**Issue**: Incorrect voice assignments
- **Cause**: SongState missing instrument IDs
- **Fix**: Ensure `song.instrumentIds` is populated

**Issue**: Timeline duration mismatch
- **Cause**: Tempo or time signature not set correctly
- **Fix**: Verify `song.tempo` and `song.timeSignature*` values

**Issue**: Graph validation fails
- **Cause**: Circular routing or orphaned nodes
- **Fix**: Check bus connections and ensure all voices have valid bus IDs

## References

- **ProjectionEngine.h**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/include/audio/ProjectionEngine.h`
- **ProjectionEngine.cpp**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/src/audio/ProjectionEngine.cpp`
- **SDK Rhythm API**: `/Users/bretbouchard/apps/schill/white_room/sdk/core/rhythm.ts`
- **PerformanceState_v1**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/include/models/PerformanceState_v1.h`
- **Tests**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/tests/audio/ProjectionEngineTest.cpp`
