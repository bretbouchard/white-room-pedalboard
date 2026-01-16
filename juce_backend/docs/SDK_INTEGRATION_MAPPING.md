# Schillinger Backend to SDK Integration Mapping

## Overview
This document maps the complete Schillinger backend API surface to SDK responsibilities, providing a comprehensive roadmap for SDK development and integration.

## Backend API Structure

### Base Configuration
- **Base URL**: `http://schillinger-backend.fly.dev`
- **API Version**: `/api/v1`
- **Authentication**: Clerk JWT with API key support
- **Documentation**: Available at `/docs` (Swagger UI)

### Complete API Endpoint Inventory

#### 1. Core Musical Operations (`/api/v1/`)

| Endpoint | Method | Purpose | SDK Mapping |
|----------|--------|---------|-------------|
| `/patterns/` | GET/POST | Musical pattern CRUD | `PatternSDK` |
| `/patterns/{id}` | GET/PUT/DELETE | Single pattern operations | `PatternSDK` |
| `/patterns/generate` | POST | Generate new patterns | `GenerationSDK` |
| `/patterns/validate` | POST | Validate pattern rules | `ValidationSDK` |
| `/chord-progressions/` | GET/POST | Chord progression CRUD | `ChordSDK` |
| `/chord-progressions/{id}` | GET/PUT/DELETE | Single progression ops | `ChordSDK` |
| `/chord-progressions/generate` | POST | Generate chord progressions | `GenerationSDK` |
| `/note-generation/generate` | POST | Generate note sequences | `GenerationSDK` |
| `/sequences/` | GET/POST | Musical sequence management | `SequenceSDK` |
| `/sequences/{id}` | GET | Get specific sequence | `SequenceSDK` |
| `/sequences/by-name/{name}` | GET | Get sequence by name | `SequenceSDK` |

#### 2. API Key Management (`/api-keys/`)

| Endpoint | Method | Purpose | SDK Mapping |
|----------|--------|---------|-------------|
| `/api-keys/` | GET/POST | API key CRUD operations | `AuthSDK` |
| `/api-keys/{key_id}` | PATCH/DELETE | Update/revoke keys | `AuthSDK` |

#### 3. MCP System (`/api/v1/mcp/`)

| Endpoint | Method | Purpose | SDK Mapping |
|----------|--------|---------|-------------|
| `/api/a2a/card` | GET | Get agent card with DAids | `MCPSDK` |
| `/api/a2a/discover` | GET | Enhanced agent discovery | `MCPSDK` |
| `/api/a2a/find-best` | GET | Find best agent for capability | `MCPSDK` |
| `/api/a2a/registry/stats` | GET | Registry statistics | `MCPSDK` |
| `/api/a2a/cards` | GET | All agent cards | `MCPSDK` |
| `/api/a2a/register` | POST | Register external agent | `MCPSDK` |
| `/api/a2a/unregister/{id}` | POST | Unregister agent | `MCPSDK` |
| `/api/a2a/request` | POST | Handle agent requests | `MCPSDK` |

#### 4. Orchestration (`/api/v1/orchestration/`)

| Endpoint | Method | Purpose | SDK Mapping |
|----------|--------|---------|-------------|
| `/compose/section` | POST | Generate musical section | `OrchestrationSDK` |
| `/compose/from-chords` | POST | Generate from chord progression | `OrchestrationSDK` |
| `/compose/advanced` | POST | Advanced generation with options | `OrchestrationSDK` |
| `/health` | GET | Health check | `OrchestrationSDK` |

#### 5. Emotion & Advanced Features (`/api/v1/emotion/`)

| Endpoint | Method | Purpose | SDK Mapping |
|----------|--------|---------|-------------|
| `/analyze-emotion` | POST | Analyze chord progression emotion | `EmotionSDK` |
| `/transform-emotion` | POST | Apply emotion transformation | `EmotionSDK` |
| `/advanced/trajectory` | POST | Generate emotional trajectory | `EmotionSDK` |
| `/advanced/permutation` | POST | Generate emotional permutation | `EmotionSDK` |
| `/advanced/distribution` | POST | Generate emotional distribution | `EmotionSDK` |
| `/advanced/transform-trajectory` | POST | Transform trajectory emotion | `EmotionSDK` |
| `/advanced/transform-permutation` | POST | Transform permutation emotion | `EmotionSDK` |

