# Schillinger SDK v2.0 - The Moving Sidewalk Realization System

A revolutionary, multi-language software development kit that implements Joseph Schillinger's System of Musical Composition with a continuous "moving sidewalk" realization layer, enabling emergent musical behavior and orchestra-scale real-time generation.

## 🎯 Revolutionary Features

### 🔄 Moving Sidewalk Realization (v2.0)
- **Continuous Time Projection**: Sliding window enables seamless musical evolution without section boundaries
- **Emergent Behavior**: Layers interact to create unexpected musical patterns and climaxes
- **Role-Based Architecture**: Functional musical roles (melody, bass, harmony) instead of track-based thinking
- **Real-Time Convergence**: Predicts and responds to convergence moments for climactic development
- **Orchestra Field**: Constraint space for intelligent instrument assignment and orchestration

### 🧮 Generator Architecture (v1.0 - Enhanced)
- **Stateful Generators**: Rhythm, Harmony, Melody, Composition with parameter persistence
- **Enhanced Metadata**: Complete provenance tracking and transformation history
- **Backward Compatibility**: All existing APIs continue to work unchanged
- **Type Safety**: Comprehensive TypeScript types with enhanced configuration support

### 🌊 Schillinger Compliance (v1.0 - Complete)
- **Intensity Field**: Emotional and dynamic evolution with multiple curve types
- **Coincidence Probability**: Detect and predict convergence moments across layers
- **Unified Resultants**: Combine generator outputs for emergent musical behavior
- **Structural Acceleration**: Intensity-driven transformation cadence and mutation frequency
- **Release Mechanics**: Engineered phase convergence windows for structural resolution

### 🎵 Original Features
- **Mathematical Pattern Generation**: Generate rhythmic resultants, harmonic progressions, melodic contours using Schillinger's mathematical principles
- **Reverse Analysis**: Analyze existing musical content and reverse-engineer Schillinger parameters from real-world music
- **Multi-Language Support**: TypeScript/JavaScript (production-ready), Python, Swift, and JUCE/C++ implementations
- **Offline Capabilities**: Core mathematical functions work completely offline without API dependencies
- **Real-time Collaboration**: WebSocket-based real-time composition and parameter synchronization
- **Provenance Tracking**: Built-in DAID (Differential Agent ID) system for transformation chains
- **Comprehensive Error Handling**: Rich error types with actionable recovery suggestions
- **Multi-Level Caching**: Memory, persistent, and network caching for optimal performance

## 🏗️ SDK Architecture

The SDK is organized into modular packages, each providing focused capabilities:

### Core Infrastructure Packages

- **@schillinger-sdk/shared**
  - Common types, utility functions, validation, and centralized error classes
  - Authentication system with role-based permissions and credential management
  - Multi-level caching system (memory, persistent, network)
  - Mathematical utilities and validation functions

- **@schillinger-sdk/core** ⭐ *Primary SDK Entry Point*
  - Main `SchillingerSDK` client with unified API
  - Rhythm generation and analysis (resultants, variations, pattern matching)
  - Harmony tools (progressions, analysis, chord resolution)
  - Melody generation and contour analysis
  - Composition creation and management
  - Real-time collaboration and WebSocket support
  - Offline mode and caching orchestration

- **@schillinger-sdk/gateway**
  - Node/Express gateway utilities for backend integration
  - Authentication middleware, rate limiting, and request validation
  - API gateway infrastructure for SDK deployments [Experimental]

### Specialized Feature Packages

- **@schillinger-sdk/analysis**
  - Advanced music analysis and pattern recognition
  - **Reverse Analysis**: Infer Schillinger parameters from existing music
  - Semantic search and similarity matching
  - Complexity analysis and pattern classification
  - Rhythm, harmony, melody, and unified reverse encoding

- **@schillinger-sdk/generation**
  - Advanced composition generation and AI-assisted tools
  - Template-based composition generation
  - AI workflow integration and intelligent helpers
  - Automated arrangement and orchestration

- **@schillinger-sdk/audio**
  - Real-time audio processing and synthesis
  - Audio analysis and feature extraction
  - Plugin management and audio routing
  - Real-time audio helpers [Experimental]

- **@schillinger-sdk/admin**
  - Administrative tools and system monitoring
  - User management and activity analytics
  - System health monitoring and configuration
  - Performance metrics and debugging tools [Experimental]

