# WebSocket Analysis Integration Tests

## Overview

This directory contains the RED phase implementation of the WebSocket Integration component for real-time audio analysis broadcasting.

## RED Phase Status: ✅ COMPLETE

### What's Been Implemented

1. **Comprehensive Test Suite** (`AnalysisWebSocketTests.cpp`)
   - 15 failing tests covering JSON serialization, real-time broadcasting, client management
   - Tests for all 5 analyzer types: CoreDSP, Pitch, Dynamics, Spatial, Quality
   - Performance tests for latency (<5ms) and throughput (>100 msg/sec)
   - Error handling and WebSocket protocol compliance tests

2. **WebSocket Handler Classes** (`../include/websocket/AnalysisWebSocketHandler.h`)
   - `AnalysisWebSocketHandler` - Main broadcasting handler
   - `AnalysisClient` - Client connection and subscription management
   - `AnalysisMessage` - Message structure for analysis results
   - Complete API definition with performance monitoring

3. **Minimal Implementation** (`../src/websocket/AnalysisWebSocketHandler.cpp`)
   - RED phase minimal implementation that compiles but will fail tests
   - Placeholder functionality ready for GREEN phase implementation

## How to Run Tests (GREEN Phase)

```bash
# Build the tests
cd tests/websocket/build
cmake .. -DCMAKE_BUILD_TYPE=Debug
make AnalysisWebSocketTests

# Run the tests
./AnalysisWebSocketTests

# Or use the custom target
make run_websocket_analysis_tests
```

## Integration Points

### Analyzer Types Supported
- **CoreDSPAnalyzer**: Spectral analysis (centroid, rolloff, flux)
- **PitchDetector**: Pitch detection (frequency, confidence, MIDI note)
- **DynamicsAnalyzer**: Dynamics analysis (LUFS, dynamic range, crest factor)
- **SpatialAnalyzer**: Spatial analysis (stereo width, correlation, imaging)
- **QualityDetector**: Quality detection (noise, clipping, DC offset)

### WebSocket Features
- Real-time JSON broadcasting of analysis results
- Client subscription to specific analysis types
- Multi-client connection support
- Rate limiting and performance monitoring
- Error handling and graceful disconnections

## Performance Requirements

- **Latency**: <5ms for message broadcasting
- **Throughput**: >100 messages/second
- **Concurrency**: 10+ simultaneous clients
- **Memory**: <10MB growth under load

## Next Steps

The RED phase is complete and ready for GREEN phase implementation where:
1. Actual WebSocket server functionality will be implemented
2. JSON serialization will be completed for all analyzer types
3. Real-time broadcasting with low latency will be implemented
4. Client subscription management will be fully functional
5. All tests will be modified to remove `DISABLED` prefix and pass

## Files

- `AnalysisWebSocketTests.cpp` - Comprehensive test suite (15 tests)
- `../include/websocket/AnalysisWebSocketHandler.h` - Class definitions
- `../src/websocket/AnalysisWebSocketHandler.cpp` - RED phase implementation
- `CMakeLists.txt` - Build configuration
- `README.md` - This documentation