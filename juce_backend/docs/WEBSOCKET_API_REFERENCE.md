# WebSocket Plugin API Reference

## Overview

This document provides a complete API reference for the WebSocket plugin system in the Audio Agent backend. The system supports real-time plugin parameter control, preset management, and state synchronization with DawDreamer engine integration and DAID provenance tracking.

## Connection

### WebSocket URL
```
ws://localhost:8000/ws
```

### Connection Headers
```json
{
  "Authorization": "Bearer <token>",
  "User-Agent": "AudioAgent-Client/1.0",
  "Session-Id": "<session-identifier>"
}
```

## Message Format

All WebSocket messages follow this structure:

```typescript
interface WebSocketMessage {
  id: string;           // Unique message identifier
  type: MessageType;    // Message type (see below)
  data: any;           // Message payload
  user_id?: string;    // User identifier (optional)
  session_id?: string; // Session identifier (optional)
  timestamp?: string;  // ISO 8601 timestamp (optional)
}
```

## Message Types

### PLUGIN_ADD
Add a new plugin to a track.

**Request:**
```json
{
  "id": "msg_001",
  "type": "PLUGIN_ADD",
  "data": {
    "track_id": "track_123",
    "name": "Reverb",
    "plugin_path": "/path/to/reverb.vst3",
    "plugin_id": ""
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

**Response:**
```json
{
  "id": "msg_001",
  "type": "PLUGIN_ADD",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "name": "Reverb",
    "plugin_path": "/path/to/reverb.vst3",
    "success": true,
    "parameters": {
      "wet_dry": 0.5,
      "room_size": 0.7,
      "damping": 0.3
    }
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

### PLUGIN_REMOVE
Remove a plugin from a track.

**Request:**
```json
{
  "id": "msg_002",
  "type": "PLUGIN_REMOVE",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123"
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

**Response:**
```json
{
  "id": "msg_002",
  "type": "PLUGIN_REMOVE",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "success": true
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

### PLUGIN_PARAMETER
Update a single plugin parameter.

**Request:**
```json
{
  "id": "msg_003",
  "type": "PLUGIN_PARAMETER",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "parameter_id": "wet_dry",
    "parameter_value": 0.75
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

**Response:**
```json
{
  "id": "msg_003",
  "type": "PLUGIN_PARAMETER",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "parameter_id": "wet_dry",
    "parameter_value": 0.75,
    "success": true
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

### PLUGIN_BYPASS
Enable or disable plugin bypass.

**Request:**
```json
{
  "id": "msg_004",
  "type": "PLUGIN_BYPASS",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "bypass": true
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

**Response:**
```json
{
  "id": "msg_004",
  "type": "PLUGIN_BYPASS",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "bypass": true,
    "success": true
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

### PLUGIN_PRESET
Load a plugin preset.

**Request:**
```json
{
  "id": "msg_005",
  "type": "PLUGIN_PRESET",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "preset_data": {
      "wet_dry": 0.6,
      "room_size": 0.8,
      "damping": 0.4,
      "pre_delay": 0.02
    }
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

**Response:**
```json
{
  "id": "msg_005",
  "type": "PLUGIN_PRESET",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "preset_data": {
      "wet_dry": 0.6,
      "room_size": 0.8,
      "damping": 0.4,
      "pre_delay": 0.02
    },
    "success": true
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

### PLUGIN_PARAMETERS_GET
Get all current parameters for a plugin.

**Request:**
```json
{
  "id": "msg_006",
  "type": "PLUGIN_PARAMETERS_GET",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123"
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

**Response:**
```json
{
  "id": "msg_006",
  "type": "PLUGIN_PARAMETERS_GET",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "parameters": {
      "wet_dry": 0.5,
      "room_size": 0.7,
      "damping": 0.3,
      "pre_delay": 0.01,
      "high_freq": 8000.0,
      "low_freq": 200.0
    },
    "success": true
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

## Error Responses

### Error Message Format
```json
{
  "id": "msg_007",
  "type": "ERROR",
  "data": {
    "error": "Plugin not found",
    "code": "PLUGIN_NOT_FOUND",
    "details": {
      "plugin_id": "plugin_invalid",
      "track_id": "track_123"
    }
  },
  "user_id": "user_456",
  "session_id": "session_789"
}
```

### Common Error Codes

| Code | Description | Details |
|------|-------------|---------|
| `PLUGIN_NOT_FOUND` | Plugin ID does not exist | `{plugin_id, track_id}` |
| `TRACK_NOT_FOUND` | Track ID does not exist | `{track_id}` |
| `INVALID_PARAMETER` | Parameter validation failed | `{parameter_id, parameter_value, validation_error}` |
| `PRESET_LOAD_FAILED` | Failed to load preset | `{plugin_id, preset_error}` |
| `ENGINE_ERROR` | DawDreamer engine error | `{engine_error}` |
| `UNAUTHORIZED` | User not authorized | `{user_id, required_permission}` |
| `RATE_LIMITED` | Too many requests | `{retry_after, limit}` |

## Message Queuing and Batching

### Parameter Updates
The system supports parameter batching for high-frequency updates:

```json
{
  "id": "batch_001",
  "type": "PLUGIN_PARAMETER_BATCH",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "parameters": [
      {"parameter_id": "wet_dry", "parameter_value": 0.6},
      {"parameter_id": "room_size", "parameter_value": 0.8},
      {"parameter_id": "damping", "parameter_value": 0.4}
    ],
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Debouncing
Parameters are debounced to prevent excessive updates:
- **Delay**: 50ms for continuous parameter changes
- **Max batch size**: 10 parameters per message
- **Timeout**: 100ms maximum wait time

## Session Management

### Session Broadcasts
All plugin operations are broadcast to all clients in the same session:

```json
{
  "id": "broadcast_001",
  "type": "PLUGIN_STATE_UPDATE",
  "data": {
    "track_id": "track_123",
    "plugin_id": "plugin_abc123",
    "state": "updated",
    "changed_by": "user_456",
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "session_id": "session_789"
}
```

### Connection States
- **CONNECTING**: Initial connection establishment
- **CONNECTED**: Connection ready for messages
- **AUTHENTICATED**: User authenticated successfully
- **DISCONNECTED**: Connection closed
- **ERROR**: Connection error occurred

## Rate Limiting

### Limits
- **Messages per second**: 100 per connection
- **Parameter updates**: 50 per second per plugin
- **Batch operations**: 20 per second
- **Plugin operations**: 10 per second

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Security

### Authentication
```json
{
  "type": "AUTH",
  "data": {
    "token": "jwt_token_here",
    "user_id": "user_456"
  }
}
```

### Authorization
Plugin operations require specific permissions:
- `plugin:read` - View plugin parameters and state
- `plugin:write` - Modify plugin parameters
- `plugin:add` - Add plugins to tracks
- `plugin:remove` - Remove plugins from tracks
- `track:modify` - Modify track structure

### Message Signing
Optional message signing for security-critical operations:

```json
{
  "id": "msg_008",
  "type": "PLUGIN_ADD",
  "data": {
    "track_id": "track_123",
    "name": "Critical Plugin"
  },
  "signature": "sha256_hash_here",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Performance Considerations

### Connection Pooling
- **Max connections per user**: 5
- **Connection timeout**: 30 seconds
- **Heartbeat interval**: 30 seconds

### Memory Management
- **Message history**: 100 messages per session
- **Plugin state cache**: 10 minutes TTL
- **Connection cleanup**: Every 5 minutes

### Optimization Tips
1. Use parameter batching for high-frequency updates
2. Implement local caching for plugin parameters
3. Use debouncing for continuous parameter changes
4. Batch plugin operations when possible
5. Implement proper error handling and retry logic