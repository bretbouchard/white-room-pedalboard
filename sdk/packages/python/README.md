# Schillinger SDK - Python

Python SDK for the Schillinger System of Musical Composition - a comprehensive toolkit for rhythm, harmony, melody, and composition generation and analysis.

## Features

- **Rhythm Generation**: Create complex rhythmic patterns using Schillinger's resultant theory
- **Harmony Analysis**: Generate and analyze chord progressions with functional harmony
- **Melody Creation**: Generate and analyze melodic fragments with contour analysis
- **Composition Tools**: Complete composition creation with section-based architecture
- **Type Safety**: Full type hints with Pydantic v2 validation
- **Async/Await**: Modern async operations throughout
- **Caching**: Multi-level caching with memory and persistent storage
- **Error Handling**: Comprehensive error types with detailed messages

## Installation

### pip install

```bash
pip install schillinger-sdk
```

### From source

```bash
git clone https://github.com/schillinger/schillinger-sdk-python
cd schillinger-sdk-python
pip install -e .
```

### With development dependencies

```bash
pip install -e ".[dev]"
```

## Quick Start

### Basic Usage

```python
from schillinger_sdk import SchillingerSDK

# Initialize with API key
sdk = SchillingerSDK(
    base_url="https://api.schillinger.io",
    api_key="your-api-key"
)

# Start the client
await sdk.start()

# Generate a rhythmic resultant
generators = [
    {"strikes": [0, 3, 6], "period": 8},
    {"strikes": [0, 2, 4, 6], "period": 8}
]
resultant = await sdk.rhythm.generate_resultant(generators)
print(f"Resultant strikes: {resultant.resultant.strikes}")

# Cleanup
await sdk.stop()
```

### Using Async Context Manager

```python
async with SchillingerSDK(
    base_url="https://api.schillinger.io",
    api_key="your-api-key"
) as sdk:
    # Generate harmonic progression
    progression = await sdk.harmony.generate_progression(
        key="C",
        length=8,
        options={"scale": "major", "complexity": 0.6}
    )
    for chord in progression.chords:
        print(f"Chord: {chord.root} {chord.quality}")
```

### With Caching Enabled

```python
sdk = SchillingerSDK(
    base_url="https://api.schillinger.io",
    api_key="your-api-key",
    enable_cache=True,
    cache_ttl=3600,
    cache_dir="~/.schillinger_sdk/cache"
)

await sdk.start()

# Responses are cached automatically
result1 = await sdk.rhythm.analyze_pattern(pattern)
result2 = await sdk.rhythm.analyze_pattern(pattern)  # From cache

# Check cache stats
stats = sdk.get_cache_stats()
print(f"Cache hit rate: {stats['memory_cache']['hit_rate']:.2%}")
```

### OAuth Authentication

```python
sdk = SchillingerSDK(
    base_url="https://api.schillinger.io",
    token_url="https://auth.schillinger.io/oauth/token",
    client_id="your-client-id",
    client_secret="your-client-secret"
)

await sdk.start()
# Token management is automatic
```

## API Reference

### Rhythm API

```python
# Generate resultant from multiple generators
resultant = await sdk.rhythm.generate_resultant(
    generators=[
        {"strikes": [0, 3, 6], "period": 8},
        {"strikes": [0, 2, 4, 6], "period": 8}
    ],
    options={"include_interference": True}
)

# Generate variation
variation = await sdk.rhythm.generate_variation(
    pattern={"strikes": [0, 2, 4, 6], "period": 8},
    technique="displacement",
    options={"amount": 0.25}
)

# Analyze pattern
analysis = await sdk.rhythm.analyze_pattern(
    pattern={"strikes": [0, 3, 6], "period": 8}
)
print(f"Complexity: {analysis.complexity}")

# Infer generators
generators = await sdk.rhythm.infer_generators(
    pattern={"strikes": [0, 1, 3, 4, 6, 7], "period": 8},
    max_generators=3
)
```

### Harmony API

```python
# Generate progression
progression = await sdk.harmony.generate_progression(
    key="C",
    length=8,
    options={"scale": "major", "complexity": 0.5}
)

# Analyze progression
analysis = await sdk.harmony.analyze_progression(
    chords=[
        {"root": 0, "quality": "major"},
        {"root": 5, "quality": "major"},
        {"root": 7, "quality": "major"}
    ],
    key="C"
)

# Resolve chord
resolution = await sdk.harmony.resolve_chord(
    chord={"root": 7, "quality": "dominant"},
    context={"key": "C"}
)

# Generate axis pattern
axis = await sdk.harmony.generate_axis_pattern(
    axis_intervals=[0, 4, 7],
    rotation=3
)
```