#### 6. Administrative Operations (`/api/v1/admin/`)

| Endpoint | Method | Purpose | SDK Mapping |
|----------|--------|---------|-------------|
| `/admin/` | Various | Administrative operations | `AdminSDK` |
| `/admin/permissions/` | GET/POST | Permission management | `AdminSDK` |

#### 7. Feature Flags (`/api/v1/feature-flags/`)

| Endpoint | Method | Purpose | SDK Mapping |
|----------|--------|---------|-------------|
| `/feature-flags/` | GET/POST | Feature flag management | `FeatureSDK` |
| `/feature-flags/monitoring` | GET | Flag usage monitoring | `FeatureSDK` |

#### 8. Import/Export (`/api/v1/import-export/`)

| Endpoint | Method | Purpose | SDK Mapping |
|----------|--------|---------|-------------|
| `/import-export/import` | POST | Import data | `DataSDK` |
| `/import-export/export` | POST | Export data | `DataSDK` |

#### 9. Utilities (`/api/v1/utilities/`)

| Endpoint | Method | Purpose | SDK Mapping |
|----------|--------|---------|-------------|
| `/utilities/` | Various | Helper endpoints | `UtilitySDK` |

## SDK Architecture Mapping

### Core SDK Modules

#### 1. `SchillingerSDK` (Main Entry Point)
```typescript
class SchillingerSDK {
  auth: AuthSDK
  patterns: PatternSDK
  chords: ChordSDK
  sequences: SequenceSDK
  generation: GenerationSDK
  emotion: EmotionSDK
  orchestration: OrchestrationSDK
  mcp: MCPSDK
  admin: AdminSDK
  features: FeatureSDK
  data: DataSDK
  utilities: UtilitySDK
}
```

#### 2. `AuthSDK` - Authentication & API Keys
**Responsibilities:**
- API key CRUD operations
- User authentication (Clerk integration)
- Session management
- Permission validation

**Key Methods:**
```typescript
class AuthSDK {
  createApiKey(data: ApiKeyCreate): Promise<ApiKeyResponse>
  listApiKeys(): Promise<ApiKeyResponse[]>
  updateApiKey(keyId: string, data: ApiKeyUpdate): Promise<ApiKeyResponse>
  revokeApiKey(keyId: string): Promise<void>
  getCurrentUser(): Promise<User>
  validatePermissions(permissions: string[]): Promise<boolean>
}
```

#### 3. `PatternSDK` - Musical Pattern Management
**Responsibilities:**
- CRUD operations for rhythm and note patterns
- Pattern validation
- Pattern discovery and search
- Pattern transformation

**Key Methods:**
```typescript
class PatternSDK {
  getNotePatterns(): Promise<NotePattern[]>
  getRhythmPatterns(): Promise<RhythmPattern[]>
  getNotePattern(id: string): Promise<NotePattern>
  getRhythmPattern(id: string): Promise<RhythmPattern>
  createNotePattern(data: NotePatternCreate): Promise<NotePattern>
  createRhythmPattern(data: RhythmPatternCreate): Promise<RhythmPattern>
  validatePattern(data: PatternData, level?: ValidationLevel): Promise<ValidationResult>
  generatePattern(data: PatternGenerationRequest): Promise<Pattern>
}
```

#### 4. `ChordSDK` - Chord Progression Management
**Responsibilities:**
- CRUD operations for chord progressions
- Chord progression generation
- Harmonic analysis
- Chord substitution suggestions

