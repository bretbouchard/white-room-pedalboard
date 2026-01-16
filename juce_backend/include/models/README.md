# White Room Schema Models - Cross-Platform Implementation

This directory contains C++ implementations of the White Room core schemas, matching the JSON schemas in `/sdk/packages/schemas/schemas/`.

## Overview

The White Room system uses three core schemas that must be implemented identically across all platforms:

1. **SongContract_v1** (SchillingerSong_v1.schema.json) - Theory layer contract
2. **SongState_v1** (SongModel_v1.schema.json) - Executable song representation  
3. **PerformanceState_v1** (PerformanceState_v1.schema.json) - Performance realization lens

## Architecture

```
User Intent
     ↓
SongContract (Theory: Schillinger systems, parameters)
     ↓
SongState (Executable: Notes, timeline, projections)
     ↓
PerformanceState (Lens: Instrumentation, density, mixing)
     ↓
RenderedSongGraph (Audio-ready rendering graph)
```

## Files

### PerformanceState_v1.h
- **Purpose**: Defines how a song is realized (solo piano, SATB, ambient techno, etc.)
- **Key Types**:
  - `PerformanceState_v1` - Main performance state structure
  - `ArrangementStyle` - Enum of arrangement styles
  - `InstrumentAssignment` - Maps roles to instruments
  - `MixTarget` - Per-role gain/pan settings
- **Features**:
  - JSON serialization/deserialization
  - Validation methods
  - Factory methods for common performance types

## Cross-Platform Compatibility

All platforms must serialize/deserialize identically:

- **TypeScript** (`/sdk/packages/sdk/src/song/`):
  - `performance_state.ts`
  - `song_contract.ts`
  - `song_state_v1.ts`

- **Swift** (`/swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Audio/`):
  - `PerformanceState_v1.swift`
  - `SongModels.swift`

- **C++** (`/juce_backend/include/models/`):
  - `PerformanceState_v1.h`
  - `SongContract_v1.h` (TODO)
  - `SongState_v1.h` (TODO)

## JSON Schema Compliance

All implementations must:
1. Match the JSON schema exactly
2. Validate at compile/build time
3. Serialize to/from JSON identically
4. Use same field names and types
5. Support same enum values

## Usage Example

```cpp
// Create a solo piano performance
auto perf = PerformanceState_v1::createSoloPiano();
assert(perf.isValid());

// Serialize to JSON
std::string json = perf.toJson();

// Deserialize from JSON
auto perf2 = PerformanceState_v1::fromJson(json);
assert(perf2.isValid());
```

## Validation

Each struct has:
- `isValid()` method - Runtime validation
- Factory methods - Create valid instances
- Type-safe enums - Compile-time guarantees

## Future Work

- [ ] Complete SongContract_v1.h implementation
- [ ] Complete SongState_v1.h implementation
- [ ] Add comprehensive unit tests
- [ ] Add JSON schema validation
- [ ] Cross-platform integration tests

## Contact

For questions about schema implementation, please refer to:
- BD issue: white_room-224
- Schema definitions: `/sdk/packages/schemas/schemas/`
