# Audio Buffer Management System

## Overview

The Audio Buffer Management System provides efficient memory management for audio processing with streaming support for large files and thread-safe operations. It's designed to handle the demanding requirements of real-time audio processing while maintaining memory efficiency and performance.

## Features

### 🎯 Core Features

- **Multiple Buffer Types**: Memory, Streaming, Ring, and Pooled buffers
- **Large File Support**: Efficient streaming for files larger than 100MB
- **Thread Safety**: All operations are thread-safe when enabled
- **Memory Monitoring**: Real-time memory usage tracking and alerts
- **Performance Metrics**: Comprehensive performance monitoring and profiling
- **Automatic Cleanup**: Intelligent memory management and leak prevention
- **Buffer Pooling**: Reusable buffers for optimal performance

### 🚀 Performance Optimizations

- **Virtual Memory**: Memory-mapped files for efficient large file handling
- **Chunked Processing**: Optimized chunk sizes for different use cases
- **Cache Management**: Multi-level caching with configurable sizes
- **Memory Pressure Handling**: Automatic cleanup under memory constraints
- **Background Monitoring**: Continuous memory and performance monitoring

## Architecture

### Buffer Types

#### Memory Buffer
- **Use Case**: Small to medium-sized audio data (< 100MB)
- **Advantages**: Fast access, low latency
- **Memory Usage**: In-memory allocation
- **Best For**: Real-time processing, temporary buffers

#### Streaming Buffer
- **Use Case**: Large audio files (> 100MB)
- **Advantages**: Memory efficient, handles large files
- **Memory Usage**: Configurable cache + disk backing
- **Best For**: File processing, batch operations

#### Ring Buffer
- **Use Case**: Real-time audio streams
- **Advantages**: Lock-free when possible, continuous operation
- **Memory Usage**: Fixed circular buffer
- **Best For**: Audio input/output, real-time streams

#### Pool Buffer
- **Use Case**: Frequent buffer allocation/deallocation
- **Advantages**: Reusable resources, reduced GC pressure
- **Memory Usage**: Pre-allocated pool
- **Best For**: High-frequency operations

### Class Hierarchy

```
AudioBuffer (ABC)
├── MemoryBuffer
├── StreamingBuffer
├── RingBufferWrapper
└── BufferPool

AudioBufferManager
├── Buffer Creation
├── Buffer Lifecycle Management
├── Memory Monitoring
└── Performance Tracking
```

## Quick Start

### Basic Usage

```python
from src.audio_agent.core.audio_buffer_manager import (
    AudioBufferManager,
    BufferConfig,
    BufferType,
    create_audio_buffer
)
import numpy as np

# Create a simple memory buffer
config = BufferConfig(
    buffer_type=BufferType.MEMORY,
    sample_rate=44100,
    channels=2,
    buffer_size=8192,
    max_memory_mb=100
)

buffer = create_audio_buffer("my_buffer", BufferType.MEMORY, config, size=8192)

# Write audio data
audio_data = np.random.randn(1024, 2).astype(np.float32)
written = buffer.write(audio_data)

# Read audio data
buffer.seek(0)
read_data = buffer.read(1024)

# Get performance metrics
metrics = buffer.get_metrics()
print(f"Memory usage: {metrics.memory_usage_mb:.2f}MB")
```

### Large File Streaming

```python
# Create streaming buffer for large files
config = BufferConfig(
    buffer_type=BufferType.STREAMING,
    sample_rate=44100,
    channels=2,
    buffer_size=8192,
    max_memory_mb=50,      # Low memory limit
    chunk_size=4096,       # Streaming chunk size
    cache_size_mb=10       # Cache for frequent access
)

manager = AudioBufferManager()

# Initialize with estimated file size
buffer = manager.create_buffer(
    "large_file",
    BufferType.STREAMING,
    config,
    estimated_size=44100 * 60 * 5  # 5 minutes of audio
)

# Stream processing
chunk_size = 8192
while True:
    chunk = buffer.read(chunk_size)
    if len(chunk) == 0:
        break

    # Process chunk
    processed_chunk = process_audio(chunk)

    # Write back if needed
    buffer.write(processed_chunk)
```

### Real-time Processing

```python
# Ring buffer for real-time audio
config = BufferConfig(
    buffer_type=BufferType.RING,
    sample_rate=44100,
    channels=2,
    buffer_size=512  # Small for low latency
)

manager = AudioBufferManager()

# Create input and output ring buffers
input_buffer = manager.create_buffer("audio_input", BufferType.RING, config)
output_buffer = manager.create_buffer("audio_output", BufferType.RING, config)

# Real-time processing loop
while processing_active:
    # Read from input
    input_chunk = input_buffer.read(128)

    if len(input_chunk) > 0:
        # Process audio
        output_chunk = process_realtime(input_chunk)

        # Write to output
        output_buffer.write(output_chunk)
```

