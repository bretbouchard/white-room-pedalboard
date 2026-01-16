# Quickstart Guide: Schillinger SDK v1

**Version**: 1.0
**Last Updated**: 2025-01-07

---

## Installation

### TypeScript / JavaScript

```bash
npm install @schillinger/sdk
```

```typescript
import {
  SchillingerSong,
  realize,
  reconcile,
  validate
} from '@schillinger/sdk';
```

### Dart

```bash
flutter pub add schillinger_sdk
```

```dart
import 'package:schillinger_sdk/schillinger_sdk.dart';
```

---

## Basic Workflow

### 1. Create a SchillingerSong

Start with a simple song using rhythm systems:

```typescript
import { v4 as uuidv4 } from 'uuid';

const song = {
  schemaVersion: "1.0",
  songId: uuidv4(),
  globals: {
    tempo: 120,
    timeSignature: [4, 4],
    key: 0, // C major
  },
  bookI_rhythmSystems: [
    {
      systemId: uuidv4(),
      systemType: "rhythm",
      generators: [
        { period: 3, phase: 0 },
        { period: 4, phase: 0 },
      ],
      resultantSelection: {
        method: "interference",
      },
      permutations: [],
      accentDisplacement: [],
      densityConstraints: {
        constraintId: uuidv4(),
        scope: "system",
        minAttacksPerMeasure: 2,
        maxAttacksPerMeasure: 8,
      },
      quantizationConstraint: {
        constraintId: uuidv4(),
        grid: 0.25, // Sixteenth notes
        allowOffset: false,
      },
    },
  ],
  bookII_melodySystems: [],
  bookIII_harmonySystems: [],
  bookIV_formSystem: null,
  bookV_orchestration: {
    systemId: uuidv4(),
    systemType: "orchestration",
    roles: [
      {
        roleId: uuidv4(),
        roleName: "primary",
        priority: "primary",
        functionalClass: "motion",
        yieldTo: [],
      },
    ],
    registerSystem: {
      systemId: uuidv4(),
      roleRegisters: [
        {
          roleId: "primary-role-id",
          minPitch: 48, // C3
          maxPitch: 84, // C6
        },
      ],
    },
    spacingSystem: {
      systemId: uuidv4(),
      minSpacing: [],
      maxSpacing: [],
      crossingRules: [],
    },
    densitySystem: {
      systemId: uuidv4(),
      roleDensity: [
        {
          roleId: "primary-role-id",
          densityBudget: 0.7,
          couplingRules: [],
        },
      ],
    },
    doublingRules: [],
    reinforcementRules: [],
    splitRules: [],
    mergeRules: [],
    formOrchestration: [],
  },
  ensembleModel: {
    voices: [
      {
        voiceId: uuidv4(),
        voiceName: "Piano",
        rolePool: ["primary-role-id"],
        registerRange: {
          minPitch: 21, // A0
          maxPitch: 108, // C8
        },
      },
    ],
    groups: [],
    balanceRules: [],
  },
  bindings: {
    roleRhythmBindings: [],
    roleMelodyBindings: [],
    roleHarmonyBindings: [],
    roleEnsembleBindings: [
      {
        bindingId: uuidv4(),
        roleId: "primary-role-id",
        voiceId: "piano-voice-id",
      },
    ],
  },
  constraints: [],
  provenance: {
    createdAt: new Date().toISOString(),
    createdBy: "user-123",
    modifiedAt: new Date().toISOString(),
    derivationChain: [],
  },
};
```

### 2. Realize to SongModel

Convert the theory into actual notes:

```typescript
const { songModel, derivationRecord } = await realize(song, 42);

console.log(`Generated ${songModel.notes.length} notes`);
console.log(`Duration: ${songModel.duration} beats`);
```

### 3. Play or Export

