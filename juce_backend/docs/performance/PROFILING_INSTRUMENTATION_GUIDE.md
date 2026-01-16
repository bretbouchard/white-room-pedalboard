# Performance Profiling Instrumentation Guide

This guide demonstrates how to use the profiling instrumentation in White Room components.

## C++ Instrumentation (ProjectionEngine)

### 1. Basic Usage

```cpp
// In ProjectionEngine.cpp
#include "audio/ProjectionTimer.h"

class ProjectionEngine {
private:
    ProjectionTimer profiler;

public:
    ProjectionResultType projectSong(
        const SongState& songState,
        const PerformanceState& performance,
        const ProjectionConfig& config)
    {
        // Profile entire function
        PROFILE_SCOPE(profiler, "projectSong");

        // Profile individual stages
        {
            PROFILE_SCOPE(profiler, "validateSong");
            auto songError = validateSong(songState);
            if (songError != nullptr) {
                return ProjectionResultType::failure(songError);
            }
        }

        {
            PROFILE_SCOPE(profiler, "validatePerformance");
            auto perfError = validatePerformance(performance, songState);
            if (perfError != nullptr) {
                return ProjectionResultType::failure(perfError);
            }
        }

        // ... rest of function
    }
};
```

### 2. Manual Recording

```cpp
std::vector<AssignedNote> ProjectionEngine::assignNotes(
    const SongState& song,
    const PerformanceState& performance)
{
    PROFILE_SCOPE(profiler, "assignNotes");

    std::vector<AssignedNote> notes;

    // Profile rhythm generation
    auto start = std::chrono::high_resolution_clock::now();
    auto rhythmAttacks = generateRhythmAttacks(rhythmSystem, duration);
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    profiler.record("generateRhythmAttacks", duration.count());

    // Profile melody generation
    PROFILE_SCOPE(profiler, "generateMelody");
    // ... melody generation code

    return notes;
}
```

### 3. Reporting and Thresholds

```cpp
// In your main loop or test code
void runPerformanceTests() {
    ProjectionEngine engine;
    ProjectionTimer& profiler = engine.getProfiler();

    // Run 100 iterations
    for (int i = 0; i < 100; ++i) {
        auto result = engine.projectSong(testSong, testPerformance, testConfig);
    }

    // Print report
    profiler.report();

    // Check thresholds
    bool allPassed = profiler.checkThresholds();

    if (!allPassed) {
        std::cerr << "Performance thresholds not met!\n";
    }
}
```

## Swift Instrumentation (UI/Frontend)

### 1. Basic Usage

```swift
import Foundation

// In your Swift code
let result = profile("ProjectionEngine.projectSong") {
    projectSong(song, performance: performance, config: config)
}
```

### 2. Async Profiling

```swift
// For async operations
let song = try await profileAsync("FileLoader.loadSong") {
    try await SongLoader().loadSong(from: url)
}
```

### 3. Scope-Based Timer

```swift
func projectSong(
    _ song: Song,
    performance: PerformanceState,
    config: ProjectionConfig
) -> Result<ProjectionResult, ProjectionError> {

    let _ = ProfileScope(label: "projectSong")

    // Stage 1: Validation
    let _ = ProfileScope(label: "validateSong")
    let songValidation = validateSong(song)

    // Stage 2: Performance Application
    let _ = ProfileScope(label: "applyPerformance")
    let appliedSong = try? applyPerformanceToSong(song, performance: performance)

    // ... rest of function
}
```

### 4. Manual Recording

```swift
func loadSong(from url: URL) async throws -> Song {
    let start = Date()

    // Read file
    let data = try Data(contentsOf: url)

    let readTime = Date().timeIntervalSince(start) * 1000
    PerformanceProfiler.shared.recordTiming("File Reading", duration: readTime)

    // Parse JSON
    let parseStart = Date()
    let song = try JSONDecoder().decode(Song.self, from: data)

    let parseTime = Date().timeIntervalSince(parseStart) * 1000
    PerformanceProfiler.shared.recordTiming("JSON Parsing", duration: parseTime)

    return song
}
```

### 5. Reporting and Thresholds

```swift
// In your test code or debug menu
func printPerformanceReport() {
    PerformanceProfiler.shared.report()
    let allPassed = PerformanceProfiler.shared.checkThresholds()

    if !allPassed {
        print("⚠️ Performance thresholds not met!")
    }
}
```

## Running the Profiling Script

### Full Profiling

```bash
cd /Users/bretbouchard/apps/schill/white_room
./infrastructure/performance/run_profiling.sh
```

This will:
1. Build all components with profiling flags
2. Run Instruments Time Profiler (CPU)
3. Run Instruments Allocations (Memory)
4. Run Instruments System Trace (Thread scheduling)
5. Run gprof analysis (C++ call graph)
6. Run performance benchmarks
7. Generate comprehensive report

### Quick Profiling (CPU only)

```bash
# Build
cd /Users/bretbouchard/apps/schill/white_room/juce_backend
cmake -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build build --config RelWithDebInfo

# Run gprof
cd build
./your_test_binary
gprof your_test_binary gmon.out > analysis.txt

# View hotspots
cat analysis.txt | grep -A 20 "time   seconds"
```

