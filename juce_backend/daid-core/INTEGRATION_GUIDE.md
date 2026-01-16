# DAID Core Integration Guide

## Overview

DAID Core is a comprehensive provenance tracking system that provides distributed agent identifiers for tracking operations across applications. This guide shows how to integrate DAID Core into your applications.

## Package Structure

```
daid-core/
├── src/                    # TypeScript/JavaScript core
├── python/                 # Python bindings  
├── integrations/           # Application integration helpers
│   ├── fastapi/           # FastAPI integration
│   ├── websocket/         # WebSocket middleware
│   ├── react/             # React components & hooks
│   └── audio/             # Audio-specific integrations
├── examples/              # Integration examples
└── docs/                  # Detailed documentation
```

## Installation

### TypeScript/JavaScript
```bash
npm install @schillinger-daid/daid_core
```

### Python
```bash
pip install daid-core
```

## Quick Start

### TypeScript/JavaScript

```typescript
import { DAIDGenerator, DAIDClient } from '@schillinger-daid/daid_core';

// Generate a DAID
const daid = DAIDGenerator.generate({
  agentId: 'my-app-v1',
  entityType: 'document',
  entityId: 'doc-123',
  operation: 'create',
  metadata: { title: 'My Document' }
});

// Use client for backend integration
const client = new DAIDClient({
  agentId: 'my-app-v1',
  baseUrl: 'http://localhost:8080',
  apiKey: 'your-api-key'
});

const record = await client.createProvenanceRecord({
  entityType: 'document',
  entityId: 'doc-123',
  operation: 'create',
  metadata: { title: 'My Document' }
});
```

### Python

```python
from daid_core import DAIDGenerator, DAIDClient

# Generate a DAID
daid = DAIDGenerator.generate(
    agent_id='my-app-v1',
    entity_type='document',
    entity_id='doc-123',
    operation='create',
    metadata={'title': 'My Document'}
)

# Use client for backend integration
client = DAIDClient(
    agent_id='my-app-v1',
    base_url='http://localhost:8080',
    api_key='your-api-key'
)

record = client.create_provenance_record(ProvenanceRecord(
    entity_type='document',
    entity_id='doc-123',
    operation='create',
    metadata={'title': 'My Document'}
))
```

## Integration Patterns

### 1. FastAPI Integration

```python
from fastapi import FastAPI
from daid_core.integrations.fastapi import DAIDMiddleware, DAIDService

app = FastAPI()

# Add DAID middleware
daid_service = DAIDService(
    agent_id='my-api-v1',
    base_url='http://localhost:8080'
)
app.add_middleware(DAIDMiddleware, daid_service=daid_service)

@app.post("/documents")
async def create_document(doc: DocumentCreate):
    # DAID tracking is automatic via middleware
    document = await create_document_logic(doc)
    return document
```

### 2. WebSocket Integration

```python
from daid_core.integrations.websocket import DAIDTrackingMiddleware

class MyWebSocketHandler:
    def __init__(self):
        self.daid_middleware = DAIDTrackingMiddleware(
            daid_client=daid_client,
            track_all_messages=True
        )
    
    async def handle_message(self, websocket, message):
        # Automatic DAID tracking
        daid = await self.daid_middleware.track_message(
            message, user_id=websocket.user_id
        )
        
        # Your message handling logic
        await self.process_message(message)
```

### 3. React Integration

```tsx
import { ProvenanceProvider, useProvenance } from '@schillinger-daid/daid_core/react';

function App() {
  return (
    <ProvenanceProvider agentId="my-app-v1" baseUrl="http://localhost:8080">
      <DocumentEditor />
    </ProvenanceProvider>
  );
}

function DocumentEditor() {
  const { trackOperation, getProvenanceChain } = useProvenance();
  
  const handleSave = async (document) => {
    const daid = await trackOperation({
      entityType: 'document',
      entityId: document.id,
      operation: 'update',
      metadata: { version: document.version }
    });
    
    await saveDocument(document);
  };
  
  return <div>...</div>;
}
```

## Configuration

### Environment Variables

```bash
# Required
DAID_AGENT_ID=my-app-v1

# Optional
DAID_BASE_URL=http://localhost:8080
DAID_API_KEY=your-api-key
DAID_BATCH_SIZE=100
DAID_BATCH_TIMEOUT=1000
DAID_CACHE_TTL=300
```

### Configuration Object

```typescript
interface DAIDConfig {
  agentId: string;
  baseUrl?: string;
  apiKey?: string;
  batchSize?: number;
  batchTimeout?: number;
  cacheTtl?: number;
  enableHealthMonitoring?: boolean;
  enableAutoRecovery?: boolean;
}
```

## Advanced Features

### Batching

```python
# Enable batching for high-throughput scenarios
client = DAIDClient(
    agent_id='high-volume-app',
    batch_size=500,
    batch_timeout=2.0
)

# Records are automatically batched
for i in range(1000):
    await client.create_record(
        entity_type='event',
        entity_id=f'event-{i}',
        operation='process',
        batch=True  # Enable batching for this record
    )
```

### Health Monitoring

```python
from daid_core import create_daid_health_monitor

monitor = create_daid_health_monitor(
    client=daid_client,
    check_interval=30,  # seconds
    alert_threshold=0.95
)

# Monitor will automatically check system health
await monitor.start()
```

### Auto-Recovery

```python
from daid_core import create_daid_recovery_manager

recovery = create_daid_recovery_manager(
    client=daid_client,
    max_retries=3,
    backoff_factor=2.0
)

# Automatic recovery for failed operations
await recovery.enable_auto_recovery()
```

## Entity Types and Operations

### Standard Entity Types
- `document` - Documents, files, content
- `user_action` - User interactions
- `api_call` - API operations
- `composition` - Audio/music compositions
- `analysis` - Analysis results
- `model` - AI/ML models
- `training_data` - Training datasets

### Standard Operations
- `create` - Entity creation
- `update` - Entity modification
- `delete` - Entity removal
- `analyze` - Analysis operations
- `transform` - Data transformations
- `user_interaction` - User actions

## Best Practices

1. **Use consistent agent IDs** across your application
2. **Enable batching** for high-volume scenarios
3. **Include meaningful metadata** for better provenance tracking
4. **Use parent DAIDs** to build proper provenance chains
5. **Handle errors gracefully** - DAID failures shouldn't break your app
6. **Monitor performance** with health checks
7. **Use appropriate privacy levels** for sensitive data

## Troubleshooting

### Common Issues

1. **DAID generation fails**
   - Check agent ID format
   - Verify entity type is valid
   - Ensure metadata is serializable

2. **Backend connection issues**
   - Verify base URL is accessible
   - Check API key permissions
   - Review network connectivity

3. **Performance issues**
   - Enable batching for high volume
   - Adjust batch size and timeout
   - Monitor memory usage

### Debug Mode

```python
import logging
logging.getLogger('daid_core').setLevel(logging.DEBUG)
```

## Migration from Existing Implementations

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions.