- **@schillinger-sdk/transformations**
  - Audio transformation functions with provenance tracking
  - Melodic, harmonic, rhythmic, and pattern transformations
  - Automatic DAID provenance tracking for AI workflows
  - Extensible transformation pipeline

- **@schillinger-sdk/daid**
  - Distributed Agent ID provenance tracking system
  - Automatic metadata generation for transformation chains
  - AI workflow tracking and reproducibility

### Native Language Packages

- **packages/python** 🐍
  - Full Python SDK with async/await support
  - Pydantic v2.5+ integration for type safety
  - Music library integrations (music21, librosa, mido)
  - Jupyter notebook support with visualization tools

- **packages/swift** 🍎
  - Native Swift SDK for iOS/macOS/watchOS/tvOS
  - SwiftUI integration with ObservableObject support
  - Keychain-based secure credential storage
  - Comprehensive error handling with localized messages

- **packages/juce-cpp** 🎛️
  - C++ SDK using JUCE framework for audio applications
  - Real-time safe functions for audio plugin development
  - JUCE-compatible architecture and memory management
  - JSON serialization using JUCE's var/DynamicObject

## 🚀 Quick Start

### Installation

#### TypeScript/JavaScript (Production Ready)

```bash
# Core package - all you need to get started
npm install @schillinger-sdk/core

# Optional feature packages for advanced use cases
npm install @schillinger-sdk/analysis @schillinger-sdk/generation @schillinger-sdk/transformations

# Development from local monorepo
npm install file:../sdk/packages/core
```

#### Python

```bash
# Basic installation
pip install schillinger-sdk

# With music library integrations
pip install schillinger-sdk[music]

# Full installation with all optional dependencies
pip install schillinger-sdk[all]
```

#### Swift (iOS/macOS)

```bash
# Swift Package Manager
dependencies: [
    .package(url: "https://github.com/schillinger/sdk-swift.git", from: "1.0.0")
]

# Or add directly in Xcode
# File → Add Package Dependencies → Enter URL
```

**Quick Start:**
```swift
import SchillingerSDK

let sdk = SchillingerSDK()
let credentials = AuthCredentials(apiKey: "your-api-key")
let authResult = await sdk.authenticate(credentials: credentials)

let rhythmResult = await sdk.rhythm.generateResultant(a: 3, b: 2)
if case .success(let pattern) = rhythmResult {
    print("Generated rhythm: \(pattern.durations)")
}
```

#### C++ (JUCE Audio Applications)

```cmake
add_subdirectory(path/to/SchillingerSDK)
target_link_libraries(YourTarget PRIVATE SchillingerSDK)
```

**Quick Start:**
```cpp
#include "SchillingerSDK.h"
using namespace Schillinger;

auto sdk = std::make_unique<SchillingerSDK>();
SDKOptions options;
options.apiBaseUrl = "https://api.schillinger.ai";
options.enableOfflineMode = true;

sdk->configure(options);
auto& rhythmAPI = sdk->getRhythmAPI();

RhythmPattern pattern;
rhythmAPI.generateResultantSync(3, 2, pattern);
```

### Basic Usage

#### TypeScript/JavaScript

```typescript
import { SchillingerSDK } from '@schillinger-sdk/core';

// Initialize with configuration
const sdk = new SchillingerSDK({
  apiUrl: 'https://api.schillinger.ai/v1',
  cacheEnabled: true,
  offlineMode: false,
  environment: 'production'
});

// Authenticate (optional for offline mathematical operations)
await sdk.authenticate({ apiKey: 'your-api-key' });

// 🎵 Generate rhythmic patterns
const rhythm = await sdk.rhythm.generateResultant(3, 2);
console.log('Rhythm durations:', rhythm.durations);

// 🎼 Analyze harmony
const harmonyAnalysis = await sdk.harmony.analyzeProgression(['C', 'F', 'G', 'C']);
console.log('Harmonic analysis:', harmonyAnalysis);

// 🎶 Create composition
const composition = await sdk.composition.create({
  name: 'My Composition',
  key: 'C',
  scale: 'major',
  tempo: 120,
  timeSignature: [4, 4],
});

// 🔄 Reverse analysis - infer generators from existing pattern
const inference = await sdk.rhythm.inferGenerators(rhythm);
console.log('Inferred generators:', inference.generators);
```

#### Python

