# Technical Stack & Development Guidelines

## Core Technologies

- **Python 3.10+**: Base programming language
- **DawDreamer**: Core audio engine for professional-grade mixing and plugin hosting
- **Faust**: DSP language for creating "AI ears" audio analysis modules
- **Pydantic V2**: Data validation with strict type safety
- **LangGraph**: Agent orchestration framework for AI mixing decisions
- **Clerk**: Authentication and user management
- **FastAPI**: API framework for backend services
- **SQLAlchemy**: Database ORM for persistent storage
- **Librosa**: Audio analysis library for Python
- **NumPy/SciPy**: Scientific computing libraries for audio processing

## Build System

- **setuptools**: Python package build system
- **pytest**: Testing framework with coverage requirements
- **mypy**: Static type checking
- **ruff**: Fast Python linter
- **black**: Code formatter
- **isort**: Import sorter
- **pre-commit**: Git hooks for code quality

## Code Quality Standards

- **Type Safety**: All code must use Pydantic V2 with `ConfigDict(strict=True)` for validation
- **Testing**: Minimum 90% test coverage required (`pytest --cov-fail-under=90`)
- **Formatting**: Code must pass black, isort, and ruff checks
- **Documentation**: All public APIs must have docstrings
- **Error Handling**: Comprehensive error handling with graceful degradation

## Common Commands

### Installation

```bash
# Install dependencies
pip install -e .

# Install development dependencies
pip install -e ".[dev]"
```

### Testing

```bash
# Run all tests
pytest

# Run tests with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_file.py

# Run tests with specific marker
pytest -m marker_name
```

### Code Quality

```bash
# Format code
black src tests

# Sort imports
isort src tests

# Run linter
ruff src tests

# Run type checker
mypy src tests
```

### Development Workflow

1. Create feature branch from main
2. Implement feature with tests (TDD approach)
3. Ensure tests pass with minimum 90% coverage
4. Run code quality checks (black, isort, ruff, mypy)
5. Submit PR for review

## Environment Setup

### DawDreamer Setup

DawDreamer requires specific dependencies for audio processing:

```bash
# Install DawDreamer dependencies
# Note: DawDreamer is currently commented out in pyproject.toml
# and will be installed separately or mocked for development
```

### Faust Setup

Faust DSP modules can be compiled to various targets:

```bash
# Compile Faust to C++ for DawDreamer integration
faust2juce faust_module.dsp

# Compile Faust to WebAssembly for browser environments
faust2wasm faust_module.dsp
```

### Authentication Configuration

```python
from src.audio_agent.auth.clerk_auth import ClerkConfig

# Configure Clerk authentication
config = ClerkConfig(
    publishable_key="pk_test_your_key",
    secret_key="sk_test_your_secret",
    schillinger_backend_url="https://schillinger-backend.fly.io"
)
```