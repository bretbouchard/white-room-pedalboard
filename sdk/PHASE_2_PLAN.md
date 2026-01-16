# Phase 2 Implementation Plan - IR-First Generator Outputs

**Branch**: `phase2-implementation`
**Base**: `phase1-implementation` (correct Phase 1 foundation)
**Status**: 🔜 In Planning
**Created**: 2025-12-30

---

## Executive Summary

Phase 2 migrates all SDK generators to return **explicit, versioned IR** (Intermediate Representation) instead of domain-specific objects.

**Why**: IR provides:
- ✅ Explicit seed tracking
- ✅ Provenance metadata
- ✅ Serialization/deserialization
- ✅ Diff-ability via SongDiff
- ✅ Cross-language compatibility
- ✅ Clear generator contract

**What Changes**:
- Generators return `PatternIR_v1` or `SongIR_v1`
- IR includes seed, metadata, and structured data
- Domain objects become derived/convenience layer
- Tests validate IR structure

---

## Phase 1 Foundation (What We're Building On)

### Already Complete ✅

On this branch (`phase2-implementation`), we have:

1. **IR Types**
   ```typescript
   // packages/shared/src/ir/song-ir.ts
   interface PatternIR_v1 {
     version: '1.0';
     seed: string;  // Explicit seed
     generator: string;  // e.g., 'rhythm.resultant'
     parameters: Record<string, unknown>;
     events: ScheduledEvent[];
     metadata: PatternMetadata;
   }

   interface SongIR_v1 {
     version: '1.0';
     seed: string;
     sections: SectionIR[];
     tracks: TrackIR[];
     metadata: SongMetadata;
   }
   ```

2. **SeededRNG**
   ```typescript
   // packages/shared/src/utils/seeded-rng.ts
   class SeededRNG {
     constructor(seed: string);
     next(): number;  // Deterministic
     nextInt(min: number, max: number): number;
   }
   ```

3. **SongDiff**
   ```typescript
   // packages/shared/src/diff/song-diff.ts
   type SongDiff = AddTrackDiff | RemoveTrackDiff | SetPatternDiff | ...;
   function applySongDiff(ir: SongIR_v1, diff: SongDiff): SongIR_v1;
   ```

4. **Execution Contract**
   - ScheduledEvent types
   - ParameterAddress system
   - Determinism validated

---

## Phase 2 Scope - What Needs Migration

### Generator APIs

| Generator | Current Return | Phase 2 Return | Status |
|-----------|---------------|----------------|--------|
| `RhythmAPI.generateResultant()` | `RhythmPattern` object | `PatternIR_v1` | 🟡 Partial |
| `RhythmAPI.generateComplex()` | `RhythmPattern` object | `PatternIR_v1` | ❌ Not started |
| `MelodyAPI.generatePattern()` | `MelodyPattern` object | `PatternIR_v1` | 🟡 Partial |
| `HarmonyAPI.generateProgression()` | `ChordProgression` object | `PatternIR_v1` | 🟡 Partial |
| `CompositionAPI.generate()` | `Composition` object | `SongIR_v1` | 🟡 Partial |

**Note**: Some IR-returning methods already exist (added in Phase 1), but we need to:
1. Make them the PRIMARY API
2. Add domain objects as DERIVED layer
3. Ensure all generators have IR methods
4. Add comprehensive tests

---

## Phase 2 Implementation Strategy

### Approach: Incremental Migration

**Principle**: One generator per commit, clear progression, no breaking changes until complete.

### Migration Steps (Per Generator)

#### Step 1: Add IR Return Method (if not exists)

```typescript
// packages/core/src/rhythm.ts

// NEW: IR-returning method (primary API)
export function generateResultantIR(
  a: number,
  b: number,
  seed: string,
  options?: RhythmOptions
): PatternIR_v1 {
  // 1. Validate inputs
  // 2. Initialize SeededRNG with seed
  // 3. Generate events deterministically
  // 4. Return PatternIR_v1 with explicit structure
}
```

#### Step 2: Make Domain Object Derived

