# Parallel Performance Universes - Design Documentation

## Executive Summary

**Parallel Performance Universes** is a revolutionary feature that separates "what the song is" from "how it sounds", enabling a single composition to exist in infinite performance realities.

### Core Concept

- **SongState**: The invariant musical logic (structure, harmony, rhythm, motifs)
- **PerformanceRealization**: The realization lens (instruments, density, groove, mixing)
- **Renderer**: Applies PerformanceRealization to SongState → playable audio graph

### Key Achievement

The same song can be rendered as:
- Solo Piano (1 voice, minimal density)
- SATB Choir (4 voices, moderate density)
- Ambient Techno (8 voices, high density, heavy effects)
- ...and infinite other realizations

---

## Architecture Overview

### Three-Layer Separation

```
┌─────────────────────────────────────────────────────────────┐
│                    SONGSTATE (Invariant)                    │
│  • Form graph                                                │
│  • Rhythmic generators                                       │
│  • Pitch fields / interval sets                              │
│  • Motif relationships                                       │
│  • Density curves                                            │
│  • PM (Predictability Metric) configuration                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│             PERFORMANCE REALIZATION (Lens)                  │
│  • Instrumentation: Role → Instrument + Preset               │
│  • Density scaling (0..1)                                    │
│  • Groove profile (timing, velocity, swing)                  │
│  • Register mapping (pitch ranges per role)                  │
│  • ConsoleX profile (mix, effects, routing)                  │
│  • Performance targets (CPU, polyphony)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   RENDERED AUDIO GRAPH                      │
│  • Complete render graph with all routing                    │
│  • Instrument instances loaded with presets                  │
│  • ConsoleX channel strips configured                        │
│  • Automation curves applied                                │
│  • Ready for real-time playback or export                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action:
  "Switch to Techno performance"
       ↓
Swift Frontend:
  PerformanceManager.switchPerformance("techno-id")
       ↓
SDK:
  SongModel.performances[] → find by ID
  SongModel.activePerformanceId = "techno-id"
       ↓
JUCE Backend:
  SongModelAdapter.renderSong(songModel, "techno-id")
       ↓
Rendering Engine:
  1. Parse SongState (invariant musical logic)
  2. Apply PerformanceRealization (instruments, density, groove)
  3. Build RenderGraph with proper routing
  4. Load instruments with presets
  5. Configure ConsoleX strips
  6. Render audio output
```

---

## Data Model

### SongModel_v1 Structure

```typescript
interface SongModel_v1 {
  readonly version: '1.0';
  readonly id: string;

  // Invariant musical logic
  readonly songState: SongStateV1;

  // Performance realizations (parallel universes)
  readonly performances: PerformanceRealizationV1[];

  // Currently active performance
  readonly activePerformanceId: string;

  // Metadata
  readonly createdAt: number;
  readonly modifiedAt: number;
}
```

### PerformanceRealizationV1 Structure

```typescript
interface PerformanceRealizationV1 {
  readonly version: '1.0';
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  // Arrangement style
  readonly arrangementStyle: ArrangementStyle;

  // Density and groove
  readonly density: number; // 0.0 (sparse) to 1.0 (full)
  readonly grooveProfileId: string;

  // Instrumentation: Role/Voice → Instrument + Preset
  readonly instrumentationMap: readonly InstrumentationEntry[];

  // ConsoleX integration
  readonly consoleXProfileId?: string;

  // Mix targets: Gain and pan per role
  readonly mixTargets: readonly MixTargetEntry[];

  // Register constraints: Pitch ranges per role
  readonly registerMap: readonly RegisterEntry[];

  // Timestamps
  readonly createdAt: number;
  readonly modifiedAt: number;
}
```

### InstrumentationEntry

```typescript
interface InstrumentationEntry {
  readonly roleId: string;        // Functional role UUID
  readonly voiceId?: string;      // Optional: specific voice UUID
  readonly instrumentId: InstrumentType;  // "NexSynth", "KaneMarco", etc.
  readonly presetId: string;      // Preset identifier
  readonly busId: string;         // Mix bus UUID
}
```

### Supported Instruments

