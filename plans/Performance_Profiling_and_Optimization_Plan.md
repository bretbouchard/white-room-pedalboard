# Performance Profiling and Optimization Plan

## Executive Summary

This plan establishes a systematic approach to profile and optimize performance across all White Room components to meet strict real-time audio requirements and UI responsiveness targets.

## Performance Targets

### Audio Engine
- **Audio processing**: <5ms per buffer (512 samples @ 48kHz = ~10.67ms budget)
- **ProjectionEngine**: <25ms complete projection
- **Schillinger generation**: <10ms per book
- **FFI calls**: <1ms overhead
- **Memory**: <500MB working set

### UI/Frontend
- **App startup**: <3s cold start
- **Screen transitions**: <100ms
- **Touch response**: <50ms
- **Scroll performance**: 60fps (16.67ms frame budget)
- **Memory**: <200MB for UI

### File I/O
- **Load .wrs file**: <1s for 10MB file
- **Save .wrs file**: <500ms for 10MB file
- **Schema validation**: <100ms
- **Migration**: <200ms

## Phase 1: Baseline Profiling (Week 1)

### 1.1 Audio Engine Profiling

#### Tools Required
- **Instruments Time Profiler** - CPU usage, hot spots
- **Instruments System Trace** - Thread scheduling, blocking calls
- **Instruments Allocations** - Memory allocation patterns
- **Instruments Leaks** - Memory leak detection
- **Custom high-resolution timers** - Per-function timing

#### Key Components to Profile

**ProjectionEngine.cpp**
```cpp
// Add timing instrumentation
class ProjectionTimer {
    std::map<std::string, std::chrono::microseconds> timings;

    void record(const std::string& label, auto duration) {
        timings[label] += duration;
    }

    void report() {
        for (auto& [label, time] : timings) {
            std::cout << label << ": " << time.count() << "μs\n";
        }
    }
};

// Instrument key functions:
// - projectSong() - Total projection time
// - buildVoices() - Voice assignment
// - assignNotes() - Note generation
// - generateRhythmAttacks() - Rhythm generation
// - buildTimeline() - Timeline construction
```

**FFI Bridge (sch_engine_ffi.cpp)**
```cpp
// Measure FFI call overhead
- sch_engine_create()
- sch_engine_destroy()
- sch_engine_audio_init()
- sch_engine_send_command()
- sch_engine_set_performance_blend()
```

#### Profiling Scripts

```bash
# Instruments Time Profiler
instruments -t "Time Profiler" -D 30 \
  /path/to/WhiteRoom.app

# System Trace for thread analysis
instruments -t "System Trace" -D 30 \
  /path/to/WhiteRoom.app

# Memory profiling
instruments -t "Allocations" -D 30 \
  /path/to/WhiteRoom.app
```

#### Test Scenarios

1. **Cold startup** - Measure engine initialization
2. **Single projection** - Baseline projection performance
3. **Concurrent projections** - Multi-threading behavior
4. **Large songs** - Scale with complexity (10, 100, 1000 notes)
5. **Sustained load** - Memory leak detection

### 1.2 UI/Frontend Profiling

#### Tools Required
- **Instruments Core Animation** - Frame rate, rendering issues
- **Instruments Time Profiler** - Main thread blocking
- **Instruments Signposts** - Custom timeline markers
- **Xcode Organizer** - Crash logs, launch time metrics

#### Key Components to Profile

**SwiftUI Views**
```swift
// Add signposts for major operations
import os.signpost

let profiler = OSSignpostLogger(subsystem: "com.whiteroom", category: "Projection")

// Measure projection time
os_signpost(.begin, log: profiler, name: "ProjectSong")
let result = projectSong(song, performance: performance, config: config)
os_signpost(.end, log: profiler, name: "ProjectSong")

// Measure screen transitions
os_signpost(.begin, log: profiler, name: "ScreenTransition")
// Navigation code
os_signpost(.end, log: profiler, name: "ScreenTransition")
```

