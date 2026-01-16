# Critical Structural Safeguards - Implementation Guide

## Overview

These 3 safeguards lock in determinism, ergonomics, and future-proofing for the Schillinger SDK across **all** implementations (TypeScript, Dart, Swift, Python, C++).

---

## 1️⃣ Deterministic Randomness Contract

### Problem
Without an explicit PRNG contract, determinism is **emergent**, not **guaranteed**. Cross-platform parity tests can pass today and drift later due to:
- Language RNG differences
- Floating-point edge cases
- Platform updates

### Solution
**One canonical PRNG shared across ALL languages**

#### Algorithm: Xoshiro256++
- **Period**: 2^256 - 1
- **State**: 256 bits (4 × 64-bit)
- **Passes**: BigCrush + TestU01
- **Reference**: https://prng.di.unimi.it/xoshiro256plusplus.c

#### Mandatory Rules

##### ✅ DO (Across All Languages)
```typescript
// TypeScript
import { Xoshiro256PlusPlus } from './prng';
const prng = new Xoshiro256PlusPlus(42);
const value = prng.nextUint64();
```

```dart
// Dart
import 'package:schillinger_sdk/schillinger_sdk.dart';
final prng = Xoshiro256PlusPlus(42);
final value = prng.nextUint64();
```

```swift
// Swift
let prng = Xoshiro256PlusPlus(seed: 42)
let value = prng.nextUint64()
```

```python
# Python
from sdk.determinism import Xoshiro256PlusPlus
prng = Xoshiro256PlusPlus(42)
value = prng.next_uint64()
```

```cpp
// C++
#include "prng/xoshiro256.hpp"
auto prng = Xoshiro256PlusPlus(42);
uint64_t value = prng.nextUint64();
```

##### ❌ NEVER (Across All Languages)
```typescript
// NO
Math.random()
```

```dart
// NO
Random().nextInt(100)
```

```swift
// NO
arc4random()
```

```python
# NO
random.random()
```

```cpp
// NO
rand()
```

#### Float Rounding Policy

**1. Serialization (Mandatory)**
```dart
// Round to 6 decimal places before JSON
final rounded = FloatRounding.roundForSerialization(value);
json['intensity'] = rounded; // Always 6 decimals
```

**2. Comparisons (Mandatory)**
```dart
// Use epsilon = 1e-9
if (FloatRounding.equals(a, b)) {
  // Safe comparison
}
```

**3. PRNG Output (Fixed)**
```dart
// 53-bit precision, multiply by 2^-53
final value = (mantissa * (1.0 / (1 << 53))).toDouble();
// NOT: divide by random value
```

#### Validation Tests

**Mandatory Test** - Run on ALL platforms:
```dart
test('PRNG produces reference sequence', () {
  final prng = Xoshiro256PlusPlus(42);

  // MUST match TS/Swift/Python/C++
  expect(prng.nextUint64(), 0x9c1f6e12591ca5a1);
  expect(prng.nextUint64(), 0xa2a2ae0b04a23add);
  expect(prng.nextUint64(), 0x3683f9e757ed779f);
  // ... (10 values)

  // If this fails, cross-platform determinism is BROKEN
});
```

**Golden Reference Files**:
- `test/cross_language/golden/prng_sequence.golden`
- Contains first 1000 uint64 values from seed 42
- MUST match across ALL implementations

---

## 2️⃣ Capability Discovery API