```typescript
// OLD: Domain object method (becomes convenience wrapper)
export function generateResultant(
  a: number,
  b: number,
  options?: RhythmOptions
): RhythmPattern {
  // Derive from IR
  const seed = generateSeed();  // Auto-generate if not provided
  const ir = generateResultantIR(a, b, seed, options);
  return fromPatternIR(ir);  // Convert IR to domain object
}

// Conversion function
function fromPatternIR(ir: PatternIR_v1): RhythmPattern {
  // Extract domain-specific fields from IR
  return {
    notes: ir.events.map(e => ({
      pitch: e.pitch,
      duration: e.duration,
      // ... domain-specific fields
    })),
    tempo: ir.metadata.tempo,
    timeSignature: ir.metadata.timeSignature,
  };
}
```

#### Step 3: Add Tests

```typescript
// packages/core/src/__tests__/rhythm-ir.test.ts

describe('RhythmAPI.generateResultantIR', () => {
  test('returns valid PatternIR_v1 structure', () => {
    const result = generateResultantIR(3, 4, 'test-seed-123');

    // Validate IR structure
    expect(result.version).toBe('1.0');
    expect(result.seed).toBe('test-seed-123');
    expect(result.generator).toBe('rhythm.resultant');
    expect(result.events).toBeInstanceOf(Array);
    expect(result.metadata).toBeDefined();
  });

  test('is deterministic with same seed', () => {
    const result1 = generateResultantIR(3, 4, 'test-seed-123');
    const result2 = generateResultantIR(3, 4, 'test-seed-123');

    expect(result1).toEqual(result2);
  });

  test('produces different results with different seeds', () => {
    const result1 = generateResultantIR(3, 4, 'seed-1');
    const result2 = generateResultantIR(3, 4, 'seed-2');

    expect(result1).not.toEqual(result2);
  });

  test('includes correct generator metadata', () => {
    const result = generateResultantIR(5, 7, 'test-seed', {
      tempo: 140,
      complexity: 0.8,
    });

    expect(result.parameters).toMatchObject({
      generatorA: 5,
      generatorB: 7,
      tempo: 140,
      complexity: 0.8,
    });
  });

  test('IR is serializable', () => {
    const result = generateResultantIR(3, 4, 'test-seed');
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual(result);
  });
});
```

#### Step 4: Update Documentation

```typescript
/**
 * Generate rhythm resultant as IR (Intermediate Representation)
 *
 * IR is the canonical output format - explicit, serializable, and diff-able.
 *
 * @param a First generator (e.g., 3)
 * @param b Second generator (e.g., 4)
 * @param seed Seed for deterministic generation
 * @param options Optional parameters (tempo, complexity, etc.)
 * @returns PatternIR_v1 with explicit seed and metadata
 *
 * @example
 * ```ts
 * const ir = generateResultantIR(3, 4, 'my-seed-123', { tempo: 120 });
 * console.log(ir.events);  // Array of ScheduledEvent
 * console.log(ir.seed);  // 'my-seed-123'
 * ```
 */
export function generateResultantIR(...): PatternIR_v1
```

---

## Migration Order

### Recommended Sequence

1. **RhythmAPI** ⭐ Start here (simplest)
   - `generateResultantIR()` - Already exists, needs tests
   - `generateComplexIR()` - Needs implementation
   - `analyzePatternIR()` - Needs implementation

2. **MelodyAPI** (medium complexity)
   - `generatePatternIR()` - Already exists, needs tests
   - `generateContourIR()` - Needs implementation

3. **HarmonyAPI** (medium complexity)
   - `generateProgressionIR()` - Already exists, needs tests
   - `generateChordIR()` - Needs implementation

4. **CompositionAPI** (most complex)
   - `generateCompositionIR()` - Already exists, needs tests
   - Combines all other generators

**Time Estimate**: 2-3 hours per generator = ~8-12 hours total

---

## Phase 2 Acceptance Criteria

### Per Generator

A generator migration is complete when:

- [ ] **IR Method Exists**: `generate{Type}IR()` returns IR type
- [ ] **IR Structure Valid**: Matches `PatternIR_v1` or `SongIR_v1` schema
- [ ] **Seed Included**: IR has explicit seed field
- [ ] **Deterministic**: Same seed → identical IR
- [ ] **Serializable**: IR can be JSON.stringify/parse
- [ ] **Metadata Complete**: generator, parameters, timestamp
- [ ] **Tests Pass**: Unit tests validate IR structure
- [ ] **Domain Object Derived**: Old API now convenience wrapper
- [ ] **Documentation Updated**: JSDoc explains IR-first approach

