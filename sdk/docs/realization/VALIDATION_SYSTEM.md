# Realization Validation System

> **Agent 3 Deliverable** - Comprehensive validation framework for SongModel_v1 and deterministic audio integration

## Overview

The Validation System provides complete verification and testing infrastructure for the SDK v2.1.0 deterministic audio integration. It ensures that all SongModels are valid, projections resolve correctly, lookahead is bounded, and event generation is 100% repeatable.

## Components

### 1. ProjectionValidator

Validates that all projections in a SongModel_v1 are properly configured:

```typescript
import { ProjectionValidator } from '@schillinger-sdk/core';

const validator = new ProjectionValidator();
const result = validator.validateProjections(songModel);

if (!result.isValid) {
  console.error('Invalid projections:', result.errors);
}
```

**Validations:**
- All role IDs exist in SongModel
- All track/bus IDs exist in MixGraph
- No duplicate projection IDs
- No circular dependencies in routing
- All parameter addresses resolve

**Methods:**
- `validateProjections(model)` - Complete validation
- `detectCircularProjections(model)` - Find cycles
- `validateAddressResolution(model)` - Verify addresses

### 2. LookaheadManager

Manages bounded lookahead for deterministic event pre-generation:

```typescript
import { LookaheadManager } from '@schillinger-sdk/core';

const manager = new LookaheadManager();

// Calculate requirements
const requirements = manager.calculateLookahead(songModel);
console.log(`Recommended lookahead: ${requirements.recommendedLookahead}s`);

// Enforce maximum boundary
const bounded = manager.enforceBoundaries(songModel, 5.0); // Max 5 seconds
if (bounded.wasClamped) {
  console.warn(`Lookahead clamped: ${bounded.reason}`);
}

// Pre-generate events
const events = manager.pregenerateEvents(songModel, currentTime);
```

**Features:**
- Calculates min/max lookahead based on tempo changes
- Enforces absolute maximum bounds (10s)
- Respects loop boundaries
- Pre-generates events within safe time window

### 3. OfflineReplaySystem

Ensures 100% deterministic event generation for regression testing:

```typescript
import { OfflineReplaySystem } from '@schillinger-sdk/core';

const replaySystem = new OfflineReplaySystem();

// Serialize event stream
const serialized = replaySystem.serializeEventStream(events);

// Replay from serialized data
const replayedEvents = replaySystem.replayEventStream(serialized);

// Verify repeatability across multiple runs
const report = replaySystem.verifyRepeatability(songModel, 100);
console.log(`Repeatability: ${report.matchRate * 100}%`);

if (!report.isRepeatable) {
  console.error('Non-deterministic behavior detected!');
}
```

**Guarantees:**
- Same model + seed → identical event streams (100%)
- Multiple runs produce byte-identical results
- Serialization preserves all information
- Detects non-deterministic generators

### 4. AudioHasher

Deterministic hashing for regression testing:

```typescript
import { AudioHasher } from '@schillinger-sdk/core';

const hasher = new AudioHasher();

// Hash audio buffer
const audioHash = hasher.hashAudioBuffer(leftChannel, rightChannel);

// Hash event stream
const eventHash = hasher.hashEventStream(events);

// Compare hashes
const comparison = hasher.compareHashes(hash1, hash2);
console.log(`Similarity: ${comparison.similarity * 100}%`);
console.log(`Equal: ${comparison.areEqual}`);
```

**Features:**
- Quantization for floating-point tolerance
- Order-sensitive event hashing
- Detailed comparison metrics
- Format validation

## Usage Examples

### Complete SongModel Validation