**Critical Views to Profile**
- `ProjectionEngine.swift` - Core projection logic
- `PerformanceEditor.swift` - Performance editing UI
- `OrderSongScreen.swift` - Song ordering interface
- `OrchestrationConsole.swift` - Console UI

#### Test Scenarios

1. **App launch** - Cold start time to interactive
2. **Screen transitions** - Navigation between views
3. **Touch response** - Button tap to visual feedback
4. **Scrolling** - List scrolling performance
5. **Large datasets** - 1000+ items in lists

### 1.3 File I/O Profiling

#### Tools Required
- **Custom timers** - Per-operation timing
- **Instruments File Activity** - Disk I/O patterns
- **Instruments System Trace** - Blocking I/O operations

#### Key Operations to Profile

```swift
// Instrument file operations
func measureFileOperation<T>(_ label: String, _ operation: () throws -> T) rethrows -> T {
    let start = CFAbsoluteTimeGetCurrent()
    let result = try operation()
    let duration = (CFAbsoluteTimeGetCurrent() - start) * 1000
    print("\(label): \(duration)ms")
    return result
}

// Profile key operations:
// - Loading .wrs files
// - Saving .wrs files
// - Schema validation
// - JSON serialization/deserialization
// - Migration operations
```

#### Test Scenarios

1. **Small files** - 1MB .wrs file
2. **Large files** - 10MB .wrs file
3. **Complex validation** - Schema with many constraints
4. **Migration** - Version upgrade scenarios

## Phase 2: Bottleneck Analysis (Week 1)

### 2.1 Bottleneck Categorization

**CPU-Bound** (Computation)
- Schillinger rhythm generation
- Melody/harmony calculation
- Voice assignment algorithms
- Graph validation (cycle detection)

**I/O-Bound** (File/Network)
- .wrs file loading/saving
- JSON parsing
- Schema validation
- Migration operations

**Memory-Bound** (Allocations)
- Swift/Obj-C object creation
- C++ memory allocations
- Buffer copies
- Intermediate data structures

**Lock-Bound** (Concurrency)
- Shared state access
- Audio thread synchronization
- FFI bridge serialization

### 2.2 Impact Prioritization

**Critical Path (Audio Processing)**
1. ProjectionEngine::projectSong() - MUST be <25ms
2. Note generation (assignNotes) - High frequency
3. Rhythm generation - Called per projection
4. FFI calls - Every audio parameter change

**User-Facing (UI Responsiveness)**
1. App startup - First impression
2. Screen transitions - Perceived performance
3. Touch response - Interactivity
4. Projection updates - Real-time editing

**Batch Operations (File I/O)**
1. File loading - User wait time
2. File saving - Background operation
3. Validation - Error detection speed

## Phase 3: Optimization (Week 2)

### 3.1 Audio Engine Optimizations

#### 3.1.1 Schillinger Generation

**Current Issues:**
- No caching of repeated calculations
- Potential memory allocations in hot path
- No SIMD optimization for vector operations
- Single-threaded execution

**Optimizations:**

```cpp
// 1. Cache rhythm attack patterns
class RhythmCache {
    std::map<uint64_t, std::vector<RhythmAttack>> cache;

    uint64_t hash(const RhythmSystem& system, double duration) {
        // Hash rhythm system parameters
        return hash;
    }

    const std::vector<RhythmAttack>& get(const RhythmSystem& system, double duration) {
        uint64_t key = hash(system, duration);
        auto it = cache.find(key);
        if (it != cache.end()) {
            return it->second;
        }

        // Generate and cache
        auto attacks = generateRhythmAttacks(system, duration);
        cache[key] = attacks;
        return cache[key];
    }
};

// 2. Pre-allocate note vectors
std::vector<AssignedNote> notes;
notes.reserve(song.instrumentIds.size() * 1000); // Reserve expected capacity

// 3. Use SIMD for vector operations (if applicable)
#include <immintrin.h>

// Parallel processing with OpenMP
#pragma omp parallel for
for (int i = 0; i < numRoles; ++i) {
    // Process each role independently
}
```

**Expected Improvement:** 40-60% reduction in rhythm generation time

#### 3.1.2 ProjectionEngine

