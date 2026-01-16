# Schillinger SDK API Documentation

Complete API reference for the Schillinger SDK v1.

## Table of Contents

- [Core Functions](#core-functions)
- [Theory Layer](#theory-layer)
- [Realization](#realization)
- [Reconciliation](#reconciliation)
- [Random Number Generation](#random-number-generation)
- [Validation](#validation)
- [Error Handling](#error-handling)
- [Types](#types)

## Core Functions

### `realize(song, seed, options?)`

Deterministically realize a Schillinger song into an executable model.

**Signature:**
```typescript
function realize(
  song: SchillingerSong_v1,
  seed: number,
  options?: RealizationOptions
): Promise<RealizationResult>
```

**Parameters:**
- `song` - Schillinger theory model
- `seed` - Random seed for deterministic generation (1-2^53)
- `options` - Optional configuration
  - `enableDerivationRecord?: boolean` - Track note derivation (default: true)
  - `enableValidation?: boolean` - Validate theory before realization (default: true)

**Returns:**
```typescript
interface RealizationResult {
  songModel: SongModel_v1;        // Executable song
  derivationRecord: DerivationRecord_v1;  // How each note was generated
  performanceMetrics: PerformanceMetrics;  // Realization statistics
}
```

**Example:**
```typescript
const { songModel, derivationRecord } = await realize(song, 12345);

console.log(`Generated ${songModel.notes.length} notes`);
console.log(`Realization took ${performanceMetrics.durationMs}ms`);
```

### `reconcile(song, editedModel, options?)`

Reconcile an edited song model back to its theory with confidence scoring.

**Signature:**
```typescript
function reconcile(
  song: SchillingerSong_v1,
  editedModel: SongModel_v1,
  options?: ReconciliationOptions
): Promise<ReconciliationReport>
```

**Parameters:**
- `song` - Original theory model
- `editedModel` - Edited song model to reconcile
- `options` - Optional configuration
  - `confidenceThreshold?: number` - Minimum confidence for auto-accept (0-1, default: 0.8)
  - `enableConflictDetection?: boolean` - Detect edit conflicts (default: true)

**Returns:**
```typescript
interface ReconciliationReport {
  proposedUpdate: SchillingerSong_v1;  // Updated theory
  confidenceSummary: ConfidenceSummary;
  derivationLoss: DerivationLoss;
  conflicts: EditConflict[];
  recommendations: ReconciliationRecommendation[];
}
```

**Example:**
```typescript
const report = await reconcile(song, editedModel);

if (report.confidenceSummary.overall > 0.8) {
  song = report.proposedUpdate;
  console.log("Successfully reconciled edits");
} else {
  console.warn("Low confidence - manual review needed");
}
```

### `validate(song)`

Validate a Schillinger song theory.

**Signature:**
```typescript
function validate(song: SchillingerSong_v1): ValidationResult
```

**Parameters:**
- `song` - Theory model to validate

**Returns:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

**Example:**
```typescript
const result = await validate(song);

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`${error.category}: ${error.message}`);
  });
}
```

## Theory Layer

### SchillingerSong_v1

Complete theory model describing a song using Schillinger's system.

**Structure:**
```typescript
interface SchillingerSong_v1 {
  readonly schemaVersion: "1.0";
  readonly songId: UUID;
  readonly metadata: SongMetadata;

  // Book I: Rhythm
  readonly bookI_rhythmSystems: RhythmSystem[];

  // Book II: Melody
  readonly bookII_melodySystems: MelodySystem[];

  // Book III: Harmony
  readonly bookIII_harmonySystems: HarmonySystem[];

  // Book IV: Form
  readonly bookIV_formSystem: FormSystem | null;

  // Book V: Orchestration
  readonly bookV_orchestration: Orchestration;
}
```

### Book I: Rhythm Systems

#### RhythmSystem

Defines rhythmic patterns using generators or resultants.

**Types:**
- `generator` - Attack pattern from periodic generators
- `resultant` - Balanced rhythm from interference patterns

**Example:**
```typescript
const rhythmSystem: RhythmSystem = {
  systemId: "rhythm-1",
  systemType: "generator",
  generators: [
    { period: 4, phase: 0, weight: 1.0 },
    { period: 6, phase: 0, weight: 0.5 }
  ],
  resolutionBars: 8
};
```

### Book II: Melody Systems

#### MelodySystem

Defines pitch patterns using cycles, intervals, and constraints.

**Components:**
- `pitchCycle` - Modulo N pitch space
- `intervalSeed` - Interval sequence
- `contourConstraints` - Direction constraints
- `registerConstraints` - Range constraints

**Example:**
```typescript
const melodySystem: MelodySystem = {
  systemId: "melody-1",
  pitchCycle: {
    modulus: 12,
    roots: [0, 4, 7]  // C major chord tones
  },
  intervalSeed: [2, 2, 1],  // Whole, whole, half
  contourConstraints: {
    maxAscend: 5,
    maxDescend: 5
  }
};
```

### Book III: Harmony Systems

#### HarmonySystem

Defines vertical sonorities and chord progressions.

**Components:**
- `intervalDistribution` - Weighted interval probabilities
- `chordClasses` - Chord type definitions
- `harmonicRhythmBinding` - Bind to Book I systems
- `voiceLeadingRules` - Voice motion constraints

**Example:**
```typescript
const harmonySystem: HarmonySystem = {
  systemId: "harmony-1",
  intervalDistribution: {
    intervals: [7, 5, 4],  // P5, M3, m3
    weights: [0.5, 0.3, 0.2]
  },
  chordClasses: [
    { chordClassId: "major", intervals: [4, 7] }
  ]
};
```

### Book IV: Form Systems

#### FormSystem

Defines song structure and section organization.

**Types:**
- `sectional` - ABA, verse-chorus, etc.
- `continuous` - Through-composed
- `hybrid` - Mixed sectional/continuous

**Example:**
```typescript
const formSystem: FormSystem = {
  formType: "sectional",
  sections: [
    {
      sectionId: "A",
      lengthBars: 8,
      systemsBinding: ["rhythm-1", "melody-1", "harmony-1"]
    },
    {
      sectionId: "B",
      lengthBars: 8,
      systemsBinding: ["rhythm-2", "melody-2", "harmony-2"]
    },
    {
      sectionId: "A'",
      lengthBars: 8,
      systemsBinding: ["rhythm-1", "melody-1", "harmony-1"]
    }
  ]
};
```

### Book V: Orchestration

#### Orchestration

Defines instruments, ensembles, and voice assignments.

**Components:**
- `ensembleId` - Reference to ensemble configuration
- `voices` - Instrument definitions with roles
- `groups` - Voice groupings
- `balanceRules` - Mix parameters

**Example:**
```typescript
const orchestration: Orchestration = {
  ensembleId: "rock-band",
  voices: [
    {
      id: "drums",
      name: "Drums",
      rolePools: [{
        role: "primary",
        functionalClass: "foundation",
        enabled: true
      }]
    },
    {
      id: "bass",
      name: "Bass Guitar",
      rolePools: [{
        role: "secondary",
        functionalClass: "foundation",
        enabled: true
      }]
    }
  ]
};
```

## Realization

### SongModel_v1

Executable song model produced from realization.

**Structure:**
```typescript
interface SongModel_v1 {
  readonly schemaVersion: "1.0";
  readonly songId: UUID;
  readonly tempo: number;
  readonly timeSignature: TimeSignature;
  readonly durationBars: number;

  // Notes
  readonly notes: Note[];
  readonly voices: VoiceAssignment[];

  // Metadata
  readonly realizationSeed: number;
  readonly realizationTimestamp: string;
}
```

### Note

Single musical event in the realized model.

**Structure:**
```typescript
interface Note {
  readonly noteId: UUID;
  readonly startBeat: number;
  readonly durationBeats: number;
  readonly pitch: number;  // MIDI pitch (0-127)
  readonly velocity: number;  // 0-127
  readonly voiceId: UUID;

  // Derivation tracking
  readonly derivation: NoteDerivation;
}
```

### DerivationRecord_v1

Complete record of how each note was generated from theory.

**Structure:**
```typescript
interface DerivationRecord_v1 {
  readonly schemaVersion: "1.0";
  readonly noteDerivations: Map<UUID, NoteDerivation>;
  readonly systemDerivations: SystemDerivation[];
  readonly reconciliationHistory: ReconciliationEntry[];
}
```

## Reconciliation

### ReconciliationReport

Result of reconciling an edited model back to theory.

**Structure:**
```typescript
interface ReconciliationReport {
  proposedUpdate: SchillingerSong_v1;
  confidenceSummary: ConfidenceSummary;
  derivationLoss: DerivationLoss;
  conflicts: EditConflict[];
  recommendations: ReconciliationRecommendation[];
}
```

### ConfidenceSummary

Overall confidence metrics for reconciliation.

**Structure:**
```typescript
interface ConfidenceSummary {
  overall: number;  // 0-1
  byCategory: {
    rhythm: number;
    melody: number;
    harmony: number;
    form: number;
    orchestration: number;
  };
}
```

### EditConflict

Detected conflict between edits and theory.

**Structure:**
```typescript
interface EditConflict {
  conflictId: UUID;
  conflictType: "theoryViolation" | "editConflict" | "inconsistent";
  affectedNotes: UUID[];
  description: string;
  resolution?: ConflictResolution;
}
```

## Random Number Generation

### `pcgRandom(seed)`

Deterministic PCG random number generator.

**Signature:**
```typescript
function pcgRandom(seed: number): PCGRandom
```

**Methods:**
- `nextInt()` - Next integer in [0, 2^32)
- `nextFloat()` - Next float in [0, 1)
- `nextInRange(min, max)` - Next integer in [min, max]
- `setState(state)` - Set generator state
- `getState()` - Get generator state

**Example:**
```typescript
const rng = pcgRandom(12345);

console.log(rng.nextFloat());  // 0.1234...
console.log(rng.nextInt());   // 1234567890
```

## Validation

### ValidationError

Theory validation error.

**Structure:**
```typescript
interface ValidationError {
  code: string;
  category: ErrorCategory;
  message: string;
  path?: string;  // Path to error in theory model
}
```

### ValidationWarning

Theory validation warning (non-blocking).

**Structure:**
```typescript
interface ValidationWarning {
  code: string;
  category: string;
  message: string;
  suggestion?: string;
}
```

## Error Handling

### Error Classes

- `WhiteRoomError` - Base error class
- `TheoryError` - Theory-related errors
- `ValidationError` - Validation failures
- `RealizationError` - Realization failures
- `AudioError` - Audio/playback errors
- `FFIError` - FFI/bridge errors
- `ConfigurationError` - Configuration errors
- `PerformanceError` - Performance warnings

### Error Severity

```typescript
enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}
```

### Error Recovery

```typescript
import {
  ErrorHandler,
  defaultErrorHandler,
  withErrorHandling
} from '@schillinger-sdk/core-v1';

// Use default handler
const result = await withErrorHandling(
  () => realize(song, seed),
  { onError: (error) => console.error(error) }
);

// Custom handler
const handler = new ErrorHandler({
  enableLogging: true,
  enableRecovery: true,
  enableStatistics: true
});

await handler.handle(error);
```

## Types

### UUID

Unique identifier string.

```typescript
type UUID = string;  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

### TimeSignature

Musical time signature.

```typescript
interface TimeSignature {
  numerator: number;   // Beats per measure
  denominator: number; // Beat unit (4 = quarter note)
}
```

### FunctionalClass

Voice functional classification.

```typescript
type FunctionalClass =
  | "foundation"  // Bass, rhythm foundation
  | "motion"      // Melodic motion
  | "ornament"    // Decorative, embellishment
  | "reinforcement";  // Doubles, reinforces

type RoleType =
  | "primary"     // Main voice
  | "secondary"   // Supporting voice
  | "tertiary";   // Fills, pads
```

## Utility Functions

### `generateUUID()`

Generate a new UUID.

```typescript
const id = generateUUID();
```

### `clamp(value, min, max)`

Clamp a value to a range.

```typescript
const clamped = clamp(value, 0, 100);
```

### `lerp(a, b, t)`

Linear interpolation between two values.

```typescript
const result = lerp(0, 100, 0.5);  // 50
```

## Complete Example

```typescript
import {
  SchillingerSong_v1,
  realize,
  reconcile,
  validate,
  pcgRandom
} from '@schillinger-sdk/core-v1';

// 1. Create theory
const song: SchillingerSong_v1 = {
  schemaVersion: "1.0",
  songId: generateUUID(),
  metadata: { title: "My Song", tempo: 120 },
  bookI_rhythmSystems: [...],
  bookII_melodySystems: [...],
  bookIII_harmonySystems: [...],
  bookIV_formSystem: {...},
  bookV_orchestration: {...}
};

// 2. Validate
const validation = await validate(song);
if (!validation.valid) {
  throw new Error("Invalid theory");
}

// 3. Realize
const { songModel, derivationRecord } = await realize(song, 12345);

// 4. Edit
songModel.notes[0].velocity = 127;

// 5. Reconcile
const report = await reconcile(song, songModel);
if (report.confidenceSummary.overall > 0.8) {
  song = report.proposedUpdate;
}
```

## TypeScript Support

The SDK is written in TypeScript and provides complete type definitions:

```typescript
import type {
  SchillingerSong_v1,
  SongModel_v1,
  Note,
  RhythmSystem,
  MelodySystem,
  HarmonySystem,
  FormSystem,
  Orchestration
} from '@schillinger-sdk/core-v1';
```

All types are exported for use in your own code.