## Configuration

### BufferConfig Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `buffer_type` | `BufferType` | Required | Type of buffer to create |
| `sample_rate` | `int` | 44100 | Audio sample rate in Hz |
| `channels` | `int` | 2 | Number of audio channels |
| `buffer_size` | `int` | 1024 | Buffer size in samples |
| `max_memory_mb` | `int` | 512 | Maximum memory usage in MB |
| `chunk_size` | `int` | 8192 | Chunk size for streaming |
| `cache_size_mb` | `int` | 64 | Cache size for disk-backed buffers |
| `enable_compression` | `bool` | False | Enable data compression |
| `thread_safe` | `bool` | True | Enable thread-safe operations |

### Performance Tuning

#### Memory Buffers
- **Large Buffers**: Better throughput, higher memory usage
- **Small Buffers**: Lower latency, more frequent operations
- **Optimal Size**: 8192-16384 samples for most use cases

#### Streaming Buffers
- **Chunk Size**: 4096-8192 samples (balance memory vs. I/O)
- **Cache Size**: 10-64MB (depends on access patterns)
- **Memory Limit**: 50-200MB (based on system constraints)

#### Ring Buffers
- **Buffer Size**: 256-1024 samples for real-time
- **Larger Buffers**: Better for offline processing
- **Smaller Buffers**: Lower latency for real-time

## Performance Metrics

### Buffer Metrics

```python
metrics = buffer.get_metrics()

# Basic metrics
print(f"Buffer type: {metrics.buffer_type}")
print(f"State: {metrics.state}")
print(f"Memory usage: {metrics.memory_usage_mb:.2f}MB")

# Operation metrics
print(f"Read count: {metrics.read_count}")
print(f"Write count: {metrics.write_count}")
print(f"Bytes read: {metrics.bytes_read:,}")
print(f"Bytes written: {metrics.bytes_written:,}")

# Performance metrics
print(f"Avg read time: {metrics.avg_read_time_ms:.3f}ms")
print(f"Avg write time: {metrics.avg_write_time_ms:.3f}ms")

# Health metrics
print(f"Cache hit rate: {metrics.cache_hit_rate:.2%}")
print(f"Error count: {metrics.error_count}")
```

### System Metrics

```python
manager = AudioBufferManager()
system_metrics = manager.get_system_metrics()

print(f"Total buffers: {system_metrics['total_buffers']}")
print(f"Total memory: {system_metrics['total_memory_mb']:.2f}MB")
print(f"Buffer types: {system_metrics['buffer_types']}")
print(f"Pool statistics: {system_metrics['pool_stats']}")
```

## Best Practices

### Memory Management

1. **Choose the Right Buffer Type**
   - Use Memory buffers for small datasets (< 100MB)
   - Use Streaming buffers for large files
   - Use Ring buffers for real-time streams
   - Use Pool buffers for frequent allocation

2. **Monitor Memory Usage**
   ```python
   # Check memory regularly
   metrics = buffer.get_metrics()
   if metrics.memory_usage_mb > threshold:
       # Take action
       handle_memory_pressure()
   ```

3. **Clean Up Resources**
   ```python
   # Always close buffers when done
   buffer.close()
   manager.remove_buffer(buffer_id)
   ```

### Performance Optimization

1. **Batch Operations**
   ```python
   # Good: Process in chunks
   chunk_size = 8192
   for i in range(0, len(data), chunk_size):
       chunk = data[i:i + chunk_size]
       process_chunk(chunk)

   # Avoid: Process sample by sample
   for sample in data:
       process_sample(sample)  # Much slower
   ```

2. **Reuse Buffers**
   ```python
   # Use buffer pools for frequent operations
   config = BufferConfig(buffer_type=BufferType.POOL, ...)
   buffer = manager.create_buffer("reusable", BufferType.POOL, config)
   ```

3. **Optimize Chunk Sizes**
   ```python
   # For streaming: balance memory vs. I/O
   chunk_size = 4096  # Good starting point

   # For real-time: minimize latency
   chunk_size = 256   # Low latency

   # For batch processing: maximize throughput
   chunk_size = 16384 # High throughput
   ```

### Error Handling

1. **Graceful Degradation**
   ```python
   try:
       buffer.write(audio_data)
   except MemoryError:
       # Switch to streaming buffer
       switch_to_streaming_mode()
   ```

2. **Check Buffer State**
   ```python
   if buffer.state == BufferState.ERROR:
       handle_buffer_error(buffer.metrics.last_error)
   ```