**Current Issues:**
- No result caching
- Redundant validation
- Memory allocations in projection
- Linear graph algorithms

**Optimizations:**

```cpp
// 1. Add projection result cache
class ProjectionCache {
    struct CacheKey {
        juce::String songId;
        juce::String performanceId;
        ProjectionConfig config;

        bool operator==(const CacheKey& other) const {
            return songId == other.songId &&
                   performanceId == other.performanceId &&
                   config.validateGraph == other.config.validateGraph;
        }
    };

    std::map<CacheKey, std::shared_ptr<ProjectionResult>> cache;

    std::shared_ptr<ProjectionResult> get(const CacheKey& key) {
        auto it = cache.find(key);
        return (it != cache.end()) ? it->second : nullptr;
    }

    void put(const CacheKey& key, std::shared_ptr<ProjectionResult> result) {
        cache[key] = result;
    }
};

// 2. Lazy validation (only when needed)
if (config.validateGraph || config.isDebugBuild) {
    auto graphValidationError = validateRenderGraph(*renderGraph);
    if (graphValidationError != nullptr) {
        return ProjectionResultType::failure(graphValidationError);
    }
}

// 3. Move semantics to avoid copies
SongState appliedSong = applyPerformanceToSong(std::move(song), performance);

// 4. Reserve capacity for vectors
graph->voices.reserve(song.instrumentIds.size());
graph->assignedNotes.reserve(estimatedNoteCount);
```

**Expected Improvement:** 30-50% reduction in projection time

#### 3.1.3 FFI Bridge

**Current Issues:**
- Serialization overhead
- Lock contention
- Memory copying
- String conversions

**Optimizations:**

```cpp
// 1. Use lock-free queues for audio thread communication
#include <atomic>

template<typename T>
class LockFreeQueue {
    struct Node {
        T data;
        Node* next;
    };

    std::atomic<Node*> head;
    std::atomic<Node*> tail;

public:
    void push(T value) {
        Node* node = new Node{value, nullptr};
        Node* prev = tail.exchange(node);
        prev->next = node;
    }

    bool pop(T& value) {
        Node* node = head.load();
        if (node == tail.load()) return false;

        value = node->data;
        head = node->next;
        delete node;
        return true;
    }
};

// 2. Batch FFI operations
struct BatchCommand {
    std::vector<sch_command_t> commands;
    void execute() {
        // Send all commands in one FFI call
        sch_engine_send_command_batch(handle, commands.data(), commands.size());
    }
};

// 3. Reuse buffers to avoid allocations
class FFIBufferPool {
    std::vector<std::unique_ptr<char[]>> buffers;

public:
    char* getBuffer(size_t size) {
        for (auto& buf : buffers) {
            // Reuse if large enough
        }
        return new char[size];
    }
};
```

**Expected Improvement:** 50-70% reduction in FFI overhead

### 3.2 UI Optimizations

#### 3.2.1 Startup Time

**Current Issues:**
- Synchronous initialization
- All components loaded upfront
- Large bundle size
- No lazy loading

**Optimizations:**

```swift
// 1. Lazy load non-critical components
@lazy var libraryManager = LibraryManager()

// 2. Async initialization
class JUCEEngine {
    private init() {
        DispatchQueue.global(qos: .userInitiated).async {
            self.initializeEngine()
        }
    }
}

// 3. Reduce bundle size
// - Enable bitcode
// - Strip unused symbols
// - Use asset catalogs for images
// - Compress assets

// 4. Defer non-critical work
class AppStartup {
    func startup() {
        // Critical: Initialize engine, show UI
        initializeEngine()
        showMainWindow()

        // Deferred: Load library, check updates
        DispatchQueue.global(qos: .utility).async {
            self.loadLibrary()
            self.checkForUpdates()
        }
    }
}
```

**Expected Improvement:** 40-60% reduction in startup time

#### 3.2.2 SwiftUI Rendering

**Current Issues:**
- Unnecessary redraws
- Complex view hierarchies
- No view caching
- Main thread blocking

**Optimizations:**

