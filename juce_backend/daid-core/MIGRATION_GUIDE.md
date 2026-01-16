# DAID Core Migration Guide

This guide helps you migrate from the current `backend/src/daid` implementation to the consolidated `daid-core` package.

## Overview

The migration consolidates:
- Core DAID functionality into a single package
- Application-specific integrations into reusable modules
- Improved APIs with better error handling and performance
- Enhanced documentation and examples

## Migration Steps

### 1. Update Dependencies

**Before:**
```python
# backend/src/daid/client.py
from .core import DAIDClient as CoreDAIDClient
from .models import DAIDRecord, EntityType
```

**After:**
```python
# Using consolidated package
from daid_core import DAIDClient, DAIDGenerator, ProvenanceRecord
from daid_core.integrations.fastapi import DAIDService, DAIDMiddleware
```

### 2. Client Initialization

**Before:**
```python
from backend.src.daid.client import DAIDClient

client = DAIDClient(
    base_url="http://localhost:8002",
    api_key="your-key",
    agent_id="audio-agent"
)
```

**After:**
```python
from daid_core import DAIDClient
from daid_core.integrations.fastapi import DAIDService, IntegrationConfig

# Direct client usage
client = DAIDClient(
    agent_id="audio-agent",
    base_url="http://localhost:8002",
    api_key="your-key"
)

# Or use integration service
config = IntegrationConfig(
    agent_id="audio-agent",
    base_url="http://localhost:8002",
    api_key="your-key",
    batch_size=100,
    batch_timeout=1.0
)
service = DAIDService(config)
await service.initialize()
```

### 3. Record Creation

**Before:**
```python
record = await client.create_record(
    entity_type=EntityType.TRACK,
    entity_id="track-123",
    operation=OperationType.CREATE,
    operation_metadata={"name": "My Track"},
    user_id="user-456",
    batch=True
)
```

**After:**
```python
# Using ProvenanceRecord
record = ProvenanceRecord(
    entity_type="track",
    entity_id="track-123", 
    operation="create",
    metadata={"name": "My Track"},
    agent_id="audio-agent"
)
daid = await client.create_provenance_record(record)

# Or using integration service
daid = await service.track_operation(
    entity_type="track",
    entity_id="track-123",
    operation="create",
    metadata={"name": "My Track"},
    user_id="user-456",
    batch=True
)
```

### 4. WebSocket Middleware

**Important Note**: If you have an existing WebSocket DAID integration that's working well (like the audio agent's WebSocket system), you may want to keep it as-is. The new integration is designed for new applications or when you want to standardize across multiple apps.

**Before:**
```python
from backend.src.daid.middleware import DAIDTrackingMiddleware

middleware = DAIDTrackingMiddleware(daid_client)
daid = await middleware.track_message(message, user_id)
```

**After (Optional Migration):**
```python
from daid_core.integrations.websocket import DAIDTrackingMiddleware
from daid_core.integrations.base import IntegrationConfig

config = IntegrationConfig(
    agent_id="audio-agent",
    base_url="http://localhost:8002",
    track_all_operations=True
)

middleware = DAIDTrackingMiddleware(config)
await middleware.initialize()
daid = await middleware.track_message(message, user_id)
```

**Recommendation**: Keep your existing WebSocket integration if it's working well. Use the new integration for new applications.

### 5. FastAPI Integration

**Before:**
```python
# Manual setup in main.py
from backend.src.daid.service import DAIDService
from backend.src.daid.client import DAIDClient

daid_client = DAIDClient(base_url="...", api_key="...")
daid_service = DAIDService(daid_client)
```

**After:**
```python
# Automatic setup with middleware
from daid_core.integrations.fastapi import setup_daid_integration

app = FastAPI()

# One-line setup
daid_service = setup_daid_integration(
    app,
    agent_id="my-api-v1",
    base_url="http://localhost:8002",
    api_key="your-key",
    track_all_operations=True
)
```

### 6. Decorators

**Before:**
```python
from backend.src.daid.decorators import track_provenance

@track_provenance(
    entity_type=EntityType.DOCUMENT,
    operation=OperationType.CREATE
)
async def create_document(doc_data):
    return await save_document(doc_data)
```