```python
import asyncio
from schillinger_sdk import SchillingerSDK

async def main():
    # Initialize SDK
    sdk = SchillingerSDK(api_url="https://api.schillinger.ai/v1")

    # Authenticate
    await sdk.authenticate({"api_key": "your-api-key"})

    # Generate rhythmic resultant
    pattern = await sdk.rhythm.generate_resultant(3, 2)
    print(f"Pattern: {pattern.durations}")

    # Reverse analysis
    inference = await sdk.rhythm.infer_generators(pattern)
    print(f"Generators: {inference.generators}")

asyncio.run(main())
```

#### Swift

```swift
import SchillingerSDK

let sdk = SchillingerSDK()
let credentials = AuthCredentials(apiKey: "your-api-key")
let authResult = await sdk.authenticate(credentials: credentials)

let rhythmResult = await sdk.rhythm.generateResultant(a: 3, b: 2)
if case .success(let pattern) = rhythmResult {
    print("Generated rhythm: \(pattern.durations)")
}
```

## Packages

### Core packages

- @schillinger-sdk/shared — Common types, utilities, and error handling
- @schillinger-sdk/core — Mathematical pattern generation and composition tools (primary SDK entry point)
- @schillinger-sdk/gateway — Node/Express gateway utilities (auth, rate limits, validation) [experimental]

### Feature packages

- @schillinger-sdk/analysis — Music analysis and reverse analysis tools
- @schillinger-sdk/generation — Advanced composition generation and AI-assisted helpers
- @schillinger-sdk/audio — Real-time audio helpers [experimental]
- @schillinger-sdk/admin — Administrative/monitoring helpers [experimental]

### Native Language Packages

- **packages/swift** 🍎 ✅ **PRODUCTION READY**
  - Native Swift SDK for iOS/macOS/watchOS/tvOS
  - SwiftUI integration with ObservableObject support
  - Keychain-based secure credential storage
  - Comprehensive error handling with localized messages
  - **Status**: All tests passing, production-ready

- **packages/juce-cpp** 🎛️ ✅ **PRODUCTION READY**
  - C++ SDK using JUCE framework for audio applications
  - Real-time safe functions for audio plugin development
  - JUCE-compatible architecture and memory management
  - JSON serialization using JUCE's var/DynamicObject
  - **Status**: Fully implemented with examples

- **packages/dart** 🎯 ✅ **PRODUCTION READY**
  - Dart/Flutter SDK with complete Moving Sidewalk Realization System v2.1
  - Comprehensive structural completion (9 layers, 45+ files, 16,000+ lines)
  - Flutter-native visualization widgets
  - Offline-first with state persistence and DAW export
  - **Status**: 100% complete, all safeguards implemented

- **packages/python** 🐍 ⏳ **PLANNED**
  - Python SDK with async/await support
  - Pydantic v2.5+ integration for type safety
  - Music library integrations (music21, librosa, mido)
  - Jupyter notebook support
  - **Status**: Not yet implemented

See package-level READMEs in packages/<name> for details and APIs.

## Architecture

Modular, layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    SDK Client Layer                        │
│       (JavaScript/TypeScript stable; others in-progress)   │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway Layer                       │
│     (Authentication, Rate Limiting, Validation)            │
├─────────────────────────────────────────────────────────────┤
│                   Core Services Layer                      │
│  (Composition, Rhythm, Harmony, Analysis, Generation)      │
├─────────────────────────────────────────────────────────────┤
│                        Data Layer                          │
│        (PostgreSQL, Cache, Vector Search as needed)        │
└─────────────────────────────────────────────────────────────┘
```

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Clone
git clone https://github.com/schillinger/sdk.git
cd sdk

# Install deps
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Development (package-level watchers where supported)
npm run dev
```

### Testing

This monorepo uses Vitest and includes unit, integration, and performance tests.

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Integration tests
npm run test:integration
npm run test:integration:api
npm run test:integration:websocket
npm run test:integration:cross-platform
npm run test:integration:environment
npm run test:integration:full    # wrapper script

# Performance tests
npm run test:performance
npm run test:performance:mathematical
npm run test:performance:caching
npm run test:performance:load
npm run test:performance:profiling
npm run test:performance:full    # wrapper script

# Coverage
npm run test:coverage
```

Additional docs in the repo:

- INTEGRATION_TESTS.md
- PERFORMANCE_TESTING_SUMMARY.md
- MONITORING.md
- TEST_IMPLEMENTATION_SUMMARY.md

## Package Structure

Each package follows a consistent layout:

```
packages/<package-name>/
├── src/
│   ├── index.ts          # Main exports
│   ├── <feature>.ts      # Feature implementations
│   └── __tests__/        # Tests
├── dist/                 # Build output
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript config
└── README.md             # Package documentation
```

## 📚 Comprehensive API Reference

### 🎵 Rhythm API

**Pattern Generation & Variation**
```typescript
// Generate Schillinger rhythmic resultants
const pattern = await sdk.rhythm.generateResultant(3, 2);
const complexPattern = await sdk.rhythm.generateComplex({
  generators: [7, 4],
  complexity: 0.7,
  style: 'jazz'
});