```swift
// 1. Use @ViewBuilder to reduce view overhead
struct PerformanceStrip: View {
    @ViewBuilder
    var body: some View {
        if showDetails {
            DetailedView(performance)
        } else {
            SimpleView(performance)
        }
    }
}

// 2. Equatable for view diffing
struct PerformanceCard: View, Equatable {
    let performance: PerformanceInfo

    static func == (lhs: Self, rhs: Self) -> Bool {
        return lhs.performance.id == rhs.performance.id
    }
}

// 3. LazyVStack for large lists
LazyVStack(spacing: 8) {
    ForEach(performances) { performance in
        PerformanceCard(performance: performance)
    }
}

// 4. DrawingGroup for complex rendering
struct ComplexVisual: View {
    var body: some View {
        // Render once to offscreen buffer
        DrawingGroup() {
            // Complex visual content
        }
    }
}

// 5. Offload work to background
@State private var projectionResult: ProjectionResult?

var body: some View {
    VStack {
        if let result = projectionResult {
            ProjectionView(result: result)
        } else {
            ProgressView()
        }
    }
    .onAppear {
        DispatchQueue.global(qos: .userInitiated).async {
            let result = projectSong(song, performance: performance, config: config)
            DispatchQueue.main.async {
                self.projectionResult = result
            }
        }
    }
}
```

**Expected Improvement:** 60fps sustained during complex interactions

### 3.3 File I/O Optimizations

#### 3.3.1 Loading

**Current Issues:**
- Synchronous file reading
- JSON parsing on main thread
- No streaming for large files
- No compression

**Optimizations:**

```swift
// 1. Async file loading
class SongLoader {
    func loadSong(from url: URL) async throws -> Song {
        // Read on background thread
        let data = try Data(contentsOf: url, options: .mappedIfSafe)

        // Parse on background thread
        let song = try JSONDecoder().decode(Song.self, from: data)
        return song
    }
}

// 2. Streaming for large files
class StreamingSongLoader {
    func loadLargeSong(from url: URL) async throws -> Song {
        // Stream JSON chunks
        for try await chunk in url.chunks {
            // Parse incrementally
        }
    }
}

// 3. Compression for .wrs files
extension Song {
    func saveCompressed(to url: URL) throws {
        let data = try JSONEncoder().encode(self)
        let compressed = try (data as NSData).compressed(using: .zlib)
        try compressed.write(to: url)
    }
}

// 4. Caching for frequently accessed songs
class SongCache {
    private var cache = NSCache<NSString, Song>()

    func getSong(id: String) -> Song? {
        return cache.object(forKey: id as NSString)
    }

    func setSong(_ song: Song, id: String) {
        cache.setObject(song, forKey: id as NSString)
    }
}
```

**Expected Improvement:** 50-70% reduction in load time

#### 3.3.2 Saving

**Current Issues:**
- Blocking save operations
- No incremental saves
- No compression
- Main thread blocking

**Optimizations:**

```swift
// 1. Async save with progress
class SongSaver {
    func saveSong(_ song: Song, to url: URL) async throws {
        // Encode on background thread
        let data = try JSONEncoder().encode(song)

        // Write with progress
        var bytesWritten = 0
        try data.withUnsafeBytes { bytes in
            try bytes.withContiguousStorageIfAvailable { buffer in
                for chunk in buffer.chunked(into: 1024 * 1024) { // 1MB chunks
                    try chunk.write(to: url)
                    bytesWritten += chunk.count
                    let progress = Double(bytesWritten) / Double(buffer.count)
                    await updateProgress(progress)
                }
            }
        }
    }
}

// 2. Incremental saves
class IncrementalSaver {
    func saveChanges(_ changes: [SongChange], to url: URL) throws {
        // Save only changed parts
        let patch = createPatch(from: originalSong, changes: changes)
        try patch.append(to: url)
    }
}

// 3. Background autosave
class AutosaveManager {
    func scheduleAutosave(for song: Song) {
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 30) {
            try? self.saveSong(song, to: autosaveURL)
        }
    }
}
```

**Expected Improvement:** 60-80% reduction in save time

## Phase 4: Validation (Week 2)

