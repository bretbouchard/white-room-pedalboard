# WebSocket Troubleshooting Guide

This document addresses common WebSocket connection issues in the audio agent application.

## Current Issue: Mixed WebSocket Connections

### Symptoms
You may see WebSocket connection errors in the browser console:
```
[Debug] [vite] connecting...
[Error] WebSocket connection to 'ws://localhost:3000/?token=...' failed: Could not connect to the server.
[Error] [vite] failed to connect to websocket (Error: WebSocket closed without opened.)
```

### Root Cause Analysis

This is actually **two separate WebSocket systems**:

1. **Vite HMR WebSocket** (`ws://localhost:3000`) - Used for Hot Module Replacement during development
2. **Application WebSocket** (`ws://localhost:8350/ws`) - Used for real-time audio agent communication

The Vite HMR WebSocket error is **harmless** and doesn't affect application functionality.

### Why Both Connections Exist

- **Vite HMR**: Vite's development server uses WebSocket for live reloading
- **Application**: Your audio agent uses WebSocket for real-time communication with the backend

### Verification

If you see these logs after the error, your application is working correctly:
```
[Log] WebSocket connected (websocketStore.ts, line 101)
[Log] Received WebSocket message: {id: "...", type: "ack", ...}
```

## Solutions

### Solution 1: Ignore Vite HMR Errors (Recommended)

The Vite HMR WebSocket error is cosmetic and doesn't affect functionality. Your application WebSocket connection is working correctly if you see the "WebSocket connected" log.

### Solution 2: Fix Vite HMR Configuration

If the HMR errors are bothersome, you can configure Vite to use a different port or disable HMR:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    host: true,
    hmr: {
      port: 3001, // Use different port for HMR
    },
    // ... rest of config
  }
})
```

### Solution 3: Docker Network Configuration

Ensure Docker containers are on the same network:

```bash
# Check container network
docker network ls
docker network inspect audio_agent_default

# Verify both containers are on the same network
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### Solution 4: Environment Configuration

Set correct environment variables:

```bash
# Backend WebSocket URL
VITE_WS_URL=ws://localhost:8350/ws

# AGUI Events URL
VITE_AGUI_EVENTS_URL=http://localhost:8350/api/agui/events
```

## Debugging Steps

### 1. Check Backend Status
```bash
docker logs audio_agent-backend-1 --tail 20
```

### 2. Check Frontend Status
```bash
docker logs audio_agent-frontend-1 --tail 20
```

### 3. Test WebSocket Connection Directly
```bash
# Test application WebSocket
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:8350/ws

# Test health endpoints
curl http://localhost:8350/health
curl http://localhost:8053/
```

### 4. Check WebSocket Security Stats
```bash
# Requires authentication token
curl -H "Authorization: Bearer <token>" \
     http://localhost:8350/admin/websocket-security
```

### 5. Browser Console Analysis

Look for these specific log messages:

**Working Application WebSocket:**
```
✅ [Log] WebSocket connected (websocketStore.ts, line 101)
✅ [Log] Received WebSocket message: {id: "...", type: "ack", ...}
```

**Harmless Vite HMR Error:**
```
⚠️ [Error] WebSocket connection to 'ws://localhost:3000/?token=...' failed
```

## Common Issues and Fixes

### Issue 1: Backend Not Starting
**Symptoms:** All WebSocket connections fail
**Fix:** Check for missing modules or import errors in backend logs

### Issue 2: Port Conflicts
**Symptoms:** Connection refused errors
**Fix:** Check if ports 8350, 8053, and 3000 are available

### Issue 3: Authentication Failures
**Symptoms:** WebSocket connects but immediately disconnects
**Fix:** Verify Clerk authentication tokens

### Issue 4: Docker Network Issues
**Symptoms:** Connections timeout or refuse
**Fix:** Recreate Docker network and containers

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Vite Dev      │    │   Backend       │
│   (Port 8053)   │    │   Server        │    │   (Port 8350)   │
│                 │    │   (Port 3000)   │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   App     │  │    │  │   HMR     │  │    │  │ WebSocket │  │
│  │ WebSocket │◄┼────┼──┤ WebSocket │  │    │  │ Endpoint  │  │
│  │  Client   │  │    │  │ (Errors)  │  │    │  │   /ws     │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌─────────────────┐
                    │  Docker Proxy   │
                    │ Configuration   │
                    └─────────────────┘
