# DAID Core Examples

This directory contains comprehensive examples showing how to integrate DAID Core into different types of applications.

## Examples Overview

### Basic Usage
- [basic-typescript.ts](./basic-typescript.ts) - Basic TypeScript usage
- [basic-python.py](./basic-python.py) - Basic Python usage

### Framework Integrations
- [fastapi-integration.py](./fastapi-integration.py) - FastAPI web application
- [express-integration.ts](./express-integration.ts) - Express.js web application
- [react-integration.tsx](./react-integration.tsx) - React frontend application

### Advanced Features
- [batching-example.py](./batching-example.py) - High-performance batching
- [health-monitoring.ts](./health-monitoring.ts) - Health monitoring and recovery
- [websocket-tracking.py](./websocket-tracking.py) - WebSocket message tracking

### Audio/DAW Specific
- [audio-daw-integration.py](./audio-daw-integration.py) - Digital Audio Workstation integration
- [music-composition-tracking.ts](./music-composition-tracking.ts) - Music composition workflow

### Enterprise Features
- [multi-service-sync.py](./multi-service-sync.py) - Multi-service synchronization
- [enterprise-monitoring.ts](./enterprise-monitoring.ts) - Enterprise-grade monitoring

## Quick Start

### TypeScript/JavaScript

```bash
npm install @schillinger-daid/daid_core
```

```typescript
import { UnifiedDAIDClient } from '@schillinger-daid/daid_core';

const client = new UnifiedDAIDClient({
  agentId: 'my-app-v1',
  baseUrl: 'http://localhost:8080',
  enableBatching: true,
  enableCaching: true
});

await client.initialize();

const result = await client.createDAID(
  'document',
  'doc-123',
  'create',
  {
    metadata: { title: 'My Document' },
    tags: ['important']
  }
);

console.log('DAID created:', result.daid);
```

### Python

```bash
pip install daid-core
```

```python
from daid_core import UnifiedDAIDClient, UnifiedDAIDConfig

config = UnifiedDAIDConfig(
    agent_id='my-app-v1',
    base_url='http://localhost:8080',
    enable_batching=True,
    enable_caching=True
)

client = UnifiedDAIDClient(config)
await client.initialize()

result = await client.create_daid(
    entity_type='document',
    entity_id='doc-123',
    operation='create',
    metadata={'title': 'My Document'},
    tags=['important']
)

print(f'DAID created: {result.daid}')
```

## Running Examples

Each example includes instructions for setup and execution. Most examples require:

1. **DAID Backend Service** (optional for local-only usage)
2. **Environment Variables** for configuration
3. **Dependencies** as specified in each example

### Environment Setup

Create a `.env` file in the examples directory:

```bash
DAID_AGENT_ID=example-app-v1
DAID_BASE_URL=http://localhost:8080
DAID_API_KEY=your-api-key-here
DAID_BATCH_SIZE=100
DAID_BATCH_TIMEOUT=1000
DAID_CACHE_TTL=300
```

### Running TypeScript Examples

```bash
cd examples
npm install
npx ts-node basic-typescript.ts
```

### Running Python Examples

```bash
cd examples
pip install -r requirements.txt
python basic-python.py
```

## Example Categories

### 1. Basic Integration
Learn the fundamentals of DAID Core integration with minimal setup.

### 2. Web Framework Integration
See how to integrate DAID Core into popular web frameworks with automatic middleware.

### 3. Real-time Applications
Examples showing WebSocket integration and real-time provenance tracking.

### 4. High-Performance Scenarios
Batching, caching, and optimization techniques for high-throughput applications.

### 5. Monitoring and Recovery
Health monitoring, automatic recovery, and system reliability features.

### 6. Cross-Language Integration
Examples showing how to share DAID data between TypeScript and Python applications.

## Best Practices Demonstrated

- **Error Handling**: Graceful degradation when DAID operations fail
- **Performance Optimization**: Batching and caching strategies
- **Security**: API key management and privacy levels
- **Monitoring**: Health checks and system observability
- **Testing**: Unit and integration testing approaches
- **Deployment**: Production deployment considerations

## Contributing Examples

To contribute a new example:

1. Create a new file following the naming convention
2. Include comprehensive comments explaining the integration
3. Add a README section describing the use case
4. Include setup and execution instructions
5. Test the example thoroughly

## Support

For questions about these examples:
- Check the main [Integration Guide](../INTEGRATION_GUIDE.md)
- Review the [API Documentation](../docs/)
- Open an issue in the repository