// Create variations
const augmentation = await sdk.rhythm.generateVariation(pattern, 'augmentation', { factor: 2 });
const diminution = await sdk.rhythm.generateVariation(pattern, 'diminution', { factor: 0.5 });
const retrograde = await sdk.rhythm.generateVariation(pattern, 'retrograde');
```

**Pattern Analysis & Reverse Engineering**
```typescript
// Analyze rhythmic characteristics
const analysis = await sdk.rhythm.analyzePattern(pattern);
// Returns: complexity, syncopation, regularity, density metrics

// Reverse analysis - infer original generators
const inference = await sdk.rhythm.inferGenerators(pattern);
// Returns: possible generator pairs with confidence scores

// Find best matching generators for target pattern
const bestFit = await sdk.rhythm.findBestFit(targetPattern, {
  maxGenerators: 12,
  tolerance: 0.1
});

// Encode/decode patterns for storage or transmission
const encoding = await sdk.rhythm.encodePattern(pattern);
const decoded = await sdk.rhythm.decodePattern(encoding);
```

### 🎼 Harmony API

**Progression Generation**
```typescript
// Generate chord progressions
const progression = await sdk.harmony.generateProgression('C', 'major', 8);
const jazzProgression = await sdk.harmony.generateProgression('C', 'major', 8, {
  style: 'jazz',
  complexity: 0.8,
  includeExtensions: true
});

// Generate variations on existing progressions
const reharmonization = await sdk.harmony.generateVariations(progression, {
  style: 'modal_interchange',
  preserveMelody: true
});
```

**Harmonic Analysis**
```typescript
// Analyze chord progressions
const analysis = await sdk.harmony.analyzeProgression(['C', 'Am', 'F', 'G']);
// Returns: functional analysis, tension/resolution patterns

// Reverse harmonic analysis
const structure = await sdk.harmony.inferHarmonicStructure([
  'Cmaj7', 'Am7', 'Fmaj7', 'G7'
]);
// Returns: key center, scale type, functional roles

// Chord resolution in context
const resolution = await sdk.harmony.resolveChord('G7', {
  key: 'C',
  scale: 'major',
  context: 'dominant_preparation'
});
```

### 🎶 Melody API

**Melody Generation**
```typescript
// Generate melodic lines
const melody = await sdk.melody.generateMelody({
  key: 'C',
  scale: 'major',
  length: 8,
  contour: 'ascending',
  intervalRange: [1, 8]
});

// Generate variations
const inversion = await sdk.melody.generateVariations(melody, 'inversion');
const retrograde = await sdk.melody.generateVariations(melody, 'retrograde');
const modalShift = await sdk.melody.generateVariations(melody, 'modal_shift', {
  newScale: 'minor'
});
```

**Melodic Analysis**
```typescript
// Analyze melodic characteristics
const analysis = await sdk.melody.analyzeMelody(melody);
// Returns: contour analysis, interval patterns, pitch set analysis

// Extract contour for similarity matching
const contour = await sdk.melody.extractContour(melody);
const similar = await sdk.melody.findSimilarMelodies(contour, {
  tolerance: 0.2
});
```

### 🎼 Composition API

**Composition Creation**
```typescript
// Create complete compositions
const composition = await sdk.composition.create({
  name: 'My Composition',
  key: 'C',
  scale: 'major',
  tempo: 120,
  timeSignature: [4, 4],
  structure: ['A', 'B', 'A', 'C'],
  sections: [
    { type: 'verse', length: 8 },
    { type: 'chorus', length: 8 },
    { type: 'verse', length: 8 },
    { type: 'bridge', length: 4 }
  ]
});

// Generate arrangements
const arrangement = await sdk.composition.generateArrangement(composition, {
  instrumentation: ['piano', 'bass', 'drums'],
  style: 'pop'
});
```

**Composition Analysis & Encoding**
```typescript
// Analyze complete composition structure
const analysis = await sdk.composition.analyzeComposition(composition);
// Returns: structural analysis, thematic development, coherence metrics

