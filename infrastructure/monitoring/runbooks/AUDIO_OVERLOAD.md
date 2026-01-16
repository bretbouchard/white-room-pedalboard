# Audio Processing Overload Runbook

## Alert
**Alert Name**: AudioProcessingOverload
**Severity**: High (P1)
**Priority**: 1

## Threshold
- Audio render time exceeds 25ms threshold
- Sustained for 2+ minutes

## Symptoms
- Audio glitches or dropouts
- High CPU usage on audio thread
- XRUNs (buffer underruns) detected
- Poor user experience

## Impact
- Degraded audio quality
- Users may hear pops, clicks, or dropouts
- Recording/playback may be unusable
- Professional users will be severely impacted

## Diagnosis Steps

### 1. Check Audio Engine Metrics
```bash
# Check render time
curl http://localhost:8000/metrics | grep audio_engine_render_time

# Check XRUN rate
curl http://localhost:8000/metrics | grep audio_engine_xruns

# Check CPU per channel
curl http://localhost:8000/metrics | grep audio_channel_cpu
```

### 2. Check System CPU
```bash
# Check CPU usage
top -p $(pgrep -f "audio engine")

# Check CPU affinity
taskset -c -p $(pgrep -f "audio engine")

# Check thread priority
ps -eTo pid,tid,class,rtprio,comm | grep audio
```

### 3. Check Audio Configuration
```bash
# Check buffer size
# (Read from config or logs)

# Check sample rate
# (Read from config or logs)

# Check active channels
curl http://localhost:8000/api/v1/audio/channels
```

### 4. Profile Audio Code
```bash
# Run profiler
./infrastructure/performance/run_profiling.sh

# Check for DSP bottlenecks
# (Look for high CPU in specific plugins)
```

## Resolution Steps

### Phase 1: Immediate Mitigation (Minutes 0-5)

#### Reduce DSP Load
```bash
# Disable non-critical effects
curl -X POST http://localhost:8000/api/v1/audio/effects/disable \
  -H "Content-Type: application/json" \
  -d '{"effect": "reverb"}'

# Reduce plugin count
curl -X POST http://localhost:8000/api/v1/audio/channels/\
  $(channel_id)/plugins/disable \
  -H "Content-Type: application/json"
```

#### Increase Buffer Size
```bash
# Double buffer size (temporary fix)
curl -X POST http://localhost:8000/api/v1/audio/configure \
  -H "Content-Type: application/json" \
  -d '{"buffer_size": 512}'

# Note: This increases latency
```

#### Optimize Thread Priority
```bash
# Set real-time priority
chrt -f -p 95 $(pgrep -f "audio engine")

# Set CPU affinity
taskset -p 0xFF $(pgrep -f "audio engine")
```

### Phase 2: Root Cause Analysis (Minutes 5-15)

#### Common Causes
1. **Too Many Active Channels**
   - Check channel count
   - Disable unused channels
   - Implement channel limiting

2. **Heavy DSP Plugins**
   - Identify CPU-heavy plugins
   - Optimize plugin code
   - Add DSP load monitoring

3. **FFI Overhead**
   - Check FFI call latency
   - Batch FFI calls
   - Cache FFI results

4. **Lock Contention**
   - Check for mutex locks in audio thread
   - Remove locks from audio path
   - Use lock-free data structures

5. **Background Processing**
   - Check for heavy work on audio thread
   - Move to worker thread
   - Use async I/O

#### Debugging Tools
```bash
# Profile audio render
./infrastructure/performance/run_profiling.sh

# Check FFI latency
curl http://localhost:8000/metrics | grep ffi_call_duration

# Look for blocking calls
sudo strace -p $(pgrep -f "audio engine") -c
```

### Phase 3: Long-Term Fixes (Post-Incident)

#### 1. Implement Dynamic Quality Scaling
```cpp
// Auto-reduce quality when overloaded
if (render_time > threshold) {
    disable_non_critical_effects();
    reduce_plugin_quality();
}
```

#### 2. Add Plugin Load Monitoring
```cpp
// Track CPU usage per plugin
plugin_cpu_usage[plugin_id] = measure_plugin_cpu();

// Warn if plugin exceeds limit
if (plugin_cpu_usage[plugin_id] > MAX_PLUGIN_CPU) {
    log_warning("Plugin overload", plugin_id);
}
```

#### 3. Optimize FFI Layer
```cpp
// Batch FFI calls
batch_ffi_calls();

// Cache results
cache_ffi_result(key, value);

// Use shared memory
shared_memory_buffer = create_shm();
```

#### 4. Implement Adaptive Buffer Size
```cpp
// Increase buffer when overloaded
if (xrun_count > threshold) {
    buffer_size *= 2;
}

// Decrease when stable
if (render_time < target / 2) {
    buffer_size /= 2;
}
```

#### 5. Add Load Shedding
```cpp
// Drop non-critical processing
if (render_time > threshold) {
    skip_ui_updates();
    skip_logging();
    skip_analytics();
}
```

## Prevention

### 1. Set Up Pre-Warning Alerts
```yaml
- alert: AudioRenderTimeHigh
  expr: audio_engine_render_time_seconds > 0.020
  for: 1m
  annotations:
    summary: "Audio render time approaching overload"
```

### 2. Implement Quality of Service
```cpp
// Prioritize critical audio processing
class AudioProcessor {
    void process() {
        // Critical: Always process
        process_audio();

        // Important: Process if time permits
        if (time_remaining > 5ms) {
            process_effects();
        }

        // Optional: Skip if overloaded
        if (time_remaining > 10ms) {
            update_ui();
        }
    }
};
```

### 3. Add Performance Testing
```bash
# Load test audio engine
./tests/audio_load_test.sh --channels 32 --plugins 10

# Stress test FFI
./tests/ffi_stress_test.sh --calls 10000

# Regression test
./infrastructure/performance/check_regressions.py
```

### 4. Optimize Build
```bash
# Use release builds
cmake -DCMAKE_BUILD_TYPE=Release ..

# Enable optimizations
cmake -DCMAKE_CXX_FLAGS="-O3 -march=native" ..

# Profile-guided optimization
cmake -DCMAKE_CXX_FLAGS="-fprofile-generate" ..
# Run application
cmake -DCMAKE_CXX_FLAGS="-fprofile-use" ..
```

## Verification

### After Resolution
```bash
# Check render time is back to normal
curl http://localhost:8000/metrics | grep audio_engine_render_time

# Verify no XRUNs
curl http://localhost:8000/metrics | grep audio_engine_xruns

# Run audio quality tests
./tests/audio_quality_test.sh
```

### Monitor for Recurrence
- Watch audio render time dashboard
- Monitor XRUN rate
- Check user reports of audio issues
- Review performance metrics weekly

## Related Runbooks
- [High CPU Usage](./HIGH_CPU.md)
- [FFI Latency High](./FFI_LATENCY.md)
- [Performance Profiling](./../performance/PROFILING_GUIDE.md)

## Contacts
- **Audio Team**: audio-team@white-room.ai
- **On-Call**: on-call@white-room.ai
- **Performance Lead**: performance-lead@white-room.ai

## Last Updated
2026-01-15 12:00:00 UTC

## Change History
| Date | Changed By | Description |
|------|-----------|-------------|
| 2026-01-15 | DevOps Team | Initial runbook creation |
