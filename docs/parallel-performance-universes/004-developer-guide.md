# Parallel Performance Universes - Developer Guide

## Overview

This guide is for developers who want to integrate with, extend, or debug the Parallel Performance Universes feature.

### Target Audience

- **SDK Developers**: Working with TypeScript SDK
- **Audio Engineers**: Integrating JUCE backend
- **iOS/macOS Developers**: Building Swift frontend UI
- **Plugin Developers**: Creating custom instruments/effects
- **Contributors**: Adding features or fixing bugs

### Prerequisites

- **TypeScript**: Node.js 18+, npm/yarn
- **C++**: C++17, CMake 3.15+
- **Swift**: Swift 5.9+, Xcode 15+
- **JUCE**: JUCE 7.0+
- **Git**: For repository management

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Integration Points](#integration-points)
3. [Extension Points](#extension-points)
4. [Debugging Guide](#debugging-guide)
5. [Performance Optimization](#performance-optimization)
6. [Testing Strategies](#testing-strategies)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)

---

## Architecture Overview

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                    SWIFT FRONTEND                           │
│  • UI: SurfaceRootView, PerformanceStrip                   │
│  • Audio: JUCEEngine, ProjectionEngine                     │
│  • Models: SongState, PerformanceState                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ FFI Bridge
                           │ (JSON serialization)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      JUCE BACKEND                           │
│  • FFI: FFIServer, SongModelAdapter                        │
│  • Audio: AudioEngine, InstrumentFactory                   │
│  • Mixer: ConsoleSystem, ConsoleChannelDSP                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                       AUDIO OUTPUT                          │
│  • Real-time playback                                       │
│  • Offline bounce/export                                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```typescript
// 1. User taps "Techno" performance in Swift UI
SurfaceRootView.userTapsPerformance("techno-id")

// 2. Swift frontend updates active performance
PerformanceManager.switchPerformance(to: "techno-id")

// 3. Swift calls JUCE via FFI
JUCEEngine.switchPerformance("techno-id")

// 4. JUCE FFI server processes request
FFIServer.switchPerformance("techno-id")

// 5. JUCE re-renders song with new performance
SongModelAdapter.renderSong("techno-id")

// 6. Audio output transforms
AudioEngine.processBlock() // Now rendering Techno performance
```

---

## Integration Points

### File Structure

```
white_room/
├── sdk/                          # TypeScript SDK
│   └── packages/sdk/src/
│       ├── song/
│       │   ├── performance_realization.ts     # Performance type
│       │   ├── performance_manager.ts         # CRUD operations
│       │   └── performance_configuration.ts   # Configuration type
│       └── validation/
│           └── performance_validator.ts       # Validation logic
│
├── juce_backend/                 # JUCE C++ backend
│   └── src/
│       ├── ffi/
│       │   ├── include/ffi_server.h           # FFI interface
│       │   └── src/ffi_server.cpp             # FFI implementation
│       ├── audio/
│       │   ├── SongModelAdapter.h             # Rendering logic
│       │   └── AudioEngine.h                  # Audio engine
│       └── models/
│           └── PerformanceRealization.h       # C++ types
│
├── swift_frontend/               # Swift frontend
│   └── src/SwiftFrontendCore/
│       ├── Models/
│       │   └── PerformanceState.swift         # Swift types
│       ├── Audio/
│       │   ├── JUCEEngine.swift               # JUCE bridge
│       │   └── ProjectionEngine.swift         # Projection logic
│       └── Surface/
│           └── SurfaceRootView.swift          # UI components
│
└── docs/                         # Documentation
    └── parallel-performance-universes/
        ├── 001-design-documentation.md
        ├── 002-api-documentation.md
        ├── 003-user-guide.md
        └── 004-developer-guide.md (this file)
```

### SDK Integration

#### Adding Performance Management to Your App

```typescript
import {
  PerformanceManager,
  createPerformanceManager,
  createSoloPianoPerformance,
  createSATBPerformance,
  createAmbientTechnoPerformance
} from '@whiteroom/sdk';

// Create manager for your song
const songModel = loadMySongModel(); // Your SongModel_v1
const manager = createPerformanceManager(songModel);

// Initialize default performances if none exist
const result = manager.initializeDefaultPerformances();
if (result.success) {
  console.log('Created default performances:', result.data);
}

// List performances
const performances = manager.listPerformances();
console.log('Available performances:', performances.map(p => p.name));

// Switch performance
const active = manager.switchPerformance('techno-id');
if (active.success) {
  console.log('Switched to:', active.data.name);
}

// Get updated SongModel for persistence
const updatedSongModel = manager.getSongModel();
saveSongModel(updatedSongModel); // Your persistence logic
```

#### Creating Custom Performance

```typescript
import {
  createMinimalPerformanceRealization,
  ArrangementStyle,
  InstrumentType
} from '@whiteroom/sdk';

// Create jazz trio performance
const jazzTrio = createMinimalPerformanceRealization(
  'Jazz Trio',
  'JAZZ_COMBO' as ArrangementStyle
);

// Customize instrumentation
jazzTrio.instrumentationMap = [
  {
    roleId: 'primary',
    instrumentId: 'NexSynth' as InstrumentType,
    presetId: 'jazz-grand-piano',
    busId: crypto.randomUUID()
  },
  {
    roleId: 'secondary',
    instrumentId: 'LocalGal' as InstrumentType,
    presetId: 'upright-bass',
    busId: crypto.randomUUID()
  },
  {
    roleId: 'tertiary',
    instrumentId: 'DrumMachine' as InstrumentType,
    presetId: 'jazz-brush-kit',
    busId: crypto.randomUUID()
  }
];

// Customize density
jazzTrio.density = 0.5; // Medium density

// Add to song
manager.createPerformance({
  name: jazzTrio.name,
  performance: jazzTrio
});
```

### JUCE Backend Integration

#### Implementing Performance-Aware Rendering

```cpp
// SongModelAdapter.h
class SongModelAdapter {
public:
  // Render song with specific performance
  RenderedSongGraph renderSong(
    const std::string& performanceId
  ) const {
    // 1. Find performance
    auto performance = findPerformance(performanceId);
    if (!performance) {
      throw std::runtime_error("Performance not found");
    }

    // 2. Apply performance to song state
    auto realizedSong = applyPerformance(
      songModel_.songState,
      *performance
    );

    // 3. Build render graph
    auto graph = buildRenderGraph(realizedSong);

    // 4. Load instruments
    loadInstruments(graph, performance->instrumentationMap);

    // 5. Configure ConsoleX
    configureConsoleX(graph, performance->consoleXProfileId);

    return graph;
  }

private:
  SongModel_v1 songModel_;
  std::unique_ptr<AudioEngine> audioEngine_;

  PerformanceRealization* findPerformance(
    const std::string& id
  ) const {
    for (auto& perf : songModel_.performances) {
      if (perf.id == id) {
        return const_cast<PerformanceRealization*>(&perf);
      }
    }
    return nullptr;
  }

  RealizedSong applyPerformance(
    const SongState& songState,
    const PerformanceRealization& performance
  ) const {
    RealizedSong realized;

    // Apply density scaling
    realized.notes = applyDensity(
      songState.notes,
      performance.density
    );

    // Apply register constraints
    realized.notes = applyRegister(
      realized.notes,
      performance.registerMap
    );

    // Apply groove profile
    realized.notes = applyGroove(
      realized.notes,
      performance.grooveProfileId
    );

    // Map to instruments
    realized.instrumentation = performance.instrumentationMap;

    return realized;
  }
};
```

#### FFI Server Integration

```cpp
// ffi_server.cpp
FFIResult FFIServer::loadSong(
  const nlohmann::json& songModelJson,
  const std::string& performanceId
) {
  try {
    // 1. Parse SongModel from JSON
    SongModel_v1 songModel;
    try {
      songModel = songModelJson.get<SongModel_v1>();
    } catch (const std::exception& e) {
      return FFIResult::error(
        FFIErrorCode::VALIDATION_ERROR,
        std::string("Failed to parse SongModel: ") + e.what()
      );
    }

    // 2. Validate SongModel
    auto validation = validator_->validateSongModel(songModelJson);
    if (!validation.isValid) {
      return FFIResult::error(
        FFIErrorCode::VALIDATION_ERROR,
        validation.errorMessage
      );
    }

    // 3. Store SongModel
    songModel_ = songModel;

    // 4. Load with specified performance
    if (!performanceId.empty()) {
      auto result = loadPerformance(performanceId);
      if (!result.isSuccess) {
        return result;
      }
    }

    // 5. Return success
    return FFIResult::success({
      {"songId", songModel.id},
      {"performanceId", performanceId},
      {"loadedAt", std::chrono::system_clock::now()}
    });

  } catch (const std::exception& e) {
    return FFIResult::error(
      FFIErrorCode::INTERNAL_ERROR,
      std::string("Failed to load song: ") + e.what()
    );
  }
}

FFIResult FFIServer::switchPerformance(const std::string& performanceId) {
  // 1. Validate performance exists
  auto performance = findPerformance(performanceId);
  if (!performance) {
    return FFIResult::error(
      FFIErrorCode::NOT_FOUND,
      "Performance not found: " + performanceId
    );
  }

  // 2. Schedule bar-boundary transition
  auto scheduledTime = scheduleBarBoundaryTransition();

  // 3. Update active performance ID
  activePerformanceId_ = performanceId;

  // 4. Return success with transition time
  return FFIResult::success({
    {"previousPerformanceId", activePerformanceId_},
    {"currentPerformanceId", performanceId},
    {"transitionTime", scheduledTime}
  });
}
```

### Swift Frontend Integration

#### Building Performance UI

```swift
// PerformanceStrip.swift
import SwiftUI

struct PerformanceStrip: View {
  @StateObject private var manager = PerformanceManager()
  @State private var selectedPerformanceId: UUID?

  var body: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 16) {
        // Performance cards
        ForEach(manager.performances) { performance in
          PerformanceCard(
            performance: performance,
            isActive: performance.id == selectedPerformanceId,
            onTap: {
              switchToPerformance(performance)
            }
          )
        }

        // Add new performance button
        Button(action: createNewPerformance) {
          Label("New Performance", systemImage: "plus.circle.fill")
        }
      }
      .padding()
    }
  }

  private func switchToPerformance(_ performance: PerformanceState) {
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
      case .success:
        selectedPerformanceId = performance.id
        print("Switched to \(performance.name)")
      case .failure(let error):
        print("Failed to switch: \(error.localizedDescription)")
      }
    }
  }

  private func createNewPerformance() {
    // Open performance editor
    showingPerformanceEditor = true
  }
}

struct PerformanceCard: View {
  let performance: PerformanceState
  let isActive: Bool
  let onTap: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(performance.name)
          .font(.headline)
        if isActive {
          Circle()
            .fill(Color.green)
            .frame(width: 8, height: 8)
        }
      }

      Text(performance.arrangementStyle.rawValue)
        .font(.caption)
        .foregroundColor(.secondary)

      Text("Density: \(Int(performance.density * 100))%")
        .font(.caption)
        .foregroundColor(.secondary)
    }
    .padding()
    .frame(width: 150, height: 100)
    .background(isActive ? Color.accentColor.opacity(0.2) : Color.gray.opacity(0.1))
    .cornerRadius(12)
    .onTapGesture(perform: onTap)
  }
}
```

#### Projection Engine

```swift
// ProjectionEngine.swift
import SwiftFrontendCore

class ProjectionEngine {
  static let shared = ProjectionEngine()

  func project(
    song: Song,
    performance: PerformanceState,
    config: ProjectionConfig
  ) -> Result<ProjectionResult, ProjectionError> {
    // 1. Validate inputs
    guard validateSong(song) else {
      return .failure(.invalidSong(song.contract))
    }

    guard validatePerformance(performance) else {
      return .failure(.invalidPerformance(performance))
    }

    // 2. Start timing
    let startTime = Date()

    // 3. Project song with performance
    let graph: RenderGraph
    do {
      graph = try JUCEBridge.shared.projectSong(
        song: song,
        performance: performance
      )
    } catch {
      return .failure(.generationFailed(error as! SchillingerError))
    }

    // 4. Validate graph
    if config.validateGraph {
      let validation = validateGraph(graph)
      if !validation.isValid {
        return .failure(.graphValidationFailed(errors: validation.errors))
      }
    }

    // 5. Generate report
    let report = generateInstrumentationReport(graph)

    // 6. Build ConsoleX config
    let consoleConfig = buildConsoleXConfig(
      performance.consoleXProfileId
    )

    // 7. Check for warnings
    let warnings = analyzeWarnings(graph, performance)

    // 8. Calculate timing stats
    let endTime = Date()
    let timingStats = ProjectionTimingStats(
      projectionDuration: endTime.timeIntervalSince(startTime),
      validationDuration: 0.0, // Track separately
      totalDuration: endTime.timeIntervalSince(startTime)
    )

    // 9. Return result
    return .success(ProjectionResult(
      graph: graph,
      instrumentationReport: report,
      consoleXConfig: consoleConfig,
      warnings: warnings,
      timingStats: timingStats
    ))
  }
}
```

---

## Extension Points

### Custom Arrangement Styles

Add your own arrangement style by extending the types:

```typescript
// custom_arrangements.ts
import { ArrangementStyle } from '@whiteroom/sdk';

// Define custom arrangement
export const CUSTOM_ARRANGEMENTS = {
  SYNTHWAVE: 'SYNTHWAVE' as ArrangementStyle,
  LOFI_HIPHOP: 'LOFI_HIPHOP' as ArrangementStyle,
  NEOCLASSICAL: 'NEOCLASSICAL' as ArrangementStyle
};

// Create synthwave performance
function createSynthwavePerformance(): PerformanceRealizationV1 {
  return {
    version: '1.0',
    id: crypto.randomUUID(),
    name: 'Synthwave',
    arrangementStyle: CUSTOM_ARRANGEMENTS.SYNTHWAVE,
    density: 0.75,
    grooveProfileId: 'groove-synthwave',
    instrumentationMap: [
      {
        roleId: 'primary',
        instrumentId: 'NexSynth',
        presetId: 'synthwave-lead',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'secondary',
        instrumentId: 'KaneMarco',
        presetId: 'synthwave-bass',
        busId: crypto.randomUUID()
      },
      {
        roleId: 'tertiary',
        instrumentId: 'DrumMachine',
        presetId: 'synthwave-drums',
        busId: crypto.randomUUID()
      }
    ],
    consoleXProfileId: 'consolex-synthwave',
    mixTargets: [
      { roleId: 'primary', gain: -3.0, pan: 0.3 },
      { roleId: 'secondary', gain: -6.0, pan: -0.4 },
      { roleId: 'tertiary', gain: -6.0, pan: 0.0 }
    ],
    registerMap: [
      { roleId: 'primary', minPitch: 60, maxPitch: 96 },
      { roleId: 'secondary', minPitch: 24, maxPitch: 48 },
      { roleId: 'tertiary', minPitch: 0, maxPitch: 127 }
    ],
    createdAt: Date.now(),
    modifiedAt: Date.now()
  };
}
```

### Custom Instruments

Add a new instrument type:

```typescript
// custom_instruments.ts
import { InstrumentType } from '@whiteroom/sdk';

// Define custom instrument
export const CUSTOM_INSTRUMENTS = {
  GRANULAR_SYNTH: 'GranularSynth' as InstrumentType,
  PHYSICAL_MODELING: 'PhysicalModeling' as InstrumentType
};

// Register in InstrumentFactory (C++)
// InstrumentFactory.cpp
std::unique_ptr<InstrumentDSP> InstrumentFactory::create(
  const std::string& instrumentType
) {
  if (instrumentType == "GranularSynth") {
    return std::make_unique<GranularSynthDSP>();
  }

  if (instrumentType == "PhysicalModeling") {
    return std::make_unique<PhysicalModelingDSP>();
  }

  // Default instruments
  // ...
}
```

### Custom Groove Profiles

Create your own groove profiles:

```typescript
// custom_grooves.ts
export interface GrooveProfile {
  id: string;
  name: string;
  timingVariance: number; // 0-1
  velocityVariance: number; // 0-1
  swingAmount: number; // 0-1
  humanization: HumanizationProfile;
}

export const CUSTOM_GROOVES: Record<string, GrooveProfile> = {
  'synthwave': {
    id: 'groove-synthwave',
    name: 'Synthwave',
    timingVariance: 0.1, // Tight timing
    velocityVariance: 0.2, // Consistent dynamics
    swingAmount: 0.0, // No swing (straight 16ths)
    humanization: {
      microTimingDeviation: 5, // +/- 5ms
      velocityCurve: 'linear',
      randomization: 0.1
    }
  },

  'lofi-hiphop': {
    id: 'groove-lofi-hiphop',
    name: 'Lo-Fi Hip Hop',
    timingVariance: 0.4, // Laid back, relaxed
    velocityVariance: 0.6, // Dynamic variation
    swingAmount: 0.6, // Heavy swing
    humanization: {
      microTimingDeviation: 20, // +/- 20ms (very human)
      velocityCurve: 'logarithmic',
      randomization: 0.5
    }
  }
};
```

### Custom ConsoleX Profiles

Create custom mixing configurations:

```typescript
// custom_consolex.ts
export interface ConsoleXProfile {
  id: string;
  name: string;
  voiceBusses: VoiceBusConfig[];
  mixBusses: MixBusConfig[];
  masterBus: MasterBusConfig;
}

export const CUSTOM_CONSOLEX: Record<string, ConsoleXProfile> = {
  'synthwave': {
    id: 'consolex-synthwave',
    name: 'Synthwave',
    voiceBusses: [
      {
        id: 'bus-lead',
        name: 'Lead Synth',
        gain: -3.0,
        pan: 0.3, // Slightly right
        inserts: [
          { effectType: 'Reverb', enabled: true, parameters: { decay: 2.0, mix: 0.3 } },
          { effectType: 'Delay', enabled: true, parameters: { time: 0.25, mix: 0.2 } }
        ],
        sends: []
      },
      {
        id: 'bus-bass',
        name: 'Bass Synth',
        gain: -6.0,
        pan: -0.4, // Left
        inserts: [
          { effectType: 'Compressor', enabled: true, parameters: { threshold: -20, ratio: 4 } }
        ],
        sends: [
          { busId: 'bus-reverb', level: -12.0 }
        ]
      }
    ],
    mixBusses: [
      {
        id: 'bus-reverb',
        name: 'Reverb',
        gain: 0.0,
        pan: 0.0,
        inserts: [
          { effectType: 'Reverb', enabled: true, parameters: { decay: 3.0, mix: 1.0 } }
        ]
      }
    ],
    masterBus: {
      id: 'master',
      gain: 0.0,
      inserts: [
        { effectType: 'Limiter', enabled: true, parameters: { threshold: -0.1 } }
      ]
    }
  }
};
```

---

## Debugging Guide

### Common Issues and Solutions

#### Issue: Performance Not Found

**Symptoms**:
```
Error: Performance with ID "xxx" not found
```

**Debug Steps**:
1. Check if performance exists in SongModel
```typescript
const performances = manager.listPerformances();
console.log('Available:', performances.map(p => ({ id: p.id, name: p.name })));
```

2. Verify ID format (should be UUID string)
```typescript
console.log('Performance ID:', performanceId);
console.log('Is valid UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(performanceId));
```

3. Check SongModel serialization
```typescript
const songJson = JSON.stringify(songModel, null, 2);
console.log('SongModel:', songJson);
```

**Solution**: Ensure performance is created and saved before switching

#### Issue: Validation Errors

**Symptoms**:
```
Error: Performance validation failed
```

**Debug Steps**:
1. Validate performance object
```typescript
const validation = validatePerformanceRealization(performance);
if (!validation.valid) {
  console.error('Validation errors:');
  validation.errors.forEach(error => {
    console.error(`  ${error.path}: ${error.message}`);
    console.error(`    Value:`, error.value);
  });
}
```

2. Check required fields
```typescript
console.log('Performance structure:', {
  hasVersion: !!performance.version,
  hasId: !!performance.id,
  hasName: !!performance.name,
  hasArrangementStyle: !!performance.arrangementStyle,
  hasDensity: typeof performance.density === 'number',
  hasInstrumentationMap: Array.isArray(performance.instrumentationMap),
  hasMixTargets: Array.isArray(performance.mixTargets),
  hasRegisterMap: Array.isArray(performance.registerMap)
});
```

**Solution**: Fix validation errors before creating performance

#### Issue: Audio Glitches on Switch

**Symptoms**:
- Clicks/pops when switching performances
- Brief dropout or silence

**Debug Steps**:
1. Check CPU usage
```cpp
// JUCE Backend
double cpuUsage = audioEngine->getCpuUsage();
std::cout << "CPU Usage: " << (cpuUsage * 100) << "%" << std::endl;
```

2. Check voice count
```typescript
// Count total voices
const voiceCount = performance.instrumentationMap.length;
console.log('Voice count:', voiceCount);
```

3. Check for missing instruments
```typescript
// Verify all instruments are available
for (const entry of performance.instrumentationMap) {
  const available = InstrumentFactory.hasInstrument(entry.instrumentId);
  if (!available) {
    console.error(`Missing instrument: ${entry.instrumentId}`);
  }
}
```

**Solution**:
- Reduce voice count or density
- Use lighter instruments
- Wait for bar boundary (automatic)

#### Issue: FFI Communication Failure

**Symptoms**:
```
Error: FFI call failed
```

**Debug Steps**:
1. Check FFI server is running
```cpp
// JUCE Backend
if (!ffiServer->isRunning()) {
  std::cerr << "FFI server not running" << std::endl;
}
```

2. Validate JSON serialization
```typescript
const songJson = JSON.stringify(songModel);
try {
  JSON.parse(songJson); // Verify it's valid JSON
} catch (e) {
  console.error('Invalid JSON:', e);
}
```

3. Check schema version
```typescript
console.log('SongModel version:', songModel.version);
console.log('Expected version: 1.0');
```

**Solution**: Ensure proper JSON serialization and schema validation

### Logging Strategies

#### TypeScript SDK

```typescript
// Enable debug logging
const DEBUG = true;

function debugLog(category: string, message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[${category}]`, message, data || '');
  }
}

// Usage
debugLog('PerformanceManager', 'Switching performance', {
  from: currentPerformanceId,
  to: targetPerformanceId
});
```

#### JUCE Backend

```cpp
// Use JUCE Logger
#include "juce_core/logging/juce_Logger.h"

// Log performance switching
void FFIServer::switchPerformance(const std::string& performanceId) {
  LOG_INFO("Switching performance: " << performanceId);

  // ... implementation ...

  LOG_INFO("Performance switched successfully");
}

// Log errors
void FFIServer::handleError(const std::string& error) {
  LOG_ERROR("Error: " << error);
}
```

#### Swift Frontend

```swift
import os.log

// Create logger
let logger = OSLog(subsystem: "com.whiteroom.frontend", category: "Performance")

// Log performance switching
func switchPerformance(to performanceId: UUID) {
  os_log("Switching to performance: %@", log: logger, type: .info, performanceId.uuidString)

  // ... implementation ...

  os_log("Performance switched successfully", log: logger, type: .info)
}

// Log errors
func handleError(_ error: Error) {
  os_log("Error: %{public}@", log: logger, type: .error, error.localizedDescription)
}
```

---

## Performance Optimization

### Memory Management

#### Immutable Data Structures

```typescript
// Immutable update pattern (no shared state)
const updatedSongModel = {
  ...songModel,
  performances: [
    ...songModel.performances,
    newPerformance
  ],
  activePerformanceId: newPerformance.id
};

// Old SongModel is still valid (no mutation)
// New SongModel shares unchanged data (structural sharing)
```

#### Render Caching

```typescript
// Cache rendered graphs per performance
class RenderCache {
  private cache = new Map<string, RenderedSongGraph>();

  get(songId: string, performanceId: string): RenderedSongGraph | undefined {
    const key = `${songId}:${performanceId}`;
    return this.cache.get(key);
  }

  set(songId: string, performanceId: string, graph: RenderedSongGraph): void {
    const key = `${songId}:${performanceId}`;
    this.cache.set(key, graph);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### CPU Optimization

#### Voice Stealing

```cpp
// JUCE Backend: Implement voice stealing
class VoiceStealer {
public:
  void stealVoiceIfNeeded(std::vector<Voice*>& voices) {
    if (voices.size() >= maxVoices) {
      // Find least recently used voice
      auto lru = std::min_element(
        voices.begin(),
        voices.end(),
        [](const Voice* a, const Voice* b) {
          return a->getLastPlayedTime() < b->getLastPlayedTime();
        }
      );

      // Stop the voice
      (*lru)->stop();
    }
  }
};
```

#### Density Scaling

```typescript
// Reduce note density instead of dropping notes
function applyDensity(notes: NoteEvent[], density: number): NoteEvent[] {
  if (density >= 1.0) return notes; // No scaling

  // Randomly drop notes based on density
  return notes.filter(note => {
    return Math.random() < density;
  });

  // Better: Use musical intelligence
  // Keep important notes (downbeats, strong beats)
  // Drop less important notes (weak beats, ornaments)
}
```

### Audio Optimization

#### Bar-Boundary Transitions

```typescript
// Schedule transitions at quiet moments
function findOptimalTransitionPoint(
  notes: NoteEvent[],
  currentPosition: number
): number {
  const barLength = getBarLength();
  const nextBar = Math.ceil(currentPosition / barLength) * barLength;

  // Find quiet moment in bar
  const barNotes = notes.filter(n =>
    n.startTime >= nextBar && n.startTime < nextBar + barLength
  );

  // If bar is sparse, transition at bar start
  if (barNotes.length < 10) {
    return nextBar;
  }

  // Otherwise, transition at quietest point
  // (find gap in notes)
  return findQuietestPoint(barNotes);
}
```

#### Smooth Crossfades

```cpp
// JUCE Backend: Equal power crossfade
class CrossfadeNode {
public:
  void process(AudioBuffer<float>& buffer, double t) {
    // Equal power crossfade curves
    float gainA = std::cos(t * MathConstants<double>::halfPi);
    float gainB = std::sin(t * MathConstants<double>::halfPi);

    // Apply gains
    bufferA.applyGain(gainA);
    bufferB.applyGain(gainB);

    // Mix
    for (int i = 0; i < buffer.getNumChannels(); ++i) {
      buffer.addFrom(i, 0, bufferA, i, 0, buffer.getNumSamples());
      buffer.addFrom(i, 0, bufferB, i, 0, buffer.getNumSamples());
    }
  }
};
```

---

## Testing Strategies

### Unit Tests

#### TypeScript SDK

```typescript
// performance_manager.test.ts
import { PerformanceManager } from '@whiteroom/sdk';

describe('PerformanceManager', () => {
  let manager: PerformanceManager;
  let songModel: SongModel_v1;

  beforeEach(() => {
    songModel = createTestSongModel();
    manager = new PerformanceManager({ songModel });
  });

  test('createPerformance adds to performances array', () => {
    const result = manager.createPerformance({
      name: 'Test Performance',
      performance: createTestPerformance()
    });

    expect(result.success).toBe(true);
    expect(manager.listPerformances()).toHaveLength(4); // 3 default + 1 new
  });

  test('switchPerformance updates activePerformanceId', () => {
    const result = manager.switchPerformance('techno-id');

    expect(result.success).toBe(true);
    expect(songModel.activePerformanceId).toBe('techno-id');
  });

  test('deletePerformance prevents deleting last performance', () => {
    // Delete all but one
    manager.listPerformances().forEach(p => {
      if (manager.listPerformances().length > 1) {
        manager.deletePerformance(p.id);
      }
    });

    // Try to delete last one
    const result = manager.deletePerformance(manager.listPerformances()[0].id);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_DATA');
  });
});
```

#### JUCE Backend

```cpp
// test_performance_switching.cpp
#include <catch2/catch_test_macros.hpp>
#include "SongModelAdapter.h"

TEST_CASE("Performance Switching", "[performance]") {
  SongModelAdapter adapter;
  adapter.loadFromJSON(testSongJson);

  SECTION("Render different performances") {
    auto pianoGraph = adapter.renderSong("piano-id");
    auto technoGraph = adapter.renderSong("techno-id");

    // Graphs should be different
    REQUIRE(pianoGraph.instrumentNodes.size() != technoGraph.instrumentNodes.size());
  }

  SECTION("Switch performance updates active ID") {
    auto result = adapter.switchPerformance("techno-id");
    REQUIRE(result.isSuccess);
    REQUIRE(adapter.getActivePerformance().id == "techno-id");
  }

  SECTION("Invalid performance ID returns error") {
    auto result = adapter.switchPerformance("non-existent-id");
    REQUIRE(!result.isSuccess);
    REQUIRE(result.error.code == FFIErrorCode::NOT_FOUND);
  }
}
```

### Integration Tests

#### Swift Frontend

```swift
// performance_switching_tests.swift
import XCTest
@testable import SwiftFrontendCore

class PerformanceSwitchingTests: XCTestCase {
  var engine: JUCEEngine!
  var song: Song!

  override func setUp() {
    super.setUp()
    engine = JUCEEngine.shared
    song = try! loadTestSong()
  }

  func testPerformanceSwitchingWorkflow() async throws {
    // Load with Piano performance
    let pianoResult = try engine.projectSong(
      song,
      performance: .piano,
      config: .init(renderMode: .realtime)
    )

    switch pianoResult {
    case .success(let projection):
      XCTAssertFalse(projection.graph.nodes.isEmpty)
    case .failure:
      XCTFail("Piano projection failed")
    }

    // Switch to Techno performance
    let technoResult = try engine.projectSong(
      song,
      performance: .techno,
      config: .init(renderMode: .realtime)
    )

    switch technoResult {
    case .success(let projection):
      XCTAssertFalse(projection.graph.nodes.isEmpty)
    case .failure:
      XCTFail("Techno projection failed")
    }

    // Graphs should be different
    // (different instruments, routing, etc.)
  }

  func testPerformanceBlending() async throws {
    // Blend performances (future feature)
    let blendedResult = try engine.projectSongBlend(
      song,
      perfA: .piano,
      perfB: .techno,
      t: 0.5
    )

    switch blendedResult {
    case .success(let projection):
      XCTAssertEqual(projection.blendParameter, 0.5)
    case .failure(let error):
      XCTFail("Blending failed: \(error)")
    }
  }
}
```

### E2E Tests

```typescript
// e2e_performance_workflow.test.ts
import { test, expect } from '@playwright/test';

test('complete performance workflow', async ({ page }) => {
  // Load White Room app
  await page.goto('http://localhost:3000');

  // Load test song
  await page.click('[data-testid="load-song-button"]');
  await page.selectOption('select[name="song"]', 'test-song');

  // Wait for performances to load
  await page.waitForSelector('[data-testid="performance-card"]');

  // Verify default performances exist
  const performances = await page.locator('[data-testid="performance-card"]').count();
  expect(performances).toBeGreaterThanOrEqual(3);

  // Switch to Techno performance
  await page.click('[data-testid="performance-card"][data-name="Ambient Techno"]');

  // Verify active indicator
  const activeCard = await page.locator('[data-testid="performance-card"][data-active="true"]');
  await expect(activeCard).toHaveText(/Ambient Techno/);

  // Create new performance
  await page.click('[data-testid="new-performance-button"]');

  // Fill in performance details
  await page.fill('[name="performance-name"]', 'My Custom Performance');
  await page.selectOption('[name="arrangement-style"]', 'CUSTOM');
  await page.fill('[name="density"]', '0.5');

  // Add instrumentation
  await page.click('[data-testid="add-instrument-button"]');
  await page.selectOption('[name="instrument-type"]', 'NexSynth');
  await page.selectOption('[name="preset"]', 'default');

  // Save performance
  await page.click('[data-testid="save-performance-button"]');

  // Verify new performance appears
  await page.waitForSelector('[data-testid="performance-card"][data-name="My Custom Performance"]');

  // Switch to new performance
  await page.click('[data-testid="performance-card"][data-name="My Custom Performance"]');

  // Verify it's active
  const newActiveCard = await page.locator('[data-testid="performance-card"][data-active="true"]');
  await expect(newActiveCard).toHaveText(/My Custom Performance/);
});
```

---

## Code Examples

### Example 1: Complete Performance CRUD

```typescript
import {
  PerformanceManager,
  createPerformanceManager,
  validatePerformanceRealization
} from '@whiteroom/sdk';

// 1. Load song model
const songModel = loadSongModel('my-song.json');
const manager = createPerformanceManager(songModel);

// 2. Create performance
const jazzTrio = {
  name: 'Jazz Trio',
  description: 'Piano, bass, drums',
  arrangementStyle: 'JAZZ_COMBO' as const,
  density: 0.5,
  grooveProfileId: 'groove-medium-swing',
  instrumentationMap: [
    {
      roleId: 'primary',
      instrumentId: 'NexSynth',
      presetId: 'jazz-piano',
      busId: crypto.randomUUID()
    },
    {
      roleId: 'secondary',
      instrumentId: 'LocalGal',
      presetId: 'upright-bass',
      busId: crypto.randomUUID()
    }
  ],
  consoleXProfileId: 'consolex-jazz-club',
  mixTargets: [
    { roleId: 'primary', gain: -3.0, pan: 0.0 },
    { roleId: 'secondary', gain: -6.0, pan: -0.2 }
  ],
  registerMap: [
    { roleId: 'primary', minPitch: 48, maxPitch: 84 },
    { roleId: 'secondary', minPitch: 28, maxPitch: 60 }
  ]
};

// Validate before creating
const validation = validatePerformanceRealization(jazzTrio);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  throw new Error('Invalid performance');
}

// Create performance
const createResult = manager.createPerformance({
  name: jazzTrio.name,
  performance: jazzTrio
});

if (!createResult.success) {
  console.error('Failed to create:', createResult.error);
  throw new Error('Creation failed');
}

console.log('Created performance:', createResult.data?.id);

// 3. Read performance
const performance = manager.getPerformance(createResult.data!.id);
console.log('Performance name:', performance?.name);

// 4. Update performance
const updateResult = manager.updatePerformance({
  performanceId: createResult.data!.id,
  updates: {
    density: 0.6, // Increase density
    description: 'Jazz trio with denser texture'
  }
});

if (updateResult.success) {
  console.log('Updated density to:', updateResult.data?.density);
}

// 5. Switch performance
const switchResult = manager.switchPerformance(createResult.data!.id);
if (switchResult.success) {
  console.log('Switched to:', switchResult.data?.name);
}

// 6. Delete performance (if not active)
if (manager.listPerformances().length > 1) {
  const deleteResult = manager.deletePerformance(createResult.data!.id);
  if (deleteResult.success) {
    console.log('Deleted performance');
  }
}

// 7. Get updated SongModel for persistence
const updatedSongModel = manager.getSongModel();
saveSongModel(updatedSongModel);
```

### Example 2: Performance Blending

```typescript
// Future feature (Milestone 2)
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

    // In audio engine, dual-render crossfade happens
    // JUCE renders both performances and crossfades output
    // No additional work needed in SDK
  }
}

// Animated sweep (0.0 → 1.0 over 4 bars)
async function animatedSweep(
  manager: PerformanceManager,
  perfA: string,
  perfB: string,
  durationBars: number
) {
  const barLength = getBarLengthMs(); // e.g., 2000ms
  const totalDuration = durationBars * barLength;
  const steps = 100;
  const stepDuration = totalDuration / steps;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0.0 to 1.0

    const result = manager.blendPerformances(perfA, perfB, t);

    if (result.success) {
      // Update sweep UI
      updateSweepControl(t);

      // Wait for next step
      await sleep(stepDuration);
    }
  }
}
```

### Example 3: Custom Validation

```typescript
import { validatePerformanceRealization, ValidationResult } from '@whiteroom/sdk';

// Extend validation with custom rules
function validateCustomPerformance(
  performance: PerformanceRealizationV1
): ValidationResult {
  // First, run standard validation
  const baseValidation = validatePerformanceRealization(performance);
  if (!baseValidation.valid) {
    return baseValidation;
  }

  const customErrors: ValidationError[] = [];

  // Custom rule 1: Jazz performances must have swing
  if (performance.arrangementStyle === 'JAZZ_COMBO') {
    const groove = getGrooveProfile(performance.grooveProfileId);
    if (groove.swingAmount < 0.3) {
      customErrors.push({
        path: 'grooveProfileId',
        message: 'Jazz performances must have swing amount >= 0.3',
        value: performance.grooveProfileId
      });
    }
  }

  // Custom rule 2: Orchestral performances need minimum voices
  if (performance.arrangementStyle === 'FULL_ORCHESTRA') {
    if (performance.instrumentationMap.length < 8) {
      customErrors.push({
        path: 'instrumentationMap',
        message: 'Full orchestra requires at least 8 instruments',
        value: performance.instrumentationMap.length
      });
    }
  }

  // Custom rule 3: Check CPU budget
  const estimatedCpu = estimateCpuUsage(performance);
  const maxCpu = 0.5; // 50% CPU limit
  if (estimatedCpu > maxCpu) {
    customErrors.push({
      path: 'instrumentationMap',
      message: `Performance exceeds CPU budget (${estimatedCpu * 100}% > ${maxCpu * 100}%)`,
      value: estimatedCpu
    });
  }

  return {
    valid: customErrors.length === 0,
    errors: [...baseValidation.errors, ...customErrors]
  };
}

// Usage
const validation = validateCustomPerformance(myPerformance);
if (!validation.valid) {
  console.error('Custom validation failed:');
  validation.errors.forEach(error => {
    console.error(`  ${error.path}: ${error.message}`);
  });
}
```

---

## Best Practices

### DO

✅ **Validate Before Creating**
```typescript
const validation = validatePerformanceRealization(performance);
if (!validation.valid) {
  // Handle errors
}
manager.createPerformance({ name, performance });
```

✅ **Use Immutable Updates**
```typescript
const updated = clonePerformanceRealization(performance, {
  density: 0.7
});
```

✅ **Handle Errors Gracefully**
```typescript
const result = manager.switchPerformance(id);
if (!result.success) {
  // Show user-friendly error
  showError(result.error.message);
}
```

✅ **Test Thoroughly**
```typescript
// Unit tests
test('switchPerformance updates active ID', () => {
  // ...
});

// Integration tests
test('performance switching workflow', async () => {
  // ...
});
```

✅ **Document Custom Extensions**
```typescript
/**
 * Custom performance preset for Synthwave arrangement
 * Features: Tight timing, heavy bass, bright leads
 */
export function createSynthwavePerformance(): PerformanceRealizationV1 {
  // ...
}
```

### DON'T

❌ **Don't Mutate Performances Directly**
```typescript
// BAD
performance.density = 0.7; // Mutates shared state

// GOOD
const updated = clonePerformanceRealization(performance, { density: 0.7 });
```

❌ **Don't Skip Validation**
```typescript
// BAD
manager.createPerformance({ name, performance }); // May fail

// GOOD
const validation = validatePerformanceRealization(performance);
if (validation.valid) {
  manager.createPerformance({ name, performance });
}
```

❌ **Don't Ignore Errors**
```typescript
// BAD
manager.switchPerformance(id); // May fail silently

// GOOD
const result = manager.switchPerformance(id);
if (!result.success) {
  console.error(result.error);
}
```

❌ **Don't Create Too Many Voices**
```typescript
// BAD - May overload CPU
const performance = createDensePerformanceWith100Voices();

// GOOD - Respect CPU limits
const performance = createBalancedPerformanceWith8Voices();
```

---

## Summary

This developer guide covers:

- **Architecture**: Three-layer system (Swift → JUCE → Audio)
- **Integration**: SDK, JUCE, Swift integration points
- **Extensions**: Custom instruments, arrangements, grooves, ConsoleX profiles
- **Debugging**: Common issues, logging strategies
- **Optimization**: Memory, CPU, audio optimization
- **Testing**: Unit, integration, E2E tests
- **Examples**: Complete CRUD, blending, validation
- **Best Practices**: DO's and DON'Ts

**Resources**:
- [Design Documentation](./001-design-documentation.md) - Architecture overview
- [API Documentation](./002-api-documentation.md) - Complete API reference
- [User Guide](./003-user-guide.md) - End-user documentation

**Next Steps**:
1. Explore the codebase using the integration points
2. Run tests to understand expected behavior
3. Create custom performances to test extensions
4. Contribute improvements and bug fixes

Happy coding! 🚀