```typescript
type InstrumentType =
  | 'LocalGal'              // Physical modeling string
  | 'KaneMarco'             // Wavetable synthesizer
  | 'KaneMarcoAether'       // Additive synthesizer
  | 'KaneMarcoAetherString' // String synthesizer
  | 'NexSynth'              // FM synthesizer
  | 'SamSampler'            // Sampler
  | 'DrumMachine';          // Drum synthesis
```

### Arrangement Styles

```typescript
type ArrangementStyle =
  | 'SOLO_PIANO'
  | 'SATB'
  | 'CHAMBER_ENSEMBLE'
  | 'FULL_ORCHESTRA'
  | 'JAZZ_COMBO'
  | 'ROCK_BAND'
  | 'AMBIENT_TECHNO'
  | 'ELECTRONIC'
  | 'ACAPPELLA'
  | 'CUSTOM';
```

---

## Rendering Pipeline

### Phase 1: Parse SongState

**Input**: SongModel_v1.songState
**Output**: Parsed musical structure

```
SongState contains:
├── Timeline (sections, tempo, time signature)
├── Note events (pitch, rhythm, dynamics)
├── Automations (parameter curves)
├── Voice assignments (roles)
└── Console model (routing, effects)
```

### Phase 2: Apply PerformanceRealization

**Input**: SongState + PerformanceRealization
**Output**: Realized instrument configuration

```typescript
// For each InstrumentationEntry in performance.instrumentationMap
for (const entry of performance.instrumentationMap) {
  // 1. Find notes for this role
  const roleNotes = songState.notes.filter(n => n.roleId === entry.roleId);

  // 2. Apply density scaling
  const scaledNotes = applyDensity(roleNotes, performance.density);

  // 3. Apply register constraints
  const constrainedNotes = applyRegister(scaledNotes, entry);

  // 4. Apply groove profile
  const groovedNotes = applyGroove(constrainedNotes, performance.grooveProfileId);

  // 5. Route to instrument
  instruments.assign(entry.instrumentId, groovedNotes, entry.presetId);
}
```

### Phase 3: Build RenderGraph

**Input**: Realized instrument configuration
**Output**: Complete audio graph

```
RenderGraph Structure:
├── Instrument Nodes
│   ├── NexSynth (Instance 1)
│   ├── KaneMarco (Instance 2)
│   └── DrumMachine (Instance 3)
├── ConsoleX Nodes
│   ├── Voice Bus 1 (NexSynth output)
│   ├── Voice Bus 2 (KaneMarco output)
│   ├── Mix Bus 1 (Reverb send)
│   └── Master Bus (Final output)
└── Routing Connections
    ├── Voice Bus 1 → Mix Bus 1 (send level: -6dB)
    ├── Voice Bus 2 → Master Bus (gain: -3dB, pan: 0.3)
    └── Mix Bus 1 → Master Bus (return)
```

### Phase 4: Load Instruments

**Input**: RenderGraph with instrument nodes
**Output**: Loaded DSP instances

```cpp
// JUCE Backend
for (const auto& node : renderGraph.instrumentNodes) {
  auto instrument = InstrumentFactory::create(node.instrumentType);
  instrument->loadPreset(node.presetId);
  audioEngine->addInstrument(node.busId, instrument);
}
```

### Phase 5: Configure ConsoleX

**Input**: PerformanceRealization.consoleXProfileId
**Output**: Configured mixer strips

```cpp
// JUCE Backend
const auto& consoleProfile = ConsoleXProfileManager::getProfile(performance.consoleXProfileId);

for (const auto& strip : consoleProfile.strips) {
  auto bus = audioEngine->getBus(strip.busId);
  bus->setGain(strip.gain);
  bus->setPan(strip.pan);
  bus->setInsertEffects(strip.effects);
}
```

### Phase 6: Render Audio

**Input**: Complete configured audio engine
**Output**: Stereo audio buffers

```cpp
// JUCE Backend (real-time rendering)
void AudioEngine::processBlock(AudioBuffer<float>& buffer) {
  // 1. Generate notes from SongState
  auto notes = generateNotes(songState, currentPerformance);

  // 2. Route notes to instruments
  for (const auto& note : notes) {
    auto instrument = getInstrumentForRole(note.roleId);
    instrument->addNote(note);
  }

  // 3. Render all instruments
  for (const auto& instrument : instruments) {
    instrument->process(buffer);
  }

  // 4. Apply ConsoleX processing
  consoleSystem->process(buffer);

  // 5. Output to master bus
  masterBus->process(buffer);
}
```

