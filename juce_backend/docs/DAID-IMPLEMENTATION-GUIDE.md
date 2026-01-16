# DAID Provenance System Implementation Guide

**Version**: 1.0.0  
**Date**: January 19, 2025  
**Audience**: Developers, DevOps Engineers, System Architects

## Quick Start

### 1. Install DAID Client Library

```bash
# JavaScript/TypeScript
npm install @schillinger/daid-client

# Python
pip install schillinger-daid

# Go
go get github.com/schillinger/daid-go

# Rust
cargo add schillinger-daid
```

### 2. Initialize DAID Client

```typescript
import { DAIDClient } from "@schillinger/daid-client";

const daidClient = new DAIDClient({
  baseUrl: "https://api.schillinger.com",
  apiKey: process.env.DAID_API_KEY,
  agentId: "user:alice123", // or 'system:my-service'
});
```

### 3. Basic Usage

```typescript
// Create a new entity with provenance
const composition = await createComposition({
  name: "My Symphony",
  key: "C",
  tempo: 120,
});

// DAID is automatically generated and attached
console.log(composition.daid);
// Output: daid:v1.0:2025-01-19T10:30:00Z:user:alice123:composition:comp-001:0000000000000000

// Transform the entity (creates new DAID with provenance)
const transformed = await applySchillingerTransform(composition.id, {
  type: "rhythm_interference",
  patterns: [
    [1, 0, 1, 0],
    [1, 1, 0, 1],
  ],
});

// New DAID links back to original
console.log(transformed.daid);
// Output: daid:v1.0:2025-01-19T10:35:00Z:system:schillinger-ai:composition:comp-002:a1b2c3d4e5f6g7h8

// Get complete provenance chain
const chain = await daidClient.getProvenanceChain(
  "composition",
  transformed.id
);
console.log(`Chain length: ${chain.chain_length}`);
```

## Language-Specific Implementations

### TypeScript/JavaScript

```typescript
// Automatic provenance tracking with decorators
import { trackProvenance, DAIDClient } from "@schillinger/daid-client";

class MusicService {
  constructor(private daidClient: DAIDClient) {}

  @trackProvenance("create")
  async createComposition(data: CompositionData): Promise<Composition> {
    const composition = await this.db.compositions.create(data);

    // Provenance automatically tracked by decorator
    return composition;
  }

  @trackProvenance("transform")
  async applyTransform(id: string, transform: Transform): Promise<Composition> {
    const original = await this.db.compositions.findById(id);
    const transformed = await this.transformEngine.apply(original, transform);

    // Decorator automatically creates provenance record linking to original
    return transformed;
  }
}

// Manual provenance tracking
async function manualTracking() {
  const parentDAIDs = ["daid:v1.0:..."];

  const newDAID = await daidClient.createProvenanceRecord({
    entityType: "composition",
    entityId: "comp-123",
    parentDAIDs: parentDAIDs,
    operation: "manual_edit",
    operationMetadata: {
      changes: ["tempo", "key"],
      editor: "user:alice123",
    },
  });

  console.log(`Created DAID: ${newDAID}`);
}
```

### Python

```python
from schillinger_daid import DAIDClient, track_provenance

# Initialize client
daid_client = DAIDClient(
    base_url='https://api.schillinger.com',
    api_key=os.getenv('DAID_API_KEY'),
    agent_id='system:ml-training'
)

# Decorator-based tracking
@track_provenance("model_training")
def train_model(dataset_daid: str, hyperparameters: dict) -> str:
    """Train a model with automatic provenance tracking."""
    model = neural_network.train(dataset_daid, hyperparameters)

    # DAID automatically generated with dataset provenance
    return model.daid

@track_provenance("inference")
def generate_music(model_daid: str, prompt: str) -> str:
    """Generate music with provenance tracking."""
    model = load_model(model_daid)
    result = model.generate(prompt)

    # Generated music linked to model provenance
    return result.daid

# Manual tracking
async def manual_tracking():
    parent_daids = ['daid:v1.0:...']

    new_daid = await daid_client.create_provenance_record(
        entity_type='model',
        entity_id='model-456',
        parent_daids=parent_daids,
        operation='hyperparameter_tuning',
        operation_metadata={
            'learning_rate': 0.001,
            'batch_size': 32,
            'epochs': 100
        }
    )

    print(f"Created DAID: {new_daid}")

# Context manager for batch operations
async def batch_operations():
    async with daid_client.batch_context() as batch:
        # All operations in this context are batched
        daid1 = await batch.create_record(...)
        daid2 = await batch.create_record(...)
        daid3 = await batch.create_record(...)

        # Batch is committed when context exits
```