**After:**
```python
from daid_core.integrations.decorators import track_provenance, initialize_global_client

# Initialize global client once
initialize_global_client(
    agent_id="my-app-v1",
    base_url="http://localhost:8002"
)

@track_provenance(
    entity_type="document",
    operation="create",
    entity_id_extractor=lambda doc_data: doc_data.get('id'),
    metadata_extractor=lambda doc_data: {'title': doc_data.get('title')}
)
async def create_document(doc_data):
    return await save_document(doc_data)
```

## API Changes

### Entity Types

**Before:** Enum-based
```python
from backend.src.daid.models import EntityType
EntityType.TRACK, EntityType.PLUGIN, EntityType.USER_ACTION
```

**After:** String-based (more flexible)
```python
# Standard types are still available as constants
"track", "plugin", "user_action"
# Or define your own
"custom_entity_type"
```

### Operations

**Before:** Enum-based
```python
from backend.src.daid.models import OperationType
OperationType.CREATE, OperationType.UPDATE
```

**After:** String-based
```python
"create", "update", "delete", "analyze", "transform"
```

### Batch Operations

**Before:**
```python
# Batching was handled internally
await client.create_record(..., batch=True)
```

**After:**
```python
# More control over batching
config = IntegrationConfig(
    batch_size=500,
    batch_timeout=2.0
)
service = DAIDService(config)
await service.track_operation(..., batch=True)
```

## Configuration Changes

### Environment Variables

**Before:**
```bash
DAID_BASE_URL=http://localhost:8002
DAID_API_KEY=your-key
```

**After:** (Same, plus additional options)
```bash
DAID_AGENT_ID=my-app-v1
DAID_BASE_URL=http://localhost:8002
DAID_API_KEY=your-key
DAID_BATCH_SIZE=100
DAID_BATCH_TIMEOUT=1000
DAID_CACHE_TTL=300
DAID_ENABLE_HEALTH_MONITORING=true
DAID_ENABLE_AUTO_RECOVERY=true
```

## New Features Available

### 1. Health Monitoring
```python
from daid_core import create_daid_health_monitor

monitor = create_daid_health_monitor(
    client=client,
    check_interval=30,
    alert_threshold=0.95
)
await monitor.start()
```

### 2. Auto-Recovery
```python
from daid_core import create_daid_recovery_manager

recovery = create_daid_recovery_manager(
    client=client,
    max_retries=3,
    backoff_factor=2.0
)
await recovery.enable_auto_recovery()
```

### 3. React Integration
```tsx
import { ProvenanceProvider, useProvenance } from '@schillinger-daid/daid_core/react';

function App() {
  return (
    <ProvenanceProvider agentId="my-app-v1">
      <MyComponent />
    </ProvenanceProvider>
  );
}
```

## Testing Changes

**Before:**
```python
from backend.tests.test_daid_integration import TestDAIDIntegration
```

**After:**
```python
from daid_core.testing import DAIDTestClient, MockDAIDService

# Use test utilities
test_client = DAIDTestClient(agent_id="test-agent")
mock_service = MockDAIDService()
```

## Breaking Changes

1. **Entity types and operations are now strings** instead of enums
2. **Client initialization** requires `agent_id` as first parameter
3. **Record creation** uses `ProvenanceRecord` dataclass instead of method parameters
4. **Import paths** have changed to use the consolidated package
5. **Middleware initialization** requires explicit configuration

## Compatibility Layer

For gradual migration, you can use the compatibility shim:

```python
# This provides backward compatibility
from daid_core.compat import LegacyDAIDClient, LegacyEntityType

# Works with old API
client = LegacyDAIDClient(base_url="...", agent_id="...")
record = await client.create_record(
    entity_type=LegacyEntityType.TRACK,
    entity_id="track-123"
)
```

## Migration Checklist

- [ ] Update import statements
- [ ] Change client initialization
- [ ] Convert enum types to strings
- [ ] Update record creation calls
- [ ] Migrate middleware setup
- [ ] Update configuration
- [ ] Test all DAID functionality
- [ ] Update documentation
- [ ] Remove old backend/src/daid code
- [ ] Update deployment scripts

## Support

For migration assistance:
1. Check the [Integration Guide](./INTEGRATION_GUIDE.md)
2. Review [examples/](./examples/) directory
3. Run the migration validation script: `python scripts/validate_migration.py`
