# GPL Isolation Strategy

This document describes how we maintain MIT licensing for the main application while using GPL-licensed DawDreamer.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Main Application Process (MIT Licensed)                    │
│ ┌─────────────────┐    ┌─────────────────────────────────┐ │
│ │ Frontend        │    │ Backend API                     │ │
│ │ - React/TS      │    │ - FastAPI                       │ │
│ │ - CopilotKit    │    │ - EngineClient (IPC)            │ │
│ │ - MIT Licensed  │    │ - Audio/Plugin Stores           │ │
│ └─────────────────┘    │ - AI Integration                │ │
│                        │ - MIT Licensed                  │ │
│                        └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                    │ 
                                    │ IPC Boundary (Clean Legal Separation)
                                    │ - Pipes for commands
                                    │ - SharedMemory for audio data
                                    │ - JSON-RPC protocol
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Engine Process (GPL Licensed - Separate Distribution)      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DawDreamer Engine                                       │ │
│ │ - GPL v3 Licensed                                       │ │
│ │ - Audio Processing                                      │ │
│ │ - Plugin Hosting (VST/AU/LV2)                          │ │
│ │ - Real-time Audio I/O                                  │ │
│ │ - Isolated from main process                           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Legal Compliance

### MIT Licensed Components
- All code in `frontend/` directory
- All code in `backend/` directory except engine process
- EngineClient and IPC communication layer
- Mock implementations for testing
- AI integration and CopilotKit components
- Plugin management (non-processing parts)
- User interface and API layers

### GPL Licensed Components (Isolated)
- DawDreamer engine (separate process)
- Real-time audio processing
- Plugin hosting and processing
- Audio rendering pipeline

### Clean Separation Principles
1. **No GPL imports** in main application process
2. **IPC-only communication** between processes
3. **Separate executables** for distribution
4. **Mock fallbacks** for GPL-free operation
5. **Clear licensing boundaries** in code organization

## Implementation Details

### Process Communication
- **Command Channel**: JSON-RPC over multiprocessing.Pipe
- **Audio Data**: SharedMemory for zero-copy audio transfer
- **Error Handling**: Graceful degradation when engine unavailable
- **Lifecycle Management**: Engine process start/stop/restart

### Directory Structure
```
src/
├── audio_agent/           # Main application (MIT)
│   ├── api/              # FastAPI endpoints
│   ├── core/             # Core logic (GPL-free)
│   ├── engine/           # IPC client and bootstrapper
│   └── main.py           # Main application entry
├── engine_process/        # GPL engine (separate distribution)
│   ├── dawdreamer_engine.py
│   ├── audio_processor.py
│   └── engine_main.py    # Engine process entry
└── tests/                # Tests (use mocks)
```

### Development vs Production
- **Development**: Can use in-process engine for debugging
- **Testing**: Always uses mock implementations
- **Production**: Separate engine process required

## Compliance Verification

### Automated Checks
1. **Import Scanner**: Ensures no GPL imports in main process
2. **License Headers**: Verify correct license in each file
3. **Dependency Audit**: Check all dependencies for GPL contamination
4. **Build Verification**: Ensure clean separation in distribution

### Manual Review Points
1. No `import dawdreamer` in main application
2. All audio processing goes through IPC
3. Engine process can be omitted without breaking main app
4. Clear licensing documentation

## Distribution Strategy

### Main Application (MIT)
- Can be distributed freely under MIT license
- Includes mock engine for basic functionality
- Does not include GPL components

### Engine Process (GPL)
- Distributed separately under GPL v3
- Requires GPL compliance for distribution
- Optional component for full functionality

### Combined Distribution
- Must comply with GPL v3 for entire package
- Clear documentation of GPL requirements
- Proper attribution and source availability

## Testing Strategy

### GPL-Free Testing
- All tests use mock implementations
- No GPL dependencies in test environment
- Verify main application works without engine

### Integration Testing
- Separate test suite for engine integration
- Requires GPL engine installation
- Tests IPC communication and error handling

## Maintenance Guidelines

### Code Review Checklist
- [ ] No GPL imports in main application
- [ ] All engine communication goes through IPC
- [ ] Proper license headers on new files
- [ ] Mock implementations updated
- [ ] Documentation reflects changes

### Dependency Management
- Monitor all dependencies for license changes
- Avoid transitive GPL dependencies
- Regular license audits
- Clear separation in requirements files

## Future Considerations

### Alternative Engines
- JUCE-based engine (commercial/GPL dual license)
- Custom audio engine (MIT licensed)
- WebAudio API for browser-based processing

### Commercial Licensing
- Negotiate commercial DawDreamer license
- Dual-license strategy for enterprise customers
- Clear upgrade path from GPL to commercial

This isolation strategy ensures legal compliance while maintaining the flexibility to use powerful GPL-licensed audio processing components.
