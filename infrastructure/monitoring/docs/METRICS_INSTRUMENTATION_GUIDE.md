# White Room Metrics Instrumentation Guide

## Overview

This guide explains how to instrument White Room applications (JUCE backend, Swift frontend, Python tooling) with Prometheus metrics for production monitoring.

## Metrics Types

### Counter
**Use case**: Count events that only increase
- HTTP requests total
- Errors total
- Songs created
- User signups

### Gauge
**Use case**: Current value that can go up or down
- Active connections
- Memory usage
- CPU usage
- Queue length

### Histogram
**Use case**: Distribution of values (latency, request size)
- Request duration
- Response size
- Audio render time
- FFI call duration

### Summary
**Use case**: Similar to histogram but client-side calculated
- Request latency (quantiles)
- Active sessions (count/sum)

## JUCE Backend Instrumentation (C++)

### Setup

```cpp
// Include Prometheus client library
#include <prometheus/registry.h>

// Create registry
auto registry = std::make_shared<prometheus::Registry>();

// Create exposition endpoint
auto exposer = prometheus::Exposer{"*:8000"};
exposer.RegisterCollectable(registry);
```

### Counters

```cpp
// Create counter
auto& http_requests_total = prometheus::BuildCounter()
    .Name("http_requests_total")
    .Help("Total HTTP requests")
    .Labels({{"service", "juce-backend"}})
    .Register(*registry);

// Increment
http_requests_total.Add({{"method", "GET"}, {"endpoint", "/api/v1/rhythm"}}).Increment();
```

### Gauges

```cpp
// Create gauge
auto& audio_engine_render_time = prometheus::BuildGauge()
    .Name("audio_engine_render_time_seconds")
    .Help("Audio engine render time in seconds")
    .Register(*registry);

// Set value
audio_engine_render_time.Add({{"instance", "audio-engine-1"}}).Set(render_time);
```

### Histograms

```cpp
// Create histogram
auto& request_duration = prometheus::BuildHistogram()
    .Name("http_request_duration_seconds")
    .Help("HTTP request duration")
    ._buckets(prometheus::Histogram::BucketBoundaries{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1.0})
    .Register(*registry);

// Observe value
auto start = std::chrono::steady_clock::now();
// ... process request ...
auto duration = std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();
request_duration.Observe(duration);
```

### Audio Engine Metrics

```cpp
class AudioEngineMetrics {
public:
    AudioEngineMetrics(prometheus::Registry& registry)
        : render_time(prometheus::BuildGauge()
            .Name("audio_engine_render_time_seconds")
            .Help("Audio render time")
            .Register(registry)),
          xruns(prometheus::BuildCounter()
            .Name("audio_engine_xruns_total")
            .Help("Audio buffer underruns")
            .Register(registry)),
          cpu_usage(prometheus::BuildGauge()
            .Name("audio_channel_cpu_usage")
            .Help("CPU usage per channel")
            .Register(registry)) {}

    void record_render_time(double seconds) {
        render_time.Add({{"instance", "audio-engine-1"}}).Set(seconds);
    }

    void record_xrun() {
        xruns.Add({{"instance", "audio-engine-1"}}).Increment();
    }

    void record_cpu_usage(int channel, double usage) {
        cpu_usage.Add({{"channel", std::to_string(channel)}}).Set(usage);
    }

private:
    prometheus::Gauge& render_time;
    prometheus::Counter& xruns;
    prometheus::Gauge& cpu_usage;
};
```

### FFI Metrics

```cpp
class FFIMetrics {
public:
    FFIMetrics(prometheus::Registry& registry)
        : call_duration(prometheus::BuildHistogram()
            .Name("ffi_call_duration_seconds")
            .Help("FFI call duration")
            .Register(registry)),
          calls_total(prometheus::BuildCounter()
            .Name("ffi_calls_total")
            .Help("Total FFI calls")
            .Register(registry)),
          errors_total(prometheus::BuildCounter()
            .Name("ffi_errors_total")
            .Help("Total FFI errors")
            .Register(registry)) {}

    void record_call(const std::string& function, double duration, bool error) {
        call_duration.Add({{"function", function}}).Observe(duration);
        calls_total.Add({{"function", function}}).Increment();
        if (error) {
            errors_total.Add({{"function", function}}).Increment();
        }
    }

private:
    prometheus::Histogram& call_duration;
    prometheus::Counter& calls_total;
    prometheus::Counter& errors_total;
};
```

