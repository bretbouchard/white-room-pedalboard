# PerformanceState_v1 Schema Documentation

## Overview

**PerformanceState_v1** represents a parallel performance universe for a song. It defines **how** a song is realized, as opposed to **what** the song is (which is defined by SongState).

### Core Concept: Parallel Performance Universes

One song can have many performances:
- **Solo Piano** - Sparse, intimate piano arrangement
- **SATB Choir** - Traditional 4-part harmony
- **Ambient Techno** - Electronic, atmospheric interpretation
- **Jazz Trio** - Swing-feel small ensemble
- **Full Orchestra** - Complete symphonic realization

### Architecture

```
SongState (what the song is)
    +
PerformanceState (how it's realized)
    ↓
Playable Graph (renderer output)
```

## Schema Structure

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | `"1"` | Schema version identifier |
| `id` | UUID | Unique identifier for this performance |
| `name` | string | Human-readable name (e.g., "Solo Piano", "SATB") |
| `arrangementStyle` | ArrangementStyle | Musical arrangement style enum |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `density` | number (0..1) | `1.0` | Note density multiplier |
| `grooveProfileId` | string | `"default"` | Reference to groove template |
| `instrumentationMap` | Record<string, InstrumentAssignment> | `{}` | Role → Instrument mapping |
| `consoleXProfileId` | string | `"default"` | ConsoleX mixing profile |
| `mixTargets` | Record<string, MixTarget> | `{}` | Per-role gain/pan targets |
| `createdAt` | ISO 8601 timestamp | auto-generated | Creation timestamp |
| `modifiedAt` | ISO 8601 timestamp | auto-generated | Last modification timestamp |
| `metadata` | Record<string, unknown> | `undefined` | Custom metadata |

## Arrangement Styles

The `arrangementStyle` enum defines common musical ensembles:

| Style | Description |
|-------|-------------|
| `SOLO_PIANO` | Single piano performance |
| `SATB` | Soprano, Alto, Tenor, Bass choir |
| `CHAMBER_ENSEMBLE` | Small chamber group |
| `FULL_ORCHESTRA` | Complete symphony orchestra |
| `JAZZ_COMBO` | Jazz ensemble (5+ pieces) |
| `JAZZ_TRIO` | Piano, bass, drums trio |
| `ROCK_BAND` | Rock band configuration |
| `AMBIENT_TECHNO` | Electronic ambient style |
| `ELECTRONIC` | General electronic style |
| `ACAPPELLA` | Vocal-only performance |
| `STRING_QUARTET` | 2 violins, viola, cello |
| `CUSTOM` | Custom arrangement |

## Instrument Assignment

Maps roles or track IDs to concrete instruments:

```typescript
interface InstrumentAssignment {
  instrumentId: string;      // Instrument identifier
  presetId?: string;         // Optional preset
  parameters?: Record<string, number>;  // Custom parameters
}
```

### Example

```json
{
  "primary": {
    "instrumentId": "LocalGal",
    "presetId": "grand_piano",
    "parameters": {
      "reverb": 0.5,
      "brightness": 0.7
    }
  }
}
```

## Mix Targets

Defines gain and pan for each role/track:

```typescript
interface MixTarget {
  gain: number;      // dB (-infinity to 0)
  pan: number;       // -1 (left) to 1 (right)
  stereo?: boolean;  // Default: true
}
```

### Example

```json
{
  "piano": {
    "gain": -6,
    "pan": -0.2,
    "stereo": true
  },
  "bass": {
    "gain": -4,
    "pan": 0,
    "stereo": false
  }
}
```

## Usage Examples

### Creating a Performance

```typescript
import {
  createPerformanceState,
  ArrangementStyle
} from '@white-room/schemas';

const piano = createPerformanceState(
  "Solo Piano",
  ArrangementStyle.SOLO_PIANO
);
```

### Using Factory Functions

```typescript
import {
  createSoloPianoPerformance,
  createSATBPerformance,
  createAmbientTechnoPerformance,
  createJazzTrioPerformance,
  createFullOrchestraPerformance
} from '@white-room/schemas';

const piano = createSoloPianoPerformance();
const choir = createSATBPerformance();
const techno = createAmbientTechnoPerformance();
const jazz = createJazzTrioPerformance();
const orchestra = createFullOrchestraPerformance();
```

