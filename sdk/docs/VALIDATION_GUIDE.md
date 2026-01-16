# TimelineModel Validation Guide

**Version**: 2.0.1
**Last Updated**: 2025-12-30

This guide explains how to use the TimelineModel validation system to ensure your multi-song timelines are valid and ready for playback.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Validation Basics](#validation-basics)
3. [Validation Results](#validation-results)
4. [Common Validation Errors](#common-validation-errors)
5. [Validation Options](#validation-options)
6. [TimelineDiff Validation](#timelinediff-validation)
7. [Best Practices](#best-practices)

---

## Quick Start

### Basic Validation

```typescript
import { validateTimeline, TimelineValidator } from '@schillinger-sdk/core';

// Simple validation
const result = validateTimeline(timeline);

if (result.valid) {
  console.log('Timeline is valid!');
} else {
  console.error('Timeline has errors:', result.errors);
}
```

### Validation with Options

```typescript
const validator = new TimelineValidator({
  checkSongInstances: true,
  checkInteractionRules: true,
  checkArchitecture: true,
});

const result = validator.validate(timeline);
```

---

## Validation Basics

### What Gets Validated

The TimelineModel validator checks:

#### ✅ Structural Requirements
- Timeline has required fields (`version`, `id`, `transport`, `songInstances`)
- `songInstances` is an array
- `transport` has required configuration

#### ✅ Transport Validation
- Tempo values are between 1-500 BPM
- Time signature denominators are powers of 2 (2, 4, 8, 16, 32)
- No `playbackSpeed` in transport (architectural rule)
- Loop ranges are valid (`start < end` when enabled)

#### ✅ Song Instance Validation
- Instance IDs are unique
- `entryBar` is non-negative
- `gain` is between 0 and 1 (or 0 and 2 for headroom)
- `state` is one of: `armed`, `muted`, `fading`
- `phaseOffset` is provided

#### ✅ Interaction Rule Validation
- Rule has required fields (`id`, `type`, `sourceInstanceId`)
- `sourceInstanceId` and `targetInstanceId` reference existing instances
- Rule type is valid
- Rule parameters is an object

#### ✅ Architectural Compliance
- TimelineModel owns transport (not SongModel)
- v2 SongModels don't have transport property
- No circular references

---

## Validation Results

### Result Structure

```typescript
interface ValidationResult {
  valid: boolean;           // true if no errors
  errors: ValidationError[];  // Array of error objects
  warnings: ValidationError[]; // Array of warning objects
}

interface ValidationError {
  field: string;   // Path to the invalid field
  message: string; // Human-readable error message
  severity: 'error' | 'warning';
}
```

### Example Results

#### Valid Timeline
```typescript
{
  valid: true,
  errors: [],
  warnings: []
}
```

#### Invalid Timeline
```typescript
{
  valid: false,
  errors: [
    {
      field: 'songInstances[2].entryBar',
      message: 'Song instance 2 has invalid entryBar: entryBar must be >= 0',
      severity: 'error'
    }
  ],
  warnings: [
    {
      field: 'songInstances',
      message: 'overlap: Multiple instances (instance-1, instance-2) start at bar 0',
      severity: 'warning'
    }
  ]
}
```

---

## Common Validation Errors

### 1. Missing Required Fields

**Error**: `TimelineModel missing required field: version`

**Solution**:
```typescript
const timeline: TimelineModel = {
  version: '1.0',  // ✅ Required
  id: 'my-timeline', // ✅ Required
  // ... other fields
};
```

### 2. Invalid Tempo Values

**Error**: `Invalid tempo at index 1: must be between 1 and 500 BPM`

**Solution**:
```typescript
transport: {
  tempoMap: [
    { time: { seconds: 0 }, tempo: 120 },  // ✅ Valid
    { time: { seconds: 10 }, tempo: 0 }    // ❌ Invalid (too slow)
  ]
}
```

### 3. Invalid Time Signature Denominator

**Error**: `setTimeSignatureEvent: denominator must be power of 2`

**Solution**:
```typescript
transport: {
  timeSignatureMap: [
    { time: { seconds: 0 }, numerator: 4, denominator: 4 },   // ✅ Valid
    { time: { seconds: 16 }, numerator: 3, denominator: 4 },  // ✅ Valid
    { time: { seconds: 32 }, numerator: 6, denominator: 8 },  // ✅ Valid
    { time: { seconds: 48 }, numerator: 5, denominator: 3 }   // ❌ Invalid (3 is not power of 2)
  ]
}
```

**Valid Denominators**: 2, 4, 8, 16, 32

### 4. Duplicate Instance IDs

**Error**: `duplicate instanceId: instance-1`

**Solution**:
```typescript
songInstances: [
  { instanceId: 'instance-1', /* ... */ },  // ✅ Unique
  { instanceId: 'instance-2', /* ... */ },  // ✅ Unique
  { instanceId: 'instance-1', /* ... */ }   // ❌ Duplicate
]
```

### 5. Invalid Gain Values

**Error**: `Invalid gain at index 0: must be number between 0 and 2`

**Solution**:
```typescript
{
  gain: 1.0,    // ✅ Valid (unity)
  gain: 0.5,    // ✅ Valid (-6 dB)
  gain: 0.0,    // ✅ Valid (muted)
  gain: 2.0,    // ✅ Valid (+6 dB headroom)
  gain: -0.5,   // ❌ Invalid (negative)
  gain: 3.0     // ❌ Invalid (too high)
}
```

### 6. Invalid State Values

**Error**: `Invalid state at index 0: invalid-state, must be armed, muted, or fading`

**Solution**:
```typescript
{
  state: 'armed',   // ✅ Valid
  state: 'muted',   // ✅ Valid
  state: 'fading',  // ✅ Valid
  state: 'playing', // ❌ Invalid
}
```

### 7. Overlapping Song Instances

**Warning**: `overlap: Multiple instances (instance-1, instance-2) start at bar 0`

**Note**: This is a **warning**, not an error. Overlaps may be intentional for:
- Layering multiple instruments
- Call-and-response patterns
- Textural density

**Example**:
```typescript
songInstances: [
  { instanceId: 'melody', entryBar: 0, /* ... */ },
  { instanceId: 'bass', entryBar: 0, /* ... */ }  // ⚠️ Overlap warning
]
```

---

## Validation Options

### Available Options

```typescript
interface ValidationOptions {
  checkSongInstances?: boolean;    // Default: true
  checkInteractionRules?: boolean; // Default: true
  checkArchitecture?: boolean;     // Default: true
}
```

### Usage Examples

#### Minimal Validation (Skip Checks)
```typescript
const result = new TimelineValidator({
  checkSongInstances: false,
  checkInteractionRules: false,
  checkArchitecture: false
}).validate(timeline);
```

#### Full Validation (Default)
```typescript
const result = new TimelineValidator({
  checkSongInstances: true,
  checkInteractionRules: true,
  checkArchitecture: true
}).validate(timeline);
```

#### Selective Validation
```typescript
const result = new TimelineValidator({
  checkArchitecture: true  // Only check architectural compliance
}).validate(timeline);
```

---

## TimelineDiff Validation

### What is TimelineDiff?

TimelineDiff represents changes to be applied to a timeline, used for updates and incremental modifications.

### Validating Diffs

```typescript
import { validateTimelineDiff } from '@schillinger-sdk/core';

// Validate an addSongInstance diff
const diff = {
  type: 'addSongInstance',
  instanceId: 'new-instance',
  songModelId: 'song-1',
  entryBar: 16,
  phaseOffset: { seconds: 0 },
  gain: 1.0,
  state: 'armed'
};

const result = validateTimelineDiff(diff);

if (result.valid) {
  // Apply the diff
} else {
  console.error('Invalid diff:', result.error);
}
```

### TimelineDiff Return Type

```typescript
interface TimelineDiffValidationResult {
  valid: boolean;
  error?: string;  // Single error message (undefined if valid)
}
```

### Common Diff Errors

#### Negative entryBar
```typescript
{
  type: 'addSongInstance',
  entryBar: -1  // ❌ Error: "entryBar must be >= 0"
}
```

#### Invalid gain
```typescript
{
  type: 'addSongInstance',
  gain: 5.0  // ❌ Error: "gain must be between 0 and 1"
}
```

#### Invalid tempo
```typescript
{
  type: 'setTempoEvent',
  tempo: 0  // ❌ Error: "tempo must be between 1 and 500 BPM"
}
```

#### Invalid time signature
```typescript
{
  type: 'setTimeSignatureEvent',
  denominator: 3  // ❌ Error: "denominator must be power of 2"
}
```

---

## Best Practices

### 1. Always Validate Before Use

```typescript
function applyTimelineUpdate(timeline: TimelineModel, diff: TimelineDiff) {
  // Validate the timeline
  const timelineResult = validateTimeline(timeline);
  if (!timelineResult.valid) {
    throw new Error(`Invalid timeline: ${timelineResult.errors[0].message}`);
  }

  // Validate the diff
  const diffResult = validateTimelineDiff(diff);
  if (!diffResult.valid) {
    throw new Error(`Invalid diff: ${diffResult.error}`);
  }

  // Apply the update
  // ...
}
```

### 2. Handle Warnings Appropriately

```typescript
const result = validateTimeline(timeline);

if (result.valid) {
  // Timeline is valid
  if (result.warnings.length > 0) {
    console.warn('Timeline warnings:', result.warnings);
    // Decide whether to proceed with warnings
  }
  // Use the timeline
} else {
  // Timeline has errors - cannot proceed
  console.error('Timeline errors:', result.errors);
}
```

### 3. Use Specific Validation Options

```typescript
// For import/validation tools - use all checks
const strictValidation = new TimelineValidator({
  checkSongInstances: true,
  checkInteractionRules: true,
  checkArchitecture: true
});

// For runtime updates - skip architecture checks
const runtimeValidation = new TimelineValidator({
  checkSongInstances: true,
  checkInteractionRules: true,
  checkArchitecture: false  // Already validated at import
});
```

### 4. Provide Clear Error Messages

```typescript
function formatValidationErrors(result: ValidationResult): string {
  const errors = result.errors.map(e => `${e.field}: ${e.message}`).join('\n');
  const warnings = result.warnings.map(w => `${w.field}: ${w.message}`).join('\n');

  let message = '';
  if (!result.valid) {
    message += `❌ Validation Failed:\n${errors}`;
  }
  if (warnings.length > 0) {
    message += `\n⚠️ Warnings:\n${warnings}`;
  }

  return message;
}
```

### 5. Test Edge Cases

```typescript
// Test with minimal timeline
const minimalTimeline = {
  version: '1.0',
  id: 'test',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  transport: {
    tempoMap: [{ time: { seconds: 0 }, tempo: 120 }],
    timeSignatureMap: [{ time: { seconds: 0 }, numerator: 4, denominator: 4 }],
    loopPolicy: { enabled: false }
  },
  songInstances: [],
  interactionRules: []
};

const result = validateTimeline(minimalTimeline);
console.assert(result.valid, 'Minimal timeline should be valid');
```

---

## API Reference

### validateTimeline()

Convenience function for timeline validation.

```typescript
function validateTimeline(
  timeline: any,
  options?: ValidationOptions
): ValidationResult
```

**Parameters**:
- `timeline`: The timeline to validate
- `options`: Optional validation configuration

**Returns**: `ValidationResult`

### TimelineValidator.validate()

Full-featured validator class.

```typescript
class TimelineValidator {
  constructor(options?: ValidationOptions)

  validate(timeline: any): ValidationResult
}
```

### validateTimelineDiff()

Validates timeline update diffs.

```typescript
function validateTimelineDiff(diff: TimelineDiff): {
  valid: boolean;
  error?: string;
}
```

---

## Troubleshooting

### Q: My timeline fails validation but I don't know why

**A**: Check the `errors` array for specific field paths and messages:

```typescript
const result = validateTimeline(timeline);

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`Field: ${error.field}`);
    console.error(`Error: ${error.message}`);
  });
}
```

### Q: Can I use a timeline with warnings?

**A**: Yes! Warnings indicate potential issues but don't prevent use:

```typescript
if (result.valid) {
  // Timeline is usable even with warnings
  if (result.warnings.length > 0) {
    console.warn('Proceeding with warnings:', result.warnings);
  }
  // Use the timeline
}
```

### Q: How do I fix "ARCHITECTURE VIOLATION" errors?

**A**: These indicate structural issues with your timeline:

- **"TimelineModel owns transport"**: Ensure `transport` is on TimelineModel, not SongModel
- **"SongModel_v2 should not have transport"**: Remove `transport` from v2 SongModels
- **"Circular references"**: Check for circular data structures

### Q: What's the difference between errors and warnings?

**A**:
- **Errors**: Critical issues that must be fixed (timeline is invalid)
- **Warnings**: Informational alerts about potential issues (timeline is still usable)

---

## Additional Resources

- [TimelineModel Type Reference](../packages/core/src/types/timeline/timeline-model.ts)
- [Validation Tests](../packages/core/src/__tests__/timeline-validator.test.ts)
- [Phase 4 Summary](../PHASE_4_COMPLETE_SUMMARY.md)
- [Architecture Documentation](../ARCHITECTURE_COMPLIANCE_REPORT.md)

---

**Last Updated**: 2025-12-30
**SDK Version**: 2.0.1
