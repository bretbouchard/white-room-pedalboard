# Schillinger Local HTTP Server

A FastAPI development server that exposes the Schillinger SDK via HTTP endpoints for local development and testing.

## Overview

The local HTTP server provides REST API endpoints that mirror the SDK's functionality, making it easy to:
- Test generation and analysis functionality
- Develop client applications
- Debug HTTP interactions
- Integrate with web-based tools

## Quick Start

### Using the CLI

```bash
# Start the server (default port 8350)
python src/audio_agent/tools/schillinger_server_cli.py start

# Start in background/daemon mode
python src/audio_agent/tools/schillinger_server_cli.py start --daemon

# Start with custom port and host
python src/audio_agent/tools/schillinger_server_cli.py start --host 0.0.0.0 --port 9000

# Check server status
python src/audio_agent/tools/schillinger_server_cli.py status

# Test server functionality
python src/audio_agent/tools/schillinger_server_cli.py test

# Stop the server
python src/audio_agent/tools/schillinger_server_cli.py stop

# Show example requests
python src/audio_agent/tools/schillinger_server_cli.py examples
```

### Direct Server Script

```bash
# Start server directly
python src/audio_agent/tools/local_schillinger_server.py

# With custom configuration
python src/audio_agent/tools/local_schillinger_server.py --port 8350 --host 127.0.0.1 --log-level info
```

## Environment Variables

- `SCHILLINGER_PORT`: Server port (default: 8350)
- `SCHILLINGER_HOST`: Server host (default: 127.0.0.1)
- `SCHILLINGER_RELOAD`: Enable auto-reload (default: true)

## API Endpoints

### Base URL: `http://127.0.0.1:8350`

### Core Endpoints

#### GET `/`
Server information and available endpoints.

**Response:**
```json
{
  "name": "Schillinger SDK HTTP Server",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "generate": "/music/generate",
    "analyze": "/music/analyze",
    "capabilities": "/capabilities",
    "docs": "/docs"
  }
}
```

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "initialized": true,
  "uptime": 0.0,
  "version": "1.0.0"
}
```

#### GET `/capabilities`
Returns available generation and analysis types.

**Response:**
```json
{
  "generation": [
    "pattern",
    "chord_progression",
    "melody",
    "rhythm",
    "sequence",
    "accompaniment",
    "composition"
  ],
  "analysis": [
    "harmony",
    "melody",
    "rhythm",
    "structure",
    "pattern",
    "style",
    "emotion",
    "comprehensive"
  ],
  "features": {
    "emotion": ["happy", "sad", "energetic", "calm", "dramatic", "peaceful"],
    "orchestration": ["arrange", "instrument", "balance", "layer"],
    "mcp": ["http", "websocket"]
  }
}
```

### Generation Endpoints

#### POST `/music/generate`
Generate musical content.

**Request:**
```json
{
  "type": "pattern",
  "parameters": {
    "key": "C",
    "scale": "MAJOR",
    "length": 4,
    "complexity": 5,
    "tempo": 120
  },
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": {
      "patterns": [
        {
          "id": "pattern_1",
          "type": "rhythm",
          "events": [
            {"pitch": 60, "startTime": 0.0, "duration": 0.5, "velocity": 80},
            {"pitch": 64, "startTime": 1.0, "duration": 0.5, "velocity": 75}
          ],
          "timeSignature": [4, 4],
          "tempo": 120
        }
      ]
    },
    "id": "generated-daid-uuid",
    "type": "pattern"
  },
  "metadata": {
    "daid": "generated-daid-uuid",
    "algorithm": "schillinger_pattern",
    "confidence": 0.85,
    "processingTime": 150
  }
}
```

### Analysis Endpoints

#### POST `/music/analyze`
Analyze musical content.

**Request:**
```json
{
  "type": "harmony",
  "input": {
    "content": {
      "chords": [
        {"root": 60, "type": "major", "duration": 1},
        {"root": 64, "type": "major", "duration": 1}
      ]
    }
  },
  "options": {
    "depth": "comprehensive"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "harmony": {
        "keySignature": {"key": "C", "scale": "MAJOR"},
        "harmonicComplexity": "medium",
        "chords": [
          {"root": 0, "type": "major", "function": "tonic"},
          {"root": 5, "type": "major", "function": "subdominant"}
        ]
      }
    },
    "type": "harmony"
  },
  "metadata": {
    "daid": "analysis-daid-uuid",
    "algorithm": "schillinger_analysis_harmony",
    "confidence": 0.82,
    "processingTime": 120
  }
}
```

### Example Endpoints

#### GET `/examples/generation`
Get example generation requests.

#### GET `/examples/analysis`
Get example analysis requests.

## Interactive Documentation

### Swagger UI: `http://127.0.0.1:8350/docs`
Interactive API documentation with request/response examples.

### ReDoc: `http://127.0.0.1:8350/redoc`
Alternative API documentation format.

## Architecture

### Components

1. **FastAPI Application**: Core HTTP server framework
2. **CLI Management**: Command-line interface for server control
3. **DAID Integration**: Asset provenance tracking
4. **Mock Services**: Realistic musical generation/analysis
5. **Health Monitoring**: System status and capabilities

### Request Flow

1. HTTP request received
2. Request validated and logged
3. Transformation applied to musical data
4. DAID generated for provenance
5. Result stored in asset database
6. HTTP response with result and metadata

### Error Handling

- Comprehensive error logging
- Structured error responses
- Graceful degradation
- Detailed error messages for debugging

## Development

### Running Tests

```bash
# Test server functionality
python src/audio_agent/tools/schillinger_server_cli.py test

# Manual testing with curl
curl -X GET "http://127.0.0.1:8350/health"
curl -X POST "http://127.0.0.1:8350/music/generate" \
  -H "Content-Type: application/json" \
  -d '{"type": "pattern", "parameters": {"key": "C", "scale": "MAJOR"}}'
```

### Logs

Server logs are written to:
- Console output (when not in daemon mode)
- Log file: `src/audio_agent/tools/schillinger_server.log`

### Configuration

Default configuration can be modified in the server script:

```python
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8350
DEFAULT_LOG_LEVEL = "info"
```

## Integration with Frontend

The server is designed to work seamlessly with the frontend Schillinger SDK integration:

1. **React Components**: SchillingerPatternGenerator, SchillingerMusicAnalyzer
2. **Service Layer**: HTTP client for API communication
3. **State Management**: Integration with app state
4. **Error Handling**: User-friendly error messages

### Example Integration

```typescript
// Frontend service calling the local server
const response = await fetch('http://127.0.0.1:8350/music/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'pattern',
    parameters: { key: 'C', scale: 'MAJOR', length: 4 }
  })
});

const result = await response.json();
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change port with `--port` argument
2. **Import errors**: Ensure Python modules are available
3. **CORS issues**: Server allows all origins by default
4. **Timeouts**: Increase timeout in client for complex operations

### Debug Mode

Run with debug logging:
```bash
python src/audio_agent/tools/schillinger_server_cli.py start --log-level debug
```

### Health Checks

Regular health checks to ensure server is running:
```bash
python src/audio_agent/tools/schillinger_server_cli.py status
```

## Production Considerations

This server is intended for development and testing. For production deployment:

1. Use proper authentication/authorization
2. Implement rate limiting
3. Use HTTPS
4. Configure proper logging and monitoring
5. Use a production-grade WSGI server
6. Implement proper error handling and recovery

## Version History

- **v1.0.0**: Initial implementation with generation and analysis endpoints
- Support for 7 generation types and 8 analysis types
- DAID provenance tracking
- CLI management tools
- Comprehensive error handling and logging