3. **Monitor Performance**
   ```python
   if metrics.avg_read_time_ms > 10:  # 10ms threshold
       # Buffer is too slow, optimize
       optimize_buffer_performance()
   ```

## Integration Examples

### Integration with Audio Source Manager

```python
from src.audio_agent.core.audio_source_manager import AudioSourceManager

# Create audio source
source_manager = AudioSourceManager()
source_config = AudioSourceConfig(
    name="file_source",
    source_type=AudioSourceType.AUDIO_FILE,
    file_path="large_audio_file.wav"
)
source_manager.create_source(source_config)

# Create buffer for processing
buffer = create_audio_buffer(
    "processing_buffer",
    BufferType.STREAMING,
    BufferConfig(
        buffer_type=BufferType.STREAMING,
        sample_rate=44100,
        channels=2,
        max_memory_mb=50
    )
)

# Process audio from source
while True:
    audio_data = source_manager.get_source_buffer("file_source")
    if audio_data is None:
        break

    buffer.write(audio_data)
    processed_data = process_audio(audio_data)
    # Use processed_data
```

### Integration with DAW Engine

```python
from src.audio_agent.core.dawdreamer_engine import DAWDreamerEngine

# Create DAW engine
engine = DAWDreamerEngine()

# Create buffer for engine output
output_buffer = create_audio_buffer(
    "engine_output",
    BufferType.RING,
    BufferConfig(
        buffer_type=BufferType.RING,
        sample_rate=44100,
        channels=2,
        buffer_size=512
    )
)

# Process audio through DAW engine
while engine.is_processing():
    engine_output = engine.get_output()
    output_buffer.write(engine_output)

    # Read from buffer for monitoring/output
    monitor_data = output_buffer.read(256)
    send_to_output(monitor_data)
```

## Troubleshooting

### Common Issues

#### Memory Leaks
**Symptoms**: Memory usage continuously increases
**Solutions**:
- Ensure buffers are properly closed
- Use buffer pools for frequent allocation
- Monitor memory usage with `get_metrics()`

#### Performance Issues
**Symptoms**: Slow buffer operations
**Solutions**:
- Increase buffer size for better throughput
- Use appropriate chunk sizes
- Check for excessive lock contention

#### File I/O Errors
**Symptoms**: Streaming buffer failures
**Solutions**:
- Check disk space availability
- Verify file permissions
- Use appropriate chunk sizes

### Debug Information

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Now buffer operations will log detailed information
buffer = create_audio_buffer("debug_test", BufferType.MEMORY, config)
```

### Performance Profiling

```python
import time
import cProfile

# Profile buffer operations
def profile_buffer_operations():
    buffer = create_audio_buffer("profile_test", BufferType.MEMORY, config)

    start_time = time.time()
    for i in range(1000):
        data = np.random.randn(1024, 2).astype(np.float32)
        buffer.write(data)
        buffer.seek(0)
        buffer.read(1024)

    end_time = time.time()
    print(f"1000 operations took {end_time - start_time:.3f}s")

# Profile with cProfile
cProfile.run('profile_buffer_operations()')
```

## API Reference

### Core Classes

#### AudioBuffer (ABC)
Base class for all audio buffers.

**Methods**:
- `read(size=None)`: Read audio data
- `write(data)`: Write audio data
- `seek(position)`: Seek to position
- `tell()`: Get current position
- `size()`: Get buffer size
- `close()`: Close buffer
- `get_metrics()`: Get performance metrics

#### AudioBufferManager
Manages multiple audio buffers.

**Methods**:
- `create_buffer(buffer_id, buffer_type, config, **kwargs)`: Create buffer
- `get_buffer(buffer_id)`: Get existing buffer
- `remove_buffer(buffer_id)`: Remove buffer
- `get_system_metrics()`: Get system-wide metrics
- `close()`: Close all buffers

#### BufferConfig
Configuration for audio buffers.

**Parameters**:
- `buffer_type`: Type of buffer
- `sample_rate`: Sample rate in Hz
- `channels`: Number of channels
- `buffer_size`: Buffer size in samples
- `max_memory_mb`: Maximum memory usage

### Utility Functions

#### create_audio_buffer()
Convenience function to create buffers.

```python
buffer = create_audio_buffer(
    buffer_id="my_buffer",
    buffer_type=BufferType.MEMORY,
    config=config,
    size=8192
)
```

#### get_audio_buffer_manager()
Get global buffer manager instance.

```python
manager = get_audio_buffer_manager()
```

## License

This Audio Buffer Management System is provided under the MIT License. See LICENSE file for details.