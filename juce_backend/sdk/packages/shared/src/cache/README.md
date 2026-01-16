# Schillinger SDK Caching System

A comprehensive multi-level caching system designed for offline functionality and optimal performance of mathematical operations in the Schillinger System.

## Overview

The caching system provides three levels of caching:

1. **Memory Cache** - Fast in-memory storage with LRU eviction
2. **Persistent Cache** - Browser localStorage/IndexedDB or Node.js file system storage
3. **Network Cache** - Remote caching with offline queue synchronization

## Features

- **Multi-level caching** with automatic fallback
- **Offline support** with queue-based synchronization
- **Automatic cache invalidation** with configurable rules
- **Compression and encryption** support
- **Cache metrics and monitoring**
- **Event-driven architecture** for cache operations
- **LRU eviction** for memory management
- **TTL (Time To Live)** support for all cache levels

## Quick Start

### Basic Usage

```typescript
import { CachedMathOperations } from '@schillinger-sdk/shared';

// Create cached math operations instance
const cachedMath = new CachedMathOperations();

// Generate rhythmic resultant (cached automatically)
const resultant = await cachedMath.generateRhythmicResultant(3, 2);

// Second call returns cached result
const cachedResultant = await cachedMath.generateRhythmicResultant(3, 2);
```

### Custom Configuration

```typescript
import { CachedMathOperations, CacheConfiguration } from '@schillinger-sdk/shared';

const config: Partial<CacheConfiguration> = {
  memory: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 1000,
  },
  persistent: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 200 * 1024 * 1024, // 200MB
    compressionEnabled: true,
  },
  global: {
    offlineMode: false,
    syncInterval: 5 * 60 * 1000, // 5 minutes
  },
};

const cachedMath = new CachedMathOperations(config);
```

## Cache Manager

For advanced use cases, you can use the `CacheManager` directly:

```typescript
import { CacheManager, CacheConfiguration } from '@schillinger-sdk/shared';

const cacheManager = new CacheManager(config);

// Store custom data
await cacheManager.set(
  {
    namespace: 'custom',
    operation: 'calculation',
    parameters: { input: [1, 2, 3] },
  },
  result
);

// Retrieve data
const cached = await cacheManager.get({
  namespace: 'custom',
  operation: 'calculation',
  parameters: { input: [1, 2, 3] },
});
```

## Cache Levels

### Memory Cache

- **Purpose**: Fastest access for frequently used data
- **Storage**: RAM
- **Persistence**: Session only
- **Eviction**: LRU (Least Recently Used)
- **Typical TTL**: 5-15 minutes

```typescript
import { MemoryCache } from '@schillinger-sdk/shared';

const memoryCache = new MemoryCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
});

await memoryCache.set('key', 'value');
const value = await memoryCache.get('key');
```

### Persistent Cache

- **Purpose**: Long-term storage across sessions
- **Storage**: localStorage (browser) or file system (Node.js)
- **Persistence**: Survives browser/app restarts
- **Features**: Compression, optimization
- **Typical TTL**: 1-24 hours

```typescript
import { PersistentCache } from '@schillinger-sdk/shared';

const persistentCache = new PersistentCache({
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  compressionEnabled: true,
});

await persistentCache.set('key', largeObject);
const value = await persistentCache.get('key');
```

### Network Cache

- **Purpose**: Shared caching across devices/users
- **Storage**: Remote server
- **Features**: Offline queue, synchronization
- **Typical TTL**: 30 minutes - 2 hours

```typescript
import { NetworkCache } from '@schillinger-sdk/shared';

const networkCache = new NetworkCache({
  endpoint: '/api/cache',
  timeout: 5000,
  retryAttempts: 3,
});

await networkCache.set('key', 'value');
const value = await networkCache.get('key');
```

## Offline Support

The caching system provides robust offline functionality:

```typescript
// Enable offline mode
cachedMath.setOfflineMode(true);

// Operations work offline using cached data
const result = await cachedMath.generateRhythmicResultant(3, 2);

// When back online, sync queued operations
cachedMath.setOfflineMode(false);
await cachedMath.syncCache();
```

## Cache Invalidation

### Automatic Invalidation

```typescript
// Add invalidation rule
cachedMath.addInvalidationRule(/rhythm/, 60000); // Invalidate rhythm patterns after 1 minute

// Manual invalidation
cachedMath.invalidate(/harmony/); // Invalidate all harmony-related cache entries
```

### Time-based Invalidation

All cache entries support TTL (Time To Live):

```typescript
// Set with custom TTL
await cacheManager.set(keyData, value, 30000); // 30 seconds TTL
```

## Cache Metrics and Monitoring

```typescript
// Get cache metrics
const metrics = cachedMath.getCacheMetrics();

metrics.forEach(metric => {
  console.log(`${metric.level} Cache:`);
  console.log(`  Entries: ${metric.stats.entries}`);
  console.log(`  Hit Rate: ${(metric.stats.hitRate * 100).toFixed(1)}%`);
  console.log(`  Size: ${metric.stats.size} bytes`);
});
```

## Event Handling

```typescript
// Listen to cache events
cacheManager.addEventListener(event => {
  console.log(`Cache ${event.type} on ${event.level} level`);
  if (event.key) {
    console.log(`Key: ${event.key}`);
  }
});
```