```typescript
// Play using web audio
import { play } from '@schillinger/sdk/web-audio';
await play(songModel);

// Export to MusicXML
import { exportToMusicXML } from '@schillinger/sdk/export';
const musicXML = await exportToMusicXML(songModel);
console.log(musicXML);

// Export to MIDI
import { exportToMIDI } from '@schillinger/sdk/export';
const midi = await exportToMIDI(songModel);
```

### 4. Edit and Reconcile

Make manual edits and update the theory:

```typescript
// Edit the song model
songModel.notes[0].velocity = 100; // Make first note louder
songModel.notes[1].pitch += 2;     // Transpose second note up

// Reconcile edits back to theory
const report = await reconcile(song, songModel);

// Check confidence
console.log(`Overall confidence: ${report.confidenceSummary.overall}`);
console.log(`Rhythm confidence: ${report.confidenceSummary.byBook.rhythm}`);

// Review suggested actions
report.suggestedActions.forEach(action => {
  console.log(`${action.actionType}: ${action.reason}`);
});

// Accept updates if confident
if (report.confidenceSummary.overall > 0.8) {
  song = report.proposedUpdate;
  console.log("Song updated successfully");
}
```

---

## Advanced Usage

### Cross-Platform Consistency

**Same seed produces identical results:**

```typescript
// TypeScript
const seed = 12345;
const { songModel: tsModel } = await realize(song, seed);

// Dart (via FFI)
final result = await SchillingerSDK.realize(song, seed);
final dartModel = result.songModel;

// Models are byte-for-byte identical
assert(identical(tsModel, dartModel));
```

### Working with All Five Books

#### Book I: Rhythm

```typescript
const rhythmSystem = {
  systemId: uuidv4(),
  systemType: "rhythm",
  generators: [
    { period: 2, phase: 0, weight: 1.0 },
    { period: 3, phase: 0, weight: 1.0 },
  ],
  resultantSelection: { method: "interference" },
  permutations: [
    {
      ruleId: uuidv4(),
      type: "rotation",
      period: 4,
      amount: 1,
    },
  ],
  accentDisplacement: [],
  densityConstraints: {
    constraintId: uuidv4(),
    scope: "system",
    minAttacksPerMeasure: 3,
    maxAttacksPerMeasure: 12,
  },
  quantizationConstraint: {
    constraintId: uuidv4(),
    grid: 0.25,
    allowOffset: false,
  },
};
```

#### Book II: Melody

```typescript
const melodySystem = {
  systemId: uuidv4(),
  systemType: "melody",
  cycleLength: 12, // mod 12 (chromatic)
  intervalSeed: [2, 2, 3, 2, 3], // Major scale intervals
  rotationRule: {
    ruleId: uuidv4(),
    type: "cyclic",
    interval: 4,
    amount: 1,
  },
  expansionRules: [],
  contractionRules: [],
  contourConstraints: {
    constraintId: uuidv4(),
    type: "ascending",
    maxIntervalLeaps: 5,
  },
  directionalBias: 0.3, // Slightly ascending
  registerConstraints: {
    constraintId: uuidv4(),
    minPitch: 60,
    maxPitch: 84,
    allowTransposition: true,
  },
};
```

#### Book III: Harmony

```typescript
const harmonySystem = {
  systemId: uuidv4(),
  systemType: "harmony",
  distribution: [
    0,  // Unison (rare)
    5,  // Minor second
    0,  // Major second
    8,  // Minor third
    10, // Major third
    0,  // Perfect fourth
    5,  // Tritone
    10, // Perfect fifth
    3,  // Minor sixth
    5,  // Major sixth
    2,  // Minor seventh
    10, // Major seventh
  ],
  harmonicRhythmBinding: "rhythm-system-id",
  voiceLeadingConstraints: [
    {
      constraintId: uuidv4(),
      maxIntervalLeap: 5,
      avoidParallels: true,
      preferredMotion: "contrary",
    },
  ],
  resolutionRules: [],
};
```

#### Book IV: Form

