# Real-time Capabilities and WebSocket Integration

This module provides comprehensive real-time capabilities for the Schillinger SDK, including WebSocket connections, streaming APIs, and collaborative editing features.

## Features

### 🔌 WebSocket Connection Management

- Automatic connection and reconnection with exponential backoff
- Heartbeat monitoring to maintain connection health
- Configurable timeout and retry settings
- Connection state tracking and event emission

### 📡 Real-time Event System

- Subscribe to pattern generation events
- Receive composition updates in real-time
- Filter events with custom predicates
- Wildcard subscriptions for broad event monitoring

### 🌊 Streaming APIs

- Stream pattern generation results as they're computed
- Real-time rhythm, harmony, and melody generation
- Chunked data delivery for large results
- Progress tracking and completion callbacks

### 👥 Collaborative Editing

- Multi-user editing sessions
- Conflict detection and resolution
- Cursor position tracking
- Operation-based synchronization

## Quick Start

### Basic Setup

```typescript
import { SchillingerSDK } from '@schillinger-sdk/core';

const sdk = new SchillingerSDK({
  apiUrl: 'https://api.schillinger.ai/v1',
  realtime: {
    url: 'wss://ws.schillinger.ai/v1',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
  },
  enableCollaboration: true,
});

// Authenticate first
await sdk.authenticate({ apiKey: 'your-api-key' });

// Connect to real-time services
await sdk.connectRealtime();
```

### Event Subscriptions

```typescript
// Subscribe to pattern generation events
const subscriptionId = sdk.subscribe('pattern_generated', data => {
  console.log('New pattern generated:', data.pattern);
});

// Subscribe to all events with wildcard
sdk.subscribe('*', data => {
  console.log('Event received:', data);
});

// Unsubscribe when done
sdk.unsubscribe(subscriptionId);
```

### Streaming Pattern Generation

```typescript
// Start streaming rhythm generation
const streamId = sdk.startStreaming(
  'rhythm',
  { generators: [3, 2], timeSignature: [4, 4] },
  chunk => {
    console.log('Received chunk:', chunk);
    // Update UI with partial results
  }
);

// Stop streaming when needed
sdk.stopStreaming(streamId);
```

## Collaboration Features

### Creating a Collaborative Session

```typescript
const collaborationManager = sdk.getCollaborationManager();

// Create a new session
const session = await collaborationManager.createSession('My Composition', {
  id: 'doc-1',
  type: 'composition',
  content: {
    id: 'comp-1',
    name: 'Collaborative Piece',
    sections: [],
    key: 'C',
    scale: 'major',
    tempo: 120,
    timeSignature: [4, 4],
  },
  version: 1,
  operations: [],
});

// Add participants
await collaborationManager.joinSession(session.id, {
  id: 'user-1',
  name: 'Alice',
  role: 'editor',
});
```

### Applying Operations

```typescript
// Apply an update operation
const result = await collaborationManager.applyOperation(session.id, {
  type: 'update',
  path: 'tempo',
  value: 140,
  oldValue: 120,
  userId: 'user-1',
  version: 1,
});

if (result.success) {
  console.log('Operation applied successfully');
} else {
  console.log('Conflicts detected:', result.conflicts);
}
```

### Conflict Resolution

```typescript
// Handle conflicts
collaborationManager.on('conflictDetected', async event => {
  const conflict = event.conflict;

  // Resolve with merge strategy
  const resolution = {
    strategy: 'merge',
    resolvedData: mergeConflictingData(conflict.operations),
    timestamp: new Date(),
    resolvedBy: 'user-1',
  };

  await collaborationManager.resolveConflict(conflict.id, resolution);
});
```

### Cursor Tracking

```typescript
// Update cursor position
collaborationManager.updateCursor(session.id, 'user-1', {
  section: 'section-1',
  element: 'rhythm',
  position: 10,
});

// Listen for cursor updates
collaborationManager.on('cursorUpdated', event => {
  console.log(`User ${event.participantId} moved cursor to:`, event.cursor);
});
```

## Configuration Options

### RealtimeConnectionOptions