### Problem
Clients assume features exist, causing runtime errors in:
- Flutter UI (hides/shows features dynamically)
- Offline mode (can't prove capabilities)
- Partial deployments (breaks clients)

### Solution
**Dynamic capability discovery surface**

#### Implementation

**1. Register Capabilities** (SDK Side)
```dart
SDKCapabilities.instance.register(Capability(
  name: 'realization',
  version: '2.0.0',
  status: CapabilityStatus.stable,
  description: 'Moving Sidewalk realization',
  dependencies: [],
));

SDKCapabilities.instance.register(Capability(
  name: 'dawExport',
  version: '1.0.0',
  status: CapabilityStatus.stable,
  description: 'DAW project export',
  dependencies: ['realization'],
  features: {
    'midi': true,
    'musicxml': true,
    'ableton': true,
    'fl_studio': true,
    'logic_pro': true,
  },
));
```

**2. Check Capabilities** (Flutter Side)
```dart
// Build UI based on capabilities
Widget buildExportButton() {
  return CapabilityUI.buildIfCapable(
    'dawExport',
    () => ExportButton(
      formats: SDKCapabilities.instance.dawExportFormats,
    ),
  ) ?? const SizedBox.shrink(); // Hide if not available
}

// Show warning for deprecated features
Widget buildGeneratorSelector() {
  final isDeprecated = CapabilityUI.shouldShowWarning('generator_convergence');

  return Column(
    children: [
      GeneratorSelector(),
      if (isDeprecated)
        WarningBanner(
          message: CapabilityUI.getDeprecationMessage('generator_convergence'),
        ),
    ],
  );
}
```

**3. Prove Offline Mode**
```dart
// Can verify offline capability programmatically
if (SDKCapabilities.instance.isOffline) {
  // Safe to use offline features
  await offlineManager.saveStateLocal(state);
} else {
  // Need network or feature not available
  throw OfflineNotSupportedException();
}
```

#### Capability Registry

**Core Capabilities** (Always Available):
- ✅ `realization` - Moving Sidewalk system
- ✅ `offline` - Offline state management
- ✅ `arbitration` - Generator arbitration
- ✅ `visualization` - Flutter widgets

**Feature Capabilities**:
- ✅ `dawExport` - DAW export (midi, musicxml, ableton, fl_studio, logic_pro)
- ✅ `generator_resultant` - Resultant generator
- ⚠️ `generator_interference` - Interference (experimental)
- ⚠️ `generator_convergence` - Convergence (deprecated, use resultant)

#### Capability Status

- **Stable**: Production-ready, use freely
- **Experimental**: May change, use with caution
- **Deprecated**: Will be removed, use replacement
- **Disabled**: Not available in current config

#### Mandatory Usage

**Flutter Widgets**:
```dart
// ALWAYS check capabilities before using features
@override
Widget build(BuildContext context) {
  return CapabilityUI.buildIfCapable('visualization', () =>
    TimelineWidget(state: state),
  ) ?? const UnsupportedFeatureWidget(
    feature: 'Visualization',
  );
}
```

**Generator Usage**:
```dart
// ALWAYS validate before using
final generatorId = 'generator_interference';
GeneratorDeprecation.validateConfig(generatorId, config);

// Check if deprecated
if (GeneratorDeprecation.isDeprecated(generatorId)) {
  final replacement = GeneratorDeprecation.getReplacement(generatorId);
  showMigrationDialog(generatorId, replacement);
}
```

---

## 3️⃣ Semantic Versioning + State Replay Policy

### Problem
- When can generator behavior change?
- When is determinism allowed to break?
- How are old states replayed in v3, v4?

### Solution
**Formal semantic versioning policy with replay guarantees**

#### Version Format
```
MAJOR.MINOR.PATCH
```

**MAJOR** - Breaking changes:
- Generator behavior changes
- State schema changes
- PRNG algorithm changes (NEVER DO THIS)
- Removal of deprecated features

**MINOR** - Additive changes:
- New generators
- New state fields (backward-compatible)
- New capabilities
- New DAW export formats

**PATCH** - Bug fixes:
- Bug fixes in existing generators
- Performance improvements
- Documentation updates
- Internal refactoring

#### State Replay Guarantee

**✅ GUARANTEED** - States replay within same MAJOR version:
```dart
// State from v2.0.0 replays in v2.1.0, v2.5.0, v2.99.99
final state_v2_0 = SidewalkState.initial(compositionId: 'test');
final json = state_v2_0.toJson();

// Later in v2.5.0
final restored = SidewalkState.fromJson(json);
// Restored state produces IDENTICAL output
```

**❌ BREAKING** - MAJOR version bump required for:
- Changing generator algorithm
- Modifying state schema
- Adding required fields
- Removing deprecated features

#### Migration Path

**v1.x → v2.0 Migration**:
```dart
// Automatic migration
final v1State = SidewalkState.fromJson(v1Json);

// Check migration needed
if (SemanticVersioning.needsMigration(v1State.metadata.version)) {
  final path = SemanticVersioning.getMigrationPath(v1State.metadata.version);

  SidewalkState migrated = v1State;
  for (final step in path) {
    migrated = await step.migrationFn(migrated);
  }

  // migrated is now v2.0.0 compatible
  final output = generate(migrated);
}
```

#### Golden Test Locking

**Golden tests lock behavior forever**:
```dart
test('Generator behavior locked', () {
  final state = SidewalkState.fromJson(File('golden/test.state').readAsStringSync());
  final prng = Xoshiro256PlusPlus(state.generatorState.generationSeed);

  // This output is LOCKED
  final expectedOutput = loadGolden('test_output.json');
  final actualOutput = generateWithPRNG(state, prng);

  expect(actualOutput, equalsGolden(expectedOutput));
  // If this fails, generator behavior changed = MAJOR version bump
});
```

#### Deprecation Timeline

**Phase 1: Mark Deprecated (v2.0.0)**
```dart
registerGenerator(DeprecatedGenerator(
  name: 'old_generator',
  deprecatedIn: '2.0.0',
  removalIn: '3.0.0',
  replacement: 'new_generator',
  reason: 'Old generator had bugs',
  migration: 'migrateOldToNew',
));
```

**Phase 2: Migration Period (v2.0.0 - v2.9.x)**
- Show warnings in UI
- Provide migration helper
- Update documentation
- Golden tests continue to pass

**Phase 3: Removal (v3.0.0)**
- Remove old generator
- Migration no longer needed
- States auto-migrated

#### Mandatory Rules

**1. Version Compatibility Check**:
```dart
// ALWAYS validate state version
try {
  SemanticVersioning.validateStateVersion(state);
} on StateVersionException catch (e) {
  // State needs migration
  final migrated = await migrateState(state);
}
```

**2. Generator Deprecation Check**:
```dart
// ALWAYS check before using
final generatorId = 'some_generator';
if (GeneratorDeprecation.isDeprecated(generatorId)) {
  final deprecation = GeneratorDeprecation.getDeprecation(generatorId);
  print('WARNING: $generatorId is deprecated since ${deprecation.deprecatedIn}');
  print('Use ${deprecation.replacement} instead');
}
```

**3. Golden Test Updates**:
```dart
// When behavior changes (MAJOR bump only)
// 1. Update generator code
// 2. Regenerate golden files
// 3. Update version in tests
// 4. Document breaking change
```

---

## Implementation Checklist

### Phase 1: Deterministic Randomness
- [ ] Implement Xoshiro256++ in all languages
- [ ] Add float rounding policy
- [ ] Create PRNG validation tests
- [ ] Generate golden reference sequence
- [ ] Add linter rules to ban platform RNG
- [ ] Document PRNG usage in style guide

### Phase 2: Capability Discovery
- [ ] Register all core capabilities
- [ ] Implement capability checks in Flutter UI
- [ ] Add capability-based widget builders
- [ ] Create offline capability proof
- [ ] Document capability registration process

### Phase 3: Semantic Versioning
- [ ] Define version bump criteria
- [ ] Implement state migration system
- [ ] Add version validation
- [ ] Create deprecation timeline
- [ ] Lock golden tests to current version
- [ ] Document breaking change policy

---

## Testing Strategy

### PRNG Tests (All Languages)
```bash
# Must pass on all platforms
test/prng_validation_test.dart
test/prng_cross_language_test.ts
test/prng_validation_test.swift
test/prng_validation_test.py
test/prng_validation_test.cpp
```

### Capability Tests
```bash
# Verify capability discovery
test/capability_discovery_test.dart
test/capability_ui_adaptation_test.dart
```

### Version Policy Tests
```bash
# Verify state replay
test/state_replay_test.dart
test/migration_test.dart
test/generator_deprecation_test.dart
```

---

## Success Criteria

✅ **Determinism Locked**:
- Same seed produces identical output across all languages
- Float serialization is consistent
- Golden tests pass forever

✅ **Ergonomics Future-Safe**:
- Flutter UI adapts dynamically to capabilities
- Offline mode is provable
- No runtime errors from missing features

✅ **Future-Proofed**:
- Clear version bump criteria
- Automatic state migration
- Generator deprecation path
- Golden tests lock behavior

---

## Bottom Line

These 3 safeguards are **small but critical**:

1. **Deterministic Randomness** - Locks cross-platform parity forever
2. **Capability Discovery** - Makes SDK ergonomics future-safe
3. **Semantic Versioning** - Protects from future you

**No hidden dragons. No missing systems. No architectural rewrites.**

Just explicit, documented contracts that ensure long-term reliability.