### Go

```go
package main

import (
    "context"
    "github.com/schillinger/daid-go"
)

func main() {
    client := daid.NewClient(&daid.Config{
        BaseURL: "https://api.schillinger.com",
        APIKey:  os.Getenv("DAID_API_KEY"),
        AgentID: "system:audio-processor",
    })

    // Create provenance record
    record := &daid.ProvenanceRecord{
        EntityType: "audio_file",
        EntityID:   "audio-789",
        ParentDAIDs: []string{"daid:v1.0:..."},
        Operation:  "audio_processing",
        OperationMetadata: map[string]interface{}{
            "filters": []string{"normalize", "eq", "compress"},
            "quality": "high",
        },
    }

    daidStr, err := client.CreateProvenanceRecord(context.Background(), record)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Created DAID: %s\n", daidStr)

    // Get provenance chain
    chain, err := client.GetProvenanceChain(context.Background(), "audio_file", "audio-789")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Chain length: %d\n", chain.ChainLength)
}

// Middleware for automatic HTTP request tracking
func DAIDMiddleware(client *daid.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Track HTTP request as provenance
        if c.Request.Method == "POST" || c.Request.Method == "PUT" {
            // Extract entity information from request
            entityType := c.Param("type")
            entityID := c.Param("id")

            if entityType != "" && entityID != "" {
                go func() {
                    client.CreateProvenanceRecord(context.Background(), &daid.ProvenanceRecord{
                        EntityType: entityType,
                        EntityID:   entityID,
                        Operation:  "http_" + strings.ToLower(c.Request.Method),
                        OperationMetadata: map[string]interface{}{
                            "endpoint": c.Request.URL.Path,
                            "user_agent": c.Request.UserAgent(),
                            "ip": c.ClientIP(),
                        },
                    })
                }()
            }
        }

        c.Next()
    }
}
```

### Rust

```rust
use schillinger_daid::{DAIDClient, ProvenanceRecord};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = DAIDClient::new(
        "https://api.schillinger.com",
        std::env::var("DAID_API_KEY")?,
        "system:rust-processor"
    );

    // Create provenance record
    let record = ProvenanceRecord {
        entity_type: "synthesis_patch".to_string(),
        entity_id: "patch-101".to_string(),
        parent_daids: vec!["daid:v1.0:...".to_string()],
        operation: "synthesis_generation".to_string(),
        operation_metadata: serde_json::json!({
            "algorithm": "fm_synthesis",
            "parameters": {
                "carrier_freq": 440.0,
                "modulator_freq": 220.0,
                "modulation_index": 2.5
            }
        }),
    };

    let daid = client.create_provenance_record(&record).await?;
    println!("Created DAID: {}", daid);

    // Get and validate provenance chain
    let chain = client.get_provenance_chain("synthesis_patch", "patch-101").await?;
    let validation = client.validate_chain("synthesis_patch", "patch-101").await?;

    if validation.is_valid {
        println!("Chain is valid with {} items", chain.chain_length);
    } else {
        println!("Chain validation failed: {:?}", validation.integrity_issues);
    }

    Ok(())
}

// Procedural macro for automatic tracking
use schillinger_daid_macros::track_provenance;

#[track_provenance("audio_synthesis")]
async fn synthesize_audio(patch_daid: &str, duration: f32) -> Result<String, SynthError> {
    let patch = load_patch(patch_daid).await?;
    let audio = synthesizer.render(patch, duration).await?;

    // DAID automatically generated and linked to patch
    Ok(audio.daid)
}
```

## Framework Integrations

### React Integration