// Encode user input (melody + optional rhythm/harmony)
const encoding = await sdk.composition.encodeUserInput(
  [60, 62, 64, 65], // MIDI melody
  [1, 1, 1, 1],    // rhythm durations
  ['C', 'F', 'G']   // harmony
);
// Returns: Schillinger parameters for reproduction/variation

// Decode Schillinger parameters back to musical output
const decoded = await sdk.composition.decodeEncoding(encoding, {
  key: 'C',
  scale: 'major'
});
```

### 🔍 Advanced Analysis API

**Pattern Recognition & Semantic Search**
```typescript
import { AnalysisAPI } from '@schillinger-sdk/analysis';

// Find similar patterns across large datasets
const matches = await analysis.findSimilarPatterns(targetPattern, {
  corpus: 'classical',
  similarityThreshold: 0.7
});

// Semantic search for musical concepts
const results = await analysis.semanticSearch('ascending minor third motif', {
  context: 'rhythm',
  style: 'baroque'
});
```

**Complexity Analysis**
```typescript
// Analyze musical complexity across dimensions
const complexity = await analysis.analyzeComplexity(composition);
// Returns: rhythmic, harmonic, melodic, and structural complexity scores

// Track complexity evolution
const evolution = await analysis.trackComplexityEvolution(composition);
// Returns: complexity changes across sections, development arcs
```

### 🔄 Transformation API with Provenance Tracking

```typescript
import { transformRhythm, transformHarmony } from '@schillinger-sdk/transformations';

// Transform with automatic provenance tracking
const result = await transformRhythm(pattern, 'apply_swing', {
  swingRatio: 0.67,
  subdivision: 'eighth'
});

// Result includes provenance information
console.log(result.provenance); // DAID tracking info
console.log(result.transformationChain); // Complete transformation history
console.log(result.parameters); // All parameters used
```

### 🤖 AI-Assisted Generation

```typescript
import { AIAssistant } from '@schillinger-sdk/generation';

const ai = new AIAssistant(sdk);

// Generate with AI guidance
const suggestion = await ai.suggestNextChord(currentProgression, {
  style: 'jazz',
  mood: 'melancholy'
});

// AI-powered pattern completion
const completion = await ai.completePattern(partialPattern, {
  context: 'blues_lick',
  length: 8
});
```

### Error Handling

The SDK throws rich error types (validation, network, auth). Example:

```typescript
import { ValidationError } from '@schillinger-sdk/shared';

try {
  await sdk.rhythm.generateResultant(0, 2); // invalid
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.message);
    console.log(err.suggestions);
  }
}
```

### Offline Mode

Mathematical operations can be executed offline:

```typescript
sdk.setOfflineMode(true);

const resultant = await sdk.rhythm.generateResultant(3, 2);
// Other math-only operations continue to work
```

### Caching

Multi-level caching is available for supported operations:

```typescript
// Enable caching at init
const sdk = new SchillingerSDK({ cacheEnabled: true });

// Clear caches when needed
sdk.clearCache();
```

## 🌟 Advanced Features

### 🔄 Real-time Collaboration

```typescript
// Connect to real-time collaboration server
await sdk.connectRealtime();

// Subscribe to pattern generation events
sdk.subscribe('pattern_generated', (data) => {
  console.log('New pattern:', data.pattern);
});

// Start collaborative composition session
const sessionId = await sdk.collaboration.createSession({
  name: 'Jazz Composition',
  collaborators: ['user2', 'user3'],
  permissions: {
    canEdit: true,
    canComment: true
  }
});

// Real-time parameter synchronization
sdk.collaboration.onParameterChange((change) => {
  // Apply changes from other collaborators
  await sdk.applyParameterChange(change);
});
```

### 🌐 Offline Mode

Many core mathematical functions work completely offline:

```typescript
// Enable offline mode
sdk.setOfflineMode(true);

// These operations work without internet connection
const resultant = await sdk.rhythm.generateResultant(3, 2);
const analysis = await sdk.rhythm.analyzePattern(resultant);
const inference = await sdk.rhythm.inferGenerators(resultant);

// Cache management for offline operation
sdk.clearCache(); // Clear all caches
const metrics = sdk.getMetrics(); // Performance metrics
```

### 📊 Multi-Level Caching

```typescript
// Configure caching at initialization
const sdk = new SchillingerSDK({
  cacheEnabled: true,
  cacheConfig: {
    memoryCache: true,      // Fast in-memory cache
    persistentCache: true,  // Survives restarts
    networkCache: true,     // Reduces API calls
    maxSize: 1000,         // Max cached items
    ttl: 3600000          // Time-to-live in ms
  }
});