**Key Methods:**
```typescript
class ChordSDK {
  getChordProgressions(): Promise<ChordProgression[]>
  getChordProgression(id: string): Promise<ChordProgression>
  createChordProgression(data: ChordProgressionCreate): Promise<ChordProgression>
  generateChordProgression(data: ChordGenerationRequest): Promise<ChordProgression>
  analyzeHarmony(progression: ChordProgression): Promise<HarmonicAnalysis>
  getSubstitutions(chord: Chord): Promise<Chord[]>
}
```

#### 5. `GenerationSDK` - Musical Content Generation
**Responsibilities:**
- Note sequence generation
- Pattern generation
- Composition generation
- AI-powered creative assistance

**Key Methods:**
```typescript
class GenerationSDK {
  generateNoteSequence(request: NoteGenerationRequest): Promise<NoteSequence>
  generatePattern(request: PatternGenerationRequest): Promise<Pattern>
  generateComposition(request: CompositionRequest): Promise<Composition>
  applyStyle(sequence: NoteSequence, style: Style): Promise<NoteSequence>
  getVariations(sequence: NoteSequence, count: number): Promise<NoteSequence[]>
}
```

#### 6. `EmotionSDK` - Emotional Analysis & Transformation
**Responsibilities:**
- Emotional analysis of musical content
- Emotional transformation application
- Advanced emotional pattern generation
- Emotion-based recommendations

**Key Methods:**
```typescript
class EmotionSDK {
  analyzeEmotion(progression: ChordProgression): Promise<EmotionAnalysis>
  transformEmotion(request: EmotionTransformRequest): Promise<EmotionTransformResult>
  generateTrajectory(request: TrajectoryRequest): Promise<EmotionalTrajectory>
  generatePermutation(request: PermutationRequest): Promise<EmotionalPermutation>
  generateDistribution(request: DistributionRequest): Promise<EmotionalDistribution>
  transformTrajectory(trajectory: number[], targetEmotion: EmotionValues): Promise<number[]>
  transformPermutation(pattern: number[], targetEmotion: EmotionValues): Promise<number[]>
}
```

#### 7. `OrchestrationSDK` - Advanced Composition Orchestration
**Responsibilities:**
- LangGraph-based composition orchestration
- Multi-step composition generation
- Advanced generation options
- Retry and validation logic

**Key Methods:**
```typescript
class OrchestrationSDK {
  generateSection(request: GenerationRequest): Promise<GenerationResponse>
  generateFromChords(request: ChordProgressionRequest): Promise<GenerationResponse>
  generateAdvanced(request: AdvancedGenerationRequest): Promise<GenerationResponse>
  healthCheck(): Promise<HealthStatus>
}
```

#### 8. `MCPSDK` - Model Context Protocol Integration
**Responsibilities:**
- Agent-to-agent communication
- Agent discovery and registration
- DAid (Digital Asset ID) management
- Capability matching and routing

**Key Methods:**
```typescript
class MCPSDK {
  getAgentCard(): Promise<AgentCard>
  discoverAgents(query: DiscoveryQuery): Promise<DiscoveryResult>
  findBestAgent(capability: string, options?: FindBestOptions): Promise<Agent>
  getRegistryStats(): Promise<RegistryStats>
  getAllAgentCards(): Promise<AgentCards>
  registerAgent(card: AgentCard): Promise<RegistrationResult>
  unregisterAgent(agentId: string): Promise<void>
  sendRequest(request: A2ARequest): Promise<A2AResponse>
}
```

### Missing Backend Endpoints for Complete SDK

#### Audio Processing & Analysis
```
GET    /api/v1/audio/analyze/{file_id}
POST   /api/v1/audio/upload
POST   /api/v1/audio/extract-features
POST   /api/v1/audio/transcribe
GET    /api/v1/audio/{file_id}/waveform
GET    /api/v1/audio/{file_id}/spectrogram
```

#### Real-time Collaboration
```
WS     /api/v1/collaboration/{session_id}
POST   /api/v1/collaboration/sessions
GET    /api/v1/collaboration/sessions/{id}/participants
POST   /api/v1/collaboration/sessions/{id}/join
POST   /api/v1/collaboration/sessions/{id}/leave
```