```typescript
const formSystem = {
  systemId: uuidv4(),
  systemType: "form",
  ratioTree: [1, 1, 2], // A : A : B (binary with repeat)
  nestedPeriodicity: [],
  reuseRules: [
    {
      ruleId: uuidv4(),
      sourceSection: "A",
      targetSection: "B",
      transformation: "transpose",
    },
  ],
  transformationReferences: [],
  cadenceConstraints: [
    {
      constraintId: uuidv4(),
      sectionId: "B",
      type: "authentic",
    },
  ],
  symmetryRules: [],
};
```

#### Book V: Orchestration

```typescript
const orchestrationSystem = {
  systemId: uuidv4(),
  systemType: "orchestration",
  roles: [
    {
      roleId: uuidv4(),
      roleName: "bass",
      priority: "primary",
      functionalClass: "foundation",
      yieldTo: [],
    },
    {
      roleId: uuidv4(),
      roleName: "melody",
      priority: "primary",
      functionalClass: "motion",
      yieldTo: [],
    },
    {
      roleId: uuidv4(),
      roleName: "accompaniment",
      priority: "secondary",
      functionalClass: "reinforcement",
      yieldTo: ["melody-role-id", "bass-role-id"],
    },
  ],
  registerSystem: {
    systemId: uuidv4(),
    roleRegisters: [
      {
        roleId: "bass-role-id",
        minPitch: 36,
        maxPitch: 60,
      },
      {
        roleId: "melody-role-id",
        minPitch: 60,
        maxPitch: 84,
      },
      {
        roleId: "accompaniment-role-id",
        minPitch: 48,
        maxPitch: 72,
      },
    ],
  },
  spacingSystem: {
    systemId: uuidv4(),
    minSpacing: [],
    maxSpacing: [],
    crossingRules: [],
  },
  densitySystem: {
    systemId: uuidv4(),
    roleDensity: [
      {
        roleId: "bass-role-id",
        densityBudget: 0.5,
        couplingRules: [],
      },
      {
        roleId: "melody-role-id",
        densityBudget: 0.8,
        couplingRules: [],
      },
      {
        roleId: "accompaniment-role-id",
        densityBudget: 0.3,
        couplingRules: [
          {
            ruleId: uuidv4(),
            targetRoleId: "melody-role-id",
            type: "inverse", // Decrease when melody increases
            amount: 0.5,
          },
        ],
      },
    ],
  },
  doublingRules: [
    {
      ruleId: uuidv4(),
      sourceVoiceId: "bass-voice-id",
      targetVoiceId: "accompaniment-voice-id",
      interval: 12, // Octave doubling
      conditional: true,
      trigger: "accent",
    },
  ],
  reinforcementRules: [],
  splitRules: [],
  mergeRules: [],
  formOrchestration: [],
};
```

### Ensemble Configuration

```typescript
const ensembleModel = {
  voices: [
    {
      voiceId: uuidv4(),
      voiceName: "Grand Piano - Left",
      rolePool: ["bass-role-id", "accompaniment-role-id"],
      registerRange: {
        minPitch: 21,
        maxPitch: 60,
      },
    },
    {
      voiceId: uuidv4(),
      voiceName: "Grand Piano - Right",
      rolePool: ["melody-role-id", "accompaniment-role-id"],
      registerRange: {
        minPitch: 48,
        maxPitch: 108,
      },
    },
  ],
  groups: [
    {
      groupId: uuidv4(),
      groupName: "Piano",
      voiceIds: ["left-voice-id", "right-voice-id"],
      balanceRules: [],
    },
  ],
  balanceRules: [
    {
      ruleId: uuidv4(),
      type: "relative",
      target: "melody-role-id",
      reference: "accompaniment-role-id",
      ratio: 1.5, // Melody 1.5x louder than accompaniment
    },
  ],
};
```

### Role Bindings