## Swift Frontend Instrumentation

### Setup

```swift
import Prometheus

// Create Prometheus client
let prometheus = PrometheusClient(storage: CollectingStore())

// Create metrics endpoint
let metricsEndpoint = MetricsEndpoint(metrics: prometheus)
```

### Counters

```swift
// Create counter
let httpRequestsTotal = Counter(
    name: "http_requests_total",
    help: "Total HTTP requests",
    labels: ["service": "swift-frontend"]
)

// Increment
httpRequestsTotal.inc(by: 1, labels: ["method": "GET", "endpoint": "/api/v1/user"])
```

### Gauges

```swift
// Create gauge
let activeConnections = Gauge(
    name: "http_active_connections",
    help: "Active HTTP connections"
)

// Set value
activeConnections.set(42.0)
```

### Histograms

```swift
// Create histogram
let requestDuration = Histogram(
    name: "http_request_duration_seconds",
    help: "HTTP request duration",
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1.0]
)

// Observe value
let start = Date()
// ... process request ...
let duration = Date().timeIntervalSince(start)
requestDuration.observe(duration)
```

### UI Metrics

```swift
class UIMetrics {
    let renderTime: Histogram
    let frameRate: Gauge
    let interactionTime: Histogram

    init() {
        self.renderTime = Histogram(
            name: "ui_render_time_seconds",
            help: "UI render time",
            buckets: [0.016, 0.033, 0.050, 0.100]  // 60fps, 30fps, 20fps, 10fps
        )

        self.frameRate = Gauge(
            name: "ui_frame_rate",
            help: "UI frame rate"
        )

        self.interactionTime = Histogram(
            name: "ui_interaction_time_seconds",
            help: "UI interaction response time"
        )
    }

    func recordRender(time: TimeInterval) {
        renderTime.observe(time)
    }

    func recordFrameRate(fps: Double) {
        frameRate.set(fps)
    }
}
```

## Python Tooling Instrumentation

### Setup

```python
from prometheus_client import start_http_server, Counter, Gauge, Histogram

# Start metrics server
start_http_server(8000)
```

### Counters

```python
# Create counter
songs_created = Counter(
    'songs_created_total',
    'Total songs created',
    ['environment']
)

# Increment
songs_created.labels(environment='production').inc()
```

### Gauges

```python
# Create gauge
active_users = Gauge(
    'active_users_total',
    'Currently active users'
)

# Set value
active_users.set(42)
```

### Histograms

```python
# Create histogram
request_duration = Histogram(
    'request_duration_seconds',
    'Request duration',
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1.0]
)

# Observe value
with request_duration.time():
    # ... process request ...
    pass
```

### Business Metrics

```python
class BusinessMetrics:
    def __init__(self):
        self.active_users = Gauge('active_users_total', 'Active users')
        self.songs_created = Counter('songs_created_total', 'Songs created', ['environment'])
        self.performances_switched = Counter('performances_switched_total', 'Performances switched')
        self.session_duration = Histogram('session_duration_seconds', 'Session duration')
        self.feature_usage = Counter('feature_usage_total', 'Feature usage', ['feature'])

    def record_user_signup(self):
        """Record new user signup"""
        user_signups.labels(environment='production').inc()

    def record_song_created(self):
        """Record song creation"""
        self.songs_created.labels(environment='production').inc()

    def record_performance_switch(self):
        """Record performance switch"""
        self.performances_switched.inc()

    def record_session_start(self):
        """Record session start (returns timer)"""
        return self.session_duration.time()

    def record_feature_usage(self, feature: str):
        """Record feature usage"""
        self.feature_usage.labels(feature=feature).inc()
```

## Metrics Best Practices

### Naming Conventions

1. **Use base units**: seconds, bytes, meters (not ms, MB, km)
2. **Use suffixes**: `_total` for counters, `_seconds` for time
3. **Snake_case**: Use underscores, not hyphens
4. **Namespace prefixes**: `http_`, `audio_`, `ffi_`, `business_`

