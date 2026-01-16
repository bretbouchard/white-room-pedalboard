# WebSocket Plugin Migration Guide

This guide helps you migrate from the old WebSocket plugin system to the new enhanced system with DawDreamer integration and improved parameter handling.

## Overview of Changes

### New Features
- **DawDreamer Engine Integration**: Full plugin processor management
- **DAID Provenance Tracking**: Complete audit trail for all operations
- **Enhanced Parameter Control**: Batch updates, debouncing, and real-time sync
- **Session Broadcasting**: Multi-client synchronization
- **Improved Error Handling**: Detailed error codes and recovery strategies
- **Performance Optimizations**: Connection pooling and parameter batching

### Breaking Changes
- New message format with additional required fields
- Updated authentication requirements
- Modified error response structure
- New message types added
- Deprecated message types removed

## Migration Steps

### 1. Update WebSocket Connection

#### Before (Old System)
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handlePluginMessage(data);
};
```

#### After (New System)
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  // Send authentication message
  ws.send(JSON.stringify({
    type: 'AUTH',
    data: {
      token: 'your_jwt_token',
      user_id: 'user_123'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  // Handle new message format
  if (message.type === 'AUTH_SUCCESS') {
    console.log('Authenticated successfully');
  } else {
    handlePluginMessage(message);
  }
};
```

### 2. Update Message Format

#### Old Plugin Add Format
```json
{
  "type": "ADD_PLUGIN",
  "data": {
    "trackId": "track_123",
    "pluginName": "Reverb",
    "pluginPath": "/path/to/reverb.vst3"
  }
}
```

#### New Plugin Add Format
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

### 3. Update Parameter Update Handling

#### Before (Old System)
```javascript
function updatePluginParameter(pluginId, parameterId, value) {
  ws.send(JSON.stringify({
    type: 'UPDATE_PARAMETER',
    data: {
      pluginId: pluginId,
      parameterId: parameterId,
      value: value
    }
  }));
}
```

#### After (New System)
```javascript
function updatePluginParameter(trackId, pluginId, parameterId, value, userId, sessionId) {
  ws.send(JSON.stringify({
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'PLUGIN_PARAMETER',
    data: {
      track_id: trackId,
      plugin_id: pluginId,
      parameter_id: parameterId,
      parameter_value: value
    },
    user_id: userId,
    session_id: sessionId
  }));
}
```

### 4. Update Error Handling

#### Before (Old System)
```javascript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Generic error handling
};
```

#### After (New System)
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'ERROR') {
    switch (message.data.code) {
      case 'PLUGIN_NOT_FOUND':
        console.error('Plugin not found:', message.data.details.plugin_id);
        // Show user-friendly error message
        showUserError('Plugin not found. Please check the plugin ID.');
        break;

      case 'UNAUTHORIZED':
        console.error('Unauthorized access');
        // Redirect to login or refresh token
        redirectToLogin();
        break;

      case 'RATE_LIMITED':
        console.error('Rate limited. Retry after:', message.data.details.retry_after);
        // Implement retry logic with exponential backoff
        scheduleRetry(message.data.details.retry_after);
        break;

      default:
        console.error('Unknown error:', message.data.error);
        showUserError('An unexpected error occurred. Please try again.');
    }
  }
};
```

### 5. Implement Session Management

#### New Session Broadcasting
```javascript
class PluginSessionManager {
  constructor(ws, sessionId, userId) {
    this.ws = ws;
    this.sessionId = sessionId;
    this.userId = userId;
    this.plugins = new Map();
  }

  handleBroadcast(message) {
    switch (message.type) {
      case 'PLUGIN_STATE_UPDATE':
        this.updatePluginState(message.data);
        break;
      case 'USER_CURSOR_UPDATE':
        this.updateUserCursor(message.data);
        break;
    }
  }

