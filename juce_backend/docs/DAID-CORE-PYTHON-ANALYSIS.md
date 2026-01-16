# DAID Core Python Module Analysis

## Overview
The DAID (Distributed Agent Identifier) core Python module provides Python bindings for the provenance system, enabling cross-language DAID usage between Python and TypeScript/JavaScript.

## Module Structure

### Core Classes

#### 1. DAIDComponents
**Purpose**: Dataclass for parsed DAID components
```python
@dataclass
class DAIDComponents:
    version: str
    timestamp: str
    agent_id: str
    entity_type: str
    entity_id: str
    provenance_hash: str
```

#### 2. ProvenanceRecord
**Purpose**: Provenance record for DAID generation
```python
@dataclass
class ProvenanceRecord:
    entity_type: str
    entity_id: str
    operation: str
    agent_id: str
    parent_daids: list[str] | None = None
    metadata: dict[str, Any] | None = None
    timestamp: str | None = None
```

#### 3. DAIDValidationResult
**Purpose**: Result of DAID validation
```python
@dataclass
class DAIDValidationResult:
    valid: bool
    components: DAIDComponents | None = None
    errors: list[str] | None = None
```

### Main Classes

#### DAIDGenerator
**Purpose**: DAID generator with provenance tracking

**Key Features**:
- **VERSION**: "v1.0"
- **DAID_REGEX**: Validates DAID format
- **VALID_ENTITY_TYPES**: Standard entity types for validation

**Core Methods**:
- `generate()`: Creates new DAID with provenance tracking
- `parse()`: Parses DAID string into components
- `validate()`: Validates DAID format
- `is_valid()`: Quick validation check
- `_calculate_provenance_hash()`: Calculates provenance hash
- `_normalize_metadata()`: Normalizes metadata for consistent hashing

#### DAIDClient
**Purpose**: DAID client for interacting with DAID services

**Configuration**:
- `agent_id`: Required agent identifier
- `base_url`: Default "http://localhost:8080"
- `api_key`: Optional API key
- `timeout`: Default 5 seconds

**Core Methods**:
- `create_provenance_record()`: Creates new provenance record
- `get_provenance_chain()`: Gets provenance chain for entity
- `invalidate_cache()`: Invalidates cache for specific DAIDs
- `discover_system_patterns()`: Discovers DAID patterns across systems
- `generate_daid()`: Generates DAID locally without storing

### Advanced Features

#### DAIDHealthMonitor
**Purpose**: Monitors DAID health and provides diagnostics

**Key Methods**:
- `check_daid_health()`: Performs health check on DAID
- `get_system_health_report()`: Generates system-wide health report
- `get_recommendations()`: Provides recommendations based on health checks

#### DAIDRecoveryManager
**Purpose**: Manages DAID recovery operations

**Recovery Strategies**:
- `regenerate`: Regenerate DAID from scratch
- `repair`: Repair corrupted DAID
- `restore`: Restore from backup data
- `merge`: Merge conflicting DAIDs

#### DAIDSynchronizationManager
**Purpose**: Manages DAID synchronization between local and remote

**Key Methods**:
- `check_sync_status()`: Checks synchronization status
- `synchronize_daid()`: Synchronizes DAID between systems

### Utility Functions

#### Factory Functions
- `create_daid_health_monitor()`: Creates health monitor instance
- `create_daid_recovery_manager()`: Creates recovery manager instance
- `create_daid_sync_manager()`: Creates sync manager instance

#### Quick Functions
- `perform_daid_health_check()`: Quick health check on DAID
- `recover_corrupted_daid()`: Recover corrupted DAID with strategy

## DAID Format Specification

### Format
```
daid:v1.0:timestamp:agent_id:entity_type:entity_id:provenance_hash
```

### Validation Rules
- Must start with "daid:"
- Must have exactly 7 colon-separated parts
- Timestamp must be valid ISO format
- Provenance hash must be 16 characters (hex)
- Entity type must be from VALID_ENTITY_TYPES

### Entity Types
Standard entity types include:
- composition
- pattern
- analysis
- user_action
- api_call
- file
- plugin_processing
- audio_analysis
- provenance_record
- user
- session
- configuration
- model
- training_data

## Usage Examples

### Basic DAID Generation
```python
from daid_core import DAIDGenerator

daid = DAIDGenerator.generate(
    agent_id="agent-123",
    entity_type="composition",
    entity_id="comp-456",
    operation="create"
)
```

### Client Usage
```python
from daid_core import DAIDClient

client = DAIDClient(
    agent_id="my-agent",
    base_url="http://localhost:8080",
    api_key="your-api-key"
)

# Create provenance record
record = ProvenanceRecord(
    entity_type="composition",
    entity_id="comp-123",
    operation="create",
    agent_id="my-agent"
)
daid = client.create_provenance_record(record)
```

### Health Monitoring
```python
from daid_core import perform_daid_health_check

health = perform_daid_health_check(
    "daid:v1.0:2024-01-01T12:00:00Z:agent-123:composition:comp-123:abcdef1234567890",
    chain_builder
)
```

## Integration Points

### Cross-Language Compatibility
- Python bindings for TypeScript/JavaScript DAID system
- Consistent DAID format across languages
- Shared validation rules and entity types

### Backend Integration
- RESTful API endpoints for DAID operations
- WebSocket support for real-time updates
- Cache invalidation mechanisms

### Monitoring & Recovery
- Health monitoring for system reliability
- Automated recovery for corrupted DAIDs
- Synchronization between local and remote systems