### Custom Instrumentation

```typescript
const custom = createPerformanceState(
  "My Custom Performance",
  ArrangementStyle.CUSTOM
);

// Assign instruments to roles
custom.instrumentationMap = {
  primary: {
    instrumentId: "LocalGal",
    presetId: "grand_piano"
  },
  secondary: {
    instrumentId: "KaneMarco",
    presetId: "upright_bass"
  }
};

// Set mix targets
custom.mixTargets = {
  primary: {
    gain: -6,
    pan: -0.3,
    stereo: true
  },
  secondary: {
    gain: -4,
    pan: 0.3,
    stereo: false
  }
};
```

### Cloning a Performance

```typescript
import { clonePerformanceState } from '@white-room/schemas';

const original = createSoloPianoPerformance();
const copy = clonePerformanceState(original, "Piano Variation");
```

### Validation

```typescript
import { validatePerformanceState } from '@white-room/schemas';

const result = validatePerformanceState(myPerformance);

if (result.valid) {
  console.log("Performance is valid!");
  console.log(result.data);
} else {
  console.error("Validation errors:", result.errors);
}
```

## Performance Switching

Performances can be switched at runtime:

1. **Discrete Switching** (Milestone 1)
   - Switch between performances at bar boundaries
   - No audio glitches
   - Instrumentation, density, groove change instantly

2. **Sweep/Crossfade** (Milestone 2)
   - Smooth interpolation between performances
   - Blend multiple performances
   - Real-time parameter morphing

## Integration Points

### SongModel Integration

The `SongModel_v1` schema will be extended to include:

```json
{
  "performances": [
    {
      "id": "performance-uuid",
      "active": true
    }
  ]
}
```

### Renderer Integration

The renderer combines:
- **SongState** → Notes, harmony, rhythm, structure
- **PerformanceState** → Instruments, density, groove, mix

Result: Playable audio graph

### ConsoleX Integration

Each performance references a `consoleXProfileId` for:
- Bus routing
- Effects configuration
- Metering setup
- Automation curves

## Best Practices

### 1. Density Values

- **0.0 - 0.3**: Sparse, minimal, ambient
- **0.3 - 0.6**: Light, delicate, sparse
- **0.6 - 0.8**: Medium, balanced
- **0.8 - 1.0**: Dense, full, complex

### 2. Gain Staging

- **Master**: -0.5 to 0 dB
- **Groups**: -3 to -6 dB
- **Voices**: -6 to -12 dB
- **Pad/Ambient**: -9 to -15 dB

### 3. Pan Positioning

- **Center**: 0 (bass, kick, lead vocals)
- **Left**: -0.3 to -1.0 (piano left, guitars)
- **Right**: 0.3 to 1.0 (piano right, guitars)
- **Stereo width**: Use stereo:true for pads, atmospheres

### 4. Naming Conventions

- Use descriptive names: "Solo Piano", "SATB Choir"
- Include genre if helpful: "Jazz Trio", "Ambient Techno"
- Avoid technical jargon in user-facing names

## Validation Rules

### Required Fields

- `version`, `id`, `name`, `arrangementStyle` are required

### UUID Format

- `id` must be valid UUID v4 format

### Density Range

- Must be between 0.0 and 1.0 (inclusive)

### Pan Range

- Must be between -1.0 and 1.0 (inclusive)

### Arrangement Style

- Must be one of the predefined enum values

## Migration

From v1 to future versions:

```typescript
import { migratePerformanceState } from '@white-room/schemas';

const v2 = migratePerformanceState(v1Performance, "2");
```

## See Also

- [SongModel_v1 Documentation](./SongModel_v1.md)
- [SchillingerSong_v1 Documentation](./SchillingerSong_v1.md)
- [ConsoleX Integration Guide](./ConsoleX_Integration.md)
- [Renderer Architecture](./Renderer_Architecture.md)

## Changelog

### v1 (2026-01-15)
- Initial release
- 12 arrangement styles
- Instrument and mix target mapping
- Full schema validation
- Factory functions for common performances
- 34 comprehensive unit tests