---

## Performance Interpolation Algorithm

### Discrete Switching (Milestone 1)

**Implementation**: Bar-boundary transitions

```
Timeline:
Bar 1     Bar 2     Bar 3     Bar 4
┌────────┬────────┬────────┬────────┐
│ Piano  │ Piano  │ Switch │ Techno │
│ 100%   │ 100%   │  ↓     │ 100%   │
└────────┴────────┴────────┴────────┘

User taps "Techno" at Bar 2.5:
→ Schedule transition for Bar 3 boundary
→ No audio glitches (wait for quiet moment)
→ At Bar 3: Switch instrumentation, density, groove, ConsoleX
```

### Continuous Blending (Milestone 2)

**Implementation**: Dual-render crossfade

```
Architecture:
┌─────────────────┐     ┌─────────────────┐
│  Perf A Render  │     │  Perf B Render  │
│  (Piano)        │     │  (Techno)       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    ┌───────────┐      │
         └────→ Crossfade ├──────┘
              │  (t: 0..1)│
              └─────┬─────┘
                    ↓
              ┌───────────┐
              │   Master  │
              │   Output  │
              └───────────┘

t = 0.0: 100% Piano, 0% Techno
t = 0.5: 50% Piano, 50% Techno
t = 1.0: 0% Piano, 100% Techno
```

### Interpolation Parameters

| Parameter | Interpolation Method |
|-----------|---------------------|
| Audio output | Linear crossfade (equal power) |
| Density | Linear (0.3 → 0.8) |
| Groove swing | Linear (0.0 → 0.5) |
| Mix targets | Linear (gain, pan) |
| Instrumentation | Staged swap at bar boundaries |
| ConsoleX profile | Linear (strip parameters) |

---

## Integration Points

### SDK Layer

**Location**: `/Users/bretbouchard/apps/schill/white_room/sdk/packages/sdk/src/song/`

**Key Files**:
- `performance_realization.ts` - PerformanceRealizationV1 type and validation
- `performance_manager.ts` - CRUD operations for performances
- `performance_configuration.ts` - PerformanceConfiguration type
- `song_state_v1.ts` - SongStateV1 type
- `performance_switching.test.ts` - Unit tests

**Key APIs**:
```typescript
class PerformanceManager {
  listPerformances(): PerformanceRealizationV1[]
  getPerformance(id: string): PerformanceRealizationV1 | undefined
  getActivePerformance(): PerformanceRealizationV1 | undefined
  createPerformance(options): ManagerResult<PerformanceRealizationV1>
  updatePerformance(options): ManagerResult<PerformanceRealizationV1>
  deletePerformance(id: string): ManagerResult<void>
  switchPerformance(id: string): ManagerResult<PerformanceRealizationV1>
  blendPerformances(a, b, t): ManagerResult<BlendResult>
}
```

### JUCE Backend Layer

**Location**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/`

**Key Files**:
- `src/ffi/include/ffi_server.h` - FFI server interface
- `src/ffi/src/ffi_server.cpp` - FFI server implementation
- `src/ffi/src/validator.cpp` - Schema validation
- `src/ffi/src/theory_bridge.cpp` - Theory engine bridge

**Key APIs**:
```cpp
class SongModelAdapter {
  // Render song under specific performance
  RenderedSongGraph renderSong(
    const SongModel_v1& songModel,
    const std::string& performanceId
  );

  // Render blended performance (future)
  RenderedSongGraph renderSongBlend(
    const SongModel_v1& songModel,
    const std::string& perfA,
    const std::string& perfB,
    double t
  );
}
```

### Swift Frontend Layer

**Location**: `/Users/bretbouchard/apps/schill/white_room/swift_frontend/src/`

**Key Files**:
- `SwiftFrontendCore/Audio/JUCEEngine.swift` - JUCE bridge
- `SwiftFrontendCore/Audio/ProjectionModels.swift` - Projection types
- `SwiftFrontendCore/Surface/SurfaceRootView.swift` - UI

**Key APIs**:
```swift
class JUCEEngine {
  // Project song with performance
  func projectSong(
    _ song: Song,
    performance: PerformanceState,
    config: ProjectionConfig
  ) -> Result<ProjectionResult, ProjectionError>