### Overall Phase 2

Phase 2 is complete when:

- [ ] All 4 generators migrated to IR output
- [ ] All IR methods tested
- [ ] All domain objects are convenience wrappers
- [ ] No breaking changes (old APIs still work)
- [ ] Tests validate IR > domain object conversion
- [ ] Documentation updated
- [ ] `PHASE_2_COMPLETE.md` written

---

## Test Strategy

### Unit Tests (Per Generator)

```typescript
// packages/core/src/__tests__/{generator}-ir.test.ts

describe('{Generator}IR API', () => {
  describe('generate{Type}IR', () => {
    test('returns valid IR structure');
    test('includes explicit seed');
    test('includes generator metadata');
    test('is deterministic with same seed');
    test('varies with different seeds');
    test('is serializable');
    test('round-trips through JSON');
    test('matches IR schema');
  });

  describe('IR to Domain Object Conversion', () => {
    test('fromPatternIR() produces valid domain object');
    test('domain object has expected fields');
    test('conversion is lossless for critical data');
  });

  describe('Backward Compatibility', () => {
    test('old API still works');
    test('old API auto-generates seed');
    test('old API produces same musical result');
  });
});
```

### Integration Tests

```typescript
// packages/core/src/__tests__/integration/ir-workflow.test.ts

describe('IR Workflow Integration', () => {
  test('full composition from IR', () => {
    // Generate all components as IR
    const rhythmIR = generateResultantIR(3, 4, 'seed-1');
    const melodyIR = generatePatternIR('C', 'major', 16, 'seed-2');
    const harmonyIR = generateProgressionIR('C', 'major', 8, 'seed-3');
    const compositionIR = generateCompositionIR({
      rhythm: rhythmIR,
      melody: melodyIR,
      harmony: harmonyIR,
      seed: 'seed-comp',
    });

    // Validate composition IR
    expect(compositionIR.version).toBe('1.0');
    expect(compositionIR.sections).toBeDefined();
    expect(compositionIR.tracks).toBeDefined();
  });

  test('SongDiff operates on IR', () => {
    const ir1 = generateCompositionIR({ /* ... */ });
    const diff: SongDiff = { type: 'replacePattern', trackId: 'track-1', pattern: newPatternIR };
    const ir2 = applySongDiff(ir1, diff);

    expect(ir2).not.toEqual(ir1);
    expect(ir2.tracks.find(t => t.id === 'track-1')?.pattern).toEqual(newPatternIR);
  });

  test('IR serialization preserves all data', () => {
    const original = generateCompositionIR({ /* ... */ });
    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(original);
  });
});
```

---

## File Structure (Phase 2)

### New Files

```
packages/core/src/__tests__/
├── rhythm-ir.test.ts          # NEW
├── melody-ir.test.ts          # NEW
├── harmony-ir.test.ts         # NEW
├── composition-ir.test.ts     # NEW
└── integration/
    └── ir-workflow.test.ts    # NEW

packages/shared/src/
├── conversion/
    │   ├── pattern-to-domain.ts   # NEW: IR → domain object
    │   └── song-to-domain.ts      # NEW: IR → domain object
    └── validation/
        └── ir-schema.test.ts      # NEW: IR schema validation tests
```

### Modified Files

```
packages/core/src/
├── rhythm.ts        # MODIFY: Add generateResultantIR, make old API derived
├── melody.ts        # MODIFY: Add generatePatternIR, make old API derived
├── harmony.ts       # MODIFY: Add generateProgressionIR, make old API derived
└── composition.ts   # MODIFY: Add generateCompositionIR, make old API derived
```

---

## Branch Strategy

### Current Branch: `phase2-implementation`

**Base**: `phase1-implementation` (correct Phase 1)
**Purpose**: Phase 2 IR migration work
**Merge Target**: Will merge to `main` after all phases complete

### Commit Strategy (Per Generator)

```bash
# Example: RhythmAPI migration
git commit -m "
feat(rhythm): add IR-first API for rhythm generation

- Add generateResultantIR() returning PatternIR_v1
- Add generateComplexIR() returning PatternIR_v1
- Make existing generateResultant() a convenience wrapper
- Add comprehensive IR tests
- Update JSDoc documentation

Phase 2: RhythmAPI IR migration
"
```

### Pull Request Strategy

