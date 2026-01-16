# API Documentation

## WebSocket API Reference

The Schillinger Ecosystem Backend provides a WebSocket API for real-time communication with external UI frameworks and applications.

### Connection

**Endpoint:** `ws://localhost:8080/ws`

**Authentication:** Optional JWT token for secure connections

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
```

### Message Format

All messages use a consistent JSON format:

```json
{
  "type": 1001,
  "payload": {},
  "requestId": "req_1234",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### API Endpoints

#### Instrument Management

**Get Available Instruments**
```json
{
  "type": 1001,
  "payload": {}
}
```

**Create Instrument Instance**
```json
{
  "type": 1002,
  "payload": {
    "instrumentName": "NEX_FM",
    "instanceName": "Lead Synth"
  }
}
```

**Delete Instrument Instance**
```json
{
  "type": 1003,
  "payload": {
    "instanceId": "inst_123456"
  }
}
```

#### Plugin System

**Scan Plugins**
```json
{
  "type": 1010,
  "payload": {
    "scanPaths": ["/Library/Audio/Plug-Ins/VST3", "~/.vst3"]
  }
}
```

**Load Plugin**
```json
{
  "type": 1012,
  "payload": {
    "pluginPath": "/path/to/plugin.vst3"
  }
}
```

**Unload Plugin**
```json
{
  "type": 1013,
  "payload": {
    "pluginId": "plugin_123456"
  }
}
```

#### Audio Routing

**Create Audio Route**
```json
{
  "type": 1020,
  "payload": {
    "source": "NEX_FM_output",
    "target": "main_output",
    "effects": ["reverb", "delay"]
  }
}
```

**Get Audio Levels**
```json
{
  "type": 1024,
  "payload": {}
}
```

#### MIDI Routing

**Create MIDI Route**
```json
{
  "type": 1030,
  "payload": {
    "sourceDevice": "USB_MIDI_Controller",
    "targetInstrument": "NEX_FM"
  }
}
```

**Start MIDI Learn**
```json
{
  "type": 1040,
  "payload": {
    "parameterName": "filter_cutoff",
    "instrumentName": "NEX_FM"
  }
}
```

#### Dynamic Algorithm System

**Load Algorithm**
```json
{
  "type": 1050,
  "payload": {
    "algorithmName": "Density",
    "parameters": {
      "Drive": 0.5,
      "Mix": 1.0
    }
  }
}
```

**Get Available Algorithms**
```json
{
  "type": 1051,
  "payload": {}
}
```

**Update Algorithm Parameter**
```json
{
  "type": 1052,
  "payload": {
    "algorithmName": "Density",
    "parameter": "Drive",
    "value": 0.75
  }
}
```

#### Performance Monitoring

**Get Performance Stats**
```json
{
  "type": 1060,
  "payload": {}
}
```

**Get System Status**
```json
{
  "type": 1061,
  "payload": {}
}
```

### Response Format

**Success Response**
```json
{
  "type": 2001,
  "payload": {
    "status": "success",
    "data": {}
  },
  "requestId": "req_1234",
  "timestamp": "2024-01-01T12:00:01Z"
}
```

**Error Response**
```json
{
  "type": 4001,
  "payload": {
    "status": "error",
    "message": "Instrument not found",
    "code": "INSTRUMENT_NOT_FOUND"
  },
  "requestId": "req_1234",
  "timestamp": "2024-01-01T12:00:01Z"
}
```

### Real-time Updates

The server sends real-time updates for:

- **Parameter Changes**: When parameters are modified
- **Audio Levels**: Live audio level monitoring
- **MIDI Activity**: Real-time MIDI event visualization
- **System Status**: Performance metrics and health

**Update Message Format**
```json
{
  "type": 3001,
  "payload": {
    "updateType": "parameter_change",
    "data": {
      "parameter": "Drive",
      "value": 0.75,
      "instrument": "Density"
    }
  },
  "timestamp": "2024-01-01T12:00:01Z"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| 1001 | Invalid message format |
| 1002 | Unknown message type |
| 1003 | Missing required parameters |
| 2001 | Instrument not found |
| 2002 | Plugin loading failed |
| 2003 | Audio routing error |
| 2004 | MIDI device error |
| 3001 | Algorithm not found |
| 3002 | Parameter validation failed |

### Rate Limiting

- **Connection Limit**: 10 concurrent connections per client
- **Message Rate**: 100 messages per second per connection
- **Burst Limit**: 200 messages in 10 seconds

### Security

- **Authentication**: JWT token required for secure endpoints
- **Input Validation**: All parameters validated and sanitized
- **Permission System**: Granular access controls for operations

For detailed implementation examples, see the `docs/api_examples/` directory.