#### Plugin & Effect Management
```
GET    /api/v1/plugins
POST   /api/v1/plugins/{plugin_id}/apply
GET    /api/v1/plugins/{plugin_id}/parameters
POST   /api/v1/plugins/{plugin_id}/configure
```

#### Advanced Music Theory
```
POST   /api/v1/theory/analyze-key
POST   /api/v1/theory/detect-scale
POST   /api/v1/theory/harmonic-rhythm
POST   /api/v1/theory/voice-leading
GET    /api/v1/theory/progression-suggestions
```

## Implementation Priorities

### Phase 1: Core Foundation (Week 1-2)
1. **AuthenticationSDK** - Critical for all operations
2. **PatternSDK** - Core musical data management
3. **ChordSDK** - Harmonic foundation
4. **Base SDK Architecture** - Client, HTTP layer, error handling

### Phase 2: Generation & Creativity (Week 3-4)
1. **GenerationSDK** - Core content generation
2. **EmotionSDK** - Emotional analysis and transformation
3. **ValidationSDK** - Music theory validation
4. **SequenceSDK** - Musical sequence management

### Phase 3: Advanced Features (Week 5-6)
1. **OrchestrationSDK** - Advanced composition orchestration
2. **MCPSDK** - Agent communication and discovery
3. **DataSDK** - Import/export functionality
4. **FeatureSDK** - Dynamic feature management

### Phase 4: Extended Ecosystem (Week 7-8)
1. **AdminSDK** - Administrative operations
2. **UtilitySDK** - Helper functions
3. **Audio Processing SDK** - Audio analysis endpoints
4. **Collaboration SDK** - Real-time features

## Technical Requirements

### SDK Structure
```
@schillinger-sdk/
├── src/
│   ├── core/
│   │   ├── client.ts          # HTTP client and configuration
│   │   ├── errors.ts          # Error handling classes
│   │   └── types.ts           # Shared TypeScript types
│   ├── auth/
│   │   ├── auth-sdk.ts        # Authentication implementation
│   │   └── types.ts           # Auth-specific types
│   ├── patterns/
│   │   ├── pattern-sdk.ts     # Pattern management
│   │   └── types.ts           # Pattern types
│   ├── chords/
│   │   ├── chord-sdk.ts       # Chord progression management
│   │   └── types.ts           # Chord types
│   ├── generation/
│   │   ├── generation-sdk.ts  # Content generation
│   │   └── types.ts           # Generation types
│   ├── emotion/
│   │   ├── emotion-sdk.ts     # Emotional analysis
│   │   └── types.ts           # Emotion types
│   ├── orchestration/
│   │   ├── orchestration-sdk.ts # Advanced orchestration
│   │   └── types.ts           # Orchestration types
│   ├── mcp/
│   │   ├── mcp-sdk.ts         # MCP integration
│   │   └── types.ts           # MCP types
│   └── index.ts               # Main SDK export
├── examples/
│   ├── basic-usage.ts
│   ├── pattern-generation.ts
│   ├── emotion-analysis.ts
│   └── orchestration.ts
└── docs/
    ├── README.md
    ├── api-reference.md
    └── examples.md
```

### Dependencies
- **HTTP Client**: Axios or fetch with retry logic
- **Type Generation**: Automated from OpenAPI spec
- **Validation**: Zod for runtime type validation
- **Authentication**: JWT token management
- **Error Handling**: Structured error classes
- **Logging**: Configurable logging levels

## Next Steps

1. **Type Generation**: Create TypeScript types from OpenAPI spec
2. **Client Implementation**: Build base HTTP client with authentication
3. **Core SDKs**: Implement AuthSDK, PatternSDK, ChordSDK
4. **Testing**: Comprehensive unit and integration tests
5. **Documentation**: API reference and usage examples
6. **CI/CD**: Automated publishing and versioning

This mapping provides a complete roadmap for SDK development that covers all existing backend endpoints and identifies missing functionality for a comprehensive musical development platform.