// Cache is automatically used for all supported operations
const pattern1 = await sdk.rhythm.generateResultant(3, 2); // Computed
const pattern2 = await sdk.rhythm.generateResultant(3, 2); // From cache
```

### 🔐 Authentication & Security

```typescript
// Multiple authentication methods
await sdk.authenticate({
  apiKey: 'your-api-key'
});

await sdk.authenticate({
  clerkToken: 'your-clerk-token'
});

await sdk.authenticate({
  customAuth: { provider: 'oauth', token: '...' }
});

// Role-based permissions
const authResult = await sdk.authenticate(credentials);
if (authResult.permissions.includes('advanced_analysis')) {
  // Access advanced features
}
```

### 🛠️ Error Handling & Recovery

```typescript
import {
  ValidationError,
  NetworkError,
  AuthenticationError,
  ProcessingError
} from '@schillinger-sdk/shared';

try {
  const pattern = await sdk.rhythm.generateResultant(0, 2); // Invalid
} catch (err) {
  if (err instanceof ValidationError) {
    console.log('Validation failed:', err.message);
    console.log('Suggestions:', err.suggestions);
    console.log('Valid range:', err.constraints);
  }

  if (err instanceof NetworkError) {
    if (err.status === 429) {
      // Rate limited - implement backoff
      await setTimeout(1000);
      // Retry with exponential backoff
    }
  }
}
```

## 🗺️ Development Roadmap

### Current Release (v1.0)
- ✅ TypeScript/JavaScript core SDK (production-ready)
- ✅ Comprehensive rhythm, harmony, melody APIs
- ✅ Reverse analysis and pattern recognition
- ✅ Multi-level caching and offline support
- ✅ Real-time collaboration foundations
- ✅ DAID provenance tracking system

### Upcoming Releases

#### v1.1 - Enhanced Native Support
- 🔄 Complete Python SDK with music library integrations
- 🔄 Production Swift SDK with SwiftUI integration
- 🔄 JUCE/C++ SDK for audio plugin development
- 🔄 Cross-language API parity

#### v1.2 - Advanced AI Integration
- 🤖 Enhanced AI-assisted composition workflows
- 🤖 Intelligent pattern completion and suggestion
- 🤖 Style-aware generation and analysis
- 🤖 Multi-modal AI workflows (audio + symbolic)

#### v1.3 - Production Features
- 🚀 Real-time collaboration production deployment
- 🚀 Advanced audio processing and synthesis
- 🚀 Performance optimization and scaling
- 🚀 Comprehensive admin and monitoring tools

#### v2.0 - Next Generation
- 🌐 WebRTC-based real-time audio collaboration
- 🌐 Distributed processing and edge computing
- 🌐 Advanced music visualization tools
- 🌐 Plugin ecosystem and third-party integrations

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup
```bash
# Clone repository
git clone https://github.com/schillinger/sdk.git
cd sdk

# Install dependencies
npm install
npm run build

# Run tests
npm test
npm run test:integration
npm run test:performance

# Development mode
npm run dev
```

### Code Standards
- **TypeScript**: Strict mode with comprehensive type definitions
- **Python**: PEP 8 compliance with type hints
- **Swift**: SwiftLint configuration and idiomatic patterns
- **C++**: JUCE coding standards and modern C++17 practices

### Testing Requirements
- Unit tests for all new functionality
- Integration tests for cross-package interactions
- Performance tests for computationally intensive operations
- Documentation for all public APIs

### Process
1. Fork the repository
2. Create feature branch from `develop`
3. Implement changes with tests
4. Update documentation
5. Submit pull request with detailed description

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Support & Community

- **Documentation**: [https://docs.schillinger.ai](https://docs.schillinger.ai)
- **API Reference**: [https://api.schillinger.ai/docs](https://api.schillinger.ai/docs)
- **Issues & Bug Reports**: [GitHub Issues](https://github.com/schillinger/sdk/issues)
- **Discussions & Community**: [GitHub Discussions](https://github.com/schillinger/sdk/discussions)
- **Email Support**: support@schillinger.ai
- **Discord Community**: [Schillinger SDK Discord](https://discord.gg/schillinger)

## 🏆 Acknowledgments

- Based on the **Schillinger System of Musical Composition** by Joseph Schillinger
- Built with modern web technologies and best practices
- Community-driven development and open collaboration
