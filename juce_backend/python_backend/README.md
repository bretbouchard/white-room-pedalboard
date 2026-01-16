# Schillinger Python Backend

The Python backend for the Schillinger Ecosystem - an AI-powered music composition and generation system.

## Overview

This backend serves as the central intelligence and orchestration layer for the Schillinger Ecosystem, providing:

- **Composition Intelligence**: Schillinger-based algorithmic composition
- **Agent Architecture**: Specialized AI agents for domain-specific tasks
- **API Services**: RESTful APIs and WebSocket communication
- **Session Management**: Authoritative session state management
- **JUCE Integration**: Seamless communication with the JUCE audio engine

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- Node.js 18+ (for development tools)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd python_backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn schillinger.main:app --reload --host 0.0.0.0 --port 8000
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/schillinger

# Redis
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# JUCE Integration
JUCE_WS_URL=ws://localhost:8081

# Logging
LOG_LEVEL=INFO
```

## Architecture

### Core Modules

- **`core/`**: Business logic and orchestration
- **`api/`**: REST API and WebSocket endpoints
- **`agents/`**: Specialized AI agents
- **`models/`**: Data models and schemas
- **`utils/`**: Utility functions and helpers

### Agent System

The backend uses a multi-agent architecture with specialized agents:

- **Pitch Agent**: Musical pitch analysis and manipulation
- **Sample Agent**: Audio sample processing and management
- **VST Agent**: Plugin coordination and control
- **IO Agent**: File operations and data persistence

### Integration with JUCE

The Python backend communicates with the JUCE audio engine via WebSocket, providing:

- Session state synchronization
- Real-time parameter updates
- Transport control commands
- Audio event processing

## API Documentation

Once running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src/schillinger

# Run specific test file
pytest tests/test_session_manager.py
```

### Code Quality

```bash
# Format code
black src/ tests/

# Lint code
ruff check src/ tests/

# Type checking
mypy src/
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Configuration

### Application Settings

The application can be configured via:

1. Environment variables (`.env` file)
2. Pydantic settings in `config/settings.py`
3. Configuration files in `config/`

### Database Configuration

PostgreSQL is the primary database. The configuration includes:

- Connection pooling
- Async operations
- Migration management
- Backup strategies

### Redis Configuration

Redis is used for:

- Session caching
- Real-time data storage
- Message queuing
- Rate limiting

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t schillinger-backend .

# Run container
docker run -p 8000:8000 --env-file .env schillinger-backend
```

### Production Considerations

- Use HTTPS/WSS for secure communication
- Configure proper logging and monitoring
- Set up database backups
- Implement rate limiting and security measures
- Use load balancers for high availability

## Monitoring

### Health Checks

- Application health: `/health`
- Database connectivity: `/health/db`
- Redis connectivity: `/health/redis`
- External services: `/health/external`

### Logging

Structured logging with correlation IDs for request tracing. Logs can be configured to output to:

- Console (development)
- Files (production)
- External services (ELK stack, etc.)

### Metrics

Performance metrics including:

- API response times
- Database query performance
- Agent execution times
- Resource utilization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite and ensure it passes
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support:

- Create an issue in the repository
- Join our Discord community
- Check the documentation in `docs/`

## Roadmap

### Phase 1: Foundation
- [x] Basic API structure
- [x] Agent framework
- [x] JUCE integration layer
- [ ] Core composition algorithms

### Phase 2: AI Integration
- [ ] Advanced AI agents
- [ ] Machine learning models
- [ ] Pattern recognition
- [ ] Intelligent composition

### Phase 3: Performance
- [ ] Optimization
- [ ] Caching strategies
- [ ] Load balancing
- [ ] Monitoring improvements

### Phase 4: Ecosystem
- [ ] Third-party integrations
- [ ] Web interface
- [ ] Mobile API
- [ ] Cloud features