  // Project blended performance (future)
  func projectSongBlend(
    _ song: Song,
    perfA: PerformanceState,
    perfB: PerformanceState,
    t: Double
  ) -> Result<ProjectionResult, ProjectionError>
}
```

---

## Performance Optimization

### Memory Management

**Strategy**: Immutable data structures with copy-on-write

```typescript
// Immutable update pattern
const updatedSongModel = {
  ...songModel,
  performances: [
    ...songModel.performances,
    newPerformance
  ]
};
```

**Benefits**:
- No shared mutable state
- Easy undo/redo (just keep old versions)
- Thread-safe (no locks needed)

### CPU Optimization

**Strategy**: Lazy rendering and caching

```typescript
// Cache rendered graphs per performance
class RenderCache {
  private cache = new Map<string, RenderedSongGraph>();

  get(
    songId: string,
    performanceId: string
  ): RenderedSongGraph | undefined {
    const key = `${songId}:${performanceId}`;
    return this.cache.get(key);
  }

  set(
    songId: string,
    performanceId: string,
    graph: RenderedSongGraph
  ): void {
    const key = `${songId}:${performanceId}`;
    this.cache.set(key, graph);
  }
}
```

**Benefits**:
- Render once, play many times
- Fast performance switching
- Low CPU overhead

### Audio Glitch Prevention

**Strategy**: Bar-boundary transitions

```typescript
// Schedule transitions at quiet moments
function schedulePerformanceSwitch(
  currentPerf: PerformanceRealizationV1,
  targetPerf: PerformanceRealizationV1
): ScheduledTransition {
  // Find next bar boundary
  const nextBar = Math.ceil(transportPosition / barLength) * barLength;

  // Schedule transition
  return {
    time: nextBar,
    from: currentPerf,
    to: targetPerf,
    rampDuration: 0.1 // 100ms crossfade
  };
}
```

**Benefits**:
- No clicks or pops
- Smooth audio transitions
- Musical timing preserved

---

## Validation Strategy

### Schema Validation

**Location**: SDK validation layer

```typescript
export function validatePerformanceRealization(
  performance: unknown
): ValidationResult {
  const errors: ValidationError[] = [];

  // Version check
  if (p.version !== '1.0') {
    errors.push({ path: 'version', message: 'Version must be "1.0"' });
  }

  // ID validation
  if (typeof p.id !== 'string' || !p.id) {
    errors.push({ path: 'id', message: 'Valid ID required' });
  }

  // Arrangement style validation
  const validStyles: ArrangementStyle[] = [
    'SOLO_PIANO', 'SATB', 'CHAMBER_ENSEMBLE',
    'FULL_ORCHESTRA', 'JAZZ_COMBO', 'ROCK_BAND',
    'AMBIENT_TECHNO', 'ELECTRONIC', 'ACAPPELLA', 'CUSTOM'
  ];
  if (!validStyles.includes(p.arrangementStyle)) {
    errors.push({
      path: 'arrangementStyle',
      message: `Invalid arrangement style. Must be one of: ${validStyles.join(', ')}`
    });
  }

  // Instrumentation map validation
  if (!Array.isArray(p.instrumentationMap)) {
    errors.push({ path: 'instrumentationMap', message: 'Must be an array' });
  } else if (p.instrumentationMap.length === 0) {
    errors.push({
      path: 'instrumentationMap',
      message: 'At least one entry required'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Runtime Validation

**Location**: JUCE backend FFI layer

```cpp
// FFI server validates before processing
FFIResult FFIServer::loadSong(const nlohmann::json& contractJson) {
  // Validate JSON syntax
  if (!contractJson.is_object()) {
    return FFIResult::error(
      FFICode::VALIDATION_ERROR,
      "Contract must be a JSON object"
    );
  }

  // Validate SongModel schema
  SongModel_v1 songModel;
  auto validation = validator.validateSongModel(contractJson);
  if (!validation.isValid) {
    return FFIResult::error(
      FFICode::VALIDATION_ERROR,
      validation.errorMessage
    );
  }

  // Parse and load
  songModel = contractJson.get<SongModel_v1>();
  return loadSong(songModel);
}
```

---

## Testing Strategy

### Unit Tests

**Location**: `/Users/bretbouchard/apps/schill/white_room/sdk/packages/sdk/src/song/__tests__/`

**Coverage**:
- `performance_switching.test.ts` - Performance CRUD operations
- `separation_validation.test.ts` - SongState vs PerformanceRealization separation
- `song_cache.test.ts` - Caching behavior

**Example**:
```typescript
test('switchPerformance updates activePerformanceId', () => {
  const songModel = createTestSongModel();
  const manager = createPerformanceManager(songModel);

  const result = manager.switchPerformance('techno-id');

  expect(result.success).toBe(true);
  expect(songModel.activePerformanceId).toBe('techno-id');
});
```

### Integration Tests

**Location**: `/Users/bretbouchard/apps/schill/white_room/juce_backend/tests/ffi/`

**Coverage**:
- FFI server operations (realize, reconcile, loadSong)
- Schema validation
- Thread safety

**Example**:
```cpp
TEST(FFIServerTest, LoadSongWithPerformanceSwitching) {
  SongModel_v1 songModel = createTestSongModel();

  // Load with Piano performance
  auto result1 = server.loadSong(songModel, "piano-id");
  EXPECT_TRUE(result1.isSuccess);

  // Switch to Techno performance
  auto result2 = server.loadSong(songModel, "techno-id");
  EXPECT_TRUE(result2.isSuccess);

  // Verify different audio output
  EXPECT_NE(result1.audioGraph, result2.audioGraph);
}
```

### E2E Tests

**Location**: `/Users/bretbouchard/apps/schill/white_room/swift_frontend/tests/`

**Coverage**:
- Swift → JUCE integration
- Performance switching workflow
- Audio output verification

**Example**:
```swift
func testPerformanceSwitchingWorkflow() async throws {
  // Load song with Piano performance
  let song = try loadSong(named: "test-song")
  let pianoResult = try engine.projectSong(
    song,
    performance: .piano,
    config: .init(renderMode: .realtime)
  )

  // Switch to Techno performance
  let technoResult = try engine.projectSong(
    song,
    performance: .techno,
    config: .init(renderMode: .realtime)
  )

  // Verify different audio graphs
  XCTAssertNotEqual(pianoResult.graph, technoResult.graph)
}
```

---

## Future Enhancements

### Performance Morphing

**Concept**: Smooth parameter interpolation between performances

```
Piano (density: 0.3) ────────→ Techno (density: 0.8)
        ↓ Morphing                          ↓
    Gradual density increase
    Instrument crossfade
    Groove transition
    ConsoleX blend
```

### Performance Presets

**Concept**: Shareable performance configurations

```typescript
// Export performance as preset
const technoPreset = exportPerformancePreset(technoPerformance);

// Import and apply to different song
const customPerformance = importPerformancePreset(
  technoPreset,
  targetSong
);
```

### AI-Assisted Performance Creation

**Concept**: Generate performances from natural language

```
User: "Make it sound like a sad jazz ballad"
AI:
  - Select JAZZ_COMBO arrangement
  - Set density to 0.4 (sparse)
  - Choose swing groove (0.6)
  - Map instruments: piano, upright bass, drums
  - Apply reverb ConsoleX profile
```

---

## Glossary

| Term | Definition |
|------|------------|
| **SongState** | Invariant musical logic (what the song is) |
| **PerformanceRealization** | Realization lens (how the song sounds) |
| **ArrangementStyle** | Category of performance (SOLO_PIANO, SATB, etc.) |
| **InstrumentationMap** | Mapping of roles to instruments and presets |
| **DensityScale** | 0-1 value controlling note density |
| **GrooveProfile** | Timing and velocity characteristics |
| **RegisterMap** | Pitch range constraints per role |
| **ConsoleXProfile** | Mixer configuration (effects, routing) |
| **Parallel Universes** | Multiple realizations of the same song |
| **Sweep Control** | UI for blending between performances |
| **Blend Parameter** | 0-1 value for crossfade (t) |

---

## References

- [API Documentation](./002-api-documentation.md)
- [User Guide](./003-user-guide.md)
- [Developer Guide](./004-developer-guide.md)
- [Issue Tracker](https://github.com/bretbouchard/white-room/issues/211)