One PR per generator:
1. `phase2-rhythm` - RhythmAPI IR migration
2. `phase2-melody` - MelodyAPI IR migration
3. `phase2-harmony` - HarmonyAPI IR migration
4. `phase2-composition` - CompositionAPI IR migration

Each PR merged to `phase2-implementation` (not main).

---

## Progress Tracking

### Checklist

- [ ] **RhythmAPI IR Migration**
  - [ ] `generateResultantIR()` implemented and tested
  - [ ] `generateComplexIR()` implemented and tested
  - [ ] Old API now convenience wrapper
  - [ ] Tests pass
  - [ ] Documentation updated

- [ ] **MelodyAPI IR Migration**
  - [ ] `generatePatternIR()` implemented and tested
  - [ ] `generateContourIR()` implemented and tested
  - [ ] Old API now convenience wrapper
  - [ ] Tests pass
  - [ ] Documentation updated

- [ ] **HarmonyAPI IR Migration**
  - [ ] `generateProgressionIR()` implemented and tested
  - [ ] `generateChordIR()` implemented and tested
  - [ ] Old API now convenience wrapper
  - [ ] Tests pass
  - [ ] Documentation updated

- [ ] **CompositionAPI IR Migration**
  - [ ] `generateCompositionIR()` implemented and tested
  - [ ] Old API now convenience wrapper
  - [ ] Tests pass
  - [ ] Documentation updated

- [ ] **Integration Tests**
  - [ ] Full IR workflow tests
  - [ ] SongDiff integration tests
  - [ ] Serialization round-trip tests

- [ ] **Documentation**
  - [ ] All IR methods documented
  - [ ] Migration guide written
  - [ ] PHASE_2_COMPLETE.md written

---

## Success Metrics

### Quantitative

| Metric | Target | Current |
|--------|--------|---------|
| Generators migrated | 4 | 0 |
| IR methods implemented | 8+ | ~4 (partial) |
| IR tests passing | 100% | N/A |
| Code coverage | >90% | N/A |
| Breaking changes | 0 | N/A |

### Qualitative

- ✅ All generators return IR as primary output
- ✅ Domain objects are convenience layer
- ✅ All IR includes explicit seeds
- ✅ All IR is deterministic
- ✅ All IR is serializable
- ✅ Tests validate IR structure
- ✅ Documentation is clear

---

## Risk Mitigation

### Potential Issues

1. **Breaking Changes**
   - **Risk**: Users depend on old API
   - **Mitigation**: Keep old API as convenience wrappers
   - **Validation**: Test that old API still works

2. **Performance Regression**
   - **Risk**: IR conversion overhead
   - **Mitigation**: Profile conversion functions
   - **Validation**: Performance tests

3. **Incomplete Migration**
   - **Risk**: Some generators not migrated
   - **Mitigation**: Clear checklist, one-at-a-time
   - **Validation**: All generators must have IR methods

4. **Schema Drift**
   - **Risk**: IR schema changes mid-Phase 2
   - **Mitigation**: Lock PatternIR_v1 schema
   - **Validation**: Schema validation tests

---

## Next Steps

### Immediate Actions

1. **Start with RhythmAPI** (simplest, already has partial IR)
   - Review existing `generateResultantIR()` implementation
   - Add missing IR methods
   - Write comprehensive tests
   - Make old API derived

2. **Create Conversion Utilities**
   - `fromPatternIR(ir): Pattern`
   - `fromSongIR(ir): Composition`
   - Ensure lossless conversion

3. **Write Tests First** (TDD approach)
   - Define IR structure expectations
   - Test determinism
   - Test serialization
   - Then implement

---

## Decision Points

### Questions to Resolve

1. **Auto-generated seeds**: Should old API generate seeds or require them?
   - **Recommendation**: Auto-generate if not provided

2. **IR versioning**: Should we support multiple IR versions?
   - **Recommendation**: Only v1 for now, add v2 in future if needed

3. **Domain object conversion**: Lossless or lossy?
   - **Recommendation**: Lossless for critical data (notes, events)

4. **Test coverage**: How much is enough?
   - **Recommendation**: >90% coverage for IR methods

---

**Phase 2 Status**: 🔜 Ready to Start
**Current Branch**: `phase2-implementation`
**First Task**: RhythmAPI IR migration (with comprehensive tests)

**Let's begin!** 🚀