```

## Performance Considerations

### WebSocket Connection Limits
- Maximum 10 connections per IP
- Maximum 1000 total connections
- Rate limiting: 100 messages/second per connection

### Security Features
- JWT token authentication
- IP blocking for suspicious activity
- Message validation and size limits
- Automatic connection timeout handling

## Monitoring

### Application Metrics
- Connection count and status
- Message throughput
- Error rates
- Security events

### Health Checks
```bash
# Application health
curl http://localhost:8350/health

# Frontend availability
curl http://localhost:8053/

# WebSocket security stats
curl -H "Authorization: Bearer <token>" \
     http://localhost:8350/admin/websocket-security
```

# WebSocket Plugin System Troubleshooting

This section covers troubleshooting for the enhanced WebSocket plugin system with DawDreamer integration.

## Plugin Parameter Issues

### Issue: Parameter Updates Not Working
**Symptoms:**
- Parameter changes sent but not reflected in audio
- Parameters revert to previous values
- Plugin not responding to parameter changes

**Debug Steps:**
```javascript
// Add this to your client code to debug parameter flow
const parameterDebugger = {
  pendingUpdates: new Map(),

  trackUpdate(pluginId, parameterId, value) {
    const key = `${pluginId}:${parameterId}`;
    this.pendingUpdates.set(key, {
      value,
      timestamp: Date.now(),
      messageId: `msg_${Date.now()}`
    });
    console.log('🎛️ Parameter update sent:', { pluginId, parameterId, value });
  },

  checkTimeouts() {
    const now = Date.now();
    const timeout = 5000; // 5 seconds

    this.pendingUpdates.forEach((update, key) => {
      if (now - update.timestamp > timeout) {
        console.warn('⚠️ Parameter update timeout:', update);
        this.pendingUpdates.delete(key);
      }
    });
  }
};

// Monitor for stuck updates
setInterval(() => parameterDebugger.checkTimeouts(), 1000);
```

### Issue: Plugin Not Found
**Symptoms:**
- `PLUGIN_NOT_FOUND` error messages
- Unable to add or control plugins

**Common Causes:**
1. Incorrect plugin ID format
2. Plugin not loaded in DawDreamer engine
3. Plugin file path issues

**Solutions:**
```javascript
// Verify plugin exists before sending messages
async function verifyPluginExists(pluginId) {
  try {
    const response = await fetch(`/api/plugins/${pluginId}`);
    if (!response.ok) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    return true;
  } catch (error) {
    console.error('Plugin verification failed:', error);
    return false;
  }
}
```

## Session Management Issues

### Issue: Multi-Client Synchronization Problems
**Symptoms:**
- Changes from one client not appearing in others
- Inconsistent plugin states across sessions
- Session broadcast failures

**Debug Steps:**
```javascript
// Add session debugging
const sessionDebugger = {
  logBroadcast(message) {
    console.log('📡 Session broadcast:', {
      type: message.type,
      sessionId: message.session_id,
      changedBy: message.data?.changed_by,
      timestamp: new Date().toISOString()
    });
  },

  trackPluginStates() {
    // Log current plugin states
    console.log('📋 Current plugin states:', this.getAllPluginStates());
  }
};
```

## Performance Issues

### Issue: High Latency Parameter Updates
**Symptoms:**
- Parameter changes take long time to take effect
- Audio glitches during parameter changes
- UI feels sluggish

**Solutions:**

#### 1. Implement Parameter Debouncing
```javascript
class ParameterDebouncer {
  constructor(ws, delay = 50) {
    this.ws = ws;
    this.delay = delay;
    this.pendingUpdates = new Map();
    this.timers = new Map();
  }

  updateParameter(trackId, pluginId, parameterId, value, userId, sessionId) {
    const key = `${pluginId}:${parameterId}`;

    this.pendingUpdates.set(key, {
      trackId, pluginId, parameterId, value, userId, sessionId
    });

    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.timers.set(key, setTimeout(() => {
      this.sendUpdate(key);
    }, this.delay));
  }