```typescript
const bindings = {
  roleRhythmBindings: [
    {
      bindingId: uuidv4(),
      roleId: "melody-role-id",
      rhythmSystemId: "rhythm-system-id",
      voiceId: "right-voice-id",
      priority: 10,
    },
    {
      bindingId: uuidv4(),
      roleId: "bass-role-id",
      rhythmSystemId: "rhythm-system-id",
      voiceId: "left-voice-id",
      priority: 8,
    },
  ],
  roleMelodyBindings: [
    {
      bindingId: uuidv4(),
      roleId: "melody-role-id",
      melodySystemId: "melody-system-id",
      voiceId: "right-voice-id",
      priority: 10,
    },
  ],
  roleHarmonyBindings: [],
  roleEnsembleBindings: [
    {
      bindingId: uuidv4(),
      roleId: "melody-role-id",
      voiceId: "right-voice-id",
    },
    {
      bindingId: uuidv4(),
      roleId: "bass-role-id",
      voiceId: "left-voice-id",
    },
    {
      bindingId: uuidv4(),
      roleId: "accompaniment-role-id",
      voiceId: "right-voice-id",
    },
    {
      bindingId: uuidv4(),
      roleId: "accompaniment-role-id",
      voiceId: "left-voice-id",
    },
  ],
};
```

---

## Custom Constraints

Add density, register, or custom constraints:

```typescript
song.constraints.push({
  constraintId: uuidv4(),
  type: "density",
  scope: {
    type: "system",
    targetId: "rhythm-system-id",
  },
  parameters: {
    minNotes: 4,
    maxNotes: 16,
  },
  enabled: true,
});

song.constraints.push({
  constraintId: uuidv4(),
  type: "register",
  scope: {
    type: "voice",
    targetId: "melody-voice-id",
  },
  parameters: {
    avoidExtremes: true,
    centerBias: 0.7,
  },
  enabled: true,
});
```

---

## Derivation Inspection

Trace any note back to its source:

```typescript
// Find derivation info for a specific note
const note = songModel.notes[0];
const derivation = derivationRecord.outputs.find(
  (output) => output.noteIds.includes(note.noteId)
);

if (derivation) {
  console.log(`Note generated by: ${derivation.systemId}`);
  console.log(`System type: ${derivation.outputType}`);
  console.log(`Parameters used:`, derivation.parameters);
  console.log(`Constraints applied:`, derivation.constraints);
}
```

---

## Validation

Validate songs before realization:

```typescript
const validation = await validate(song);

if (!validation.valid) {
  console.error("Validation errors:");
  validation.errors.forEach((error) => {
    console.error(`- ${error.path}: ${error.message}`);
  });
}

console.log("Validation warnings:");
validation.warnings.forEach((warning) => {
  console.warn(`- ${warning.path}: ${warning.message}`);
});
```

---

## Configuration

Configure reconciliation thresholds:

```typescript
import { configureReconciliation } from '@schillinger/sdk';

configureReconciliation({
  thresholds: {
    rhythm: { autoAccept: 0.90, suggest: 0.80 },
    melody: { autoAccept: 0.85, suggest: 0.70 },
    harmony: { autoAccept: 0.85, suggest: 0.70 },
    form: { autoAccept: 0.95, suggest: 0.85 },
    orchestration: { autoAccept: 0.70, suggest: 0.60 },
  },
});
```

---

## Error Handling

Handle common errors:

```typescript
try {
  const { songModel, derivationRecord } = await realize(song, seed);
} catch (error) {
  if (error.code === 'INVALID_SCHEMA') {
    console.error("Song schema validation failed:", error.details);
  } else if (error.code === 'CONSTRAINT_CONFLICT') {
    console.error("Constraints cannot be satisfied:", error.conflicts);
  } else if (error.code === 'REALIZATION_ERROR') {
    console.error("Realization failed:", error.message);
  }
}

try {
  const report = await reconcile(song, editedModel);
} catch (error) {
  if (error.code === 'INVALID_MODEL') {
    console.error("Edited model validation failed:", error.details);
  } else if (error.code === 'DERIVATION_NOT_FOUND') {
    console.error("No derivation link between song and model");
  } else if (error.code === 'UNRECONCILABLE') {
    console.error("Destructive edits cannot be processed:", error.losses);
  }
}
```