### Melody API

```python
# Generate melody
melody = await sdk.melody.generate_melody(
    length=16,
    scale=[0, 2, 4, 5, 7, 9, 11],  # C major
    options={"complexity": 0.5, "range": (60, 72)}
)

# Generate variations
variations = await sdk.melody.generate_variations(
    melody={"pitches": [60, 62, 64, 65], "durations": [1, 1, 1, 1]},
    techniques=["ornamentation", "sequence"],
    count=3
)

# Analyze melody
analysis = await sdk.melody.analyze_melody(
    melody={"pitches": [60, 62, 64, 65, 67], "durations": [1, 1, 1, 1, 1]}
)
print(f"Contour: {analysis.contour.contour}")

# Extract contour
contour = await sdk.melody.extract_contour(
    melody={"pitches": [60, 62, 64, 63, 65]},
    granularity="fine"
)
```

### Composition API

```python
# Create composition
composition = await sdk.composition.create(
    title="My Composition",
    metadata={"key": "C", "tempo": 120}
)

# Generate section
section = await sdk.composition.generate_section(
    composition_id=composition.id,
    section_name="Verse 1",
    bars=16,
    parameters={"generate_melody": True, "energy": 0.7}
)

# Analyze composition
analysis = await sdk.composition.analyze_composition(composition.id)
print(f"Coherence: {analysis.coherence_score}")

# Encode user input
encoded = await sdk.composition.encode_user_input(
    input_type="contour",
    data=[2, 2, -1, 2, -2, 2, -1]
)

# Export composition
midi_data = await sdk.composition.export_composition(
    composition_id=composition.id,
    format="midi"
)
with open("composition.mid", "wb") as f:
    f.write(midi_data)
```

## Error Handling

```python
from schillinger_sdk import (
    ValidationError,
    NetworkError,
    AuthenticationError,
    RateLimitError
)

try:
    resultant = await sdk.rhythm.generate_resultant(generators)
except ValidationError as e:
    print(f"Validation error: {e.message}")
    print(f"Field: {e.details.get('field')}")
except NetworkError as e:
    print(f"Network error: {e.message}")
    print(f"Status code: {e.details.get('status_code')}")
except AuthenticationError as e:
    print(f"Authentication failed: {e.message}")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.details.get('retry_after')} seconds")
```

## Configuration

### Environment Variables

```bash
export SCHILLINGER_BASE_URL="https://api.schillinger.io"
export SCHILLINGER_API_KEY="your-api-key"
export SCHILLINGER_TIMEOUT="30"
export SCHILLINGER_CACHE_ENABLED="true"
export SCHILLINGER_CACHE_TTL="3600"
```

### Logging

```python
import logging

# Configure logging level
sdk = SchillingerSDK(
    base_url="https://api.schillinger.io",
    api_key="your-api-key",
    log_level="DEBUG"  # or INFO, WARNING, ERROR
)

# Custom logging handler
logging.getLogger('schillinger_sdk').addHandler(my_handler)
```

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=schillinger_sdk --cov-report=html

# Run specific test file
pytest tests/test_rhythm.py

# Run async tests only
pytest -m asyncio
```

### Code Quality

```bash
# Format code
black schillinger_sdk tests

# Lint code
ruff check schillinger_sdk tests

# Type checking
mypy schillinger_sdk

# Run all checks
pre-commit run --all-files
```

### Building Documentation

```bash
pip install -e ".[docs]"
cd docs
make html
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run tests and linting
6. Submit a pull request

## Support

- Documentation: https://schillinger-sdk.readthedocs.io
- Issues: https://github.com/schillinger/schillinger-sdk-python/issues
- Email: sdk@schillinger.io

## Changelog

### Version 1.0.0 (2025-12-24)

- Initial release
- Complete rhythm, harmony, melody, and composition APIs
- Async/await throughout
- Multi-level caching
- OAuth and API key authentication
- Comprehensive error handling
- Full type hints with Pydantic v2
- 80%+ test coverage
