# WebSocket Plugin Parameter Integration Guide

## Overview

This guide covers the WebSocket-based plugin parameter management system for real-time audio plugin control. The system provides efficient parameter handling with batching, debouncing, DAID provenance tracking, and multi-client synchronization.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Message Types](#message-types)
4. [Client Integration](#client-integration)
5. [API Reference](#api-reference)
6. [Code Examples](#code-examples)
7. [Best Practices](#best-practices)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)
10. [Migration Guide](#migration-guide)

## Quick Start

### Basic Plugin Parameter Update

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws');

// Update plugin parameter with batching
ws.send(JSON.stringify({
    id: 'msg_001',
    type: 'plugin.parameter',
    timestamp: '2025-01-01T00:00:00.000Z',
    data: {
        track_id: 'track_123',
        plugin_id: 'plugin_456',
        parameter_id: 'volume',
        parameter_value: 0.75
    },
    user_id: 'user_789',
    session_id: 'session_abc'
}));
```

### Add a Plugin

```javascript
ws.send(JSON.stringify({
    id: 'msg_002',
    type: 'plugin.add',
    timestamp: '2025-01-01T00:00:00.000Z',
    data: {
        track_id: 'track_123',
        name: 'Reverb Plugin',
        plugin_path: '/path/to/reverb.vst3'
    },
    user_id: 'user_789',
    session_id: 'session_abc'
}));
```

## Architecture Overview

### Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend Client    │    │  WebSocket      │    │   Backend Server   │
│                   │    │   Message Router  │    │                   │
│   - Audio Store     │◄──►│                   │◄──►│   - DawDreamer     │
│   - UI Components  │    │   Parameter       │    │     Engine        │
│   - WebSocket API  │    │   Batcher         │    │                   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   DAID Service    │
                    │                   │
                    │ - Provenance     │
                    │ - Audit Trail    │
                    └─────────────────┘
```

### Data Flow

1. **Client Action** → WebSocket message sent
2. **Message Router** → Parameter batcher processing
3. **DawDreamer Engine** → Audio parameter update
4. **DAID Service** → Provenance tracking
5. **Broadcast** → All connected clients updated

## Message Types

### Plugin Management

| Message Type | Purpose | Data Fields |
|---------------|---------|------------|
| `plugin.add` | Add plugin to track | `track_id`, `name`, `plugin_path` |
| `plugin.remove` | Remove plugin from track | `track_id`, `plugin_id` |
| `plugin.bypass` | Toggle plugin bypass state | `track_id`, `plugin_id`, `bypass` |
| `plugin.preset` | Load plugin preset | `track_id`, `plugin_id`, `preset_name`, `preset_data` |
| `plugin.parameters.get` | Get current plugin parameters | `track_id`, `plugin_id` |

### Parameter Control

| Message Type | Purpose | Data Fields |
|---------------|---------|------------|
| `plugin.parameter` | Single parameter update | `track_id`, `plugin_id`, `parameter_id`, `parameter_value` |
| `plugin.parameter.batch` | Batch parameter updates | `changes[]`, `debounce_ms`, `apply_immediately` |

### Message Structure

```typescript
interface WebSocketMessage {
    id: string;
    type: MessageType;
    timestamp: string;
    data: PluginData;
    user_id?: string;
    session_id?: string;
    t0_timestamp?: string; // Latency measurement start
    t1_engine_call?: string; // Engine call timestamp
}
```

## Client Integration

### React Hook Example

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';

export const usePluginControl = (trackId: string, pluginId: string) => {
    const [parameters, setParameters] = useState<Record<string, number>>({});
    const { sendJsonMessage, isConnected } = useWebSocket();
    const pendingUpdates = useRef<Map<string, number>>(new Map());

    // Debounced parameter updates
    const debouncedUpdate = useCallback((parameterId: string, value: number) => {
        pendingUpdates.current.set(parameterId, value);

        // Schedule debounced update
        setTimeout(() => {
            if (pendingUpdates.current.size > 0) {
                const changes = Array.from(pendingUpdates.current.entries()).map(([id, val]) => ({
                    track_id: trackId,
                    plugin_id: pluginId,
                    parameter_id: id,
                    value: val
                }));

                sendJsonMessage({
                    type: 'plugin.parameter.batch',
                    data: {
                        changes,
                        debounce_ms: 50,
                        apply_immediately: false
                    }
                });

                pendingUpdates.current.clear();
            }
        }, 50);
    }, [trackId, pluginId, sendJsonMessage]);

    // Update parameter
    const updateParameter = useCallback((parameterId: string, value: number) => {
        setParameters(prev => ({
            ...prev,
            [parameterId]: value
        }));
        debouncedUpdate(parameterId, value);
    }, [debouncedUpdate]);

    // Get current parameters
    const refreshParameters = useCallback(() => {
        sendJsonMessage({
            type: 'plugin.parameters.get',
            data: {
                track_id: trackId,
                plugin_id: pluginId
            }
        });
    }, [sendJsonMessage, trackId, pluginId]);

    return {
        parameters,
        updateParameter,
        refreshParameters,
        isConnected
    };
};
```

### WebSocket Client Implementation

```typescript
class PluginWebSocketClient {
    private ws: WebSocket | null = null;
    private messageHandlers: Map<string, (data: any) => void> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor(private url: string) {
        this.connect();
    }

    private connect() {
        try {
            this.ws = new WebSocket(this.url);
            this.setupEventHandlers();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    private setupEventHandlers() {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private handleMessage(message: any) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message);
        }
    }

    public sendJsonMessage(message: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const messageWithTimestamp = {
                ...message,
                timestamp: new Date().toISOString(),
                t0_timestamp: new Date().toISOString() // For latency measurement
            };
            this.ws.send(JSON.stringify(messageWithTimestamp));
        }
    }

    public onMessage(type: string, handler: (data: any) => void) {
        this.messageHandlers.set(type, handler);
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect();
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
```

## API Reference

### Message Types

```typescript
enum MessageType {
    // Plugin management
    PLUGIN_ADD = "plugin.add",
    PLUGIN_REMOVE = "plugin.remove",
    PLUGIN_PARAMETER = "plugin.parameter",
    PLUGIN_PARAMETER_BATCH = "plugin.parameter.batch",
    PLUGIN_BYPASS = "plugin.bypass",
    PLUGIN_PRESET = "plugin.preset",
    PLUGIN_PARAMETERS_GET = "plugin.parameters.get",

    // Other types...
}
```

### PluginMessage Schema

```typescript
interface PluginMessage {
    track_id: string;
    plugin_id: string;
    plugin_name?: string;
    name?: string; // Alias for plugin_name
    plugin_path?: string;
    parameter_id?: string;
    parameter_value?: number;
    bypassed?: boolean;
    bypass?: boolean; // Alias for bypassed
    preset_name?: string;
    preset_data?: Record<string, any>;
    plugin_format?: "VST3" | "AU" | "LV2" | "CLAP";
    position?: number;
}
```

### ParameterBatchMessage Schema

```typescript
interface ParameterBatchMessage {
    changes: Array<{
        track_id: string;
        plugin_id: string;
        parameter_id: string;
        value: number;
    }>;
    debounce_ms: number; // 50-1000ms
    apply_immediately: boolean;
}
```

## Code Examples

### Vue.js Integration

```vue
<template>
  <div class="plugin-control">
    <div class="plugin-header">
      <h3>{{ plugin.name }}</h3>
      <button
        @click="toggleBypass"
        :class="{ 'bypass': plugin.bypass }"
      >
        {{ plugin.bypass ? 'Enable' : 'Bypass' }}
      </button>
    </div>

    <div class="parameters">
      <div
        v-for="(param, key) in plugin.parameters"
        :key="key"
        class="parameter"
      >
        <label>{{ formatParameterName(key) }}</label>
        <input
          type="range"
          :min="param.min"
          :max="param.max"
          :step="param.step"
          :value="param.value"
          @input="updateParameter(key, $event.target.value)"
          @mouseup="applyParameterChanges"
        />
        <span class="value">{{ param.value.toFixed(3) }}</span>
      </div>
    </div>

    <div class="presets">
      <button
        v-for="preset in plugin.presets"
        :key="preset.name"
        @click="loadPreset(preset)"
        :class="{ active: preset.name === currentPreset }"
      >
        {{ preset.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePluginControl } from '@/composables/usePluginControl';

const props = defineProps<{
  trackId: string;
  pluginId: string;
}>();

const { parameters, updateParameter, refreshParameters, isConnected } = usePluginControl(
  props.trackId,
  props.pluginId
);

const plugin = ref({
  name: 'Test Plugin',
  bypass: false,
  presets: [
    { name: 'Default', data: { volume: 0.8, reverb: 0.3 } },
    { name: 'Warm', data: { volume: 0.9, reverb: 0.5 } }
  ],
  parameters: {}
});

// Format parameter names for display
const formatParameterName = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ));
};

// Update parameter locally and batch changes
const updateParameter = (parameterId: string, value: number) => {
  plugin.value.parameters[parameterId] = value;
  updateParameter(parameterId, value);
};

// Apply batched parameter changes
const applyParameterChanges = () => {
  // Parameters are already being debounced in the hook
};

// Toggle bypass state
const toggleBypass = () => {
  plugin.value.bypass = !plugin.value.bypass;

  sendMessage('plugin.bypass', {
    track_id: props.trackId,
    plugin_id: props.pluginId,
    bypass: plugin.value.bypass
  });
};

// Load preset
const loadPreset = (preset: any) => {
  Object.entries(preset.data).forEach(([key, value]) => {
    plugin.value.parameters[key] = value;
    updateParameter(key, value);
  });

  plugin.value.currentPreset = preset.name;
};

// Send WebSocket message
const sendMessage = (type: string, data: any) => {
  // WebSocket client implementation would go here
  console.log(`Sending ${type}:`, data);
};

// Initialize
onMounted(() => {
  refreshParameters();
});
</script>
```

### React with Custom Hook

```tsx
import React, { useState, useEffect } from 'react';
import { PluginWebSocketClient } from './PluginWebSocketClient';

interface PluginControlProps {
  trackId: string;
  pluginId: string;
  children: (controls: PluginControls) => React.ReactNode;
}

interface PluginControls {
  parameters: Record<string, number>;
  updateParameter: (id: string, value: number) => void;
  refreshParameters: () => void;
  toggleBypass: () => void;
  loadPreset: (preset: any) => void;
  isConnected: boolean;
}

export const PluginControl: React.FC<PluginControlProps> = ({
  trackId,
  pluginId,
  children
}) => {
  const [client] = useState(() => new PluginWebSocketClient('ws://localhost:8000/ws'));
  const [parameters, setParameters] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [bypass, setBypass] = useState(false);

  useEffect(() => {
    // Set up message handlers
    client.onMessage('plugin.parameters.get', (data) => {
      setParameters(data.data.parameters);
    });

    client.onMessage('plugin.bypass', (data) => {
      setBypass(data.data.bypass);
    });

    client.onMessage('plugin.parameter', (data) => {
      setParameters(prev => ({
        ...prev,
        [data.data.parameter_id]: data.data.parameter_value
      }));
    });

    // Connection status
    client.onMessage('connection.status', (data) => {
      setIsConnected(data.data.connected);
    });

    // Initialize parameters
    client.sendJsonMessage({
      type: 'plugin.parameters.get',
      data: { trackId, pluginId }
    });

    return () => {
      client.disconnect();
    };
  }, [trackId, pluginId, client]);

  const updateParameter = useCallback((id: string, value: number) => {
    setParameters(prev => ({ ...prev, [id]: value }));

    client.sendJsonMessage({
      type: 'plugin.parameter',
      data: {
        track_id: trackId,
        plugin_id: pluginId,
        parameter_id: id,
        parameter_value: value
      }
    });
  }, [trackId, pluginId, client]);

  const refreshParameters = useCallback(() => {
    client.sendJsonMessage({
      type: 'plugin.parameters.get',
      data: { trackId, pluginId }
    });
  }, [trackId, pluginId, client]);

  const toggleBypass = useCallback(() => {
    const newBypass = !bypass;
    setBypass(newBypass);

    client.sendJsonMessage({
      type: 'plugin.bypass',
      data: {
        track_id: trackId,
        plugin_id: pluginId,
        bypass: newBypass
      }
    });
  }, [bypass, trackId, pluginId, client]);

  const loadPreset = useCallback((presetData: any) => {
    Object.entries(presetData).forEach(([key, value]) => {
      updateParameter(key, value);
    });
  }, [updateParameter]);

  const controls: PluginControls = {
    parameters,
    updateParameter,
    refreshParameters,
    toggleBypass,
    loadPreset,
    isConnected
  };

  return (
    <div className="plugin-control">
      {children(controls)}
    </div>
  );
};
```

### Vanilla JavaScript Implementation

```javascript
class PluginController {
  constructor(trackId, pluginId, wsUrl) {
    this.trackId = trackId;
    this.pluginId = pluginId;
    this.wsUrl = wsUrl;
    this.parameters = {};
    this.bypass = false;
    this.isConnected = false;

    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.refreshParameters();
      this.onConnected?.();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.onDisconnected?.();
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onError?.(error);
    };
  }

  handleMessage(message) {
    switch (message.type) {
      case 'plugin.parameters.get':
        this.parameters = message.data.parameters;
        this.onParametersUpdated?.( this.parameters );
        break;

      case 'plugin.bypass':
        this.bypass = message.data.bypass;
        this.onBypassChanged?.( this.bypass );
        break;

      case 'plugin.parameter':
        this.parameters[message.data.parameter_id] = message.data.parameter_value;
        this.onParameterChanged?.(
          message.data.parameter_id,
          message.data.parameter_value
        );
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  // Public methods
  updateParameter(parameterId, value) {
    this.parameters[parameterId] = value;

    this.ws.send(JSON.stringify({
      type: 'plugin.parameter',
      timestamp: new Date().toISOString(),
      data: {
        track_id: this.trackId,
        plugin_id: this.pluginId,
        parameter_id,
        parameter_value: value
      }
    }));
  }

  batchUpdateParameter(changes) {
    this.ws.send(JSON.stringify({
      type: 'plugin.parameter.batch',
      timestamp: new Date().toISOString(),
      data: {
        changes,
        debounce_ms: 50,
        apply_immediately: false
      }
    }));
  }

  refreshParameters() {
    this.ws.send(JSON.stringify({
      type: 'plugin.parameters.get',
      timestamp: new Date().toISOString(),
      data: {
        track_id: this.trackId,
        plugin_id: this.pluginId
      }
    }));
  }

  toggleBypass() {
    this.bypass = !this.bypass;

    this.ws.send(JSON.stringify({
      type: 'plugin.bypass',
      timestamp: new Date().toISOString(),
      data: {
        track_id: this.trackId,
        plugin_id: this.pluginId,
        bypass: this.bypass
      }
    }));
  }

  loadPreset(presetData) {
    this.batchUpdateParameter(
      Object.entries(presetData).map(([key, value]) => ({
        track_id: this.trackId,
        plugin_id: this.pluginId,
        parameter_id: key,
        value
      }))
    );

    this.onPresetLoaded?.(presetData);
  }

  // Event callbacks
  onConnected(callback) { this.onConnected = callback; }
  onDisconnected(callback) { this.onDisconnected = callback; }
  onParameterChanged(callback) { this.onParameterChanged = callback; }
  onParametersUpdated(callback) { this.onParametersUpdated = callback; }
  onBypassChanged(callback) { this.onBypassChanged = callback; }
  onError(callback) { this.onError = callback; }
  onPresetLoaded(callback) { this.onPresetLoaded = callback; }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Usage example
const pluginController = new PluginController(
  'track_123',
  'plugin_456',
  'ws://localhost:8000/ws'
);

pluginController.onConnected(() => {
  console.log('Plugin controller connected');
});

pluginController.onParameterChanged((id, value) => {
  console.log(`Parameter ${id} changed to ${value}`);
});

pluginController.updateParameter('volume', 0.75);
```

## Best Practices

### Performance Optimization

1. **Parameter Batching**: Use the batch API for multiple parameter updates
2. **Debouncing**: Implement client-side debouncing for high-frequency changes
3. **Lazy Loading**: Only request parameters when needed
4. **Connection Pooling**: Reuse WebSocket connections

```typescript
// Good: Batch parameter updates
const batchParameterUpdates = (updates: ParameterUpdate[]) => {
  const changes = updates.map(update => ({
    track_id: trackId,
    plugin_id: pluginId,
    parameter_id: update.id,
    value: update.value
  }));

  ws.send({
    type: 'plugin.parameter.batch',
    data: { changes, debounce_ms: 50, apply_immediately: false }
  });
};

// Bad: Individual parameter updates
updates.forEach(update => {
  ws.send({
    type: 'plugin.parameter',
    data: update
  });
});
```

### Error Handling

```typescript
const handleWebSocketError = (error: Event) => {
  console.error('WebSocket error:', error);

  // Attempt reconnection
  setTimeout(() => {
    if (ws.readyState === WebSocket.CLOSED) {
      connect();
    }
  }, 1000);
};

ws.onerror = handleWebSocketError;
```

### Connection Management

```typescript
class ConnectionManager {
  private connections = new Map<string, WebSocket>();
  private reconnectIntervals = new Map<string, NodeJS.Timeout>();

  addConnection(id: string, ws: WebSocket) {
    // Remove existing connection if any
    this.removeConnection(id);

    this.connections.set(id, ws);
    this.setupConnectionHandlers(id, ws);
  }

  removeConnection(id: string) {
    const ws = this.connections.get(id);
    if (ws) {
      ws.close();
      this.connections.delete(id);
    }

    // Clear reconnect interval
    const interval = this.reconnectIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.reconnectIntervals.delete(id);
    }
  }

  setupConnectionHandlers(id: string, ws: WebSocket) {
    ws.onclose = () => {
      this.scheduleReconnection(id);
    };

    ws.onerror = (error) => {
      console.error(`Connection ${id} error:`, error);
      this.scheduleReconnection(id);
    };
  }

  scheduleReconnection(id: string) {
    const interval = this.reconnectIntervals.get(id) || 1000;

    const timeout = setTimeout(() => {
      this.reconnect(id);
    }, interval);

    this.reconnectIntervals.set(id, timeout);
  }

  reconnect(id: string) {
    this.removeConnection(id);
    // Implementation would reconnect...
  }
}
```

### DAID Provenance Tracking

The system automatically tracks all plugin operations for audit trails:

```typescript
// Operations tracked:
// - plugin.add (plugin creation)
// - plugin.remove (plugin deletion)
// - plugin.parameter (parameter changes)
// - plugin.bypass (bypass toggles)
// - plugin.preset (preset loading)

// DAID entries include:
// - User ID and session ID
// - Timestamp and operation type
// - Entity ID and parameters
// - Context information
```

## Performance Optimization

### Client-Side Optimization

1. **Parameter Debouncing**
```typescript
class ParameterDebouncer {
  private pendingUpdates = new Map<string, number>();
  private timeoutId: NodeJS.Timeout | null = null;

  update(parameterId: string, value: number, callback: () => void) {
    this.pendingUpdates.set(parameterId, value);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      callback();
      this.pendingUpdates.clear();
      this.timeoutId = null;
    }, 50);
  }
}
```

2. **Connection Pooling**
```typescript
class WebSocketPool {
  private connections: WebSocket[] = [];
  private currentIndex = 0;

  getConnection(): WebSocket {
    const ws = this.connections[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    return ws;
  }

  addConnection(url: string): WebSocket {
    const ws = new WebSocket(url);
    this.connections.push(ws);
    return ws;
  }
}
```

### Server-Side Optimization

1. **Efficient Parameter Batching**
```python
class ParameterBatcher:
    def __init__(self, debounce_ms: int = 50):
        self.debounce_ms = debounce_ms
        self.pending_changes = {}
        self.batch_timer = None

    def add_change(self, change: ParameterChange) -> str:
        key = change.key
        self.pending_changes[key] = change
        return self.schedule_batch()
```

2. **Memory Management**
```python
# Clear old connections
async def cleanup_old_connections():
    cutoff_time = datetime.utcnow() - timedelta(minutes=5)
    old_connections = [
        conn_id for conn_id, conn in connections.items()
        if conn.last_activity < cutoff_time
    ]

    for conn_id in old_connections:
        await remove_connection(conn_id)
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check server is running
   - Verify WebSocket URL
   - Check firewall settings
   - Enable browser console for errors

2. **Parameter Updates Not Working**
   - Verify message format
   - Check DawDreamerEngine integration
   - Confirm DAID service availability

3. **High Latency**
   - Check parameter batching
   - Verify debounce settings
   - Monitor network conditions
   - Check server performance

### Debug Logging

```typescript
// Enable detailed logging
const DEBUG = true;

const logMessage = (type: string, data: any) => {
  if (DEBUG) {
    console.log(`[${type}]`, {
      timestamp: new Date().toISOString(),
      data
    });
  });
};

// Log all outgoing messages
const originalSend = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
  logMessage('OUTGOING', JSON.parse(data));
  return originalSend.call(this, data);
};
```

### Error Monitoring

```typescript
class WebSocketMonitor {
  private errors: Array<{
    timestamp: Date;
    type: string;
    message: string;
    data: any;
  }> = [];

  logError(type: string, message: string, data?: any) {
    this.errors.push({
      timestamp: new Date(),
      type,
      message,
      data
    });

    // Alert on high error rates
    if (this.errors.length > 10) {
      console.warn('High error rate detected:', this.errors.length);
    }
  }

  getErrorRate(): number {
    return this.errors.length;
  }
}
```

## Migration Guide

### From Direct API Calls

**Before:**
```typescript
// Direct HTTP API calls
await fetch('/api/plugins/parameters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    track_id, plugin_id, parameter_id, value
  })
});
```

**After:**
```typescript
// WebSocket real-time updates
ws.send(JSON.stringify({
  type: 'plugin.parameter',
  timestamp: new Date().toISOString(),
  data: { track_id, plugin_id, parameter_id, value }
}));
```

### From Polling

**Before:**
```typescript
setInterval(() => {
  fetch('/api/plugins/parameters')
    .then(response => response.json())
    .then(data => updateParameters(data.parameters));
}, 1000);
```

**After:**
```typescript
// Real-time updates via WebSocket
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'plugin.parameter') {
    updateParameters({
      [message.data.parameter_id]: message.data.parameter_value
    });
  }
};
```

### Legacy Compatibility

For existing code that expects HTTP API responses, create a compatibility layer:

```typescript
class WebSocketCompatibilityLayer {
  private ws: WebSocketClient;
  private cache: Map<string, any> = new Map();

  constructor(wsUrl: string) {
    this.ws = new WebSocketClient(wsUrl);
    this.setupCacheInvalidation();
  }

  async getParameters(trackId: string, pluginId: string): Promise<any> {
    const cacheKey = `${trackId}:${pluginId}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return Promise.resolve(this.cache.get(cacheKey));
    }

    // Subscribe to updates
    return new Promise((resolve) => {
      const handler = (data: any) => {
        if (data.track_id === trackId && data.plugin_id === plugin_id) {
          this.cache.set(cacheKey, data.parameters);
          resolve(data.parameters);
        }
      };

      this.ws.onMessage(`plugin.parameters.get.${trackId}:${pluginId}`, handler);
      this.ws.sendJsonMessage({
        type: 'plugin.parameters.get',
        data: { track_id, plugin_id }
      });
    });
  }
}
```

## Support

For issues and questions:

1. **Documentation**: Check this guide and API reference
2. **Examples**: See the code examples section
3. **Debugging**: Enable logging and monitor WebSocket messages
4. **Performance**: Follow the optimization guidelines

**Contact**: Development team for technical support and assistance.