```typescript
interface RealtimeConnectionOptions {
  url?: string; // WebSocket URL
  reconnectInterval?: number; // Reconnection delay (ms)
  maxReconnectAttempts?: number; // Max reconnection attempts
  heartbeatInterval?: number; // Heartbeat interval (ms)
  timeout?: number; // Connection timeout (ms)
  protocols?: string[]; // WebSocket protocols
}
```

### SDK Configuration

```typescript
const sdk = new SchillingerSDK({
  // ... other options
  realtime: {
    url: 'wss://ws.schillinger.ai/v1',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    timeout: 10000,
    protocols: ['schillinger-v1'],
  },
  enableCollaboration: true,
});
```

## Event Types

### Real-time Events

- `pattern_generated` - New pattern generated
- `composition_updated` - Composition modified
- `user_joined` - User joined session
- `user_left` - User left session
- `conflict_detected` - Collaboration conflict
- `conflict_resolved` - Conflict resolved

### SDK Events

- `realtimeEvent` - Any real-time event received
- `collaborationConflict` - Collaboration conflict detected
- `collaborationSessionCreated` - New session created
- `collaborationParticipantJoined` - Participant joined
- `collaborationOperationApplied` - Operation applied

## Error Handling

### Connection Errors

```typescript
sdk.on('error', event => {
  if (event.data.message.includes('WebSocket')) {
    console.error('WebSocket error:', event.data);
    // Handle connection issues
  }
});

// Check connection state
const state = sdk.isRealtimeConnected();
if (!state) {
  // Attempt reconnection
  await sdk.connectRealtime();
}
```

### Collaboration Errors

```typescript
collaborationManager.on('operationFailed', event => {
  console.error('Operation failed:', event.error);
  // Retry or handle gracefully
});
```

## Best Practices

### 1. Connection Management

```typescript
// Always check authentication before connecting
if (sdk.isAuthenticated()) {
  await sdk.connectRealtime();
}

// Handle disconnections gracefully
sdk.on('realtime', event => {
  if (event.data.connectionState.status === 'disconnected') {
    // Show offline indicator
    showOfflineIndicator();
  }
});
```

### 2. Event Subscription Cleanup

```typescript
class MyComponent {
  private subscriptions: string[] = [];

  async componentDidMount() {
    const id = sdk.subscribe('pattern_generated', this.handlePattern);
    this.subscriptions.push(id);
  }

  componentWillUnmount() {
    this.subscriptions.forEach(id => sdk.unsubscribe(id));
  }
}
```

### 3. Conflict Resolution Strategy

```typescript
// Implement intelligent conflict resolution
const resolveConflict = conflict => {
  switch (conflict.type) {
    case 'concurrent_edit':
      // Use last-write-wins for simple properties
      if (isSimpleProperty(conflict.path)) {
        return useLatestOperation(conflict.operations);
      }
      // Use merge for complex structures
      return mergeOperations(conflict.operations);

    case 'version_mismatch':
      // Rebase operations on latest version
      return rebaseOperations(conflict.operations);
  }
};
```

### 4. Performance Optimization

```typescript
// Throttle cursor updates
const throttledCursorUpdate = throttle(cursor => {
  collaborationManager.updateCursor(sessionId, userId, cursor);
}, 100);

// Batch operations when possible
const batchOperations = operations => {
  return operations.reduce((batched, op) => {
    // Group related operations
    return groupRelatedOperations(batched, op);
  }, []);
};
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Increase timeout value in configuration
   - Check network connectivity
   - Verify WebSocket URL is accessible

2. **Frequent Disconnections**
   - Adjust heartbeat interval
   - Check for network instability
   - Implement exponential backoff

3. **Conflict Resolution Loops**
   - Ensure deterministic conflict resolution
   - Implement proper operation ordering
   - Add conflict prevention logic

### Debug Mode

```typescript
const sdk = new SchillingerSDK({
  debug: true, // Enable debug logging
  // ... other options
});
```

## API Reference

See the TypeScript definitions for complete API documentation:

- `RealtimeManager` - Core real-time functionality
- `CollaborationManager` - Collaborative editing features
- `SchillingerSDK` - Main SDK with real-time integration

## Examples

Check the test files for comprehensive examples:

- `realtime-basic.test.ts` - Basic real-time functionality
- `collaboration-simple.test.ts` - Collaboration features
- `realtime-examples.test.ts` - Complete usage examples