### 4.1 Re-profiling

**Before/After Comparison:**
- Run same profiling scenarios as Phase 1
- Generate performance improvement report
- Verify all targets met

**Key Metrics to Compare:**
- ProjectionEngine::projectSong() - Target: <25ms
- Rhythm generation - Target: <5ms
- FFI call overhead - Target: <1ms
- App startup - Target: <3s
- Screen transitions - Target: <100ms
- File loading - Target: <1s (10MB)

### 4.2 Regression Testing

**Performance Tests:**
```swift
class PerformanceTests: XCTestCase {
    func testProjectionPerformance() {
        let song = createTestSong(noteCount: 1000)
        let performance = createTestPerformance()

        measure {
            _ = projectSong(song, performance: performance, config: .realtime())
        }
    }

    func testFileLoadingPerformance() {
        let url = testFileURL(size: 10_000_000) // 10MB

        measure {
            _ = try! SongLoader().loadSong(from: url)
        }
    }
}
```

### 4.3 Continuous Monitoring

**In-App Performance Metrics:**
```swift
class PerformanceMonitor {
    static let shared = PerformanceMonitor()

    func recordMetric(_ name: String, duration: TimeInterval) {
        // Log to analytics
        analytics.logEvent("performance_metric", parameters: [
            "name": name,
            "duration_ms": duration * 1000
        ])

        // Alert if threshold exceeded
        let thresholds = [
            "ProjectionEngine.projectSong": 0.025, // 25ms
            "FileLoader.loadSong": 1.0, // 1s
            "ScreenTransition": 0.1 // 100ms
        ]

        if let threshold = thresholds[name], duration > threshold {
            NSLog("⚠️ Performance regression: \(name) took \(duration)s (threshold: \(threshold)s)")
        }
    }
}
```

**Automated Benchmarking:**
```python
# CI/CD performance benchmarks
#!/bin/bash

# Run performance tests
xcodebuild test -scheme WhiteRoom -destination 'platform=iOS Simulator,name=iPhone 15'

# Check for regressions
python3 check_performance_regressions.py

# Fail build if regression detected
if [ $? -ne 0 ]; then
    echo "Performance regression detected!"
    exit 1
fi
```

## Deliverables

1. **Performance Baseline Report** (end of Week 1)
   - All components profiled
   - Current performance metrics
   - Bottleneck identification

2. **Optimization Implementation** (Week 2)
   - All optimizations applied
   - Code changes documented
   - Tests updated

3. **Performance Improvement Report** (end of Week 2)
   - Before/after comparisons
   - Targets verification
   - Regression analysis

4. **Continuous Monitoring Setup** (end of Week 2)
   - In-app metrics collection
   - CI/CD benchmarks
   - Alerting system

## Success Criteria

- [ ] All audio targets met (<5ms, <25ms)
- [ ] All UI targets met (60fps, <100ms)
- [ ] All I/O targets met (<1s load)
- [ ] No regressions in existing functionality
- [ ] Continuous monitoring in place
- [ ] Performance tests passing in CI/CD
- [ ] Documentation updated

## Risk Mitigation

**Risk:** Optimizations break functionality
**Mitigation:** Comprehensive regression testing, code review

**Risk:** Performance improvements not sufficient
**Mitigation:** Early profiling, iterative optimization, fallback plans

**Risk:** Memory usage increases
**Mitigation:** Memory profiling, allocation tracking, leak detection

## Timeline

- **Week 1, Days 1-3:** Baseline profiling
- **Week 1, Days 4-5:** Bottleneck analysis
- **Week 2, Days 1-3:** Optimization implementation
- **Week 2, Days 4-5:** Validation and monitoring setup

## Next Steps

1. Begin baseline profiling with Instruments
2. Set up performance test suite
3. Identify critical bottlenecks
4. Implement high-priority optimizations
5. Validate improvements
6. Set up continuous monitoring

---

**Performance Benchmarker**: Professional performance analysis and optimization

**Status**: READY TO BEGIN PROFILING

**Confidence**: HIGH - Systematic approach with clear targets and validation