## Preloading Common Patterns

```typescript
// Preload frequently used patterns
await cachedMath.preloadCommonPatterns();

// This loads common rhythmic resultants, harmonic progressions, and melodic contours
// into cache for faster access
```

## Cache Optimization

```typescript
// Optimize cache storage
await cachedMath.optimizeCache();

// This performs:
// - Cleanup of expired entries
// - Defragmentation of storage
// - Compression optimization
```

## Error Handling

The caching system handles errors gracefully:

- **Storage errors**: Falls back to next cache level
- **Network errors**: Queues operations for later sync
- **Serialization errors**: Logs warnings and continues
- **Quota exceeded**: Automatically evicts old entries

```typescript
try {
  const result = await cachedMath.generateRhythmicResultant(3, 2);
} catch (error) {
  // Mathematical validation errors are still thrown
  console.error('Invalid parameters:', error);
}
```

## Best Practices

### 1. Configure Appropriate TTLs

```typescript
const config = {
  memory: { ttl: 5 * 60 * 1000 }, // Short TTL for memory
  persistent: { ttl: 24 * 60 * 60 * 1000 }, // Longer TTL for persistent
  network: { ttl: 60 * 60 * 1000 }, // Medium TTL for network
};
```

### 2. Use Offline Mode for Reliability

```typescript
// Detect network status and adjust accordingly
if (!navigator.onLine) {
  cachedMath.setOfflineMode(true);
}
```

### 3. Monitor Cache Performance

```typescript
// Regular monitoring
setInterval(() => {
  const metrics = cachedMath.getCacheMetrics();
  const memoryHitRate = metrics[0].stats.hitRate;

  if (memoryHitRate < 0.8) {
    console.warn('Low cache hit rate, consider preloading more patterns');
  }
}, 60000);
```

### 4. Clean Up Resources

```typescript
// Always clean up when done
cachedMath.destroy();
```

## API Reference

### CachedMathOperations

Main class for cached mathematical operations.

#### Methods

- `generateRhythmicResultant(a, b, options?)` - Generate cached rhythmic resultant
- `generateHarmonicProgression(key, scale, length, options?)` - Generate cached harmonic progression
- `generateMelodicContour(length, range, options?)` - Generate cached melodic contour
- `preloadCommonPatterns()` - Preload frequently used patterns
- `getCacheMetrics()` - Get cache performance metrics
- `setOfflineMode(offline)` - Enable/disable offline mode
- `syncCache()` - Synchronize with network cache
- `optimizeCache()` - Optimize cache storage
- `clearCache()` - Clear all cached data
- `destroy()` - Clean up resources

### CacheManager

Low-level cache management.

#### Methods

- `get(keyData)` - Get value with multi-level fallback
- `set(keyData, value, ttl?)` - Set value in all cache levels
- `delete(keyData)` - Delete from all cache levels
- `clear()` - Clear all cache levels
- `has(keyData)` - Check if key exists
- `sync(options?)` - Synchronize caches
- `getMetrics()` - Get detailed metrics
- `addEventListener(listener)` - Add event listener
- `destroy()` - Clean up resources

## Configuration Options

### CacheConfiguration

```typescript
interface CacheConfiguration {
  memory: {
    ttl?: number; // Time to live in milliseconds
    maxSize?: number; // Maximum size in bytes
    maxEntries?: number; // Maximum number of entries
  };
  persistent: {
    ttl?: number;
    maxSize?: number;
    maxEntries?: number;
    compressionEnabled?: boolean;
    storageAdapter?: CacheStorageAdapter;
  };
  network: {
    ttl?: number;
    endpoint?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retryAttempts?: number;
  };
  global: {
    enableCompression?: boolean;
    enableEncryption?: boolean;
    syncInterval?: number;
    offlineMode?: boolean;
  };
}
```

## Performance Considerations

- **Memory cache** is fastest (~0.1ms access time)
- **Persistent cache** is moderate (~5-10ms access time)
- **Network cache** is slowest (~100-200ms access time)
- **Cache keys** are hashed for consistent lookup
- **Compression** reduces storage size but adds CPU overhead
- **LRU eviction** maintains optimal memory usage

## Browser Compatibility

- **Modern browsers**: Full support with localStorage/IndexedDB
- **Older browsers**: Graceful degradation to memory-only caching
- **Node.js**: Full support with file system storage
- **Web Workers**: Supported with message passing

## Troubleshooting

### Common Issues

1. **High memory usage**: Reduce `maxEntries` or `maxSize`
2. **Low hit rates**: Increase TTL or preload more patterns
3. **Storage quota exceeded**: Enable compression or reduce cache size
4. **Network sync failures**: Check endpoint configuration and network connectivity

### Debug Mode

```typescript
// Enable debug logging
const config = {
  global: {
    debugMode: true, // Logs all cache operations
  },
};
```

## Migration Guide

### From v1.0 to v2.0

- `CacheManager` constructor now requires configuration object
- Event listener API changed from callbacks to addEventListener
- TTL is now specified in milliseconds instead of seconds

### Upgrading Cache Format

```typescript
// Clear old cache format
await cachedMath.clearCache();

// Preload with new format
await cachedMath.preloadCommonPatterns();
```
