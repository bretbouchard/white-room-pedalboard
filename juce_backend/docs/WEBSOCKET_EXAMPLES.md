# WebSocket Plugin Integration Examples

This document provides practical examples and code samples for integrating with the WebSocket plugin system across different frontend frameworks and use cases.

## Table of Contents
- [React Integration](#react-integration)
- [Vue.js Integration](#vuejs-integration)
- [Vanilla JavaScript Integration](#vanilla-javascript-integration)
- [Real-time Parameter Control](#real-time-parameter-control)
- [Plugin Preset Management](#plugin-preset-management)
- [Error Handling and Reconnection](#error-handling-and-reconnection)
- [Performance Optimization](#performance-optimization)

## React Integration

### Basic WebSocket Hook

```typescript
// hooks/useWebSocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  user_id?: string;
  session_id?: string;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export const useWebSocket = ({
  url,
  onMessage,
  onError,
  reconnectAttempts = 5,
  reconnectDelay = 1000
}: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          onMessage?.(message);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        setError('WebSocket connection error');
        onError?.(event);
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectCountRef.current < reconnectAttempts) {
          setTimeout(() => {
            reconnectCountRef.current++;
            connect();
          }, reconnectDelay * Math.pow(2, reconnectCountRef.current));
        }
      };
    } catch (err) {
      setError(`Failed to connect: ${err}`);
    }
  }, [url, onMessage, onError, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'id'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      wsRef.current.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    sendMessage,
    connect,
    disconnect
  };
};
```

### Plugin Control Component

```typescript
// components/PluginController.tsx
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface Plugin {
  id: string;
  name: string;
  trackId: string;
  parameters: Record<string, number>;
  bypassed: boolean;
}

interface PluginControllerProps {
  trackId: string;
  sessionId: string;
  userId: string;
}

export const PluginController: React.FC<PluginControllerProps> = ({
  trackId,
  sessionId,
  userId
}) => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);

  const { isConnected, sendMessage, error } = useWebSocket({
    url: 'ws://localhost:8000/ws',
    onMessage: (message) => {
      switch (message.type) {
        case 'PLUGIN_ADD':
          handlePluginAdded(message.data);
          break;
        case 'PLUGIN_REMOVE':
          handlePluginRemoved(message.data);
          break;
        case 'PLUGIN_PARAMETER':
          handleParameterUpdated(message.data);
          break;
        case 'PLUGIN_BYPASS':
          handleBypassToggled(message.data);
          break;
        case 'PLUGIN_PARAMETERS_GET':
          handleParametersReceived(message.data);
          break;
      }
    }
  });

  const handlePluginAdded = (data: any) => {
    const newPlugin: Plugin = {
      id: data.plugin_id,
      name: data.name,
      trackId: data.track_id,
      parameters: data.parameters || {},
      bypassed: false
    };
    setPlugins(prev => [...prev, newPlugin]);
  };

  const handlePluginRemoved = (data: any) => {
    setPlugins(prev => prev.filter(p => p.id !== data.plugin_id));
    if (selectedPlugin === data.plugin_id) {
      setSelectedPlugin(null);
    }
  };

  const handleParameterUpdated = (data: any) => {
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

  const handleBypassToggled = (data: any) => {
    setPlugins(prev => prev.map(plugin =>
      plugin.id === data.plugin_id
        ? { ...plugin, bypassed: data.bypass }
        : plugin
    ));
  };

  const handleParametersReceived = (data: any) => {
    setPlugins(prev => prev.map(plugin =>
      plugin.id === data.plugin_id
        ? { ...plugin, parameters: data.parameters }
        : plugin
    ));
  };

  const addPlugin = (name: string, pluginPath?: string) => {
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
  };

  const removePlugin = (pluginId: string) => {
    sendMessage({
      type: 'PLUGIN_REMOVE',
      data: {
        track_id: trackId,
        plugin_id: pluginId
      },
      user_id: userId,
      session_id: sessionId
    });
  };

  const updateParameter = (pluginId: string, parameterId: string, value: number) => {
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
  };

  const toggleBypass = (pluginId: string, bypass: boolean) => {
    sendMessage({
      type: 'PLUGIN_BYPASS',
      data: {
        track_id: trackId,
        plugin_id: pluginId,
        bypass
      },
      user_id: userId,
      session_id: sessionId
    });
  };

  const loadPreset = (pluginId: string, presetData: Record<string, number>) => {
    sendMessage({
      type: 'PLUGIN_PRESET',
      data: {
        track_id: trackId,
        plugin_id: pluginId,
        preset_data: presetData
      },
      user_id: userId,
      session_id: sessionId
    });
  };

  const refreshPluginParameters = (pluginId: string) => {
    sendMessage({
      type: 'PLUGIN_PARAMETERS_GET',
      data: {
        track_id: trackId,
        plugin_id: pluginId
      },
      user_id: userId,
      session_id: sessionId
    });
  };

  const selectedPluginData = plugins.find(p => p.id === selectedPlugin);

  return (
    <div className="plugin-controller">
      <div className="connection-status">
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        {error && <span className="error">Error: {error}</span>}
      </div>

      <div className="plugin-list">
        <h3>Plugins</h3>
        <button onClick={() => addPlugin('Reverb', '/path/to/reverb.vst3')}>
          Add Reverb
        </button>
        <button onClick={() => addPlugin('Compressor', '/path/to/compressor.vst3')}>
          Add Compressor
        </button>

        {plugins.map(plugin => (
          <div key={plugin.id} className={`plugin-item ${plugin.bypassed ? 'bypassed' : ''}`}>
            <div className="plugin-header">
              <span>{plugin.name}</span>
              <div className="plugin-controls">
                <button
                  onClick={() => toggleBypass(plugin.id, !plugin.bypassed)}
                  className={plugin.bypassed ? 'bypassed' : ''}
                >
                  {plugin.bypassed ? 'Enable' : 'Bypass'}
                </button>
                <button onClick={() => setSelectedPlugin(plugin.id)}>
                  Configure
                </button>
                <button onClick={() => removePlugin(plugin.id)}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPluginData && (
        <div className="plugin-parameters">
          <h3>Parameters: {selectedPluginData.name}</h3>

          <div className="parameter-controls">
            {Object.entries(selectedPluginData.parameters).map(([paramId, value]) => (
              <div key={paramId} className="parameter">
                <label>{paramId}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={value}
                  onChange={(e) => updateParameter(selectedPlugin!, paramId, parseFloat(e.target.value))}
                />
                <span>{value.toFixed(3)}</span>
              </div>
            ))}
          </div>

          <div className="preset-controls">
            <button onClick={() => loadPreset(selectedPlugin!, {
              wet_dry: 0.5,
              room_size: 0.7,
              damping: 0.3
            })}>
              Load Default Preset
            </button>
            <button onClick={() => refreshPluginParameters(selectedPlugin!)}>
              Refresh Parameters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

## Vue.js Integration

### WebSocket Composable

```typescript
// composables/useWebSocket.ts
import { ref, onUnmounted } from 'vue';

interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  user_id?: string;
  session_id?: string;
}

export function useWebSocket(url: string) {
  const isConnected = ref(false);
  const error = ref<string | null>(null);
  const ws = ref<WebSocket | null>(null);

  const messageHandlers = ref<Map<string, (data: any) => void>>(new Map());

  const connect = () => {
    try {
      ws.value = new WebSocket(url);

      ws.value.onopen = () => {
        isConnected.value = true;
        error.value = null;
      };

      ws.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          const handler = messageHandlers.value.get(message.type);
          if (handler) {
            handler(message.data);
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.value.onerror = (event) => {
        error.value = 'WebSocket connection error';
        console.error('WebSocket error:', event);
      };

      ws.value.onclose = () => {
        isConnected.value = false;
        ws.value = null;
      };
    } catch (err) {
      error.value = `Failed to connect: ${err}`;
    }
  };

  const disconnect = () => {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
  };

  const sendMessage = (message: Omit<WebSocketMessage, 'id'>) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      const fullMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      ws.value.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket not connected');
    }
  };

  const onMessage = (type: string, handler: (data: any) => void) => {
    messageHandlers.value.set(type, handler);
  };

  const offMessage = (type: string) => {
    messageHandlers.value.delete(type);
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    onMessage,
    offMessage
  };
}
```

### Plugin Management Component

```vue
<!-- components/PluginManager.vue -->
<template>
  <div class="plugin-manager">
    <div class="status-bar">
      <span :class="['status', { connected: isConnected, disconnected: !isConnected }]">
        {{ isConnected ? '🟢 Connected' : '🔴 Disconnected' }}
      </span>
      <span v-if="error" class="error">{{ error }}</span>
    </div>

    <div class="plugin-controls">
      <h3>Plugin Controls</h3>
      <div class="add-plugin">
        <select v-model="selectedPluginType">
          <option value="">Select Plugin Type</option>
          <option value="reverb">Reverb</option>
          <option value="compressor">Compressor</option>
          <option value="eq">Equalizer</option>
        </select>
        <button @click="addPlugin" :disabled="!selectedPluginType">
          Add Plugin
        </button>
      </div>

      <div class="plugin-list">
        <div v-for="plugin in plugins" :key="plugin.id"
             :class="['plugin-item', { bypassed: plugin.bypassed }]">
          <div class="plugin-header">
            <span>{{ plugin.name }}</span>
            <div class="plugin-actions">
              <button @click="toggleBypass(plugin.id, !plugin.bypassed)"
                      :class="{ active: !plugin.bypassed }">
                {{ plugin.bypassed ? 'Enable' : 'Bypass' }}
              </button>
              <button @click="selectPlugin(plugin.id)"
                      :class="{ active: selectedPluginId === plugin.id }">
                Configure
              </button>
              <button @click="removePlugin(plugin.id)" class="danger">
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedPlugin" class="plugin-details">
      <h3>Configure: {{ selectedPlugin.name }}</h3>

      <div class="parameters">
        <div v-for="(value, paramId) in selectedPlugin.parameters"
             :key="paramId" class="parameter">
          <label>{{ paramId }}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="value"
            @input="updateParameter(selectedPlugin.id, paramId, $event)"
          />
          <span class="value">{{ value.toFixed(3) }}</span>
        </div>
      </div>

      <div class="presets">
        <h4>Presets</h4>
        <button @click="loadPreset('default')">Load Default</button>
        <button @click="loadPreset('bright')">Load Bright</button>
        <button @click="loadPreset('warm')">Load Warm</button>
        <button @click="refreshParameters">Refresh</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useWebSocket } from '../composables/useWebSocket';

interface Plugin {
  id: string;
  name: string;
  trackId: string;
  parameters: Record<string, number>;
  bypassed: boolean;
}

const props = defineProps<{
  trackId: string;
  sessionId: string;
  userId: string;
}>();

const plugins = ref<Plugin[]>([]);
const selectedPluginId = ref<string | null>(null);
const selectedPluginType = ref('');

const { isConnected, error, sendMessage, onMessage, offMessage, connect, disconnect } =
  useWebSocket('ws://localhost:8000/ws');

const selectedPlugin = computed(() =>
  plugins.value.find(p => p.id === selectedPluginId.value)
);

const pluginPresets = {
  default: {
    wet_dry: 0.5,
    room_size: 0.7,
    damping: 0.3
  },
  bright: {
    wet_dry: 0.4,
    room_size: 0.8,
    damping: 0.2,
    high_freq: 12000.0
  },
  warm: {
    wet_dry: 0.6,
    room_size: 0.6,
    damping: 0.4,
    low_freq: 150.0
  }
};

const addPlugin = () => {
  if (!selectedPluginType.value) return;

  const pluginName = selectedPluginType.value.charAt(0).toUpperCase() +
                    selectedPluginType.value.slice(1);

  sendMessage({
    type: 'PLUGIN_ADD',
    data: {
      track_id: props.trackId,
      name: pluginName,
      plugin_path: `/path/to/${selectedPluginType.value}.vst3`,
      plugin_id: ''
    },
    user_id: props.userId,
    session_id: props.sessionId
  });

  selectedPluginType.value = '';
};

const removePlugin = (pluginId: string) => {
  sendMessage({
    type: 'PLUGIN_REMOVE',
    data: {
      track_id: props.trackId,
      plugin_id: pluginId
    },
    user_id: props.userId,
    session_id: props.sessionId
  });
};

const selectPlugin = (pluginId: string) => {
  selectedPluginId.value = pluginId;
};

const toggleBypass = (pluginId: string, bypass: boolean) => {
  sendMessage({
    type: 'PLUGIN_BYPASS',
    data: {
      track_id: props.trackId,
      plugin_id: pluginId,
      bypass
    },
    user_id: props.userId,
    session_id: props.sessionId
  });
};

const updateParameter = (pluginId: string, parameterId: string, event: Event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);

  sendMessage({
    type: 'PLUGIN_PARAMETER',
    data: {
      track_id: props.trackId,
      plugin_id: pluginId,
      parameter_id: parameterId,
      parameter_value: value
    },
    user_id: props.userId,
    session_id: props.sessionId
  });

  // Optimistic update
  const plugin = plugins.value.find(p => p.id === pluginId);
  if (plugin) {
    plugin.parameters[parameterId] = value;
  }
};

const loadPreset = (presetName: keyof typeof pluginPresets) => {
  if (!selectedPluginId.value) return;

  sendMessage({
    type: 'PLUGIN_PRESET',
    data: {
      track_id: props.trackId,
      plugin_id: selectedPluginId.value,
      preset_data: pluginPresets[presetName]
    },
    user_id: props.userId,
    session_id: props.sessionId
  });
};

const refreshParameters = () => {
  if (!selectedPluginId.value) return;

  sendMessage({
    type: 'PLUGIN_PARAMETERS_GET',
    data: {
      track_id: props.trackId,
      plugin_id: selectedPluginId.value
    },
    user_id: props.userId,
    session_id: props.sessionId
  });
};

// Message handlers
const handlePluginAdded = (data: any) => {
  const newPlugin: Plugin = {
    id: data.plugin_id,
    name: data.name,
    trackId: data.track_id,
    parameters: data.parameters || {},
    bypassed: false
  };
  plugins.value.push(newPlugin);
  selectedPluginId.value = newPlugin.id;
};

const handlePluginRemoved = (data: any) => {
  const index = plugins.value.findIndex(p => p.id === data.plugin_id);
  if (index > -1) {
    plugins.value.splice(index, 1);
    if (selectedPluginId.value === data.plugin_id) {
      selectedPluginId.value = null;
    }
  }
};

const handleParameterUpdated = (data: any) => {
  const plugin = plugins.value.find(p => p.id === data.plugin_id);
  if (plugin) {
    plugin.parameters[data.parameter_id] = data.parameter_value;
  }
};

const handleBypassToggled = (data: any) => {
  const plugin = plugins.value.find(p => p.id === data.plugin_id);
  if (plugin) {
    plugin.bypassed = data.bypass;
  }
};

const handleParametersReceived = (data: any) => {
  const plugin = plugins.value.find(p => p.id === data.plugin_id);
  if (plugin) {
    plugin.parameters = data.parameters;
  }
};

onMounted(() => {
  connect();

  onMessage('PLUGIN_ADD', handlePluginAdded);
  onMessage('PLUGIN_REMOVE', handlePluginRemoved);
  onMessage('PLUGIN_PARAMETER', handleParameterUpdated);
  onMessage('PLUGIN_BYPASS', handleBypassToggled);
  onMessage('PLUGIN_PARAMETERS_GET', handleParametersReceived);
});

onUnmounted(() => {
  offMessage('PLUGIN_ADD');
  offMessage('PLUGIN_REMOVE');
  offMessage('PLUGIN_PARAMETER');
  offMessage('PLUGIN_BYPASS');
  offMessage('PLUGIN_PARAMETERS_GET');

  disconnect();
});
</script>

<style scoped>
.plugin-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.status-bar {
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.status.connected {
  color: green;
}

.status.disconnected {
  color: red;
}

.error {
  color: red;
  margin-left: 10px;
}

.plugin-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  margin: 10px 0;
}

.plugin-item.bypassed {
  opacity: 0.6;
  background: #f9f9f9;
}

.plugin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plugin-actions button {
  margin-left: 5px;
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: white;
  cursor: pointer;
}

.plugin-actions button.active {
  background: #007bff;
  color: white;
}

.plugin-actions button.danger {
  background: #dc3545;
  color: white;
}

.parameter {
  display: flex;
  align-items: center;
  margin: 10px 0;
}

.parameter label {
  width: 150px;
  margin-right: 10px;
}

.parameter input {
  flex: 1;
  margin-right: 10px;
}

.parameter .value {
  width: 60px;
  text-align: right;
  font-family: monospace;
}

.presets button {
  margin-right: 10px;
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.presets button:hover {
  background: #f8f9fa;
}
</style>
```

## Vanilla JavaScript Integration

### WebSocket Client Class

```javascript
// class/AudioPluginWebSocket.js
class AudioPluginWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      ...options
    };

    this.ws = null;
    this.isConnected = false;
    this.reconnectCount = 0;
    this.messageHandlers = new Map();
    this.pendingMessages = [];
    this.heartbeatTimer = null;

    this.eventListeners = {
      connect: [],
      disconnect: [],
      error: [],
      message: []
    };
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      this.handleError(error);
    }
  }

  setupEventListeners() {
    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectCount = 0;
      this.startHeartbeat();
      this.flushPendingMessages();
      this.emit('connect');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
        this.emit('message', message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onerror = (event) => {
      this.handleError(event);
      this.emit('error', event);
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.stopHeartbeat();
      this.emit('disconnect');
      this.attemptReconnect();
    };
  }

  handleMessage(message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data);
    }
  }

  send(message) {
    const fullMessage = {
      ...message,
      id: this.generateMessageId()
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      this.pendingMessages.push(fullMessage);
    }
  }

  flushPendingMessages() {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      this.ws.send(JSON.stringify(message));
    }
  }

  on(type, handler) {
    if (this.eventListeners[type]) {
      this.eventListeners[type].push(handler);
    }
  }

  off(type, handler) {
    if (this.eventListeners[type]) {
      const index = this.eventListeners[type].indexOf(handler);
      if (index > -1) {
        this.eventListeners[type].splice(index, 1);
      }
    }
  }

  emit(type, data) {
    if (this.eventListeners[type]) {
      this.eventListeners[type].forEach(handler => handler(data));
    }
  }

  addMessageHandler(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  removeMessageHandler(type) {
    this.messageHandlers.delete(type);
  }

  // Plugin-specific methods
  addPlugin(trackId, name, pluginPath, userId, sessionId) {
    this.send({
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
  }

  removePlugin(trackId, pluginId, userId, sessionId) {
    this.send({
      type: 'PLUGIN_REMOVE',
      data: {
        track_id: trackId,
        plugin_id: pluginId
      },
      user_id: userId,
      session_id: sessionId
    });
  }

  updateParameter(trackId, pluginId, parameterId, value, userId, sessionId) {
    this.send({
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
  }

  toggleBypass(trackId, pluginId, bypass, userId, sessionId) {
    this.send({
      type: 'PLUGIN_BYPASS',
      data: {
        track_id: trackId,
        plugin_id: pluginId,
        bypass
      },
      user_id: userId,
      session_id: sessionId
    });
  }

  loadPreset(trackId, pluginId, presetData, userId, sessionId) {
    this.send({
      type: 'PLUGIN_PRESET',
      data: {
        track_id: trackId,
        plugin_id: pluginId,
        preset_data: presetData
      },
      user_id: userId,
      session_id: sessionId
    });
  }

  getParameters(trackId, pluginId, userId, sessionId) {
    this.send({
      type: 'PLUGIN_PARAMETERS_GET',
      data: {
        track_id: trackId,
        plugin_id: pluginId
      },
      user_id: userId,
      session_id: sessionId
    });
  }

  // Utility methods
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'PING' });
      }
    }, this.options.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectCount < this.options.reconnectAttempts) {
      const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectCount);
      setTimeout(() => {
        this.reconnectCount++;
        this.connect();
      }, delay);
    }
  }

  handleError(error) {
    console.error('WebSocket error:', error);
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
```

### Simple Plugin Controller

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Plugin Controller</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }

        .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .status {
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-weight: bold;
        }

        .status.connected {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .status.disconnected {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .plugin-item {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
            background: #fafafa;
        }

        .plugin-item.bypassed {
            opacity: 0.6;
            background: #e9ecef;
        }

        .plugin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .plugin-name {
            font-weight: bold;
            font-size: 16px;
        }

        .plugin-controls {
            display: flex;
            gap: 8px;
        }

        .btn {
            padding: 6px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }

        .btn:hover {
            background: #f8f9fa;
        }

        .btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }

        .btn.danger {
            background: #dc3545;
            color: white;
            border-color: #dc3545;
        }

        .btn.danger:hover {
            background: #c82333;
        }

        .parameters {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
        }

        .parameter {
            display: flex;
            align-items: center;
            margin: 10px 0;
            gap: 10px;
        }

        .parameter label {
            width: 120px;
            font-size: 14px;
        }

        .parameter input[type="range"] {
            flex: 1;
            height: 6px;
            border-radius: 3px;
            background: #ddd;
            outline: none;
        }

        .parameter input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #007bff;
            cursor: pointer;
        }

        .parameter-value {
            width: 50px;
            text-align: right;
            font-family: monospace;
            font-size: 12px;
        }

        .add-plugin {
            margin-bottom: 20px;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 4px;
            border: 1px solid #bbdefb;
        }

        .add-plugin select {
            padding: 8px;
            margin-right: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .add-plugin .btn {
            padding: 8px 16px;
        }

        .error {
            color: #dc3545;
            margin-top: 5px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Audio Plugin Controller</h1>

        <div id="status" class="status disconnected">
            🔴 Disconnected
        </div>

        <div id="error-message" class="error"></div>

        <div class="add-plugin">
            <select id="pluginType">
                <option value="">Select Plugin Type</option>
                <option value="reverb">Reverb</option>
                <option value="compressor">Compressor</option>
                <option value="eq">Equalizer</option>
                <option value="delay">Delay</option>
            </select>
            <button class="btn" onclick="addPlugin()">Add Plugin</button>
        </div>

        <div id="pluginList"></div>
    </div>

    <script src="AudioPluginWebSocket.js"></script>
    <script>
        // Configuration
        const CONFIG = {
            trackId: 'track_001',
            sessionId: 'session_123',
            userId: 'user_456',
            wsUrl: 'ws://localhost:8000/ws'
        };

        // State
        let plugins = [];
        let ws = null;

        // Plugin presets
        const PRESETS = {
            reverb: {
                default: { wet_dry: 0.5, room_size: 0.7, damping: 0.3 },
                hall: { wet_dry: 0.6, room_size: 0.9, damping: 0.2 },
                room: { wet_dry: 0.4, room_size: 0.5, damping: 0.4 }
            },
            compressor: {
                default: { threshold: -20, ratio: 4, attack: 0.003, release: 0.1 },
                gentle: { threshold: -15, ratio: 2, attack: 0.01, release: 0.2 },
                aggressive: { threshold: -25, ratio: 8, attack: 0.001, release: 0.05 }
            },
            eq: {
                default: { low_freq: 200, low_gain: 0, mid_freq: 1000, mid_gain: 0, high_freq: 8000, high_gain: 0 },
                smile: { low_freq: 200, low_gain: 3, mid_freq: 1000, mid_gain: -2, high_freq: 8000, high_gain: 3 },
                warm: { low_freq: 200, low_gain: 2, mid_freq: 1000, mid_gain: 1, high_freq: 8000, high_gain: -1 }
            }
        };

        // Initialize WebSocket connection
        function initWebSocket() {
            ws = new AudioPluginWebSocket(CONFIG.wsUrl);

            // Setup event listeners
            ws.on('connect', () => {
                updateStatus(true);
            });

            ws.on('disconnect', () => {
                updateStatus(false);
            });

            ws.on('error', (error) => {
                showError('WebSocket error: ' + error);
            });

            // Setup message handlers
            ws.addMessageHandler('PLUGIN_ADD', handlePluginAdded);
            ws.addMessageHandler('PLUGIN_REMOVE', handlePluginRemoved);
            ws.addMessageHandler('PLUGIN_PARAMETER', handleParameterUpdated);
            ws.addMessageHandler('PLUGIN_BYPASS', handleBypassToggled);
            ws.addMessageHandler('PLUGIN_PRESET', handlePresetLoaded);
            ws.addMessageHandler('PLUGIN_PARAMETERS_GET', handleParametersReceived);
            ws.addMessageHandler('ERROR', handleError);

            // Connect
            ws.connect();
        }

        // UI Update functions
        function updateStatus(connected) {
            const statusEl = document.getElementById('status');
            if (connected) {
                statusEl.className = 'status connected';
                statusEl.innerHTML = '🟢 Connected';
                hideError();
            } else {
                statusEl.className = 'status disconnected';
                statusEl.innerHTML = '🔴 Disconnected';
            }
        }

        function showError(message) {
            const errorEl = document.getElementById('error-message');
            errorEl.textContent = message;
        }

        function hideError() {
            const errorEl = document.getElementById('error-message');
            errorEl.textContent = '';
        }

        function renderPlugins() {
            const container = document.getElementById('pluginList');
            container.innerHTML = '';

            plugins.forEach(plugin => {
                const pluginEl = createPluginElement(plugin);
                container.appendChild(pluginEl);
            });
        }

        function createPluginElement(plugin) {
            const div = document.createElement('div');
            div.className = `plugin-item ${plugin.bypassed ? 'bypassed' : ''}`;
            div.dataset.pluginId = plugin.id;

            div.innerHTML = `
                <div class="plugin-header">
                    <span class="plugin-name">${plugin.name}</span>
                    <div class="plugin-controls">
                        <button class="btn ${plugin.bypassed ? '' : 'active'}"
                                onclick="toggleBypass('${plugin.id}', ${!plugin.bypassed})">
                            ${plugin.bypassed ? 'Enable' : 'Bypass'}
                        </button>
                        <button class="btn" onclick="refreshParameters('${plugin.id}')">
                            Refresh
                        </button>
                        <button class="btn danger" onclick="removePlugin('${plugin.id}')">
                            Remove
                        </button>
                    </div>
                </div>
                <div class="parameters">
                    ${renderParameters(plugin)}
                    <div class="preset-controls">
                        ${renderPresetControls(plugin)}
                    </div>
                </div>
            `;

            return div;
        }

        function renderParameters(plugin) {
            if (!plugin.parameters || Object.keys(plugin.parameters).length === 0) {
                return '<p>No parameters available</p>';
            }

            return Object.entries(plugin.parameters).map(([paramId, value]) => `
                <div class="parameter">
                    <label>${paramId}</label>
                    <input type="range"
                           min="0"
                           max="1"
                           step="0.01"
                           value="${value}"
                           oninput="updateParameter('${plugin.id}', '${paramId}', this.value)">
                    <span class="parameter-value">${parseFloat(value).toFixed(3)}</span>
                </div>
            `).join('');
        }

        function renderPresetControls(plugin) {
            const pluginType = plugin.name.toLowerCase();
            const presets = PRESETS[pluginType];

            if (!presets) {
                return '<p>No presets available</p>';
            }

            return Object.keys(presets).map(presetName => `
                <button class="btn" onclick="loadPreset('${plugin.id}', '${presetName}')">
                    Load ${presetName.charAt(0).toUpperCase() + presetName.slice(1)}
                </button>
            `).join('');
        }

        // Plugin control functions
        function addPlugin() {
            const select = document.getElementById('pluginType');
            const pluginType = select.value;

            if (!pluginType) {
                showError('Please select a plugin type');
                return;
            }

            const name = pluginType.charAt(0).toUpperCase() + pluginType.slice(1);
            const pluginPath = `/path/to/${pluginType}.vst3`;

            ws.addPlugin(CONFIG.trackId, name, pluginPath, CONFIG.userId, CONFIG.sessionId);
            select.value = '';
            hideError();
        }

        function removePlugin(pluginId) {
            ws.removePlugin(CONFIG.trackId, pluginId, CONFIG.userId, CONFIG.sessionId);
        }

        function toggleBypass(pluginId, bypass) {
            ws.toggleBypass(CONFIG.trackId, pluginId, bypass, CONFIG.userId, CONFIG.sessionId);
        }

        function updateParameter(pluginId, parameterId, value) {
            const numValue = parseFloat(value);

            // Optimistic UI update
            const plugin = plugins.find(p => p.id === pluginId);
            if (plugin && plugin.parameters) {
                plugin.parameters[parameterId] = numValue;

                // Update display
                const pluginEl = document.querySelector(`[data-plugin-id="${pluginId}"]`);
                if (pluginEl) {
                    const parameterEls = pluginEl.querySelectorAll('.parameter');
                    parameterEls.forEach(el => {
                        const label = el.querySelector('label');
                        if (label && label.textContent === parameterId) {
                            el.querySelector('.parameter-value').textContent = numValue.toFixed(3);
                        }
                    });
                }
            }

            ws.updateParameter(CONFIG.trackId, pluginId, parameterId, numValue, CONFIG.userId, CONFIG.sessionId);
        }

        function loadPreset(pluginId, presetName) {
            const plugin = plugins.find(p => p.id === pluginId);
            if (!plugin) return;

            const pluginType = plugin.name.toLowerCase();
            const presets = PRESETS[pluginType];

            if (presets && presets[presetName]) {
                ws.loadPreset(CONFIG.trackId, pluginId, presets[presetName], CONFIG.userId, CONFIG.sessionId);
            }
        }

        function refreshParameters(pluginId) {
            ws.getParameters(CONFIG.trackId, pluginId, CONFIG.userId, CONFIG.sessionId);
        }

        // Message handlers
        function handlePluginAdded(data) {
            const plugin = {
                id: data.plugin_id,
                name: data.name,
                trackId: data.track_id,
                parameters: data.parameters || {},
                bypassed: false
            };

            plugins.push(plugin);
            renderPlugins();
        }

        function handlePluginRemoved(data) {
            plugins = plugins.filter(p => p.id !== data.plugin_id);
            renderPlugins();
        }

        function handleParameterUpdated(data) {
            const plugin = plugins.find(p => p.id === data.plugin_id);
            if (plugin && plugin.parameters) {
                plugin.parameters[data.parameter_id] = data.parameter_value;

                // Update UI
                const pluginEl = document.querySelector(`[data-plugin-id="${data.plugin_id}"]`);
                if (pluginEl) {
                    const parameterEls = pluginEl.querySelectorAll('.parameter');
                    parameterEls.forEach(el => {
                        const label = el.querySelector('label');
                        if (label && label.textContent === data.parameter_id) {
                            el.querySelector('.parameter-value').textContent = data.parameter_value.toFixed(3);
                            el.querySelector('input').value = data.parameter_value;
                        }
                    });
                }
            }
        }

        function handleBypassToggled(data) {
            const plugin = plugins.find(p => p.id === data.plugin_id);
            if (plugin) {
                plugin.bypassed = data.bypass;
                renderPlugins();
            }
        }

        function handlePresetLoaded(data) {
            const plugin = plugins.find(p => p.id === data.plugin_id);
            if (plugin && data.preset_data) {
                plugin.parameters = data.preset_data;
                renderPlugins();
            }
        }

        function handleParametersReceived(data) {
            const plugin = plugins.find(p => p.id === data.plugin_id);
            if (plugin && data.parameters) {
                plugin.parameters = data.parameters;
                renderPlugins();
            }
        }

        function handleError(data) {
            showError(`Error: ${data.error}`);
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            initWebSocket();
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (ws) {
                ws.disconnect();
            }
        });
    </script>
</body>
</html>
```

## Real-time Parameter Control

### Debounced Parameter Updates

```typescript
// utils/parameterDebouncer.ts
class ParameterDebouncer {
  private delay: number;
  private pendingUpdates: Map<string, { value: number; timer: NodeJS.Timeout }> = new Map();
  private onUpdate: (pluginId: string, parameterId: string, value: number) => void;

  constructor(delay: number, onUpdate: (pluginId: string, parameterId: string, value: number) => void) {
    this.delay = delay;
    this.onUpdate = onUpdate;
  }

  updateParameter(pluginId: string, parameterId: string, value: number) {
    const key = `${pluginId}:${parameterId}`;

    // Clear existing timer
    if (this.pendingUpdates.has(key)) {
      clearTimeout(this.pendingUpdates.get(key)!.timer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.onUpdate(pluginId, parameterId, value);
      this.pendingUpdates.delete(key);
    }, this.delay);

    this.pendingUpdates.set(key, { value, timer });
  }

  flush() {
    this.pendingUpdates.forEach(({ value }, key) => {
      const [pluginId, parameterId] = key.split(':');
      this.onUpdate(pluginId, parameterId, value);
    });
    this.pendingUpdates.clear();
  }

  destroy() {
    this.flush();
  }
}

// Usage in React component
const debouncer = new ParameterDebouncer(50, (pluginId, parameterId, value) => {
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
});

// In parameter input handler
const handleParameterChange = (pluginId: string, parameterId: string, value: number) => {
  debouncer.updateParameter(pluginId, parameterId, value);
};
```

### Parameter Batching

```typescript
// utils/parameterBatcher.ts
class ParameterBatcher {
  private batchSize: number;
  private maxDelay: number;
  private pendingUpdates: Array<{
    pluginId: string;
    parameterId: string;
    value: number;
    timestamp: number;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private onBatch: (updates: Array<any>) => void;

  constructor(batchSize: number, maxDelay: number, onBatch: (updates: Array<any>) => void) {
    this.batchSize = batchSize;
    this.maxDelay = maxDelay;
    this.onBatch = onBatch;
  }

  addUpdate(pluginId: string, parameterId: string, value: number) {
    this.pendingUpdates.push({
      pluginId,
      parameterId,
      value,
      timestamp: Date.now()
    });

    if (this.pendingUpdates.length >= this.batchSize) {
      this.flush();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flush();
      }, this.maxDelay);
    }
  }

  flush() {
    if (this.pendingUpdates.length === 0) return;

    const updates = this.pendingUpdates.splice(0);
    this.onBatch(updates);

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  destroy() {
    this.flush();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
  }
}

// Usage
const batcher = new ParameterBatcher(10, 100, (updates) => {
  // Group updates by plugin
  const updatesByPlugin = updates.reduce((acc, update) => {
    if (!acc[update.pluginId]) {
      acc[update.pluginId] = [];
    }
    acc[update.pluginId].push({
      parameter_id: update.parameterId,
      parameter_value: update.value
    });
    return acc;
  }, {} as Record<string, Array<any>>);

  // Send batched updates for each plugin
  Object.entries(updatesByPlugin).forEach(([pluginId, params]) => {
    sendMessage({
      type: 'PLUGIN_PARAMETER_BATCH',
      data: {
        track_id: trackId,
        plugin_id: pluginId,
        parameters: params
      },
      user_id: userId,
      session_id: sessionId
    });
  });
});
```

## Error Handling and Reconnection

### Robust Error Handling

```typescript
// utils/webSocketErrorHandler.ts
interface WebSocketError {
  type: 'connection' | 'message' | 'server';
  message: string;
  code?: string;
  details?: any;
  retryable: boolean;
}

class WebSocketErrorHandler {
  private maxRetries: number;
  private retryDelay: number;
  private retryCount: number = 0;
  private onRetry?: (attempt: number, error: WebSocketError) => void;
  private onFatalError?: (error: WebSocketError) => void;

  constructor(
    maxRetries: number = 5,
    retryDelay: number = 1000,
    onRetry?: (attempt: number, error: WebSocketError) => void,
    onFatalError?: (error: WebSocketError) => void
  ) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.onRetry = onRetry;
    this.onFatalError = onFatalError;
  }

  handleError(error: WebSocketError): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!error.retryable || this.retryCount >= this.maxRetries) {
        this.onFatalError?.(error);
        reject(error);
        return;
      }

      this.retryCount++;
      this.onRetry?.(this.retryCount, error);

      setTimeout(() => {
        resolve();
      }, this.retryDelay * Math.pow(2, this.retryCount - 1));
    });
  }

  reset() {
    this.retryCount = 0;
  }

  isRetryableError(error: any): WebSocketError {
    if (error.code === 'ECONNREFUSED') {
      return {
        type: 'connection',
        message: 'Connection refused',
        code: error.code,
        retryable: true
      };
    }

    if (error.code === 'ENOTFOUND') {
      return {
        type: 'connection',
        message: 'Host not found',
        code: error.code,
        retryable: true
      };
    }

    if (error.code === 'RATE_LIMITED') {
      return {
        type: 'server',
        message: 'Rate limited',
        code: error.code,
        details: error.details,
        retryable: true
      };
    }

    if (error.code === 'UNAUTHORIZED') {
      return {
        type: 'server',
        message: 'Unauthorized',
        code: error.code,
        retryable: false
      };
    }

    return {
      type: 'unknown',
      message: error.message || 'Unknown error',
      retryable: true
    };
  }
}
```

## Performance Optimization

### Connection Pooling

```typescript
// utils/webSocketPool.ts
class WebSocketPool {
  private connections: Map<string, WebSocket> = new Map();
  private maxConnections: number;
  private connectionTimeout: number;

  constructor(maxConnections: number = 5, connectionTimeout: number = 30000) {
    this.maxConnections = maxConnections;
    this.connectionTimeout = connectionTimeout;
  }

  getConnection(url: string): WebSocket | null {
    let ws = this.connections.get(url);

    if (ws && ws.readyState === WebSocket.OPEN) {
      return ws;
    }

    if (ws) {
      ws.close();
      this.connections.delete(url);
    }

    if (this.connections.size >= this.maxConnections) {
      // Close oldest connection
      const oldestUrl = this.connections.keys().next().value;
      const oldestWs = this.connections.get(oldestUrl);
      if (oldestWs) {
        oldestWs.close();
        this.connections.delete(oldestUrl);
      }
    }

    try {
      ws = new WebSocket(url);
      this.setupConnectionTimeout(ws, url);
      this.connections.set(url, ws);
      return ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      return null;
    }
  }

  private setupConnectionTimeout(ws: WebSocket, url: string) {
    const timeout = setTimeout(() => {
      ws.close();
      this.connections.delete(url);
    }, this.connectionTimeout);

    ws.onclose = () => {
      clearTimeout(timeout);
      this.connections.delete(url);
    };
  }

  closeAll() {
    this.connections.forEach(ws => ws.close());
    this.connections.clear();
  }
}
```

These examples provide comprehensive integration patterns for different frameworks and use cases, with proper error handling, performance optimization, and real-time parameter control capabilities.