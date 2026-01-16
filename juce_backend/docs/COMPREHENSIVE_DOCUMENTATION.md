# Schillinger Audio Agent - Comprehensive Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [API Documentation](#api-documentation)
5. [Frontend Components](#frontend-components)
6. [Performance Optimization](#performance-optimization)
7. [Plugin System](#plugin-system)
8. [Audio Export](#audio-export)
9. [Installation & Setup](#installation--setup)
10. [Development Guide](#development-guide)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)
13. [Contributing](#contributing)

## System Overview

The Schillinger Audio Agent is a comprehensive digital audio workstation (DAW) system that combines web-based audio processing, real-time collaboration, and advanced workflow management capabilities. It leverages modern web technologies to provide professional audio editing and production tools in a browser environment.

### Key Features

- **Real-time Audio Processing**: Advanced audio analysis, effects, and processing
- **Workflow Management**: React Flow-based visual workflow design and execution
- **Plugin Architecture**: Extensible plugin system for custom audio processing nodes
- **Performance Optimization**: Advanced performance monitoring and optimization for large-scale workflows
- **Audio Export**: Multi-format audio export with metadata preservation
- **Collaboration**: Real-time collaboration features with DAID provenance tracking
- **AI Integration**: AI-powered suggestions and workflow optimization

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Audio Engine  │
│   (React/TS)    │◄──►│   (FastAPI)     │◄──►│   (DAW Engine)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Flow    │    │   WebSocket     │    │   Audio Files  │
│   Workflows     │    │   Communication│    │   Management    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Performance     │    │   Plugin        │    │   DAID          │
│ Optimization    │    │   System        │    │   Provenance    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18+ with TypeScript
- React Flow for visual workflows
- Zustand for state management
- Tailwind CSS for styling
- Vite for development/build

**Backend:**
- FastAPI with Python 3.9+
- WebSocket for real-time communication
- SQLAlchemy for database operations
- Pydantic for data validation
- asyncio for async operations

**Audio Processing:**
- DAWDreamer for audio engine
- librosa for audio analysis
- soundfile for audio file handling
- numpy for numerical operations

## Core Components

### 1. Audio Engine

**Location**: `backend/src/audio_agent/core/`

The audio engine provides the foundation for all audio processing operations:

- **DAW Engine**: Core audio processing engine
- **MIDI Support**: Comprehensive MIDI handling and processing
- **Audio Analysis**: Real-time audio feature extraction
- **Plugin Hosting**: Hosts and manages audio plugins

### 2. Workflow System

**Location**: `frontend/src/components/` and `backend/src/`

The workflow system enables visual audio processing workflows:

- **React Flow Integration**: Visual node-based workflow design
- **Audio Processing Nodes**: Specialized nodes for audio operations
- **Real-time Execution**: Live audio processing during workflow execution
- **Workflow Serialization**: Save and load complete workflows

### 3. Performance System

**Location**: `backend/src/performance/`

Advanced performance optimization for large-scale workflows:

- **Rendering Optimization**: Virtual scrolling, LOD rendering, frustum culling
- **Caching System**: Multi-level caching with memory and disk storage
- **Performance Monitoring**: Real-time metrics and alerting
- **Profiling Tools**: Comprehensive performance analysis

### 4. Plugin System

**Location**: `backend/src/plugins/`

Extensible plugin architecture:

- **Dynamic Loading**: Runtime plugin loading and unloading
- **Sandboxed Execution**: Secure plugin execution environment
- **Plugin Types**: Multiple plugin types (NODE, EFFECT, GENERATOR, etc.)
- **Hot Reloading**: Development-friendly plugin reloading

### 5. Audio Export

**Location**: `backend/src/audio_export/`

Professional audio export capabilities:

- **Multiple Formats**: WAV, AIFF, FLAC, MP3, M4A support
- **Metadata Preservation**: Complete metadata handling
- **Quality Control**: Adjustable export quality settings
- **Batch Operations**: Export multiple tracks or projects

## API Documentation

### Base URL: `http://localhost:8000`

### Authentication

The system uses Clerk for authentication. Include JWT tokens in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

### Core Endpoints

#### Projects

```http
GET    /api/projects                # List user projects
GET    /api/projects/{id}          # Get project details
POST   /api/projects                # Create new project
PUT    /api/projects/{id}          # Update project
DELETE /api/projects/{id}          # Delete project
```

#### Audio Export

```http
POST   /api/export/project/{id}     # Export project
POST   /api/export/file/{id}        # Export audio file
GET    /api/export/progress/{id}    # Get export progress
POST   /api/export/cancel/{id}       # Cancel export
GET    /api/export/formats          # Get supported formats
```

#### Performance Optimization

```http
POST   /api/performance/optimize-workflow    # Optimize React Flow workflow
GET    /api/performance/dashboard            # Get performance dashboard
POST   /api/performance/benchmark            # Run performance benchmark
POST   /api/performance/cache-workflow/{id} # Cache workflow data
GET    /api/performance/cached-workflow/{id} # Get cached workflow
POST   /api/performance/monitoring/start     # Start monitoring
POST   /api/performance/monitoring/stop      # Stop monitoring
```

#### Plugin System

```http
GET    /api/plugins                            # List available plugins
GET    /api/plugins/{id}                      # Get plugin details
POST   /api/plugins/{id}/instances             # Create plugin instance
DELETE /api/plugins/instances/{id}            # Destroy plugin instance
POST   /api/plugins/instances/{id}/execute     # Execute plugin
GET    /api/plugins/system/status            # Get plugin system status
POST   /api/plugins/{id}/reload               # Reload plugin
```

#### WebSocket Events

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/{user_id}');

// Messages format
{
  "type": "workflow_execution",
  "data": {
    "nodeId": "node_1",
    "result": {...}
  }
}
```

## Frontend Components

### Core Components

**AudioStore**: Global state management
- Location: `frontend/src/stores/audioStore.ts`
- Manages audio projects, tracks, regions, and mixer state

**ReactFlow Components**: Visual workflow interface
- Location: `frontend/src/components/`
- Custom React Flow nodes and edges for audio processing

**Performance Components**: Performance monitoring and optimization
- Location: `frontend/src/components/performance/`
- PerformanceDashboard, WorkflowOptimizer, PerformanceTester

### Component Architecture

```
src/
├── components/
│   ├── audio/          # Audio-specific components
│   ├── workflow/       # React Flow workflow components
│   ├── performance/    # Performance optimization components
│   ├── plugins/        # Plugin management components
│   └── export/         # Audio export components
├── stores/             # State management (Zustand)
├── services/           # API service layer
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

## Performance Optimization

### Performance Monitoring

The system includes comprehensive performance monitoring:

```typescript
// Real-time performance metrics
interface PerformanceMetrics {
  fps: number;              // Frames per second
  memoryUsage: number;       // Memory usage in MB
  renderTime: number;        // Render time in ms
  visibleNodes: number;      // Number of visible nodes
  totalNodes: number;        // Total number of nodes
  optimizationLevel: string;  // Current optimization level
}
```

### Optimization Strategies

1. **Virtual Scrolling**: Only render visible nodes
2. **Level-of-Detail (LOD)**: Simplify node rendering based on zoom
3. **Edge Simplification**: Reduce edge complexity for large workflows
4. **Node Clustering**: Group nodes for better performance
5. **Multi-level Caching**: Memory and disk caching for workflow data

### Performance Guidelines

- Use virtual scrolling for workflows with 2000+ nodes
- Enable LOD rendering for workflows with 1000+ nodes
- Monitor memory usage and enable optimizations when needed
- Cache frequently accessed workflows
- Benchmark performance regularly

## Plugin System

### Plugin Structure

```
plugins/
├── my_plugin/
│   ├── plugin.json          # Plugin manifest
│   ├── main.py              # Main plugin code
│   ├── assets/              # Static assets
│   └── docs/               # Documentation
```

### Plugin Manifest

```json
{
  "metadata": {
    "name": "My Plugin",
    "version": "1.0.0",
    "description": "Plugin description",
    "author": "Author Name",
    "plugin_type": "NODE",
    "category": "Audio Processing",
    "dependencies": [],
    "requires_permissions": ["execute"]
  },
  "main_file": "main.py",
  "config_schema": {},
  "default_config": {}
}
```

### Plugin Development

```python
from backend.src.plugins.types import NodePlugin, PluginContext

class MyPlugin(NodePlugin):
    def __init__(self, context: PluginContext):
        super().__init__(context)

    async def initialize(self) -> bool:
        return True

    async def execute(self, inputs: dict, parameters: dict) -> dict:
        # Plugin processing logic
        return {"result": "processed_data"}

    def get_node_definition(self) -> dict:
        return {
            "type": "myNode",
            "label": "My Plugin",
            "inputs": ["input"],
            "outputs": ["output"],
            "parameters": {
                "gain": {"type": "number", "default": 1.0}
            }
        }
```

## Audio Export

### Supported Formats

- **WAV**: Uncompressed PCM audio
- **AIFF**: Apple audio format
- **FLAC**: Lossless compression
- **MP3**: Lossy compression (LAME)
- **M4A**: Apple AAC format

### Export Configuration

```python
export_config = {
    "format": "wav",
    "quality": "high",
    "sample_rate": 44100,
    "bit_depth": 16,
    "metadata": {
        "title": "My Song",
        "artist": "Artist Name",
        "album": "Album Name"
    }
}
```

### Export Process

1. **Validation**: Validate export parameters
2. **Mixing**: Mix tracks according to mixer settings
3. **Processing**: Apply effects and processing
4. **Encoding**: Encode to target format
5. **Metadata**: Add metadata to exported file
6. **Completion**: Return export results

## Installation & Setup

### Prerequisites

- Python 3.9+
- Node.js 16+
- npm or yarn
- Git

### Backend Setup

```bash
# Clone repository
git clone <repository_url>
cd schill/audio_agent

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-dev.txt

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start development server
uvicorn backend.src.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Environment Variables

```bash
# Backend (.env)
DATABASE_URL=sqlite:///./schill.db
DAID_BASE_URL=http://localhost:8002
DAID_API_KEY=your_daid_api_key
CLERK_API_KEY=your_clerk_api_key

# Frontend (.env.local)
VITE_API_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

## Development Guide

### Code Structure

```
schill/audio_agent/
├── backend/
│   ├── src/
│   │   ├── audio_agent/     # Core audio processing
│   │   ├── plugins/          # Plugin system
│   │   ├── audio_export/     # Audio export functionality
│   │   ├── performance/     # Performance optimization
│   │   └── models/           # Database models
│   └── tests/               # Backend tests
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── stores/          # State management
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript types
│   └── __tests__/           # Frontend tests
└── docs/                   # Documentation
```

### Development Workflow

1. **Feature Development**: Create feature branch from main
2. **Testing**: Write comprehensive tests for new features
3. **Documentation**: Update documentation for new features
4. **Code Review**: Submit pull request for review
5. **Integration**: Merge to main after approval

### Testing

```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm test

# Integration tests
pytest backend/tests/test_integration_comprehensive.py -v

# Performance tests
npm run test:performance
```

### Code Style

- **Backend**: Follow PEP 8, use Black for formatting
- **Frontend**: Use ESLint and Prettier
- **TypeScript**: Strict typing required
- **Documentation**: Document all public APIs

## Testing

### Test Categories

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: System integration testing
3. **Performance Tests**: Performance benchmarking
4. **End-to-End Tests**: Complete workflow testing

### Test Coverage

- **Backend**: Target >80% coverage
- **Frontend**: Target >70% coverage
- **Critical Paths**: 100% coverage required

### Running Tests

```bash
# All tests
npm run test:all

# Specific test suites
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Performance Testing

The system includes comprehensive performance testing:

```typescript
// Performance benchmark example
const result = await performanceService.benchmarkWorkflow(workflowData, 5);

console.log('Performance Results:', {
  averageTime: result.optimization_performance.avg_time_ms,
  maxTime: result.optimization_performance.max_time_ms,
  successRate: result.optimization_performance.success_rate
});
```

## Troubleshooting

### Common Issues

#### Performance Issues

1. **Low FPS**: Enable virtual scrolling and LOD rendering
2. **High Memory Usage**: Enable node clustering and clear cache
3. **Slow Loading**: Check caching configuration and optimize workflows

#### Audio Issues

1. **No Audio Output**: Check audio engine initialization
2. **Poor Audio Quality**: Verify sample rate and bit depth settings
3. **Export Failures**: Check file permissions and disk space

#### Plugin Issues

1. **Plugin Loading Failed**: Check plugin manifest and dependencies
2. **Plugin Execution Errors**: Review plugin logs and permissions
3. **Plugin Performance**: Monitor plugin execution time

### Debug Tools

1. **Performance Dashboard**: Real-time performance monitoring
2. **Browser DevTools**: Memory and performance profiling
3. **Plugin Debug Mode**: Enable detailed plugin logging
4. **API Debugging**: Use API logs to trace issues

### Getting Help

- **Documentation**: Check relevant documentation sections
- **GitHub Issues**: Create detailed issue reports
- **Logs**: Check application logs for error details
- **Community**: Join community discussions for help

## Contributing

### Contributing Guidelines

1. **Fork Repository**: Create fork for development
2. **Create Branch**: Use descriptive branch names
3. **Write Tests**: Include tests for new features
4. **Update Docs**: Update relevant documentation
5. **Submit PR**: Create pull request with description

### Code Review Process

1. **Automated Checks**: CI/CD pipeline validation
2. **Code Review**: Peer review of code changes
3. **Testing**: Comprehensive test validation
4. **Documentation**: Documentation review
5. **Integration**: Integration testing validation

### Development Standards

- **Code Quality**: Follow established coding standards
- **Testing**: Maintain test coverage requirements
- **Documentation**: Keep documentation updated
- **Performance**: Consider performance implications

## API Reference

### Audio Export API

#### Export Project

```http
POST /api/export/project/{project_id}
Content-Type: application/json

{
  "format": "wav",
  "quality": "high",
  "sample_rate": 44100,
  "bit_depth": 16
}
```

**Response:**
```json
{
  "success": true,
  "export_path": "/exports/project_123.wav",
  "format": "wav",
  "quality": "high"
}
```

#### Get Export Progress

```http
GET /api/export/progress/{export_id}
```

**Response:**
```json
{
  "export_id": "export_456",
  "progress": 0.75,
  "status": "processing",
  "current_step": "Encoding audio",
  "output_path": "/exports/project_123.wav"
}
```

### Performance API

#### Optimize Workflow

```http
POST /api/performance/optimize-workflow
Content-Type: application/json

{
  "nodes": [...],
  "viewport": {
    "x": 0,
    "y": 0,
    "width": 1920,
    "height": 1080,
    "zoom": 1.0
  },
  "edges": [...]
}
```

**Response:**
```json
{
  "success": true,
  "optimized_nodes": [...],
  "optimized_edges": [...],
  "render_plan": {
    "high_detail": ["node_1", "node_2"],
    "medium_detail": ["node_3"],
    "low_detail": ["node_4", "node_5"]
  },
  "performance_stats": {...},
  "recommendations": [...]
}
```

#### Get Performance Dashboard

```http
GET /api/performance/dashboard
```

**Response:**
```json
{
  "timestamp": 1640995200000,
  "system_status": {...},
  "performance_report": {...},
  "cache_statistics": {...},
  "service_status": {...}
}
```

### Plugin API

#### List Plugins

```http
GET /api/plugins?plugin_type=NODE&category=Audio%20Processing
```

**Response:**
```json
{
  "plugins": [
    {
      "id": "my_plugin",
      "name": "My Plugin",
      "type": "NODE",
      "category": "Audio Processing",
      "description": "Plugin description",
      "version": "1.0.0",
      "author": "Author Name"
    }
  ],
  "count": 1
}
```

#### Create Plugin Instance

```http
POST /api/plugins/{plugin_id}/instances
Content-Type: application/json

{
  "config": {
    "gain": 1.0,
    "frequency": 440.0
  },
  "permissions": ["execute"]
}
```

**Response:**
```json
{
  "success": true,
  "instance_id": "instance_789",
  "plugin_id": "my_plugin"
}
```

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Changelog

### Version 1.0.0
- Initial release
- Core audio processing capabilities
- React Flow workflow system
- Performance optimization system
- Plugin architecture
- Audio export functionality
- Comprehensive testing suite

## Support

For support and questions:

- **Documentation**: Check this comprehensive documentation
- **Issues**: Create GitHub issues with detailed descriptions
- **Community**: Join discussions in GitHub or Discord
- **Email**: Contact development team

---

*This documentation covers the complete Schillinger Audio Agent system. For specific component documentation, see the respective files in the docs/ directory.*