```typescript
import {
  DAIDProvider,
  useDAID,
  useProvenanceChain,
} from "@schillinger/daid-react";

// App-level provider
function App() {
  return (
    <DAIDProvider
      baseUrl="https://api.schillinger.com"
      apiKey={process.env.REACT_APP_DAID_API_KEY}
      agentId="user:current-user"
    >
      <CompositionEditor />
    </DAIDProvider>
  );
}

// Component with provenance tracking
function CompositionEditor() {
  const { createRecord, getChain } = useDAID();
  const [composition, setComposition] = useState(null);

  const handleSave = async (compositionData) => {
    // Save composition
    const saved = await saveComposition(compositionData);

    // Create provenance record
    const daid = await createRecord({
      entityType: "composition",
      entityId: saved.id,
      operation: "user_edit",
      operationMetadata: {
        changes: compositionData.changes,
        timestamp: new Date().toISOString(),
      },
    });

    setComposition({ ...saved, daid });
  };

  return (
    <div>
      <CompositionForm onSave={handleSave} />
      {composition && <ProvenanceViewer entityId={composition.id} />}
    </div>
  );
}

// Provenance visualization component
function ProvenanceViewer({ entityId }) {
  const { data: chain, loading } = useProvenanceChain("composition", entityId);

  if (loading) return <div>Loading provenance...</div>;

  return (
    <div className="provenance-chain">
      <h3>Provenance Chain</h3>
      {chain.provenance_chain.map((item, index) => (
        <div key={index} className="provenance-item">
          <div>Operation: {item.operation}</div>
          <div>Created: {new Date(item.created_at).toLocaleString()}</div>
          <div>Depth: {item.depth}</div>
        </div>
      ))}
    </div>
  );
}
```

### Express.js Middleware

```typescript
import { createDAIDMiddleware } from "@schillinger/daid-express";

const app = express();

// Add DAID middleware
app.use(
  createDAIDMiddleware({
    baseUrl: "https://api.schillinger.com",
    apiKey: process.env.DAID_API_KEY,
    agentId: "system:api-server",
    trackRequests: true,
    trackResponses: true,
  })
);

// Routes automatically tracked
app.post("/api/compositions", async (req, res) => {
  const composition = await createComposition(req.body);

  // Provenance automatically created by middleware
  res.json(composition);
});

app.put("/api/compositions/:id", async (req, res) => {
  const updated = await updateComposition(req.params.id, req.body);

  // Update operation automatically tracked with parent DAID
  res.json(updated);
});
```

### Django Integration

```python
from django.middleware import MiddlewareMixin
from schillinger_daid import DAIDClient

class DAIDMiddleware(MiddlewareMixin):
    def __init__(self, get_response):
        self.get_response = get_response
        self.daid_client = DAIDClient(
            base_url=settings.DAID_BASE_URL,
            api_key=settings.DAID_API_KEY,
            agent_id='system:django-app'
        )
        super().__init__(get_response)

    def process_request(self, request):
        # Track incoming requests
        if request.method in ['POST', 'PUT', 'PATCH']:
            request.daid_context = {
                'operation': f'http_{request.method.lower()}',
                'metadata': {
                    'path': request.path,
                    'user': str(request.user) if hasattr(request, 'user') else None
                }
            }

    def process_response(self, request, response):
        # Create provenance record for successful operations
        if hasattr(request, 'daid_context') and 200 <= response.status_code < 300:
            # Extract entity info from response or URL
            # Create provenance record asynchronously
            pass

        return response

# Model with automatic DAID tracking
from schillinger_daid.django import DAIDModel

class Composition(DAIDModel):
    name = models.CharField(max_length=200)
    tempo = models.IntegerField()
    key = models.CharField(max_length=10)

    class Meta:
        daid_entity_type = 'composition'
        daid_track_operations = ['create', 'update', 'delete']
```

## Testing

### Unit Tests

```typescript
import { DAIDClient } from "@schillinger/daid-client";
import { MockDAIDClient } from "@schillinger/daid-client/testing";

describe("DAID Integration", () => {
  let mockClient: MockDAIDClient;

  beforeEach(() => {
    mockClient = new MockDAIDClient();
  });

  test("should create provenance record", async () => {
    const daid = await mockClient.createProvenanceRecord({
      entityType: "test_entity",
      entityId: "test-123",
      operation: "create",
    });

    expect(daid).toMatch(/^daid:v1\.0:/);
    expect(mockClient.getRecordCount()).toBe(1);
  });

  test("should build provenance chain", async () => {
    // Create parent
    const parentDAID = await mockClient.createProvenanceRecord({
      entityType: "parent",
      entityId: "parent-1",
      operation: "create",
    });

    // Create child with provenance
    const childDAID = await mockClient.createProvenanceRecord({
      entityType: "child",
      entityId: "child-1",
      parentDAIDs: [parentDAID],
      operation: "derive",
    });

    const chain = await mockClient.getProvenanceChain("child", "child-1");
    expect(chain.chain_length).toBe(2);
    expect(chain.provenance_chain[0].depth).toBe(0);
    expect(chain.provenance_chain[1].depth).toBe(1);
  });
});
```

### Integration Tests

