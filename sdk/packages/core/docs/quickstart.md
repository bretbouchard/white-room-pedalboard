# Schillinger SDK Quickstart Guide

Get started with the Schillinger SDK in 5 minutes. This guide will take you from installation to your first generated song.

## What is the Schillinger SDK?

The Schillinger SDK is a **theory-first music composition system** based on Joseph Schillinger's complete systematic approach to music composition. Unlike traditional DAWs where you place notes manually, the Schillinger SDK lets you:

- **Describe music using theory** (rhythm, melody, harmony, form, orchestration)
- **Generate deterministic results** from theory parameters
- **Reconcile edits back to theory** with confidence scoring
- **Achieve bit-for-bit consistency** across platforms

## Prerequisites

- Node.js 18+ or TypeScript 5+
- Basic understanding of music theory concepts (helpful but not required)

## Installation

```bash
# npm
npm install @schillinger-sdk/core-v1

# yarn
yarn add @schillinger-sdk/core-v1

# pnpm
pnpm add @schillinger-sdk/core-v1
```

## Your First Schillinger Song

### Step 1: Import the SDK

```typescript
import {
  SchillingerSong_v1,
  SongModel_v1,
  realize,
  reconcile,
  validate
} from '@schillinger-sdk/core-v1';
```

### Step 2: Define Theory Systems

The SDK uses Schillinger's complete system organized into 5 books:

```typescript
const song: SchillingerSong_v1 = {
  schemaVersion: "1.0",
  songId: "my-first-song",

  // Book I: Rhythm - Attack patterns and timing
  bookI_rhythmSystems: [{
    systemId: "rhythm-1",
    systemType: "generator",
    generators: [{
      period: 4,           // Cycle length
      phase: 0,            // Starting position
      weight: 1.0          // Emphasis
    }]
  }],

  // Book II: Melody - Pitch and intervals
  bookII_melodySystems: [{
    systemId: "melody-1",
    pitchCycle: {
      modulus: 12,         // Chromatic scale
      roots: [0, 4, 7]     // C major chord tones
    },
    intervalSeed: [2, 2, 1] // Whole, whole, half
  }],

  // Book III: Harmony - Chords and progressions
  bookIII_harmonySystems: [{
    systemId: "harmony-1",
    intervalDistribution: {
      intervals: [7, 5, 4], // P5, M3, m3
      weights: [0.5, 0.3, 0.2]
    }
  }],

  // Book IV: Form - Song structure
  bookIV_formSystem: {
    formType: "sectional",
    sections: [{
      sectionId: "A",
      lengthBars: 8,
      systemsBinding: ["rhythm-1", "melody-1", "harmony-1"]
    }]
  },

  // Book V: Orchestration - Instruments and ensembles
  bookV_orchestration: {
    ensembleId: "ensemble-1",
    voices: [{
      id: "voice-1",
      name: "Piano",
      rolePools: [{
        role: "primary",
        functionalClass: "foundation",
        enabled: true
      }]
    }]
  }
};
```

### Step 3: Validate Theory

Before realizing, validate your theory for errors:

```typescript
const validation = await validate(song);

if (!validation.valid) {
  console.error("Theory validation failed:");
  validation.errors.forEach(error => {
    console.error(`- ${error.category}: ${error.message}`);
  });
  process.exit(1);
}

console.log("✓ Theory is valid");
```

### Step 4: Realize the Song

Transform theory into executable notes with a seed for determinism:

```typescript
const seed = 12345; // Any number, same seed = same output

const { songModel, derivationRecord } = await realize(song, seed);

console.log(`Generated ${songModel.notes.length} notes`);
console.log(`Duration: ${songModel.durationBars} bars`);
```

### Step 5: Explore the Result

The realized song model contains all the musical data:

```typescript
// Access notes
songModel.notes.forEach(note => {
  console.log(`Note: ${note.pitch} at ${note.startBeat}s`);
});

// Export to MIDI (example)
import { exportToMidi } from '@schillinger-sdk/core-v1';

const midiBuffer = exportToMidi(songModel);
// Save midiBuffer to file...
```

## Understanding the Architecture

### Theory (SchillingerSong_v1)

The theory layer describes **what** you want musically using Schillinger's concepts:

- **Book I (Rhythm)**: When notes occur (attack patterns, generators)
- **Book II (Melody)**: What pitches occur (pitch cycles, intervals)
- **Book III (Harmony)**: How pitches combine (chords, progressions)
- **Book IV (Form)**: How sections are structured (ABA, rondo, etc.)
- **Book V (Orchestration)**: Which instruments play (ensembles, voices)

### Realization (SongModel_v1)

The realization layer produces **executable music** from theory:

- Notes with precise timing and pitch
- Velocity and articulation
- Voice assignments
- Complete derivations showing how each note was generated

### Determinism

**Critical Property**: Same theory + same seed = identical results

```typescript
const seed = 12345;

const result1 = await realize(song, seed);
const result2 = await realize(song, seed);

// These are bit-for-bit identical
assert.deepEqual(result1, result2);
```

This enables:
- Cross-platform consistency
- Collaborative editing
- Version control for music
- Regression testing

## Round-Tip Editing

The SDK supports editing realized songs and reconciling back to theory:

```typescript
// 1. Realize original
const { songModel } = await realize(song, seed);

// 2. Edit the realized model (e.g., in DAW)
songModel.notes[0].velocity = 127;
songModel.notes[0].pitch += 2; // Transpose up 2 semitones

// 3. Reconcile back to theory
const report = await reconcile(song, songModel);

console.log(`Confidence: ${report.confidenceSummary.overall}`);
console.log(`Notes preserved: ${report.derivationLoss.preservedNotes} / ${songModel.notes.length}`);

if (report.confidenceSummary.overall > 0.8) {
  // High confidence - accept the update
  song = report.proposedUpdate;
} else {
  // Low confidence - manual review needed
  console.warn("Low reconciliation confidence - manual review required");
}
```

## Next Steps

### Learning Resources

- **API Documentation**: See `api.md` for complete API reference
- **Integration Guide**: See `integration.md` for platform-specific setup
- **Examples**: Check `docs/examples/` for complete working examples

### Common Patterns

#### Multiple Rhythm Systems

```typescript
bookI_rhythmSystems: [
  { systemId: "bass", generators: [{ period: 4, phase: 0 }] },
  { systemId: "drums", generators: [{ period: 2, phase: 0 }] },
  { systemId: "lead", generators: [{ period: 8, phase: 2 }] }
]
```

#### Sectional Form

```typescript
bookIV_formSystem: {
  formType: "sectional",
  sections: [
    { sectionId: "A", lengthBars: 8, systemsBinding: ["rhythm-1", "melody-1"] },
    { sectionId: "B", lengthBars: 8, systemsBinding: ["rhythm-2", "melody-2"] },
    { sectionId: "A'", lengthBars: 8, systemsBinding: ["rhythm-1", "melody-1"] }
  ]
}
```

#### Ensemble Configuration

```typescript
bookV_orchestration: {
  ensembleId: "rock-band",
  voices: [
    { id: "drums", name: "Drums", rolePools: [{ role: "primary", functionalClass: "foundation" }] },
    { id: "bass", name: "Bass", rolePools: [{ role: "secondary", functionalClass: "foundation" }] },
    { id: "guitar", name: "Guitar", rolePools: [{ role: "primary", functionalClass: "motion" }] },
    { id: "vocals", name: "Vocals", rolePools: [{ role: "primary", functionalClass: "ornament" }] }
  ]
}
```

## Troubleshooting

### Validation Errors

Most errors come from invalid theory parameters:

```typescript
// Error: Generator period out of range
generators: [{ period: 20 }] // Must be 1-16

// Fix: Use valid range
generators: [{ period: 12 }]
```

### Empty Realization

If realization produces no notes:

```typescript
// Check systems are bound to sections
bookIV_formSystem: {
  sections: [{
    systemsBinding: ["rhythm-1"] // Must match systemId
  }]
}
```

### Low Reconciliation Confidence

Common causes:
- Too many edits (edit in smaller batches)
- Conflicting edits (same note edited twice)
- Theory mismatch (editing outside theory bounds)

## Best Practices

1. **Always validate** before realizing
2. **Use consistent seeds** for reproducibility
3. **Save theory files** (they're small and human-readable)
4. **Version control theory** (track musical decisions)
5. **Test reconciliation** after major edits
6. **Keep systems simple** (complexity doesn't = better music)

## Getting Help

- **Issues**: Report bugs at GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: Check `docs/` for detailed guides

## What's Next?

- Explore the [API documentation](api.md)
- Learn about [integration patterns](integration.md)
- Try the [examples](docs/examples/)
