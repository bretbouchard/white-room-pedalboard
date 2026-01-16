# Python Backend Feature Breakdown

## Overview

The Python backend serves as the system's primary logic and orchestration layer, providing comprehensive composition intelligence, agent coordination, and API services. It operates as the authoritative control layer while delegating real-time audio processing to the JUCE backend.

## Core Modules

### `/core`
**Purpose**: Central business logic and system orchestration

#### Session Management (`core/session/`)
- `SessionManager.py` - Central session state controller
- `SessionModel.py` - Pydantic model for session data
- `SessionPersistence.py` - Database operations for sessions
- `StateSync.py` - Synchronization with JUCE backend

#### Composition Engine (`core/composition/`)
- `SchillingerEngine.py` - Core Schillinger algorithm implementation
- `MotifProcessor.py` - Motif generation and manipulation
- `HarmonyEngine.py` - Chord progression and harmony analysis
- `RhythmEngine.py` - Rhythmic pattern generation
- `FormAnalyzer.py` - Musical form analysis and generation

#### Generation Systems (`core/generation/`)
- `NoteGenerator.py` - Melodic note generation
- `ChordGenerator.py` - Harmonic chord generation
- `RhythmGenerator.py` - Rhythmic pattern generation
- `PatternExpander.py` - Pattern variation and expansion

#### Messaging (`core/messaging/`)
- `MessageBus.py` - Central message routing system
- `EventDispatcher.py` - Event publishing and subscription
- `AgentCommunicator.py` - Inter-agent communication
- `ProtocolHandler.py` - Message protocol implementation

### `/api`
**Purpose**: External interface and communication endpoints

#### REST Routes (`api/routes/`)
- `session_routes.py` - Session CRUD operations
- `composition_routes.py` - Composition management
- `generation_routes.py` - Generation API endpoints
- `project_routes.py` - Project management
- `user_routes.py` - User authentication and management

#### WebSocket (`api/websocket/`)
- `websocket_manager.py` - WebSocket connection management
- `realtime_events.py` - Real-time event broadcasting
- `session_sync.py` - Session synchronization over WebSocket
- `transport_events.py` - Transport control events

#### Middleware (`api/middleware/`)
- `auth_middleware.py` - Authentication and authorization
- `cors_middleware.py` - Cross-origin resource sharing
- `rate_limiter.py` - API rate limiting
- `logging_middleware.py` - Request/response logging

### `/agents`
**Purpose**: Specialized AI agents for domain-specific tasks

#### Pitch Agent (`agents/pitch/`)
- `PitchAgent.py` - Pitch detection and analysis
- `PitchClassifier.py` - Musical pitch classification
- `IntonationAnalyzer.py` - Intonation analysis
- `PitchCorrection.py` - Pitch correction suggestions

#### Sample Agent (`agents/sample/`)
- `SampleAgent.py` - Audio sample analysis
- `SampleMatcher.py` - Sample matching and recommendation
- `AudioAnalyzer.py` - Audio feature extraction
- `SampleLibrary.py` - Sample library management

#### VST Agent (`agents/vst/`)
- `VSTAgent.py` - VST plugin coordination
- `PluginManager.py` - Plugin lifecycle management
- `ParameterController.py` - Plugin parameter control
- `PresetManager.py` - Plugin preset management

#### IO Agent (`agents/io/`)
- `IOAgent.py` - Input/output coordination
- `FileHandler.py` - File import/export operations
- `FormatConverter.py` - Audio format conversion
- `BackupManager.py` - Data backup and recovery

### `/models`
**Purpose**: Data models and schemas

#### Pydantic Models (`models/pydantic/`)
- `session_models.py` - Session state models
- `composition_models.py` - Composition data models
- `agent_models.py` - Agent communication models
- `api_models.py` - API request/response models
- `user_models.py` - User account models

#### SQLAlchemy Models (`models/sqlalchemy/`)
- `database_models.py` - Database table definitions
- `relationships.py` - Model relationships
- `migrations/` - Database migration scripts

### `/utils`
**Purpose**: Utility functions and helpers

- `config.py` - Configuration management
- `logging.py` - Logging utilities
- `validators.py` - Input validation functions
- `converters.py` - Data conversion utilities
- `security.py` - Security helpers
- `performance.py` - Performance monitoring

### `/config`
**Purpose**: Configuration files and environment settings

- `settings.py` - Application settings
- `database.py` - Database configuration
- `redis.py` - Redis configuration
- `security.py` - Security settings
- `environment.yml` - Environment variables

### `/tests`
**Purpose**: Test suite and quality assurance

#### Unit Tests (`tests/unit/`)
- Test individual modules and functions
- Mock external dependencies
- Validate business logic

#### Integration Tests (`tests/integration/`)
- Test component interactions
- Database integration testing
- API endpoint testing

## Agent Architecture

### Agent Base Class
All agents inherit from a common `BaseAgent` class providing:
- Message handling interface
- State management
- Logging capabilities
- Performance monitoring

