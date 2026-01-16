# Project Structure & Architecture

## Directory Organization

```
src/audio_agent/
├── __init__.py
├── auth/                    # Clerk authentication
│   ├── __init__.py
│   ├── clerk_auth.py        # ClerkAuthenticator class
│   ├── middleware.py        # FastAPI middleware
│   └── exceptions.py        # Auth-specific exceptions
├── core/                    # Core audio processing
│   ├── __init__.py
│   ├── dawdreamer_engine.py # DawDreamer integration
│   ├── dawdreamer_mock.py   # Mock implementation for testing
│   └── faust_analyzers.py   # Faust-based audio analysis
└── models/                  # Pydantic data models
    ├── __init__.py
    ├── audio.py             # Audio analysis models
    ├── composition.py       # Musical composition models
    ├── user.py              # User profile and preferences
    ├── plugin.py            # Plugin management models
    ├── plugin_state.py      # Plugin state management
    └── validation.py        # Custom validators and TypeAdapters

tests/                       # Test suite
├── test_auth_clerk.py       # Authentication tests
├── test_dawdreamer_engine.py # Engine tests
├── test_faust_analyzers.py  # Audio analysis tests
├── test_integration_foundation.py # Integration tests
├── test_models_audio.py     # Audio model tests
├── test_models_composition.py # Composition model tests
├── test_models_user.py      # User model tests
├── test_models_plugin.py    # Plugin model tests
├── test_models_plugin_state.py # Plugin state tests
└── test_validation.py       # Validation utility tests

.kiro/                       # Kiro-specific files
├── specs/                   # Project specifications
│   └── audio-agent-transformation/
│       ├── requirements.md  # Project requirements
│       ├── design.md        # Design document
│       └── tasks.md         # Implementation tasks
└── steering/                # Steering documents
    ├── product.md           # Product overview
    ├── tech.md              # Technical stack
    └── structure.md         # Project structure
```

## Architecture Patterns

### Data Model Architecture

The project uses a strict Pydantic V2 validation approach with the following key models:

```
AudioAnalysis
├── SpectralFeatures (centroid, rolloff, flux, MFCC, etc.)
├── DynamicFeatures (RMS, peak, transients, dynamic range)
├── HarmonicFeatures (pitch, harmonics, inharmonicity)
├── PerceptualFeatures (loudness LUFS, brightness, warmth)
├── SpatialFeatures (stereo width, phase correlation)
└── FrequencyBalance (bass, mid, treble distribution)

CompositionContext
├── Musical Parameters (tempo, key, time signature, style)
├── Harmonic Progression (chord analysis, modulations)
├── Schillinger Integration (rhythmic patterns, pitch scales)
└── Structure Analysis (sections, form, arrangement)

Plugin System
├── PluginInstance (active plugin with parameters)
├── PluginChain (ordered plugin processing)
├── PluginRecommendation (AI-driven suggestions)
├── PluginStateSnapshot (undo/redo functionality)
└── PluginPerformanceMetrics (real-time monitoring)
```

### Authentication Architecture

```
Clerk Integration
├── ClerkAuthenticator (session verification)
├── AuthenticationMiddleware (FastAPI integration)
├── User Context (all models include clerk_user_id)
└── Schillinger Backend Bridge (authenticated API calls)
```

### Audio Processing Architecture

```
DawDreamer Engine
├── Audio Device Management
├── Plugin Host
├── Mixing Console
└── Automation Engine

Faust Analysis System
├── Spectral Analysis
├── Dynamic Analysis
├── Harmonic Analysis
├── Perceptual Analysis
└── Spatial Analysis
```

### Agent Architecture

```
LangGraph Orchestration
├── Agent Coordinator
├── EQ Specialist
├── Dynamics Agent
├── Spatial Agent
└── Arrangement Agent
```

## Coding Conventions

1. **Model Validation**: All models must use `ConfigDict(strict=True)` for runtime type safety
2. **Field Validators**: Use `field_validator` for custom validation logic
3. **Error Handling**: Provide detailed error messages with context
4. **Testing**: Each module should have corresponding test file with same name
5. **Documentation**: Use docstrings for all classes and public methods
6. **Type Hints**: Use proper type hints throughout the codebase
7. **User Context**: Include `clerk_user_id` in all user-specific models

## Development Workflow

1. **Task Selection**: Choose a task from the implementation plan
2. **Test-First Approach**: Write tests before implementation
3. **Implementation**: Implement the feature with strict validation
4. **Testing**: Ensure tests pass with minimum 90% coverage
5. **Code Quality**: Run black, isort, ruff, and mypy
6. **Documentation**: Update documentation as needed
7. **Review**: Submit for code review

## Integration Points

1. **Clerk Authentication**: All user-related functionality integrates with Clerk
2. **Schillinger Backend**: Integration with schillinger-backend.fly.io
3. **DawDreamer**: Core audio processing engine
4. **Faust**: DSP-based audio analysis
5. **LangGraph**: Agent orchestration for mixing decisions