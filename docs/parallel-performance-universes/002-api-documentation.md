# Parallel Performance Universes - API Documentation

## Overview

This document provides comprehensive API reference for the Parallel Performance Universes feature across all platform layers:

- **TypeScript SDK** - Core data models and management APIs
- **JUCE Backend (C++)** - Audio rendering and FFI bridge
- **Swift Frontend** - iOS/macOS/tvOS UI and integration

---

## Table of Contents

1. [TypeScript SDK APIs](#typescript-sdk-apis)
2. [JUCE Backend APIs](#juce-backend-apis)
3. [Swift Frontend APIs](#swift-frontend-apis)
4. [FFI Bridge Specification](#ffi-bridge-specification)
5. [Code Examples](#code-examples)

---

## TypeScript SDK APIs

### Location

```
/Users/bretbouchard/apps/schill/white_room/sdk/packages/sdk/src/
├── song/
│   ├── performance_realization.ts
│   ├── performance_manager.ts
│   └── performance_configuration.ts
└── validation/
    └── performance_validator.ts
```

### PerformanceRealizationV1 Type

**File**: `performance_realization.ts`

```typescript
interface PerformanceRealizationV1 {
  readonly version: '1.0';
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  // Arrangement
  readonly arrangementStyle: ArrangementStyle;

  // Density and groove
  readonly density: number; // 0.0 (sparse) to 1.0 (full)
  readonly grooveProfileId: string;

  // Instrumentation: How roles map to instruments
  readonly instrumentationMap: readonly InstrumentationEntry[];

  // ConsoleX integration
  readonly consoleXProfileId?: string;

  // Mix targets
  readonly mixTargets: readonly MixTargetEntry[];

  // Register constraints
  readonly registerMap: readonly RegisterEntry[];

  // Timestamps
  readonly createdAt: number;
  readonly modifiedAt: number;
}
```

#### Type Definitions

```typescript
// Arrangement style categories
type ArrangementStyle =
  | 'SOLO_PIANO'
  | 'SATB'
  | 'CHAMBER_ENSEMBLE'
  | 'FULL_ORCHESTRA'
  | 'JAZZ_COMBO'
  | 'ROCK_BAND'
  | 'AMBIENT_TECHNO'
  | 'ELECTRONIC'
  | 'ACAPPELLA'
  | 'CUSTOM';

// Instrumentation mapping
interface InstrumentationEntry {
  readonly roleId: string;        // Functional role UUID
  readonly voiceId?: string;      // Optional: specific voice UUID
  readonly instrumentId: InstrumentType;
  readonly presetId: string;
  readonly busId: string;
}

// Instrument types
type InstrumentType =
  | 'LocalGal'
  | 'KaneMarco'
  | 'KaneMarcoAether'
  | 'KaneMarcoAetherString'
  | 'NexSynth'
  | 'SamSampler'
  | 'DrumMachine';

// Register mapping
interface RegisterEntry {
  readonly roleId: string;
  readonly minPitch: number; // 0-127 (MIDI note)
  readonly maxPitch: number; // 0-127 (MIDI note)
}

// Mix targets
interface MixTargetEntry {
  readonly roleId: string;
  readonly gain: number; // dB
  readonly pan: number; // -1.0 (left) to +1.0 (right)
}
```

### PerformanceManager Class

**File**: `performance_manager.ts`

```typescript
class PerformanceManager {
  constructor(options: PerformanceManagerOptions);

  // CRUD operations
  listPerformances(): PerformanceRealizationV1[];
  getPerformance(performanceId: string): PerformanceRealizationV1 | undefined;
  getActivePerformance(): PerformanceRealizationV1 | undefined;
  createPerformance(options: CreatePerformanceOptions): ManagerResult<PerformanceRealizationV1>;
  updatePerformance(options: UpdatePerformanceOptions): ManagerResult<PerformanceRealizationV1>;
  deletePerformance(performanceId: string): ManagerResult<void>;

  // Performance switching
  switchPerformance(performanceId: string): ManagerResult<PerformanceRealizationV1>;
  blendPerformances(
    performanceAId: string,
    performanceBId: string,
    t: number
  ): ManagerResult<BlendResult>;

  // Utilities
  validatePerformance(performance: unknown): ValidationResult;
  getSongModel(): SongModel_v1;
  initializeDefaultPerformances(): ManagerResult<PerformanceRealizationV1[]>;
}
```

#### Constructor

```typescript
interface PerformanceManagerOptions {
  readonly songModel: SongModel_v1;
}

const manager = new PerformanceManager({ songModel: mySongModel });
```

#### listPerformances()

Get all performances for this song.

```typescript
const performances: PerformanceRealizationV1[] = manager.listPerformances();
// Returns: [pianoPerf, satbPerf, technoPerf]
```

**Returns**: Array of all performance realizations

#### getPerformance()

Get a specific performance by ID.

```typescript
const performance = manager.getPerformance('perf-uuid-123');
if (performance) {
  console.log(performance.name); // "Solo Piano"
}
```

**Parameters**:
- `performanceId` (string): UUID of the performance

**Returns**: Performance object or `undefined` if not found

#### getActivePerformance()

Get the currently active performance.

```typescript
const active = manager.getActivePerformance();
console.log('Currently playing:', active?.name); // "Solo Piano"
```

**Returns**: Active performance or `undefined` if none set

#### createPerformance()

Create a new performance for this song.

```typescript
const result = manager.createPerformance({
  name: 'Jazz Trio',
  description: 'Piano, bass, drums',
  performance: {
    arrangementStyle: 'JAZZ_COMBO',
    density: 0.5,
    grooveProfileId: 'groove-jazz-medium',
    instrumentationMap: [
      {
        roleId: 'primary',
        instrumentId: 'NexSynth',
        presetId: 'jazz-piano',
        busId: 'bus-piano'
      },
      {
        roleId: 'secondary',
        instrumentId: 'LocalGal',
        presetId: 'upright-bass',
        busId: 'bus-bass'
      }
    ],
    consoleXProfileId: 'consolex-jazz',
    mixTargets: [
      { roleId: 'primary', gain: -3.0, pan: 0.0 },
      { roleId: 'secondary', gain: -6.0, pan: -0.2 }
    ],
    registerMap: [
      { roleId: 'primary', minPitch: 48, maxPitch: 84 },
      { roleId: 'secondary', minPitch: 28, maxPitch: 60 }
    ]
  }
});

if (result.success) {
  console.log('Created performance:', result.data?.id);
}
```

**Parameters**:
- `options.name` (string): Performance name
- `options.description` (string, optional): Description
- `options.performance` (object): Performance configuration

**Returns**: `ManagerResult<PerformanceRealizationV1>`

```typescript
interface ManagerResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ManagerError;
}

interface ManagerError {
  readonly code: 'NOT_FOUND' | 'ALREADY_EXISTS' | 'INVALID_DATA' | 'INTERNAL_ERROR';
  readonly message: string;
  readonly details?: unknown;
}
```

#### updatePerformance()

Update an existing performance.

```typescript
const result = manager.updatePerformance({
  performanceId: 'perf-uuid-123',
  updates: {
    density: 0.7, // Increase density
    name: 'Solo Piano (Dense)' // Update name
  }
});
```

**Parameters**:
- `performanceId` (string): UUID of performance to update
- `updates` (Partial<PerformanceRealizationV1>): Fields to update

**Returns**: `ManagerResult<PerformanceRealizationV1>`

#### deletePerformance()

Delete a performance.

```typescript
const result = manager.deletePerformance('perf-uuid-123');
if (!result.success) {
  console.error('Cannot delete:', result.error?.message);
}
```

**Constraints**:
- Cannot delete the last performance
- Cannot delete the active performance

**Returns**: `ManagerResult<void>`

#### switchPerformance()

Switch the active performance (core operation for Parallel Performance Universes).

```typescript
const result = manager.switchPerformance('techno-perf-id');
if (result.success) {
  console.log('Switched to:', result.data?.name);
  // Audio engine will render with new performance at next bar boundary
}
```

**Parameters**:
- `performanceId` (string): UUID of target performance

**Returns**: `ManagerResult<PerformanceRealizationV1>`

**Behavior**:
- Updates `SongModel.activePerformanceId`
- Triggers bar-boundary transition in audio engine
- No audio glitches (waits for quiet moment)

#### blendPerformances()

Blend two performances (future feature for smooth transitions).

```typescript
const result = manager.blendPerformances('piano-id', 'techno-id', 0.5);
if (result.success) {
  console.log('Blending 50/50');
  // Audio engine renders both performances with equal power crossfade
}
```

**Parameters**:
- `performanceAId` (string): First performance UUID
- `performanceBId` (string): Second performance UUID
- `t` (number): Blend parameter (0.0 = 100% A, 1.0 = 100% B)

**Returns**: `ManagerResult<BlendResult>`

```typescript
interface BlendResult {
  readonly blend: number;
  readonly from: PerformanceRealizationV1;
  readonly to: PerformanceRealizationV1;
}
```

### Factory Functions

**File**: `performance_realization.ts`

```typescript
// Create solo piano performance
function createSoloPianoPerformance(): PerformanceRealizationV1;

// Create SATB choir performance
function createSATBPerformance(): PerformanceRealizationV1;

// Create ambient techno performance
function createAmbientTechnoPerformance(): PerformanceRealizationV1;

// Create minimal performance
function createMinimalPerformanceRealization(
  name: string,
  arrangementStyle: ArrangementStyle
): PerformanceRealizationV1;

// Clone with updates
function clonePerformanceRealization(
  performance: PerformanceRealizationV1,
  updates: Partial<Omit<PerformanceRealizationV1, 'version' | 'id' | 'createdAt'>>
): PerformanceRealizationV1;
```

#### Example Usage

```typescript
// Get preset performances
const piano = createSoloPianoPerformance();
const satb = createSATBPerformance();
const techno = createAmbientTechnoPerformance();

// Create custom performance
const custom = createMinimalPerformanceRealization('My Performance', 'CUSTOM');

// Clone and modify
const densePiano = clonePerformanceRealization(piano, {
  density: 0.8,
  name: 'Dense Piano'
});
```

### Validation APIs

**File**: `performance_realization.ts`

```typescript
// Validate performance object
function validatePerformanceRealization(
  performance: unknown
): ValidationResult;

// Type guard
function isPerformanceRealizationV1(
  value: unknown
): value is PerformanceRealizationV1;
```

#### ValidationResult

```typescript
interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly value: unknown;
}
```

#### Example Usage

```typescript
// Validate before saving
const result = validatePerformanceRealization(userInput);
if (!result.valid) {
  result.errors.forEach(error => {
    console.error(`${error.path}: ${error.message}`);
  });
}

// Type guard for type safety
if (isPerformanceRealizationV1(obj)) {
  // TypeScript knows obj is PerformanceRealizationV1
  console.log(obj.arrangementStyle);
}
```

---

## JUCE Backend APIs

### Location

```
/Users/bretbouchard/apps/schill/white_room/juce_backend/src/
├── ffi/
│   ├── include/ffi_server.h
│   └── src/ffi_server.cpp
├── models/
│   ├── SongContract.h
│   └── PerformanceRealization.h
└── audio/
    ├── SongModelAdapter.h
    └── SongModelAdapter.cpp
```

### SongModelAdapter Class

**File**: `audio/SongModelAdapter.h`

```cpp
class SongModelAdapter {
public:
  SongModelAdapter();
  ~SongModelAdapter();

  // Load song model
  bool loadFromJSON(const std::string& jsonString);

  // Render with specific performance
  RenderedSongGraph renderSong(
    const std::string& performanceId
  ) const;

  // Render blended performance (future)
  RenderedSongGraph renderSongBlend(
    const std::string& perfA,
    const std::string& perfB,
    double t
  ) const;

  // Get available performances
  std::vector<PerformanceRealization> getPerformances() const;

  // Get active performance
  PerformanceRealization getActivePerformance() const;

  // Set active performance
  void setActivePerformance(const std::string& performanceId);

private:
  SongModel_v1 songModel_;
  std::unique_ptr<AudioEngine> audioEngine_;
};
```

#### renderSong()

Render the song under a specific performance.

```cpp
// Load song
SongModelAdapter adapter;
adapter.loadFromJSON(songJsonString);

// Render with Piano performance
auto pianoGraph = adapter.renderSong("piano-perf-id");

// Render with Techno performance
auto technoGraph = adapter.renderSong("techno-perf-id");

// Graphs are different (different instruments, routing, etc.)
```

**Parameters**:
- `performanceId` (string): UUID of performance to render

**Returns**: `RenderedSongGraph` containing complete audio graph

**Behavior**:
1. Parse SongState from SongModel
2. Find PerformanceRealization by ID
3. Apply instrumentation mapping
4. Apply density scaling
5. Apply groove profile
6. Build RenderGraph with routing
7. Load instrument instances
8. Configure ConsoleX strips

#### renderSongBlend()

Render blended performance (future feature).

```cpp
// Crossfade between Piano and Techno
auto blendedGraph = adapter.renderSongBlend("piano-id", "techno-id", 0.5);
// t = 0.5 → 50% Piano, 50% Techno
```

**Parameters**:
- `perfA` (string): First performance UUID
- `perfB` (string): Second performance UUID
- `t` (double): Blend parameter (0.0 to 1.0)

**Returns**: `RenderedSongGraph` with crossfaded audio

**Implementation** (v1):
```cpp
RenderedSongGraph SongModelAdapter::renderSongBlend(
  const std::string& perfA,
  const std::string& perfB,
  double t
) const {
  // Render both performances
  auto graphA = renderSong(perfA);
  auto graphB = renderSong(perfB);

  // Create crossfade node
  auto crossfade = std::make_unique<CrossfadeNode>();
  crossfade->setBlendParameter(t);

  // Connect graphs
  crossfade->setInputA(graphA.masterBus);
  crossfade->setInputB(graphB.masterBus);

  // Return blended graph
  return RenderedSongGraph{
    .masterBus = crossfade->getOutput(),
    .instrumentNodes = {/* combined nodes */},
    // ...
  };
}
```

### FFI Server APIs

**File**: `ffi/include/ffi_server.h`

```cpp
class FFIServer {
public:
  // Realize song contract
  FFIResult realize(const nlohmann::json& contractJson);

  // Reconcile song state
  FFIResult reconcile(const nlohmann::json& contractJson);

  // Load song with performance
  FFIResult loadSong(
    const nlohmann::json& songModelJson,
    const std::string& performanceId
  );

  // Switch performance
  FFIResult switchPerformance(const std::string& performanceId);

  // Blend performances (future)
  FFIResult blendPerformances(
    const std::string& perfA,
    const std::string& perfB,
    double t
  );
};
```

#### FFIResult

```cpp
struct FFIResult {
  bool isSuccess;
  FFIErrorCode code;
  std::string message;
  nlohmann::json data;

  static FFIResult success(const nlohmann::json& data);
  static FFIResult error(FFIErrorCode code, const std::string& message);
};

enum class FFIErrorCode {
  SUCCESS = 0,
  VALIDATION_ERROR = 1,
  NOT_FOUND = 2,
  ALREADY_EXISTS = 3,
  INTERNAL_ERROR = 4
};
```

#### Example Usage

```cpp
// Create FFI server
FFIServer server;

// Load song
auto result = server.loadSong(songModelJson, "piano-perf-id");
if (!result.isSuccess) {
  std::cerr << "Error: " << result.message << std::endl;
  return;
}

// Switch performance
auto switchResult = server.switchPerformance("techno-perf-id");
if (switchResult.isSuccess) {
  std::cout << "Switched to Techno performance" << std::endl;
}

// Blend performances (future)
auto blendResult = server.blendPerformances("piano-id", "techno-id", 0.5);
if (blendResult.isSuccess) {
  std::cout << "Blending 50/50" << std::endl;
}
```

### PerformanceRealization Struct

**File**: `models/PerformanceRealization.h`

```cpp
struct PerformanceRealization {
  std::string version;
  std::string id;
  std::string name;
  std::optional<std::string> description;

  ArrangementStyle arrangementStyle;
  double density;
  std::string grooveProfileId;

  std::vector<InstrumentationEntry> instrumentationMap;
  std::optional<std::string> consoleXProfileId;
  std::vector<MixTargetEntry> mixTargets;
  std::vector<RegisterEntry> registerMap;

  int64_t createdAt;
  int64_t modifiedAt;
};

enum class ArrangementStyle {
  SOLO_PIANO,
  SATB,
  CHAMBER_ENSEMBLE,
  FULL_ORCHESTRA,
  JAZZ_COMBO,
  ROCK_BAND,
  AMBIENT_TECHNO,
  ELECTRONIC,
  ACAPPELLA,
  CUSTOM
};

struct InstrumentationEntry {
  std::string roleId;
  std::optional<std::string> voiceId;
  InstrumentType instrumentId;
  std::string presetId;
  std::string busId;
};

enum class InstrumentType {
  LocalGal,
  KaneMarco,
  KaneMarcoAether,
  KaneMarcoAetherString,
  NexSynth,
  SamSampler,
  DrumMachine
};

struct RegisterEntry {
  std::string roleId;
  int minPitch; // 0-127
  int maxPitch; // 0-127
};

struct MixTargetEntry {
  std::string roleId;
  double gain; // dB
  double pan; // -1.0 to +1.0
};
```

---

## Swift Frontend APIs

### Location

```
/Users/bretbouchard/apps/schill/white_room/swift_frontend/src/
├── SwiftFrontendCore/
│   ├── Models/
│   │   ├── SongContract.swift
│   │   ├── SongState.swift
│   │   └── PerformanceState.swift
│   ├── Audio/
│   │   ├── JUCEEngine.swift
│   │   ├── ProjectionModels.swift
│   │   └── ProjectionEngine.swift
│   └── Surface/
│       └── SurfaceRootView.swift
```

### PerformanceState Struct

**File**: `Models/PerformanceState.swift`

```swift
struct PerformanceState: Identifiable, Codable {
  let version: String
  let id: UUID
  var name: String
  var description: String?

  // Arrangement
  var arrangementStyle: ArrangementStyle

  // Density and groove
  var density: Double // 0.0 to 1.0
  var grooveProfileId: UUID

  // Instrumentation
  var instrumentationMap: [InstrumentationEntry]

  // ConsoleX
  var consoleXProfileId: UUID?

  // Mix targets
  var mixTargets: [MixTargetEntry]

  // Register map
  var registerMap: [RegisterEntry]

  // Timestamps
  let createdAt: Date
  var modifiedAt: Date
}

enum ArrangementStyle: String, Codable, CaseIterable {
  case soloPiano = "SOLO_PIANO"
  case satb = "SATB"
  case chamberEnsemble = "CHAMBER_ENSEMBLE"
  case fullOrchestra = "FULL_ORCHESTRA"
  case jazzCombo = "JAZZ_COMBO"
  case rockBand = "ROCK_BAND"
  case ambientTechno = "AMBIENT_TECHNO"
  case electronic = "ELECTRONIC"
  case acappella = "ACAPPELLA"
  case custom = "CUSTOM"
}

struct InstrumentationEntry: Codable {
  let roleId: UUID
  let voiceId: UUID?
  let instrumentId: InstrumentType
  let presetId: String
  let busId: UUID
}

enum InstrumentType: String, Codable, CaseIterable {
  case localGal = "LocalGal"
  case kaneMarco = "KaneMarco"
  case kaneMarcoAether = "KaneMarcoAether"
  case kaneMarcoAetherString = "KaneMarcoAetherString"
  case nexSynth = "NexSynth"
  case samSampler = "SamSampler"
  case drumMachine = "DrumMachine"
}

struct RegisterEntry: Codable {
  let roleId: UUID
  let minPitch: Int // 0-127
  let maxPitch: Int // 0-127
}

struct MixTargetEntry: Codable {
  let roleId: UUID
  let gain: Double // dB
  let pan: Double // -1.0 to +1.0
}
```

### JUCEEngine Class

**File**: `Audio/JUCEEngine.swift`

```swift
class JUCEEngine: ObservableObject {
  // Singleton
  static let shared = JUCEEngine()

  // Project song with performance
  func projectSong(
    _ song: Song,
    performance: PerformanceState,
    config: ProjectionConfig
  ) -> Result<ProjectionResult, ProjectionError>

  // Project blended performance (future)
  func projectSongBlend(
    _ song: Song,
    perfA: PerformanceState,
    perfB: PerformanceState,
    t: Double
  ) -> Result<ProjectionResult, ProjectionError>

  // Switch performance
  func switchPerformance(to performanceId: UUID) -> Bool
}
```

#### projectSong()

Project song with specific performance.

```swift
let engine = JUCEEngine.shared

// Load song
let song = try loadSong(named: "My Song")

// Create performance
let pianoPerformance = PerformanceState(
  name: "Solo Piano",
  arrangementStyle: .soloPiano,
  density: 0.3,
  grooveProfileId: UUID(),
  instrumentationMap: [
    InstrumentationEntry(
      roleId: UUID(),
      instrumentId: .nexSynth,
      presetId: "grand-piano",
      busId: UUID()
    )
  ],
  // ...
)

// Project song
let config = ProjectionConfig(
  renderMode: .realtime,
  validateGraph: true
)

let result = engine.projectSong(song, performance: pianoPerformance, config: config)

switch result {
case .success(let projectionResult):
  print("Rendered graph with \(projectionResult.graph.nodes.count) nodes")
case .failure(let error):
  print("Projection failed: \(error)")
}
```

#### ProjectionConfig

```swift
struct ProjectionConfig {
  var renderMode: RenderMode
  var durationOverride: Double? // nil = use song duration
  var validateGraph: Bool
  var includeAutomation: Bool
}

enum RenderMode {
  case realtime      // Real-time playback
  case bounce        // Offline bounce
  case export        // Export to file
}
```

#### ProjectionResult

```swift
struct ProjectionResult {
  let graph: RenderGraph
  let instrumentationReport: InstrumentationReport
  let consoleXConfig: ConsoleXConfig
  let warnings: [ProjectionWarning]
  let timingStats: ProjectionTimingStats
}

struct InstrumentationReport {
  let instrumentsUsed: [InstrumentType]
  let voiceCount: Int
  let estimatedCpuUsage: Double
}

struct ProjectionWarning {
  let message: String
  let severity: WarningSeverity
}

enum WarningSeverity {
  case info
  case warning
  case error
}

struct ProjectionTimingStats {
  let projectionDuration: TimeInterval
  let validationDuration: TimeInterval
  let totalDuration: TimeInterval
}
```

#### ProjectionError

```swift
enum ProjectionError: Error, LocalizedError {
  case invalidSong(SongContract)
  case invalidPerformance(PerformanceState)
  case missingInstrument(roleId: UUID, instrumentType: InstrumentType)
  case incompatibleRole(roleId: UUID, instrumentType: InstrumentType)
  case graphValidationFailed(errors: [ValidationError])
  case generationFailed(SchillingerError)
  case projectionTimeout(TimeInterval)

  var errorDescription: String? {
    switch self {
    case .invalidSong:
      return "Song contract is invalid or corrupted"
    case .invalidPerformance:
      return "Performance state is invalid or corrupted"
    case .missingInstrument(let roleId, let instrumentType):
      return "Missing instrument: \(instrumentType) for role \(roleId)"
    case .incompatibleRole(let roleId, let instrumentType):
      return "Instrument \(instrumentType) cannot play role \(roleId)"
    case .graphValidationFailed(let errors):
      return "Graph validation failed: \(errors.map { $0.message }.joined(separator: ", "))"
    case .generationFailed(let error):
      return "Schillinger generation failed: \(error.localizedDescription)"
    case .projectionTimeout(let duration):
      return "Projection timed out after \(duration)s"
    }
  }
}
```

### PerformanceManager (Swift)

**File**: `Audio/PerformanceManager.swift`

```swift
class PerformanceManager: ObservableObject {
  @Published var performances: [PerformanceState] = []
  @Published var activePerformanceId: UUID?

  // CRUD operations
  func createPerformance(_ performance: PerformanceState) -> Bool
  func updatePerformance(_ performance: PerformanceState) -> Bool
  func deletePerformance(_ performanceId: UUID) -> Bool

  // Performance switching
  func switchPerformance(to performanceId: UUID) -> Bool

  // Blend performances (future)
  func blendPerformances(
    _ perfA: PerformanceState,
    _ perfB: PerformanceState,
    t: Double
  ) -> PerformanceState?
}
```

#### Example Usage

```swift
// Create manager
let manager = PerformanceManager()

// Create performances
let piano = createSoloPianoPerformance()
let techno = createAmbientTechnoPerformance()

manager.performances = [piano, techno]
manager.activePerformanceId = piano.id

// Switch performance
manager.switchPerformance(to: techno.id)

// Blend performances (future)
if let blended = manager.blendPerformances(piano, techno, t: 0.5) {
  print("Blended performance: \(blended.name)")
}
```

---

## FFI Bridge Specification

### Communication Protocol

**Transport**: JSON over C function calls

**Direction**: Swift/TS ↔ JUCE (FFI Server)

### API Contract

#### realize()

```typescript
// TypeScript/Swift
interface RealizeRequest {
  contractJson: string; // SongContract JSON
}

interface RealizeResponse {
  success: boolean;
  songStateJson?: string; // SongState JSON
  error?: FFIError;
}

// JUCE (C++)
FFIResult FFIServer::realize(const nlohmann::json& contractJson);
```

#### reconcile()

```typescript
// TypeScript/Swift
interface ReconcileRequest {
  contractJson: string; // Updated SongContract JSON
}

interface ReconcileResponse {
  success: boolean;
  reconciliationReport?: ReconciliationReport;
  error?: FFIError;
}

// JUCE (C++)
FFIResult FFIServer::reconcile(const nlohmann::json& contractJson);
```

#### loadSong()

```typescript
// TypeScript/Swift
interface LoadSongRequest {
  songModelJson: string; // SongModel JSON with performances
  performanceId?: string; // Optional: specific performance to load
}

interface LoadSongResponse {
  success: boolean;
  renderGraph?: RenderGraph;
  error?: FFIError;
}

// JUCE (C++)
FFIResult FFIServer::loadSong(
  const nlohmann::json& songModelJson,
  const std::string& performanceId
);
```

#### switchPerformance()

```typescript
// TypeScript/Swift
interface SwitchPerformanceRequest {
  performanceId: string;
}

interface SwitchPerformanceResponse {
  success: boolean;
  previousPerformanceId?: string;
  currentPerformanceId?: string;
  error?: FFIError;
}

// JUCE (C++)
FFIResult FFIServer::switchPerformance(const std::string& performanceId);
```

#### blendPerformances() (Future)

```typescript
// TypeScript/Swift
interface BlendPerformancesRequest {
  performanceAId: string;
  performanceBId: string;
  t: number; // 0.0 to 1.0
}

interface BlendPerformancesResponse {
  success: boolean;
  blendedGraph?: RenderGraph;
  error?: FFIError;
}

// JUCE (C++)
FFIResult FFIServer::blendPerformances(
  const std::string& perfA,
  const std::string& perfB,
  double t
);
```

### Error Codes

```typescript
enum FFIErrorCode {
  SUCCESS = 0,
  VALIDATION_ERROR = 1,
  NOT_FOUND = 2,
  ALREADY_EXISTS = 3,
  INTERNAL_ERROR = 4
}

interface FFIError {
  code: FFIErrorCode;
  message: string;
  details?: unknown;
}
```

---

## Code Examples

### Example 1: Create Custom Performance

```typescript
import {
  PerformanceManager,
  createMinimalPerformanceRealization,
  ArrangementStyle
} from '@whiteroom/sdk';

// Create manager
const manager = new PerformanceManager({ songModel: mySong });

// Create jazz trio performance
const jazzTrio = manager.createPerformance({
  name: 'Jazz Trio',
  description: 'Piano, upright bass, drums',
  performance: {
    arrangementStyle: 'JAZZ_COMBO' as ArrangementStyle,
    density: 0.5,
    grooveProfileId: 'groove-medium-swing',
    instrumentationMap: [
      {
        roleId: 'primary',
        instrumentId: 'NexSynth',
        presetId: 'jazz-grand-piano',
        busId: 'bus-piano'
      },
      {
        roleId: 'secondary',
        instrumentId: 'LocalGal',
        presetId: 'upright-bass',
        busId: 'bus-bass'
      },
      {
        roleId: 'tertiary',
        instrumentId: 'DrumMachine',
        presetId: 'jazz-drums-brush',
        busId: 'bus-drums'
      }
    ],
    consoleXProfileId: 'consolex-jazz-club',
    mixTargets: [
      { roleId: 'primary', gain: -3.0, pan: 0.0 },
      { roleId: 'secondary', gain: -6.0, pan: -0.2 },
      { roleId: 'tertiary', gain: -9.0, pan: 0.0 }
    ],
    registerMap: [
      { roleId: 'primary', minPitch: 48, maxPitch: 84 },
      { roleId: 'secondary', minPitch: 28, maxPitch: 60 },
      { roleId: 'tertiary', minPitch: 0, maxPitch: 127 }
    ]
  }
});

if (jazzTrio.success) {
  console.log('Created jazz trio performance');
}
```

### Example 2: Switch Performances

```swift
// Swift
import SwiftFrontendCore

class PerformanceSwitcher: ObservableObject {
  @Published var currentPerformance: PerformanceState?

  func switchToPerformance(named name: String) {
    guard let performance = manager.performances.first(where: { $0.name == name }) else {
      print("Performance not found: \(name)")
      return
    }

    // Switch in manager
    let success = manager.switchPerformance(to: performance.id)

    if success {
      // Project in audio engine
      let result = JUCEEngine.shared.projectSong(
        currentSong,
        performance: performance,
        config: ProjectionConfig(renderMode: .realtime)
      )

      switch result {
      case .success(let projection):
        print("Switched to \(name) successfully")
        self.currentPerformance = performance
      case .failure(let error):
        print("Failed to switch: \(error.localizedDescription)")
      }
    }
  }
}

// Usage
let switcher = PerformanceSwitcher()
switcher.switchToPerformance(named: "Ambient Techno")
```

### Example 3: Blend Performances (Future)

```typescript
// TypeScript
import { PerformanceManager } from '@whiteroom/sdk';

const manager = new PerformanceManager({ songModel: mySong });

// Get two performances
const piano = manager.getPerformance('piano-id');
const techno = manager.getPerformance('techno-id');

if (piano && techno) {
  // Blend 50/50
  const result = manager.blendPerformances(piano.id, techno.id, 0.5);

  if (result.success) {
    const { blend, from, to } = result.data!;
    console.log(`Blending ${blend * 100}% from ${from.name} to ${to.name}`);

    // In audio engine, dual-render crossfade happens automatically
    // JUCE renders both performances and crossfades output
  }
}
```

### Example 4: Validate Performance

```typescript
import { validatePerformanceRealization } from '@whiteroom/sdk';

// User input from UI
const userInput = {
  name: 'My Performance',
  arrangementStyle: 'CUSTOM',
  density: 0.7,
  grooveProfileId: 'groove-123',
  instrumentationMap: [
    {
      roleId: 'primary',
      instrumentId: 'NexSynth',
      presetId: 'preset-456',
      busId: 'bus-789'
    }
  ],
  // ... missing required fields
};

// Validate before creating
const validation = validatePerformanceRealization(userInput);

if (!validation.valid) {
  console.error('Validation errors:');
  validation.errors.forEach(error => {
    console.error(`  ${error.path}: ${error.message}`);
  });
} else {
  // Safe to create performance
  manager.createPerformance({
    name: userInput.name,
    performance: userInput
  });
}
```

---

## Summary

This API reference covers:

- **TypeScript SDK**: PerformanceRealizationV1, PerformanceManager, factory functions, validation
- **JUCE Backend**: SongModelAdapter, FFIServer, rendering APIs
- **Swift Frontend**: PerformanceState, JUCEEngine, PerformanceManager
- **FFI Bridge**: realize, reconcile, loadSong, switchPerformance, blendPerformances

All APIs are designed for:
- **Type safety** across TypeScript, C++, and Swift
- **Immutable data** with copy-on-write updates
- **Clear error handling** with detailed error messages
- **Cross-platform compatibility** via JSON serialization
- **Extensibility** for future enhancements (morphing, presets, AI)

For usage examples, see the [User Guide](./003-user-guide.md).
For integration details, see the [Developer Guide](./004-developer-guide.md).