```typescript
import {
  ProjectionValidator,
  LookaheadManager,
  OfflineReplaySystem,
  AudioHasher
} from '@schillinger-sdk/core';

async function validateSongModel(model: SongModel_v1) {
  const errors: string[] = [];

  // 1. Validate projections
  const projectionValidator = new ProjectionValidator();
  const projectionResult = projectionValidator.validateProjections(model);
  if (!projectionResult.isValid) {
    errors.push(...projectionResult.errors.map(e => e.message));
  }

  // 2. Check for circular dependencies
  const cycleResult = projectionValidator.detectCircularProjections(model);
  if (cycleResult.hasCycles) {
    errors.push(`Circular dependencies: ${cycleResult.cycles.join(', ')}`);
  }

  // 3. Validate lookahead is bounded
  const lookaheadManager = new LookaheadManager();
  const bounded = lookaheadManager.enforceBoundaries(model, 5.0);
  if (bounded.wasClamped) {
    errors.push(`Lookahead exceeded maximum: ${bounded.reason}`);
  }

  // 4. Verify determinism
  const replaySystem = new OfflineReplaySystem();
  const repeatability = replaySystem.verifyRepeatability(model, 50);
  if (!repeatability.isRepeatable) {
    errors.push(`Non-deterministic: ${repeatability.matchRate * 100}% match rate`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Regression Testing

```typescript
import { AudioHasher, OfflineReplaySystem } from '@schillinger-sdk/core';

function testRegression(model: SongModel_v1, goldenHash: string) {
  const hasher = new AudioHasher();
  const replaySystem = new OfflineReplaySystem();

  // Generate events
  const events = generateEvents(model);

  // Hash event stream
  const currentHash = hasher.hashEventStream(events);

  // Compare with golden hash
  const comparison = hasher.compareHashes(currentHash, goldenHash);

  if (!comparison.areEqual) {
    throw new Error(
      `Regression detected! ` +
      `Similarity: ${comparison.similarity * 100}%, ` +
      `Difference: ${comparison.difference}`
    );
  }

  console.log('✅ Regression test passed');
}
```

## Testing

Run all validation tests:

```bash
# Test all validators
npm test -- tests/core/realization/projection-validator.test.ts
npm test -- tests/core/realization/lookahead-manager.test.ts
npm test -- tests/core/realization/offline-replay.test.ts
npm test -- tests/core/realization/audio-hashing.test.ts

# Test all realization validation
npm test -- tests/core/realization/
```

## Validation Requirements

### Projection Validation

- ✅ All role IDs exist in SongModel
- ✅ All track/bus IDs exist in MixGraph
- ✅ No circular dependencies
- ✅ All parameter addresses resolve
- ✅ No duplicate projection IDs

### Lookahead Validation

- ✅ Maximum lookahead is bounded and calculable
- ✅ Pre-generation does not exceed limits
- ✅ Events scheduled within valid time ranges
- ✅ Loop boundaries respected

### Repeatability Validation

- ✅ Same model + seed → identical event streams (100%)
- ✅ Multiple runs produce byte-identical results
- ✅ Serialization preserves all information

## Definition of Done

All validators are complete when:

- ✅ ProjectionValidator with comprehensive checks
- ✅ LookaheadManager with boundary enforcement
- ✅ OfflineReplaySystem with repeatability verification
- ✅ AudioHasher for regression testing
- ✅ All tests passing with >95% coverage

## Integration Points

- **Agent 1 (Core Types)**: Uses SongModel_v1, ScheduledEvent types
- **Agent 2 (Event Emitter)**: Validates emitted event streams
- **Agent 4 (Integration)**: Provides validation for JUCE harness

## Performance Considerations

- **ProjectionValidator**: O(n) where n = number of projections
- **LookaheadManager**: O(1) for boundary enforcement
- **OfflineReplaySystem**: O(n) where n = number of events
- **AudioHasher**: O(n) where n = buffer/event count

All validators are designed for fast startup-time validation, not real-time use.

## Future Enhancements

1. **Parallel Validation**: Run all validators concurrently
2. **Caching**: Cache validation results for unchanged models
3. **Streaming Validation**: Validate events as they're generated
4. **Visual Reports**: Generate HTML validation reports
5. **Golden Test Generator**: Auto-generate golden test data

## References

- [SONGMODEL_V1_IMPLEMENTATION.md](../../plans/SONGMODEL_V1_IMPLEMENTATION.md)
- [SongModel Type Definition](../packages/shared/src/types/song-model.ts)
- [ScheduledEvent Type Definition](../packages/shared/src/types/scheduled-event.ts)