### Instruments Profiling (GUI)

```bash
# Open Instruments with your app
open -a "Instruments" /path/to/WhiteRoom.app
```

Then:
1. Select "Time Profiler" template
2. Click record
3. Exercise the app
4. Stop recording
5. Analyze call tree and hotspots

## Interpreting Results

### CPU Profiling

**Look for:**
- Functions with high self time (actual work done there)
- Functions with high total time (including children)
- Functions called frequently (optimization targets)

**Red flags:**
- ProjectionEngine::projectSong() > 25ms
- assignNotes() > 15ms
- FFI calls > 1ms

### Memory Profiling

**Look for:**
- Peak memory usage
- Allocation rate (allocations/sec)
- Memory leaks (leaking objects)
- Temporary allocations (high churn)

**Red flags:**
- Working set > 500MB for audio engine
- Working set > 200MB for UI
- Memory leaks increasing over time

### System Trace

**Look for:**
- Thread blocking (main thread blocked)
- Thread contention (lock waits)
- Excessive context switching
- Thread starvation (audio thread not running)

**Red flags:**
- Main thread blocked > 16ms (missed 60fps)
- Audio thread blocked > 5ms (audio glitches)
- Lock waits > 1ms (contention)

## Optimization Workflow

1. **Profile**: Run profiling script
2. **Analyze**: Review report and identify bottlenecks
3. **Prioritize**: Focus on critical path first
4. **Optimize**: Implement targeted optimizations
5. **Validate**: Re-profile to verify improvements
6. **Repeat**: Continue until targets met

## Continuous Monitoring

### Add to CI/CD

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Profiling
        run: ./infrastructure/performance/run_profiling.sh
      - name: Check Regressions
        run: |
          python3 infrastructure/performance/check_regressions.py
```

### In-App Monitoring

```swift
// In debug builds, show performance metrics
#if DEBUG
let stats = PerformanceProfiler.shared.getStats(for: "projectSong")
if stats?.p99Microseconds ?? 0 > 25000 {
    showAlert("Performance regression detected: projectSong took \(stats?.p99Microseconds ?? 0)μs")
}
#endif
```

## Common Patterns

### Cache Expensive Computations

```cpp
// Before: Recalculate every time
std::vector<RhythmAttack> attacks = generateRhythmAttacks(system, duration);

// After: Cache with hash-based lookup
class RhythmCache {
    std::map<uint64_t, std::vector<RhythmAttack>> cache;

public:
    const std::vector<RhythmAttack>& get(
        const RhythmSystem& system,
        double duration)
    {
        uint64_t key = hash(system, duration);
        auto it = cache.find(key);
        if (it != cache.end()) {
            return it->second;
        }

        auto attacks = generateRhythmAttacks(system, duration);
        cache[key] = attacks;
        return cache[key];
    }
};
```

### Reduce Allocations

```cpp
// Before: Allocate in loop
for (int i = 0; i < 1000; ++i) {
    std::vector<Note> notes;
    notes.reserve(100);
    // ... fill notes
}

// After: Pre-allocate once
std::vector<Note> notes;
notes.reserve(100 * 1000);
for (int i = 0; i < 1000; ++i) {
    // ... fill notes
}
```

### Parallelize Independent Work

```cpp
// Before: Sequential
for (int i = 0; i < numRoles; ++i) {
    processRole(i);
}

// After: Parallel (with OpenMP)
#pragma omp parallel for
for (int i = 0; i < numRoles; ++i) {
    processRole(i);
}
```

## Performance Targets Summary

| Component | Metric | Target | Priority |
|-----------|--------|--------|----------|
| ProjectionEngine | projectSong() | <25ms | CRITICAL |
| Rhythm Generation | generateRhythmAttacks() | <5ms | HIGH |
| Note Assignment | assignNotes() | <15ms | HIGH |
| FFI Bridge | Call overhead | <1ms | HIGH |
| UI Startup | Cold start | <3s | HIGH |
| Screen Transitions | Navigation | <100ms | MEDIUM |
| Touch Response | Button tap | <50ms | MEDIUM |
| File I/O | Load 10MB | <1s | MEDIUM |
| File I/O | Save 10MB | <500ms | LOW |

## Troubleshooting

### Profiling overhead too high

**Solution**: Use sampling instead of instrumentation
```bash
# Instruments with lower sampling rate
instruments -t "Time Profiler" -sampling-interval 1ms
```

### Can't find performance issue

**Solution**: Use system trace to find blocking calls
```bash
instruments -t "System Trace"
# Look for thread blocking and lock contention
```

### Memory leak false positives

**Solution**: Use leaks tool with --atExit flag
```bash
leaks --atExit -- ./your_app
```

## Resources

- [Instruments User Guide](https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/InstrumentsUserGuide/)
- [gprof documentation](https://sourceware.org/binutils/docs/gprof/)
- [os_signpost documentation](https://developer.apple.com/documentation/os/logging)
- [Performance Best Practices](https://developer.apple.com/documentation/xcode/improving-your-app-s-performance)

---

**Last Updated**: January 15, 2026
**Status**: Active