```python
import pytest
from schillinger_daid import DAIDClient
from schillinger_daid.testing import DAIDTestServer

@pytest.fixture
async def daid_server():
    """Start test DAID server."""
    server = DAIDTestServer()
    await server.start()
    yield server
    await server.stop()

@pytest.fixture
def daid_client(daid_server):
    """Create test DAID client."""
    return DAIDClient(
        base_url=daid_server.base_url,
        api_key='test-key',
        agent_id='test:pytest'
    )

async def test_end_to_end_provenance(daid_client):
    """Test complete provenance workflow."""
    # Create original entity
    original_daid = await daid_client.create_provenance_record(
        entity_type='composition',
        entity_id='comp-1',
        operation='create'
    )

    # Transform entity
    transformed_daid = await daid_client.create_provenance_record(
        entity_type='composition',
        entity_id='comp-2',
        parent_daids=[original_daid],
        operation='transform'
    )

    # Verify chain
    chain = await daid_client.get_provenance_chain('composition', 'comp-2')
    assert chain.chain_length == 2
    assert chain.validation.is_valid

    # Verify lineage
    lineage = await daid_client.get_lineage_graph('composition', 'comp-1')
    assert len(lineage.descendants) == 1
    assert lineage.descendants[0].entity_id == 'comp-2'
```

## Performance Optimization

### Batch Operations

```typescript
// Batch multiple provenance records
const batch = daidClient.createBatch();

batch.addRecord({
  entityType: "track",
  entityId: "track-1",
  operation: "create",
});

batch.addRecord({
  entityType: "track",
  entityId: "track-2",
  operation: "create",
});

// Submit all at once
const daids = await batch.commit();
```

### Caching

```typescript
// Enable client-side caching
const daidClient = new DAIDClient({
  baseUrl: "https://api.schillinger.com",
  apiKey: process.env.DAID_API_KEY,
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 1000, // Max cached items
  },
});

// Cache provenance chains for faster retrieval
const chain = await daidClient.getProvenanceChain("composition", "comp-1", {
  useCache: true,
});
```

### Async Processing

```python
# Async provenance creation for high-throughput scenarios
async def process_batch_operations(operations):
    tasks = []

    for operation in operations:
        task = asyncio.create_task(
            daid_client.create_provenance_record(operation)
        )
        tasks.append(task)

    # Process all operations concurrently
    daids = await asyncio.gather(*tasks)
    return daids
```

## Monitoring & Observability

### Metrics

```typescript
// Built-in metrics collection
const daidClient = new DAIDClient({
  baseUrl: "https://api.schillinger.com",
  apiKey: process.env.DAID_API_KEY,
  metrics: {
    enabled: true,
    endpoint: "https://metrics.schillinger.com",
    interval: 60000, // 1 minute
  },
});

// Custom metrics
daidClient.metrics.increment("provenance.records.created");
daidClient.metrics.histogram("provenance.chain.length", chainLength);
daidClient.metrics.gauge("provenance.cache.hit_rate", hitRate);
```

### Logging

```python
import logging
from schillinger_daid import DAIDClient

# Configure DAID logging
logging.getLogger('schillinger_daid').setLevel(logging.INFO)

# Client with structured logging
daid_client = DAIDClient(
    base_url='https://api.schillinger.com',
    api_key=os.getenv('DAID_API_KEY'),
    logging={
        'level': 'INFO',
        'format': 'json',
        'include_metadata': True
    }
)
```

## Troubleshooting

### Common Issues

1. **Invalid DAID Format**

   ```
   Error: Invalid DAID format
   Solution: Ensure DAID follows format: daid:v1.0:timestamp:agent:type:id:hash
   ```

2. **Broken Provenance Chain**

   ```
   Error: Chain validation failed - missing parent DAID
   Solution: Verify all parent DAIDs exist before creating child records
   ```

3. **Hash Mismatch**
   ```
   Error: Provenance hash verification failed
   Solution: Check that parent DAIDs and metadata haven't been modified
   ```

### Debug Mode

```typescript
const daidClient = new DAIDClient({
  baseUrl: "https://api.schillinger.com",
  apiKey: process.env.DAID_API_KEY,
  debug: true, // Enable debug logging
  validateChains: true, // Validate chains on every operation
});
```

---

**Next Steps**:

1. Choose your implementation language
2. Install the appropriate DAID client library
3. Follow the quick start guide
4. Implement automatic tracking for your entities
5. Add provenance visualization to your UI

**Support**: For implementation questions, contact the DAID team at daid-support@schillinger.com
