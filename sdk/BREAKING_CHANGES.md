# Breaking Changes & Migration Guide

**Schillinger SDK v1.0.0-alpha.1 → System-First Rewrite**

This document outlines breaking changes, migration paths, and transition requirements for upgrading to the new theory-first architecture.

---

## Executive Summary

### What Changed

The SDK has been refactored from a **pattern-based authoring system** to a **theory-first composition system**. Songs are now authored using Schillinger systems (Book I-V) rather than direct note patterns.

### Why It Changed

- **Separation of Concerns**: Theory (systems) vs. realization (notes) are now separate
- **Determinism**: Seed-based generation ensures reproducible compositions
- **Editability**: Round-trip editing enables both theory and note-level editing
- **Explainability**: Every musical decision is traceable to its source system

### Impact Level

🔴 **CRITICAL BREAKING CHANGES** - Requires code migration
- Song authoring API completely changed
- Direct note editing replaced with round-trip workflow
- New required fields in all song objects

---

## Table of Contents

1. [Critical Breaking Changes](#critical-breaking-changes)
2. [API Changes](#api-changes)
3. [Schema Changes](#schema-changes)
4. [Migration Guide](#migration-guide)
5. [New Features](#new-features)
6. [Deprecations](#deprecations)
7. [Transition Timeline](#transition-timeline)

---

## Critical Breaking Changes

### 1. Song Model Split

**Before (v0.x)**:
```typescript
// Single unified model
interface Song {
  id: string;
  notes: Note[];
  patterns: Pattern[];
  metadata: Metadata;
}
```

**After (v1.0)**:
```typescript
// TWO separate models
interface SchillingerSong_v1 {
  // Theory only - NO notes
  bookI_rhythmSystems: RhythmSystem[];
  bookII_melodySystems: MelodySystem[];
  bookIII_harmonySystems: HarmonySystem[];
  bookIV_formSystem: FormSystem | null;
  bookV_orchestration: OrchestrationSystem;
  // ... other theory fields
}

interface SongModel_v1 {
  // Notes only - derived from theory
  notes: Note[];
  derivationId: string;  // Links to theory
  // ... note-level fields
}
```

**Migration Required**:
- ❌ Can no longer create songs with notes directly
- ✅ Must create theory first, then realize to notes
- ✅ See [Migration Guide](#migration-guide) below

---

### 2. Authoring Workflow Change

**Before**:
```typescript
import { Song } from '@schillinger-sdk/core';

// Author notes directly
const song = new Song({
  id: 'my-song',
  notes: [
    { pitch: 60, time: 0, duration: 1, velocity: 80 },
    { pitch: 62, time: 1, duration: 1, velocity: 80 },
    { pitch: 64, time: 2, duration: 1, velocity: 80 },
  ]
});
```

**After**:
```typescript
import { realizeSong } from '@schillinger-sdk/core';

// Step 1: Author theory
const theorySong: SchillingerSong_v1 = {
  schemaVersion: '1.0',
  songId: 'my-song',
  globals: { tempo: 120, timeSignature: [4, 4], key: 0 },
  bookI_rhythmSystems: [{
    systemId: 'rhythm-1',
    generators: [
      { period: 3, phase: 0, weight: 1.0 },
      { period: 4, phase: 0, weight: 1.0 },
    ],
  }],
  bookII_melodySystems: [{
    systemId: 'melody-1',
    rhythmBinding: 'rhythm-1',
    pitchCycle: { modulus: 12, seedSet: [0, 2, 4, 5, 7, 9, 11] },
  }],
  // ... required fields
};

// Step 2: Realize to notes
const { songModel, derivation } = realizeSong(theorySong, 42);
```

**Breaking Changes**:
- ❌ `new Song()` constructor removed
- ❌ Direct note authoring removed
- ✅ Theory-first authoring required
- ✅ Deterministic realization with seeds

---

### 3. Direct Editing No Longer Supported

**Before**:
```typescript
// Edit notes directly
song.notes[0].pitch = 64;
song.notes.push({ pitch: 67, time: 3, duration: 1, velocity: 80 });
saveSong(song);
```

**After**:
```typescript
import { classifyEdits, reconcile } from '@schillinger-sdk/core';

// Step 1: Realize theory
const { songModel: originalModel, derivation } = realizeSong(theorySong, 42);

// Step 2: Edit realized model
const editedModel = {
  ...originalModel,
  notes: [
    { ...originalModel.notes[0], pitch: 64 },
    ...originalModel.notes.slice(1),
    { pitch: 67, time: 3, duration: 1, velocity: 80 },
  ],
};

// Step 3: Classify edits
const classification = classifyEdits(originalModel, editedModel, derivation);

// Step 4: Reconcile back to theory
const result = reconcile(theorySong, originalModel, editedModel, derivation, classification);

// Step 5: Handle result
if (result.success) {
  // Edit was reconciled - use updated theory
  saveSong(result.updatedSong);
} else {
  // Edit couldn't be reconciled - handle loss
  console.error('Edit rejected:', result.report.rejectedEdits);
}
```

**Breaking Changes**:
- ❌ Direct note mutation removed
- ❌ Automatic save on edit removed
- ✅ Round-trip editing required
- ✅ Explicit reconciliation with loss reporting

---

## API Changes

### Removed APIs

```typescript
// ❌ REMOVED
class Song { /* ... */ }
class Pattern { /* ... */ }
class NoteGenerator { /* ... */ }

function generateNotes(pattern: Pattern): Note[] { }
function validatePattern(pattern: Pattern): boolean { }
function exportMIDI(song: Song): Blob { }
```

### New APIs

```typescript
// ✅ NEW - Theory Authoring
interface SchillingerSong_v1 { /* theory fields */ }
interface RhythmSystem { /* ... */ }
interface MelodySystem { /* ... */ }
interface HarmonySystem { /* ... */ }
interface FormSystem { /* ... */ }
interface OrchestrationSystem { /* ... */ }

// ✅ NEW - Realization
function realizeSong(song: SchillingerSong_v1, seed: number): {
  songModel: SongModel_v1;
  derivation: DerivationRecord;
}

// ✅ NEW - Round-Trip Editing
function classifyEdits(
  original: SongModel_v1,
  edited: SongModel_v1,
  derivation: DerivationRecord
): EditClassification

function reconcile(
  originalSong: SchillingerSong_v1,
  originalModel: SongModel_v1,
  editedModel: SongModel_v1,
  derivation: DerivationRecord,
  classification: EditClassification,
  options?: ReconciliationOptions
): ReconciliationResult
```

### Changed APIs

```typescript
// 🔄 CHANGED - Signature updated
// Before: saveSong(song: Song): Promise<void>
// After: saveSong(song: SchillingerSong_v1): Promise<void>

// 🔄 CHANGED - New required fields
// Before: { id, notes, patterns }
// After: { songId, schemaVersion, globals, bookI-V_*, ensembleModel, bindings, constraints, provenance }
```

---

## Schema Changes

### SchillingerSong_v1 Required Fields

**All songs MUST include these fields**:

```typescript
interface SchillingerSong_v1 {
  // Metadata (REQUIRED)
  readonly schemaVersion: "1.0";
  readonly songId: string;  // UUID v4

  // Global Parameters (REQUIRED)
  globals: {
    tempo: number;          // 40-300 BPM
    timeSignature: [number, number];  // [numerator, denominator]
    key: number;           // 0-11 pitch class
  };

  // Systems (ALL REQUIRED, can be empty arrays)
  bookI_rhythmSystems: RhythmSystem[];
  bookII_melodySystems: MelodySystem[];
  bookIII_harmonySystems: HarmonySystem[];
  bookIV_formSystem: FormSystem | null;
  bookV_orchestration: OrchestrationSystem;  // NOT nullable

  // Ensemble & Bindings (REQUIRED)
  ensembleModel: EnsembleModel;
  bindings: {
    roleRhythmBindings: RoleRhythmBinding[];
    roleMelodyBindings: RoleMelodyBinding[];
    roleHarmonyBindings: RoleHarmonyBinding[];
    roleEnsembleBindings: RoleEnsembleBinding[];
  };

  // Constraints & Provenance (REQUIRED)
  constraints: Constraint[];
  provenance: {
    readonly createdAt: string;      // ISO 8601
    readonly createdBy: string;      // User/system ID
    readonly modifiedAt: string;     // ISO 8601
    readonly derivationChain: string[];
  };
}
```

### Field Name Changes

| Old Name (v0.x) | New Name (v1.0) | Notes |
|----------------|----------------|-------|
| `id` | `songId` | UUID format enforced |
| `metadata` | `provenance` | New structure |
| `patterns` | `bookI_rhythmSystems` | Split into separate arrays |
| N/A | `bookII_melodySystems` | **NEW** - Melody systems |
| N/A | `bookIII_harmonySystems` | **NEW** - Harmony systems |
| N/A | `bookIV_formSystem` | **NEW** - Form system |
| `orchestration` | `bookV_orchestration` | Renamed |
| N/A | `ensembleModel` | **NEW** - Required |
| N/A | `bindings` | **NEW** - Required |
| N/A | `constraints` | **NEW** - Required |

### New Required Sub-Objects

**1. EnsembleModel** (previously optional):
```typescript
interface EnsembleModel {
  ensembleId: string;
  description?: string;
  voicePools: VoicePool[];
  groupingRules?: GroupingRule[];
}
```

**2. Bindings** (new):
```typescript
interface Bindings {
  roleRhythmBindings: RoleRhythmBinding[];
  roleMelodyBindings: RoleMelodyBinding[];
  roleHarmonyBindings: RoleHarmonyBinding[];
  roleEnsembleBindings: RoleEnsembleBinding[];
}
```

**3. Provenance** (renamed from metadata):
```typescript
interface Provenance {
  readonly createdAt: string;      // ISO 8601
  readonly createdBy: string;      // User/system ID
  readonly modifiedAt: string;     // ISO 8601
  readonly derivationChain: string[];  // Track song lineage
}
```

---

## Migration Guide

### Step 1: Update Song Creation

**Old Code**:
```typescript
const song = {
  id: 'my-song',
  notes: generateNotes(pattern),
  metadata: {
    title: 'My Song',
    createdAt: new Date().toISOString(),
  }
};
```

**New Code**:
```typescript
const song: SchillingerSong_v1 = {
  schemaVersion: '1.0',
  songId: generateUUID(),  // Use UUID v4
  globals: {
    tempo: 120,
    timeSignature: [4, 4],
    key: 0,
  },
  bookI_rhythmSystems: [],  // Can be empty initially
  bookII_melodySystems: [],
  bookIII_harmonySystems: [],
  bookIV_formSystem: null,
  bookV_orchestration: createDefaultOrchestration(),
  ensembleModel: createDefaultEnsemble(),
  bindings: {
    roleRhythmBindings: [],
    roleMelodyBindings: [],
    roleHarmonyBindings: [],
    roleEnsembleBindings: [],
  },
  constraints: [],
  provenance: {
    createdAt: new Date().toISOString(),
    createdBy: 'user-123',
    modifiedAt: new Date().toISOString(),
    derivationChain: [],
  },
};
```

### Step 2: Replace Note Generation

**Old Code**:
```typescript
import { generateNotes } from '@schillinger-sdk/core';

const notes = generateNotes(pattern);
song.notes = notes;
```

**New Code**:
```typescript
import { realizeSong } from '@schillinger-sdk/core';

// Add rhythm system
song.bookI_rhythmSystems.push({
  systemId: generateUUID(),
  generators: [
    { period: 3, phase: 0, weight: 1.0 },
    { period: 4, phase: 0, weight: 1.0 },
  ],
  resultantRules: [],
  accentPatterns: [],
});

// Realize to notes
const { songModel, derivation } = realizeSong(song, 42);
const notes = songModel.notes;
```

### Step 3: Update Edit Workflows

**Old Code**:
```typescript
function editNotePitch(song: Song, noteIndex: number, newPitch: number) {
  song.notes[noteIndex].pitch = newPitch;
  await saveSong(song);
}
```

**New Code**:
```typescript
async function editNotePitch(
  theorySong: SchillingerSong_v1,
  noteIndex: number,
  newPitch: number
) {
  // Realize current theory
  const { songModel: originalModel, derivation } = realizeSong(theorySong, 42);

  // Edit note
  const editedModel = {
    ...originalModel,
    notes: originalModel.notes.map((note, i) =>
      i === noteIndex ? { ...note, pitch: newPitch } : note
    ),
  };

  // Classify edit
  const classification = classifyEdits(originalModel, editedModel, derivation);

  // Reconcile
  const result = reconcile(theorySong, originalModel, editedModel, derivation, classification);

  if (result.success) {
    // Save updated theory
    await saveSong(result.updatedSong);
  } else {
    throw new Error(`Edit rejected: ${result.report.rejectedEdits[0].reason}`);
  }
}
```

### Step 4: Update Serialization

**Old Code**:
```typescript
const json = JSON.stringify(song);
const loaded = JSON.parse(json);
```

**New Code**:
```typescript
import { SchillingerSong } from '@schillinger-sdk/core';

// Serialize
const song = new SchillingerSong(theorySong);
const json = song.toJSON();

// Deserialize
const loaded = SchillingerSong.fromJSON(json);
```

### Step 5: Update Validation

**Old Code**:
```typescript
import { validateSong } from '@schillinger-sdk/core';

const isValid = validateSong(song);
```

**New Code**:
```typescript
import { validate, SchillingerSong } from '@schillinger-sdk/core';

const song = new SchillingerSong(theorySong);
const result = song.validate();

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

---

## New Features

### 1. Deterministic Realization

```typescript
// Same seed always produces same notes
const result1 = realizeSong(song, 42);
const result2 = realizeSong(song, 42);

expect(result1.songModel).toEqual(result2.songModel);

// Different seeds produce different results
const result3 = realizeSong(song, 123);
expect(result3.songModel).not.toEqual(result1.songModel);
```

### 2. Edit Classification

```typescript
const classification = classifyEdits(original, edited, derivation);

console.log(`Can reconcile: ${classification.canReconcile}`);
console.log(`Confidence: ${classification.overallConfidence}`);
console.log(`Ambiguity: ${classification.overallAmbiguity}`);
console.log(`Estimated loss: ${classification.estimatedLoss}`);

// Edit types
classification.edits.forEach(edit => {
  console.log(`${edit.type}: ${edit.description}`);
  console.log(`  Confidence: ${edit.confidence}`);
});
```

### 3. Loss Reporting

```typescript
const result = reconcile(song, original, edited, derivation, classification);

if (!result.success) {
  console.error('Reconciliation failed');
  console.error(`Total loss: ${(result.report.totalLoss * 100).toFixed(1)}%`);

  result.report.rejectedEdits.forEach(rejected => {
    console.error(`- ${rejected.edit.description}`);
    console.error(`  Reason: ${rejected.reason}`);
    console.error(`  Loss: ${(rejected.lostInformation * 100).toFixed(1)}%`);
  });
}
```

### 4. Dependency Resolution

```typescript
import { resolveExecutionOrder } from '@schillinger-sdk/core';

const plan = resolveExecutionOrder(song);

console.log(`Valid: ${plan.valid}`);
console.log(`Phases: ${plan.phases.length}`);

plan.phases.forEach((phase, i) => {
  console.log(`Phase ${i}: ${phase.join(', ')}`);
});
```

---

## Deprecations

### Deprecated in v1.0, Will Remove in v2.1

```typescript
// ⚠️ DEPRECATED - Use realizeSong() instead
function generateSong(patterns: Pattern[]): Song

// ⚠️ DEPRECATED - Use round-trip editing instead
function editNotes(song: Song, edits: NoteEdit[]): Song

// ⚠️ DEPRECATED - Use reconcile() instead
function applyEdits(song: Song, edits: Edit[]): Song

// ⚠️ DEPRECATED - Field renamed
interface Song {
  metadata: Metadata  // → provenance
}
```

### Migration Path for Deprecated APIs

| Deprecated API | Replacement | Timeline |
|---------------|-------------|----------|
| `generateSong()` | `realizeSong()` | Remove in v2.1 |
| `editNotes()` | Round-trip editing | Remove in v2.1 |
| `applyEdits()` | `reconcile()` | Remove in v2.1 |
| `song.metadata` | `song.provenance` | Remove in v2.1 |

---

## Transition Timeline

### Phase 1: Immediate (Required Now)

**Deadline**: Before upgrading to v1.0

✅ **Update song creation**:
- Add all required fields
- Use SchillingerSong_v1 schema
- Generate UUIDs for IDs

✅ **Replace note generation**:
- Use `realizeSong()` instead of `generateNotes()`
- Add rhythm/melody systems
- Use seeds for determinism

✅ **Update edit workflows**:
- Implement round-trip editing
- Handle reconciliation results
- Provide user feedback for rejected edits

### Phase 2: Short-term (Recommended Within 30 Days)

🔄 **Optimize theory authoring**:
- Create helper functions for common patterns
- Build theory-to-note converters
- Add validation at theory level

🔄 **Update serialization**:
- Use `SchillingerSong.toJSON()`
- Use `SchillingerSong.fromJSON()`
- Handle derivation records

🔄 **Update tests**:
- Test deterministic realization
- Test round-trip editing
- Test reconciliation scenarios

### Phase 3: Long-term (Complete Within 90 Days)

🎯 **Leverage new features**:
- Use seeds for version control
- Implement edit history tracking
- Build reconciliation UI

🎯 **Remove deprecated APIs**:
- Migrate away from deprecated functions
- Update all internal code
- Update third-party integrations

🎯 **Optimize performance**:
- Cache derivation records
- Parallelize system execution
- Optimize large song handling

---

## Rollback Plan

If issues arise during migration:

### Option 1: Stay on v0.x

```json
// package.json
{
  "dependencies": {
    "@schillinger-sdk/core": "0.9.0"
  }
}
```

**Support Timeline**: v0.x supported for 6 months after v1.0 release

### Option 2: Hybrid Approach

```typescript
// Keep v0.x for existing songs
import { Song as SongV0 } from '@schillinger-sdk/core-v0';

// Use v1.0 for new songs
import { SchillingerSong_v1, realizeSong } from '@schillinger-sdk/core';

// Migrate songs incrementally
function migrateSong(oldSong: SongV0): SchillingerSong_v1 {
  // Migration logic
}
```

### Option 3: Fork and Customize

If v1.0 doesn't meet requirements:
1. Fork the repository
2. Revert breaking changes locally
3. Maintain custom branch

**Not Recommended**: Will miss future updates and improvements

---

## Getting Help

### Documentation

- **Round-Trip Guide**: `docs/ROUND_TRIP_RECONCILIATION.md`
- **Architecture**: `docs/ARCHITECTURE_AUTHORITY.md`
- **API Reference**: `packages/core/README.md`

### Examples

```bash
# Clone examples repo
git clone https://github.com/bretbouchard/schillinger-sdk-examples.git

# See migration examples
cd examples/migration-guide
```

### Support Channels

- **GitHub Issues**: https://github.com/bretbouchard/schillinger-sdk/issues
- **Discussions**: https://github.com/bretbouchard/schillinger-sdk/discussions
- **Email**: support@schillinger-sdk.dev

### Migration Service

For enterprise customers, professional migration assistance is available:
- Code review and refactoring
- Test suite updates
- Performance optimization
- Team training

Contact: enterprise@schillinger-sdk.dev

---

## Checklist

Use this checklist to track your migration progress:

### Planning
- [ ] Read all documentation
- [ ] Assess current codebase impact
- [ ] Create migration plan
- [ ] Estimate timeline and resources

### Code Updates
- [ ] Update song creation
- [ ] Replace note generation
- [ ] Implement round-trip editing
- [ ] Update serialization
- [ ] Update validation

### Testing
- [ ] Unit tests updated
- [ ] Integration tests updated
- [ ] Manual testing completed
- [ ] Performance testing completed

### Deployment
- [ ] Staging deployment successful
- [ ] Rollback plan tested
- [ ] Production deployment scheduled
- [ ] Monitoring configured

### Post-Migration
- [ ] Team training completed
- [ ] Documentation updated
- [ ] Deprecated APIs removed
- [ ] Performance optimized

---

## Summary

The system-first rewrite represents a **significant architectural improvement** but requires **substantial migration effort**.

### Key Points

1. **Breaking changes are extensive** - Plan for 2-4 weeks migration time
2. **New capabilities are powerful** - Determinism, explainability, editability
3. **Long-term benefits outweigh short-term pain** - Future-proof architecture
4. **Support is available** - Documentation, examples, and enterprise services

### Recommended Approach

1. **Start small** - Migrate non-critical songs first
2. **Test thoroughly** - Comprehensive test coverage is essential
3. **Communicate early** - Inform stakeholders of timeline and impact
4. **Leverage support** - Use available resources and assistance

---

**Version**: 1.0.0-alpha.1
**Last Updated**: 2025-01-07
**Author**: Schillinger SDK Development Team
**License**: MIT