---

## Tips and Best Practices

### 1. Start Simple

Begin with just Book I (rhythm), then add other books incrementally:

```typescript
// Minimal song
const minimalSong = {
  // ... metadata
  bookI_rhythmSystems: [simpleRhythmSystem],
  bookII_melodySystems: [],
  bookIII_harmonySystems: [],
  bookIV_formSystem: null,
  bookV_orchestration: minimalOrchestration,
  ensembleModel: minimalEnsemble,
  bindings: minimalBindings,
  constraints: [],
};
```

### 2. Use Descriptive Names

Name systems, roles, and voices clearly:

```typescript
{
  systemId: uuidv4(),
  systemType: "rhythm",
  // Add a name for debugging
  name: "Main Rhythm - 3:4 Resultant",
}
```

### 3. Save Derivation Records

Keep derivation records for reproducibility:

```typescript
const { songModel, derivationRecord } = await realize(song, seed);

// Save for later
await saveToFile(derivationRecord, 'derivation.json');
```

### 4. Test Reconciliation Confidence

Always check confidence before accepting updates:

```typescript
const report = await reconcile(song, editedModel);

if (report.confidenceSummary.overall < 0.7) {
  console.warn("Low confidence - manual review recommended");
  // Show user what changed
  report.systemMatches.forEach((match) => {
    console.log(`${match.systemId}: ${match.confidence * 100}% confidence`);
  });
}
```

### 5. Leverage Constraints

Use constraints to guide realization toward desired outcomes:

```typescript
// Ensure sparse texture
song.constraints.push({
  constraintId: uuidv4(),
  type: "density",
  scope: { type: "global" },
  parameters: { maxNotesPerMeasure: 4 },
  enabled: true,
});

// Force ascending motion
song.constraints.push({
  constraintId: uuidv4(),
  type: "contour",
  scope: { type: "system", targetId: "melody-system-id" },
  parameters: { direction: "ascending" },
  enabled: true,
});
```

---

## Complete Example

Putting it all together:

```typescript
import {
  SchillingerSong,
  realize,
  reconcile,
  validate,
  exportToMusicXML
} from '@schillinger/sdk';
import { v4 as uuidv4 } from 'uuid';

async function composeSong() {
  // 1. Create song
  const song = createCompleteSong();

  // 2. Validate
  const validation = await validate(song);
  if (!validation.valid) {
    throw new Error(`Invalid song: ${validation.errors}`);
  }

  // 3. Realize
  const seed = Math.floor(Math.random() * 2**32);
  const { songModel, derivationRecord } = await realize(song, seed);
  console.log(`Generated ${songModel.notes.length} notes`);

  // 4. Export
  const musicXML = await exportToMusicXML(songModel);
  console.log("Exported to MusicXML");

  // 5. Edit (user modifies songModel in DAW)
  const editedModel = await userEditsInDAW(songModel);

  // 6. Reconcile
  const report = await reconcile(song, editedModel);
  console.log(`Reconciliation confidence: ${report.confidenceSummary.overall}`);

  // 7. Update if confident
  if (report.confidenceSummary.overall > 0.8) {
    song = report.proposedUpdate;
    console.log("Song updated from edits");
  } else {
    console.warn("Low confidence - edits kept decorative only");
  }

  return song;
}

function createCompleteSong(): SchillingerSong_v1 {
  // ... (complete song definition)
}
```

---

## Further Reading

- **Data Model**: See `data-model.md` for complete entity definitions
- **API Contracts**: See `contracts/` for detailed API specifications
- **Research**: See `research.md` for technical decisions and rationale
- **Implementation Plan**: See `plan.md` for development roadmap

---

## Support

- **Documentation**: https://docs.schillinger.sdk
- **Issues**: https://github.com/schillinger/sdk/issues
- **Discussions**: https://github.com/schillinger/sdk/discussions