  updatePluginState(data) {
    const plugin = this.plugins.get(data.plugin_id);
    if (plugin) {
      // Update local plugin state
      plugin.state = data.state;
      plugin.lastModified = data.timestamp;
      plugin.modifiedBy = data.changed_by;

      // Refresh UI if not the current user
      if (data.changed_by !== this.userId) {
        this.refreshPluginUI(data.plugin_id);
      }
    }
  }
}
```

## Field Mapping

### Message Fields

| Old Field | New Field | Description |
|-----------|-----------|-------------|
| `trackId` | `track_id` | Track identifier |
| `pluginId` | `plugin_id` | Plugin identifier |
| `pluginName` | `name` | Plugin name |
| `pluginPath` | `plugin_path` | Plugin file path |
| `parameterId` | `parameter_id` | Parameter identifier |
| `parameterValue` | `parameter_value` | Parameter value |
| `bypassed` | `bypass` | Bypass state |

### New Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique message identifier |
| `user_id` | string | User identifier |
| `session_id` | string | Session identifier |
| `timestamp` | string | ISO 8601 timestamp (optional) |

## Code Migration Examples

### React Hook Migration

#### Before (Old Hook)
```typescript
function usePluginControls(trackId) {
  const [plugins, setPlugins] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8000/ws');

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'PLUGIN_ADDED':
          setPlugins(prev => [...prev, data.plugin]);
          break;
        case 'PARAMETER_UPDATED':
          updatePluginParameter(data.pluginId, data.parameterId, data.value);
          break;
      }
    };

    setWs(websocket);

    return () => websocket.close();
  }, []);

  const addPlugin = (name, path) => {
    ws.send(JSON.stringify({
      type: 'ADD_PLUGIN',
      data: { trackId, name, path }
    }));
  };

  return { plugins, addPlugin };
}
```

#### After (New Hook)
```typescript
function usePluginControls(trackId, sessionId, userId) {
  const [plugins, setPlugins] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      wsRef.current.send(JSON.stringify(fullMessage));
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Send authentication
      sendMessage({
        type: 'AUTH',
        data: { token: 'your_jwt_token', user_id: userId }
      });
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'AUTH_SUCCESS':
          console.log('Authenticated');
          break;
        case 'PLUGIN_ADD':
          handlePluginAdded(message.data);
          break;
        case 'PLUGIN_PARAMETER':
          handleParameterUpdated(message.data);
          break;
        case 'PLUGIN_STATE_UPDATE':
          handleStateBroadcast(message.data);
          break;
        case 'ERROR':
          handleError(message.data);
          break;
      }
    };

    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  }, [sendMessage, userId]);

  const handlePluginAdded = (data) => {
    setPlugins(prev => [...prev, {
      id: data.plugin_id,
      name: data.name,
      trackId: data.track_id,
      parameters: data.parameters || {},
      bypassed: false
    }]);
  };

  const handleParameterUpdated = (data) => {
    setPlugins(prev => prev.map(plugin =>
      plugin.id === data.plugin_id
        ? {
            ...plugin,
            parameters: {
              ...plugin.parameters,
              [data.parameter_id]: data.parameter_value
            }
          }
        : plugin
    ));
  };

  const handleStateBroadcast = (data) => {
    // Handle updates from other users in the session
    if (data.changed_by !== userId) {
      setPlugins(prev => prev.map(plugin =>
        plugin.id === data.plugin_id
          ? { ...plugin, lastModified: data.timestamp }
          : plugin
      ));
    }
  };

  const addPlugin = useCallback((name, pluginPath) => {
    sendMessage({
      type: 'PLUGIN_ADD',
      data: {
        track_id: trackId,
        name,
        plugin_path: pluginPath || name,
        plugin_id: ''
      },
      user_id: userId,
      session_id: sessionId
    });
  }, [sendMessage, trackId, userId, sessionId]);

  const updateParameter = useCallback((pluginId, parameterId, value) => {
    sendMessage({
      type: 'PLUGIN_PARAMETER',
      data: {
        track_id: trackId,
        plugin_id: pluginId,
        parameter_id: parameterId,
        parameter_value: value
      },
      user_id: userId,
      session_id: sessionId
    });
  }, [sendMessage, trackId, userId, sessionId]);

  return { plugins, isConnected, addPlugin, updateParameter };
}
```

## Backend Integration Migration

### Express.js WebSocket Server

#### Before (Old Implementation)
```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'ADD_PLUGIN':
        // Add plugin logic
        addPluginToTrack(data.trackId, data.pluginName);
        break;
      case 'UPDATE_PARAMETER':
        // Update parameter logic
        updatePluginParameter(data.pluginId, data.parameterId, data.value);
        break;
    }
  });
});
```

#### After (New Implementation with Enhanced Features)
```javascript
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class PluginWebSocketServer {
  constructor(port = 8000) {
    this.wss = new WebSocket.Server({ port });
    this.connections = new Map();
    this.sessions = new Map();
    this.audioEngine = null; // DawDreamer engine instance

    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const connectionId = uuidv4();

      this.connections.set(connectionId, {
        ws,
        userId: null,
        sessionId: null,
        authenticated: false
      });

      ws.on('message', (message) => {
        this.handleMessage(connectionId, message);
      });

      ws.on('close', () => {
        this.handleDisconnection(connectionId);
      });
    });
  }

  async handleMessage(connectionId, message) {
    try {
      const data = JSON.parse(message);
      const connection = this.connections.get(connectionId);

      if (!connection) return;

      // Handle authentication
      if (data.type === 'AUTH') {
        await this.handleAuthentication(connectionId, data);
        return;
      }

      // Require authentication for all other messages
      if (!connection.authenticated) {
        this.sendError(connectionId, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      // Add metadata to message
      const enhancedMessage = {
        ...data,
        user_id: connection.userId,
        session_id: connection.sessionId,
        timestamp: new Date().toISOString()
      };

      await this.routeMessage(connectionId, enhancedMessage);
    } catch (error) {
      console.error('Message handling error:', error);
      this.sendError(connectionId, 'INVALID_MESSAGE', error.message);
    }
  }

  async handleAuthentication(connectionId, data) {
    try {
      // Validate JWT token
      const decoded = await this.validateToken(data.data.token);

      const connection = this.connections.get(connectionId);
      connection.userId = decoded.userId;
      connection.sessionId = data.data.session_id || this.generateSessionId();
      connection.authenticated = true;

      // Add to session
      if (!this.sessions.has(connection.sessionId)) {
        this.sessions.set(connection.sessionId, new Set());
      }
      this.sessions.get(connection.sessionId).add(connectionId);

      this.sendMessage(connectionId, {
        type: 'AUTH_SUCCESS',
        data: { session_id: connection.sessionId }
      });

    } catch (error) {
      this.sendError(connectionId, 'AUTH_FAILED', 'Invalid authentication token');
    }
  }

  async routeMessage(connectionId, message) {
    const { type, data } = message;

    switch (type) {
      case 'PLUGIN_ADD':
        await this.handlePluginAdd(connectionId, message);
        break;
      case 'PLUGIN_REMOVE':
        await this.handlePluginRemove(connectionId, message);
        break;
      case 'PLUGIN_PARAMETER':
        await this.handlePluginParameter(connectionId, message);
        break;
      case 'PLUGIN_BYPASS':
        await this.handlePluginBypass(connectionId, message);
        break;
      case 'PLUGIN_PRESET':
        await this.handlePluginPreset(connectionId, message);
        break;
      case 'PLUGIN_PARAMETERS_GET':
        await this.handlePluginParametersGet(connectionId, message);
        break;
      default:
        this.sendError(connectionId, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${type}`);
    }
  }

  async handlePluginAdd(connectionId, message) {
    const connection = this.connections.get(connectionId);

    try {
      // Create plugin processor with DawDreamer
      const pluginId = await this.audioEngine.createPluginProcessor(
        message.data.name,
        message.data.plugin_path
      );

      // Track with DAID
      await this.daidService.trackUserInteraction({
        userId: connection.userId,
        action: 'plugin_add',
        details: {
          pluginId,
          trackId: message.data.track_id,
          name: message.data.name
        }
      });

      // Get initial parameters
      const parameters = await this.audioEngine.getPluginParameters(pluginId);

      const response = {
        type: 'PLUGIN_ADD',
        data: {
          ...message.data,
          plugin_id: pluginId,
          parameters,
          success: true
        }
      };

      // Send to requester
      this.sendMessage(connectionId, response);

      // Broadcast to session
      this.broadcastToSession(connection.sessionId, response, connectionId);

    } catch (error) {
      this.sendError(connectionId, 'PLUGIN_ADD_FAILED', error.message);
    }
  }

  async handlePluginParameter(connectionId, message) {
    const connection = this.connections.get(connectionId);

    try {
      // Update parameter in DawDreamer
      await this.audioEngine.setPluginParameter(
        message.data.plugin_id,
        message.data.parameter_id,
        message.data.parameter_value
      );

      // Track with DAID
      await this.daidService.trackUserInteraction({
        userId: connection.userId,
        action: 'parameter_update',
        details: {
          pluginId: message.data.plugin_id,
          parameterId: message.data.parameter_id,
          value: message.data.parameter_value
        }
      });

      const response = {
        type: 'PLUGIN_PARAMETER',
        data: {
          ...message.data,
          success: true
        }
      };

      // Send to requester
      this.sendMessage(connectionId, response);

      // Broadcast to session
      this.broadcastToSession(connection.sessionId, response, connectionId);

    } catch (error) {
      this.sendError(connectionId, 'PARAMETER_UPDATE_FAILED', error.message);
    }
  }

  broadcastToSession(sessionId, message, excludeConnectionId = null) {
    const sessionConnections = this.sessions.get(sessionId);
    if (!sessionConnections) return;

    sessionConnections.forEach(connectionId => {
      if (connectionId !== excludeConnectionId) {
        this.sendMessage(connectionId, message);
      }
    });
  }

  sendMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  sendError(connectionId, code, message, details = null) {
    this.sendMessage(connectionId, {
      type: 'ERROR',
      data: {
        error: message,
        code,
        details
      }
    });
  }

  handleDisconnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.sessionId) {
      const sessionConnections = this.sessions.get(connection.sessionId);
      if (sessionConnections) {
        sessionConnections.delete(connectionId);
        if (sessionConnections.size === 0) {
          this.sessions.delete(connection.sessionId);
        }
      }
    }
    this.connections.delete(connectionId);
  }
}
```

## Testing Migration

### Migration Test Suite

```javascript
// tests/migration.test.js
describe('WebSocket Plugin Migration', () => {
  let oldClient, newClient;
  let testTrackId = 'test_track_001';
  let testSessionId = 'test_session_001';
  let testUserId = 'test_user_001';

  beforeEach(() => {
    // Initialize old client (for comparison)
    oldClient = new OldPluginClient('ws://localhost:8001/ws');

    // Initialize new client
    newClient = new NewPluginClient('ws://localhost:8000/ws');
  });

  afterEach(async () => {
    await oldClient.disconnect();
    await newClient.disconnect();
  });

  test('Plugin addition compatibility', async () => {
    // Test old format
    const oldResult = await oldClient.addPlugin(testTrackId, 'Reverb', '/path/to/reverb.vst3');
    expect(oldResult.success).toBe(true);
    expect(oldResult.pluginId).toBeDefined();

    // Test new format
    const newResult = await newClient.addPlugin(
      testTrackId,
      'Reverb',
      '/path/to/reverb.vst3',
      testUserId,
      testSessionId
    );
    expect(newResult.success).toBe(true);
    expect(newResult.plugin_id).toBeDefined();
    expect(newResult.parameters).toBeDefined();
  });

  test('Parameter update compatibility', async () => {
    // Add plugin first
    const plugin = await newClient.addPlugin(testTrackId, 'Reverb', '/path/to/reverb.vst3', testUserId, testSessionId);

    // Test old format
    const oldResult = await oldClient.updateParameter(plugin.plugin_id, 'wet_dry', 0.7);
    expect(oldResult.success).toBe(true);

    // Test new format
    const newResult = await newClient.updateParameter(
      testTrackId,
      plugin.plugin_id,
      'wet_dry',
      0.8,
      testUserId,
      testSessionId
    );
    expect(newResult.success).toBe(true);
    expect(newResult.track_id).toBe(testTrackId);
  });

  test('Error handling improvements', async () => {
    // Test non-existent plugin
    try {
      await newClient.updateParameter(
        testTrackId,
        'non_existent_plugin',
        'wet_dry',
        0.5,
        testUserId,
        testSessionId
      );
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.code).toBe('PLUGIN_NOT_FOUND');
      expect(error.details.plugin_id).toBe('non_existent_plugin');
    }
  });

  test('Session broadcasting', async () => {
    // Create two clients in same session
    const client1 = new NewPluginClient('ws://localhost:8000/ws');
    const client2 = new NewPluginClient('ws://localhost:8000/ws');

    await client1.authenticate(testUserId, testSessionId);
    await client2.authenticate('user_002', testSessionId);

    // Add plugin from client1
    const plugin = await client1.addPlugin(testTrackId, 'Reverb', '/path/to/reverb.vst3', testUserId, testSessionId);

    // Update parameter from client1
    await client1.updateParameter(testTrackId, plugin.plugin_id, 'wet_dry', 0.7, testUserId, testSessionId);

    // Client2 should receive the update
    const broadcast = await client2.waitForMessage('PLUGIN_STATE_UPDATE');
    expect(broadcast.data.plugin_id).toBe(plugin.plugin_id);
    expect(broadcast.data.changed_by).toBe(testUserId);

    await client1.disconnect();
    await client2.disconnect();
  });
});
```

## Rollback Strategy

### Feature Flags for Gradual Migration

```javascript
// config/featureFlags.js
const featureFlags = {
  // Enable new WebSocket plugin system
  NEW_PLUGIN_SYSTEM: process.env.ENABLE_NEW_PLUGIN_SYSTEM === 'true',

  // Enable session broadcasting
  SESSION_BROADCASTING: process.env.ENABLE_SESSION_BROADCASTING === 'true',

  // Enable DAID tracking
  DAID_TRACKING: process.env.ENABLE_DAID_TRACKING === 'true',

  // Enable parameter batching
  PARAMETER_BATCHING: process.env.ENABLE_PARAMETER_BATCHING === 'true'
};

// middleware/featureFlagMiddleware.js
function pluginSystemMiddleware(req, res, next) {
  if (featureFlags.NEW_PLUGIN_SYSTEM) {
    // Use new plugin system
    req.pluginSystem = newPluginSystem;
  } else {
    // Use old plugin system for compatibility
    req.pluginSystem = oldPluginSystem;
  }
  next();
}
```

### Database Migration

```sql
-- Migration script for plugin system
-- Add new fields to existing plugin configurations

ALTER TABLE plugin_configurations
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS daid_id VARCHAR(255);

-- Create new table for DAID tracking
CREATE TABLE IF NOT EXISTS daid_events (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
);

-- Migrate existing data
UPDATE plugin_configurations
SET session_id = 'legacy_session',
    created_by = 'migration_script',
    daid_id = CONCAT('daid_', id)
WHERE session_id IS NULL;
```

## Troubleshooting

### Common Migration Issues

#### Issue 1: Authentication Errors
**Problem**: New system requires authentication but old client doesn't provide it.
**Solution**: Implement backward compatibility with anonymous sessions.

```javascript
// Allow anonymous access during migration period
async function handleAuthentication(connectionId, data) {
  const connection = this.connections.get(connectionId);

  if (!data.data.token && process.env.ALLOW_ANONYMOUS === 'true') {
    // Create anonymous session for backward compatibility
    connection.userId = 'anonymous_user';
    connection.sessionId = `anonymous_${uuidv4()}`;
    connection.authenticated = true;
    return;
  }

  // Normal authentication flow...
}
```

#### Issue 2: Missing Required Fields
**Problem**: Old messages missing new required fields.
**Solution**: Add field validation and default values.

```javascript
function validateMessage(message, schema) {
  const validated = { ...message };

  // Add missing required fields with defaults
  if (!validated.id) {
    validated.id = `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  if (!validated.user_id) {
    validated.user_id = 'legacy_user';
  }

  if (!validated.session_id) {
    validated.session_id = 'legacy_session';
  }

  return validated;
}
```

#### Issue 3: Performance Degradation
**Problem**: New system is slower due to additional features.
**Solution**: Enable/disable features based on performance requirements.

```javascript
class PluginWebSocketServer {
  constructor(options = {}) {
    this.enableDAIDTracking = options.enableDAID !== false;
    this.enableSessionBroadcast = options.enableSessionBroadcast !== false;
    this.enableParameterBatching = options.enableParameterBatching !== false;
  }

  async handlePluginParameter(connectionId, message) {
    // Update parameter (always required)
    await this.audioEngine.setPluginParameter(/*...*/);

    // Optional features
    if (this.enableDAIDTracking) {
      await this.daidService.trackUserInteraction(/*...*/);
    }

    if (this.enableSessionBroadcast) {
      this.broadcastToSession(/*...*/);
    }
  }
}
```

This migration guide provides comprehensive steps and examples to help you transition from the old WebSocket plugin system to the new enhanced system with minimal disruption to your existing functionality.