### Agent Communication
- **Message Bus**: Central message routing system
- **Event System**: Publish-subscribe pattern for events
- **Protocol**: JSON-based message format
- **Synchronization**: Async communication with timeouts

### Agent Specialization
Each agent focuses on specific domain expertise:
- **Pitch Agent**: Musical pitch analysis and manipulation
- **Sample Agent**: Audio sample processing and management
- **VST Agent**: Plugin coordination and control
- **IO Agent**: File operations and data persistence

## API Endpoints

### Session Management
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/{id}` - Get session details
- `PUT /api/sessions/{id}` - Update session
- `DELETE /api/sessions/{id}` - Delete session

### Composition
- `GET /api/compositions` - List compositions
- `POST /api/compositions` - Create composition
- `GET /api/compositions/{id}` - Get composition
- `PUT /api/compositions/{id}` - Update composition
- `POST /api/compositions/{id}/generate` - Generate content

### Generation
- `POST /api/generate/notes` - Generate musical notes
- `POST /api/generate/chords` - Generate chords
- `POST /api/generate/rhythm` - Generate rhythm patterns
- `POST /api/generate/pattern` - Generate patterns

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project

### WebSocket Topics
- `/ws/session/{id}` - Session updates
- `/ws/transport` - Transport control events
- `/ws/parameters` - Parameter updates
- `/ws/agents` - Agent communication

## Session & Data Models

### SessionModel
```python
class SessionModel(BaseModel):
    id: str
    name: str
    tempo: float
    time_signature: Tuple[int, int]
    key_signature: str
    created_at: datetime
    updated_at: datetime
    composition_data: CompositionData
    transport_state: TransportState
```

### CompositionData
```python
class CompositionData(BaseModel):
    notes: List[Note]
    chords: List[Chord]
    rhythms: List[RhythmPattern]
    form: FormStructure
    metadata: CompositionMetadata
```

### TransportState
```python
class TransportState(BaseModel):
    is_playing: bool
    position: float
    loop_start: float
    loop_end: float
    tempo: float
```

## JUCE Integration Layer

### Communication Interface
- **Protocol**: WebSocket over localhost
- **Port**: Configurable (default: 8081)
- **Message Format**: JSON with type discriminators
- **Authentication**: Token-based

### Message Types
- `SessionUpdate` - Session state changes
- `TransportCommand` - Play, stop, seek commands
- `ParameterChange` - Plugin parameter updates
- `MIDIEvent` - MIDI data forwarding
- `AudioEvent` - Audio processing events

### Synchronization Strategy
1. **State Mirroring**: Python maintains authoritative state
2. **Event Broadcasting**: Changes propagate to JUCE
3. **Conflict Resolution**: Timestamp-based conflict resolution
4. **Recovery**: Automatic resynchronization on connection loss

## Dependencies

### Core Dependencies
- **FastAPI** 0.104+: Web framework and API server
- **Pydantic** 2.0+: Data validation and serialization
- **SQLAlchemy** 2.0+: ORM and database management
- **Alembic**: Database migrations
- **Redis**: Caching and session storage

### AI/ML Dependencies
- **LangGraph**: Agent orchestration
- **LangChain**: LLM integration
- **OpenAI**: GPT model access
- **NumPy**: Numerical computations
- **librosa**: Audio analysis

### Communication Dependencies
- **websockets**: WebSocket server implementation
- **asyncio**: Asynchronous programming
- **aiofiles**: Async file operations
- **httpx**: Async HTTP client

### Audio Dependencies
- **soundfile**: Audio file I/O
- **pydub**: Audio manipulation
- **midiutil**: MIDI file handling
- **music21**: Music theory analysis

## Future Expansion Plans

### Phase 2: Advanced AI Integration
- Multi-modal AI agents
- Advanced pattern recognition
- Intelligent composition assistance
- Real-time collaboration features

### Phase 3: Performance Optimization
- Caching strategies
- Load balancing
- Database optimization
- Memory management improvements

### Phase 4: Ecosystem Integration
- Third-party plugin support
- Cloud synchronization
- Mobile app API
- Web-based interface

### Phase 5: Advanced Features
- Machine learning model training
- Custom algorithm development
- Advanced audio processing
- Real-time performance analysis

## Security Considerations

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control
- API rate limiting
- Session management

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

### Communication Security
- HTTPS/WSS encryption
- API key management
- Secure WebSocket connections
- Message authentication

## Monitoring & Observability

### Logging
- Structured logging with correlation IDs
- Log levels and filtering
- Log aggregation and analysis
- Error tracking and alerting

### Metrics
- API performance metrics
- Agent execution metrics
- Database query performance
- Resource utilization monitoring

### Health Checks
- Application health endpoints
- Database connectivity checks
- External service dependency checks
- Agent health monitoring

This Python backend provides the foundation for a comprehensive, intelligent music composition system that seamlessly integrates with the JUCE audio engine while offering powerful AI-driven composition capabilities.