### Labels

1. **Cardinality**: Keep label values low cardinality (<100 unique values)
2. **Consistency**: Use same labels across related metrics
3. **No user IDs**: Never include PII in labels
4. **Enums**: Use known values, not free-form text

### Metric Design

1. **Counters**: Events that only increase (requests, errors)
2. **Gauges**: Current state (memory, connections, queue length)
3. **Histograms**: Distributions (latency, request size)
4. **Avoid**: Removing metrics (use `_total` suffix for cumulative)

### Bucket Design

For histograms, choose appropriate buckets:

```cpp
// Latency (network requests)
{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1.0, 5.0}

// Audio render time
{0.001, 0.005, 0.01, 0.015, 0.020, 0.025, 0.050}

// File sizes (bytes)
{1024, 10240, 102400, 1048576, 10485760}
```

## Performance Considerations

### Metric Overhead

1. **Limit metric count**: <10,000 metrics per instance
2. **Sample high-frequency metrics**: Don't measure every sample
3. **Batch metrics**: Send metrics in batches
4. **Async collection**: Don't block on metrics collection

### Memory Usage

```cpp
// Limit histogram buckets (avoid memory blowup)
.histogram(prometheus::Histogram::BucketBoundaries{0.001, 0.01, 0.1, 1.0})

// Use summaries instead of histograms for high-cardinality
.summary(prometheus::Summary::Quantiles{{0.5, 0.9, 0.99}})
```

### Thread Safety

```cpp
// Prometheus client libraries are thread-safe
// But expensive operations should be locked
{
    std::lock_guard<std::mutex> lock(metrics_mutex);
    expensive_metric.Update(value);
}
```

## Testing Metrics

### Unit Tests

```cpp
TEST(MetricsTest, RecordsRenderTime) {
    auto registry = std::make_shared<prometheus::Registry>();
    AudioEngineMetrics metrics(*registry);

    metrics.record_render_time(0.020);

    // Verify metric was recorded
    auto collected = registry->Collect();
    ASSERT_EQ(collected.size(), 1);
}
```

### Integration Tests

```python
def test_metrics_endpoint():
    response = requests.get('http://localhost:8000/metrics')
    assert response.status_code == 200

    # Check for specific metric
    assert 'http_requests_total' in response.text
```

### Load Tests

```bash
# Verify metrics don't impact performance
ab -n 10000 -c 100 http://localhost:8000/api/v1/rhythm

# Check metrics endpoint still responsive
time curl http://localhost:8000/metrics
```

## Debugging Metrics

### Check Metric Exposure

```bash
# Verify metrics endpoint
curl http://localhost:8000/metrics

# Check Prometheus scrape
curl http://localhost:9090/api/v1/targets | jq
```

### Verify Metric Format

```bash
# Validate Prometheus metrics
prometheus-tool check-metrics metrics.txt

# Test queries
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=up'
```

### Common Issues

1. **Metric not appearing**: Check Prometheus config, verify target is up
2. **Label cardinality too high**: Reduce unique label values
3. **Metrics not scraping**: Check network, firewall, authentication
4. **Memory leak**: Limit histogram buckets, remove unused metrics

## Metrics Migration

### Gradual Rollout

1. **Add new metrics**: Deploy alongside old metrics
2. **Compare data**: Verify new metrics match old
3. **Update dashboards**: Switch to new metrics gradually
4. **Remove old metrics**: After validation period (1-2 weeks)

### Backward Compatibility

```cpp
// Old metric
auto& old_metric = prometheus::BuildCounter()
    .Name("requests_total")
    .Register(*registry);

// New metric (with labels)
auto& new_metric = prometheus::BuildCounter()
    .Name("http_requests_total")
    .Labels({{"service", "juce-backend"}})
    .Register(*registry);

// Keep both for migration period
old_metric.Increment();
new_metric.Add({{"method", "GET"}}).Increment();
```

## Resources

- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [Prometheus Client Libraries](https://prometheus.io/docs/instrumenting/clientlibs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [Exposition Formats](https://prometheus.io/docs/instrumenting/exposition_formats/)

---

**Last Updated**: 2026-01-15
**Version**: 1.0.0
**Maintained By**: DevOps Team
