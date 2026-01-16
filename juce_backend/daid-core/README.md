# DAID Core: Distributed Asset Identifier Library

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PyPI version](https://badge.fury.io/py/daid-core.svg)](https://badge.fury.io/py/daid-core)
[![npm version](https://badge.fury.io/js/%40schillinger-daid%2Fdaid-core.svg)](https://badge.fury.io/js/%40schillinger-daid%2Fdaid-core)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/bretbouchard/daid_core/actions)
[![Type Safety](https://img.shields.io/badge/types-TypeScript%20%7C%20Python%20%7C%20Node.js-blue)](https://github.com/bretbouchard/daid_core)

A comprehensive, cross-language library for DAID (Distributed Asset Identifier) provenance tracking and management. Available in Python, TypeScript/JavaScript, and with comprehensive CLI support.

## 🎯 What is DAID?

DAID (Distributed Asset Identifier) is a deterministic, human-readable identifier system that provides:

- **Cryptographic Uniqueness**: Each DAID contains a provenance hash for integrity verification
- **Human Readability**: Clear, structured format that encodes creation time, agent, and entity information
- **Cross-Language Validation**: DAIDs generated in TypeScript validate in Python and vice versa
- **Provenance Tracking**: Complete audit trail of when, who, and what created each asset

### DAID Format
```
daid:v1.0:2025-01-19T10-30-00.262Z:user:alice:composition:comp-001:27e05b945ce122f9
│       │         │                  │    │     │     │    │     └─ Provenance Hash
│       │         │                  │    │     │     │    └─ Entity ID
│       │         │                  │    │     │     └─ Entity Type
│       │         │                  │    │     └─ Agent ID
│       │         │                  │    └─ Timestamp (ISO 8601, colons replaced with hyphens)
│       │         └─ Version
│       └─ Protocol identifier
```

## ✨ Key Features

### 🔐 Security & Integrity
- **Cryptographic Hashes**: SHA-256 based provenance verification
- **Collision Resistance**: 64-bit hash provides excellent collision resistance
- **Immutable Records**: Once generated, DAIDs cannot be altered without detection
- **Cross-Validation**: Built-in validation across all supported languages

### 🚀 Performance
- **Zero Dependencies**: Lightweight implementation with minimal footprint
- **Batch Operations**: Efficient bulk generation and validation
- **Caching Layer**: Built-in TTL-based caching for high-throughput scenarios
- **Memory Efficient**: Optimized for large-scale deployments

### 🔧 Developer Experience
- **Type Safety**: Full TypeScript definitions and Python type hints
- **Comprehensive CLI**: Complete command-line interface for all operations
- **Extensible**: Plugin architecture for custom validation rules
- **Well Documented**: Extensive documentation and examples

## 📦 Installation

### Python
```bash
# From PyPI
pip install daid-core

# From source
git clone https://github.com/bretbouchard/daid_core.git
cd daid_core
pip install -e .
```

### TypeScript/JavaScript
```bash
# From npm
npm install @schillinger-daid/daid-core

# From source
git clone https://github.com/bretbouchard/daid_core.git
cd daid_core
npm install
npm build
npm link
```

### Docker
```bash
# Pull the official image
docker pull ghcr.io/bretbouchard/daid-core:latest

# Or build from source
docker build -t daid-core .
```

## 🚀 Quick Start

### Python Usage

```python
from daid_core import DAIDGenerator, DAIDValidator, DAIDClient

# Generate a DAID locally
daid = DAIDGenerator.generate(
    agent_id="user:alice123",
    entity_type="composition",
    entity_id="comp-001",
    operation="create",
    metadata={
        "tempo": 120,
        "key": "C major",
        "duration": 180.5
    }
)

print(f"Generated DAID: {daid}")
# Output: daid:v1.0:2025-01-19T10-30-00.262Z:user:alice123:composition:comp-001:abc123def

# Validate a DAID
is_valid = DAIDValidator.validate(daid)
print(f"Valid: {is_valid}")

# Extract components
components = DAIDValidator.parse(daid)
print(f"Agent: {components.agent_id}")
print(f"Created: {components.timestamp}")
```

### TypeScript Usage

```typescript
import {
  DAIDGenerator,
  DAIDValidator,
  UnifiedDAIDClient,
  DAIDComponents
} from '@schillinger-daid/daid-core';

// Generate a DAID
const daid = DAIDGenerator.generate({
  agentId: "user:alice123",
  entityType: "composition",
  entityId: "comp-001",
  operation: "create",
  metadata: {
    tempo: 120,
    key: "C major",
    duration: 180.5
  }
});

console.log(`Generated DAID: ${daid}`);

// Validate and parse
const isValid = DAIDValidator.validate(daid);
if (isValid) {
  const components = DAIDValidator.parse(daid);
  console.log(`Agent: ${components.agentId}`);
  console.log(`Created: ${components.timestamp}`);
}

// Use the client for service integration
const client = new UnifiedDAIDClient({
  agentId: "system:my-app",
  baseUrl: "https://api.daid.example.com",
  enableCaching: true,
  timeout: 5000
});

const result = await client.createDAID(
  "composition",
  "comp-002",
  "update",
  {
    metadata: { tempo: 140, key: "G minor" }
  }
);
```

## 🖥️ Command Line Interface

The `daid-cli` tool provides complete command-line access to DAID operations:

### Basic Operations
```bash
# Generate a DAID
daid-cli generate \
  --agent-id "user:alice" \
  --entity-type "composition" \
  --entity-id "comp-001" \
  --operation "create" \
  --metadata '{"tempo": 120, "key": "C"}'

# Validate a DAID
daid-cli validate "daid:v1.0:2025-01-19T10-30-00Z:user:alice:composition:comp-001:abc123"

# Parse a DAID
daid-cli parse "daid:v1.0:2025-01-19T10-30-00Z:user:alice:composition:comp-001:abc123"
```

### Batch Operations
```bash
# Generate multiple DAIDs from JSON file
daid-cli batch-generate --input assets.json --output daids.json

# Validate multiple DAIDs
daid-cli batch-validate --input daids.json --report validation-report.json

# Health check for DAID service
daid-cli health --base-url https://api.daid.example.com
```

### Service Management
```bash
# Start DAID service
daid-cli serve --port 8080 --host 0.0.0.0

# Service status
daid-cli status --base-url https://api.daid.example.com

# Performance metrics
daid-cli metrics --base-url https://api.daid.example.com
```

## 🔧 Advanced Usage

### Custom Validation Rules

```python
from daid_core import DAIDValidator, ValidationRule

class CustomRule(ValidationRule):
    def validate(self, daid: str, components: DAIDComponents) -> bool:
        # Custom logic here
        return components.agent_id.startswith("user:")

# Register custom rule
validator = DAIDValidator()
validator.add_rule(CustomRule())
```

### Batch Processing

```python
from daid_core import BatchProcessor

# Process multiple assets
processor = BatchProcessor()
assets = [
    {"agent_id": "user:alice", "entity_type": "track", "entity_id": "track-001"},
    {"agent_id": "user:bob", "entity_type": "track", "entity_id": "track-002"}
]

daids = processor.generate_batch(assets)
print(f"Generated {len(daids)} DAIDs")
```

### Caching and Performance

```python
from daid_core import CachedDAIDGenerator

# Generator with built-in caching
generator = CachedDAIDGenerator(
    cache_size=1000,
    ttl_seconds=3600
)

# High-performance generation
for i in range(10000):
    daid = generator.generate(
        agent_id=f"user:{i}",
        entity_type="sample",
        entity_id=f"sample-{i}",
        operation="create"
    )
```

## 🏗️ Architecture

### Core Components

```
DAID Core Architecture
├── Generator           # DAID creation and formatting
├── Validator           # DAID validation and parsing
├── Client             # HTTP client for service integration
├── Cache              # In-memory caching layer
├── CLI                # Command-line interface
├── Utils              # Utility functions and helpers
└── Types              # Type definitions and schemas
```

### Language Implementations

- **Python**: `src/python/daid_core/` - Pure Python implementation
- **TypeScript**: `src/typescript/` - Native TypeScript implementation
- **CLI**: `src/cli/` - Unified command-line interface
- **API**: `src/api/` - HTTP API specification and clients

## 🧪 Testing

### Python Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=daid_core --cov-report=html

# Run specific test suites
pytest tests/test_generator.py
pytest tests/test_validator.py
pytest tests/test_client.py
```

### TypeScript Tests
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:generator
npm run test:validator
npm run test:client
```

### Integration Tests
```bash
# Cross-language validation tests
pytest tests/integration/test_cross_language.py

# Performance tests
pytest tests/performance/test_benchmarks.py

# CLI tests
pytest tests/cli/test_commands.py
```

## 📊 Performance Benchmarks

### Generation Performance
- **Python**: ~10,000 DAIDs/second (single thread)
- **TypeScript**: ~15,000 DAIDs/second (Node.js)
- **CLI**: ~8,000 DAIDs/second (command line)

### Validation Performance
- **Python**: ~50,000 validations/second
- **TypeScript**: ~75,000 validations/second
- **Memory Usage**: <50MB for 100K cached DAIDs

## 🔌 Integration Examples

### Web Framework Integration

```python
# FastAPI integration
from fastapi import FastAPI, HTTPException
from daid_core import DAIDGenerator

app = FastAPI()
generator = DAIDGenerator()

@app.post("/api/assets")
async def create_asset(asset: AssetCreate):
    daid = generator.generate(
        agent_id=asset.agent_id,
        entity_type=asset.entity_type,
        entity_id=asset.entity_id,
        operation="create",
        metadata=asset.metadata
    )
    return {"daid": daid, "asset": asset}
```

### Database Integration

```python
# SQLAlchemy integration
from sqlalchemy import Column, String
from daid_core import DAIDValidator

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True)  # DAID
    # ... other fields

    def __init__(self, **kwargs):
        daid = DAIDGenerator.generate(**kwargs)
        if not DAIDValidator.validate(daid):
            raise ValueError("Invalid DAID generated")
        self.id = daid
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/bretbouchard/daid_core.git
cd daid_core

# Python development
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e ".[dev]"

# TypeScript development
npm install
npm run build

# Run tests
pytest && npm test
```

### Code Quality
- **Python**: Follow PEP 8, use black for formatting, mypy for type checking
- **TypeScript**: Follow ESLint rules, use Prettier for formatting
- **Tests**: Maintain >90% test coverage
- **Documentation**: Update docs for all public API changes

## 📚 Documentation

- **[API Reference](docs/api-reference.md)** - Complete API documentation
- **[User Guide](docs/user-guide.md)** - Comprehensive usage guide
- **[Integration Guide](docs/integration-guide.md)** - Integration examples
- **[CLI Reference](docs/cli-reference.md)** - Complete CLI documentation
- **[Architecture Guide](docs/architecture.md)** - System architecture overview

## 🗺️ Roadmap

### Version 1.1 (Planned)
- [ ] GraphQL API support
- [ ] Redis caching backend
- [ ] Advanced compression algorithms
- [ ] gRPC protocol support

### Version 1.2 (Planned)
- [ ] Distributed consensus for DAID generation
- [ ] Advanced analytics and metrics
- [ ] Kubernetes operators
- [ ] Event streaming integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Schillinger Audio Team**: For the original DAID specification
- **Open Source Contributors**: For valuable feedback and contributions
- **Beta Testers**: For rigorous testing and bug reports

## 📞 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/bretbouchard/daid_core/issues)
- **Discussions**: [Community forum](https://github.com/bretbouchard/daid_core/discussions)
- **Email**: [Support team](mailto:support@schillinger.audio)

---

<div align="center">
  <strong>🔗 Track your assets with confidence! 🔗</strong>
</div>