  sendUpdate(key) {
    const update = this.pendingUpdates.get(key);
    if (!update) return;

    this.ws.send(JSON.stringify({
      id: `debounced_${Date.now()}_${key}`,
      type: 'PLUGIN_PARAMETER',
      data: {
        track_id: update.trackId,
        plugin_id: update.pluginId,
        parameter_id: update.parameterId,
        parameter_value: update.value
      },
      user_id: update.userId,
      session_id: update.sessionId
    }));

    this.pendingUpdates.delete(key);
    this.timers.delete(key);
  }
}
```

#### 2. Performance Monitoring
```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      messageCount: 0,
      totalLatency: 0,
      maxLatency: 0,
      errorCount: 0
    };
    this.messageTimestamps = new Map();
  }

  startMonitoring(ws) {
    const originalSend = ws.send.bind(ws);
    ws.send = (data) => {
      const message = JSON.parse(data);
      this.messageTimestamps.set(message.id, Date.now());
      this.metrics.messageCount++;
      return originalSend(data);
    };

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.messageTimestamps.has(message.id)) {
        const latency = Date.now() - this.messageTimestamps.get(message.id);
        this.metrics.totalLatency += latency;
        this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
        this.messageTimestamps.delete(message.id);

        if (latency > 200) {
          console.warn('🐌 Slow message detected:', {
            type: message.type,
            latency: `${latency}ms`,
            messageId: message.id
          });
        }
      }
    });
  }

  reportMetrics() {
    const avgLatency = this.metrics.messageCount > 0
      ? this.metrics.totalLatency / this.metrics.messageCount
      : 0;

    console.log('📊 WebSocket Performance:', {
      messageCount: this.metrics.messageCount,
      averageLatency: `${avgLatency.toFixed(2)}ms`,
      maxLatency: `${this.metrics.maxLatency}ms`,
      errorCount: this.metrics.errorCount
    });
  }
}
```

## Error Code Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| `PLUGIN_NOT_FOUND` | Plugin ID does not exist | Verify plugin ID, check plugin loading |
| `TRACK_NOT_FOUND` | Track ID does not exist | Check track configuration |
| `INVALID_PARAMETER` | Parameter validation failed | Validate parameter ranges and types |
| `PRESET_LOAD_FAILED` | Failed to load preset | Verify preset format and plugin state |
| `ENGINE_ERROR` | DawDreamer engine error | Check engine logs and restart if needed |
| `UNAUTHORIZED` | Authentication failed | Refresh JWT token, check permissions |
| `RATE_LIMITED` | Too many requests | Implement backoff strategy |

## Connection Recovery

### Automatic Reconnection with State Recovery
```javascript
class ConnectionRecoveryManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.pluginStates = new Map();
  }

  async handleConnectionLoss() {
    console.log('🔄 Starting connection recovery');

    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.delay(Math.pow(2, this.reconnectAttempts) * 1000);
        await this.reconnect();
        await this.recoverPluginStates();
        console.log('✅ Connection recovered');
        return;
      } catch (error) {
        this.reconnectAttempts++;
        console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed`);
      }
    }
  }

  async recoverPluginStates() {
    console.log('🔄 Recovering plugin states');
    // Send stored plugin states to restore session
    this.pluginStates.forEach((state, pluginId) => {
      // Restore plugin parameters and state
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Enhanced Debugging Tools

### WebSocket Message Inspector
```javascript
class WebSocketInspector {
  constructor() {
    this.messages = [];
    this.filters = { types: [], users: [], sessions: [] };
  }

  inspect(ws) {
    const originalSend = ws.send.bind(ws);
    ws.send = (data) => {
      const message = JSON.parse(data);
      this.logMessage('outgoing', message);
      return originalSend(data);
    };

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      this.logMessage('incoming', message);
    });
  }

  logMessage(direction, message) {
    const logEntry = {
      direction, timestamp: Date.now(), type: message.type,
      id: message.id, data: message.data,
      user_id: message.user_id, session_id: message.session_id
    };

    this.messages.push(logEntry);
    if (this.messages.length > 1000) this.messages.shift();

    if (this.shouldLog(logEntry)) {
      console.log(`${direction === 'outgoing' ? '📤' : '📥'} ${message.type}:`, message);
    }
  }

  shouldLog(entry) {
    return (!this.filters.types.length || this.filters.types.includes(entry.type)) &&
           (!this.filters.users.length || this.filters.users.includes(entry.user_id)) &&
           (!this.filters.sessions.length || this.filters.sessions.includes(entry.session_id));
  }

  exportMessages() {
    const dataStr = JSON.stringify(this.messages, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `websocket_logs_${Date.now()}.json`);
    linkElement.click();
  }
}
```

## Summary

The WebSocket connection errors you're seeing are primarily from Vite's HMR system and are **harmless**. Your actual application WebSocket connection is working correctly as evidenced by the "WebSocket connected" and message receipt logs.

For the enhanced plugin system:
1. Use the debugging tools above to troubleshoot plugin parameter issues
2. Implement parameter debouncing for better performance
3. Monitor session broadcasting for multi-client synchronization
4. Use automatic reconnection with state recovery for reliability
5. Leverage the comprehensive error handling and logging

If you want to eliminate the cosmetic errors, you can either:
1. Ignore them (recommended)
2. Configure Vite to use a different HMR port
3. Set proper environment variables

The core functionality of your audio agent application is working correctly with the enhanced security measures and plugin system in place.