# Performance Profiling Quick Start Guide

Get started with performance profiling in 5 minutes!

## Step 1: Add Instrumentation to Your Code (2 minutes)

### C++ Code (ProjectionEngine.cpp)

```cpp
// Add at top of file
#include "audio/ProjectionTimer.h"

class ProjectionEngine {
private:
    ProjectionTimer profiler;

public:
    ProjectionResultType projectSong(...) {
        PROFILE_SCOPE(profiler, "projectSong");

        // Your existing code
        auto songError = validateSong(songState);
        // ...
    }
};

// Add at end of function or in test code
profiler.report();
profiler.checkThresholds();
```

### Swift Code (ProjectionEngine.swift)

```swift
// Wrap any code block
let result = profile("ProjectionEngine.projectSong") {
    projectSong(song, performance: performance, config: config)
}

// Or use scope-based timer
let _ = ProfileScope(label: "projectSong")
// Your existing code

// Print report
PerformanceProfiler.shared.report()
```

## Step 2: Run Profiling Script (1 minute)

```bash
cd /Users/bretbouchard/apps/schill/white_room
./infrastructure/performance/run_profiling.sh
```

This will:
- Build all components with profiling flags
- Run Instruments Time Profiler (CPU)
- Run Instruments Allocations (Memory)
- Run Instruments System Trace (Threads)
- Run gprof analysis (C++ call graph)
- Run performance benchmarks
- Check for memory leaks
- Generate comprehensive report

## Step 3: View Results (1 minute)

### Open in Instruments
```bash
open performance_results/cpu_profile.trace
open performance_results/memory_profile.trace
open performance_results/system_trace.trace
```

### Read Summary Report
```bash
cat performance_results/performance_report.md
```

### Check Thresholds
```bash
python3 infrastructure/performance/check_regressions.py \
    --results-dir performance_results
```

## Step 4: Analyze Bottlenecks (1 minute)

Look for:
- **Red metrics** - Failed thresholds (critical)
- **Yellow metrics** - Warning zones (caution)
- **High self time** - Functions doing actual work
- **High call count** - Functions called frequently
- **Memory allocations** - Allocation hotspots

## Step 5: Optimize and Validate

1. Implement optimization
2. Re-run profiling script
3. Compare before/after
4. Update baseline

```bash
# Save current performance as baseline
python3 infrastructure/performance/check_regressions.py \
    --results-dir performance_results \
    --save-baseline baseline.json

# After optimization, check for regressions
python3 infrastructure/performance/check_regressions.py \
    --results-dir performance_results \
    --baseline baseline.json
```

## Common Performance Issues

### Issue: ProjectionEngine too slow
**Solution**: Cache rhythm patterns, pre-allocate vectors

### Issue: UI janky during scrolling
**Solution**: Use LazyVStack, reduce view hierarchy depth

### Issue: File loading slow
**Solution**: Async loading, streaming, compression

### Issue: Memory increasing over time
**Solution**: Check for leaks, reduce allocations, reuse buffers

## Performance Targets Checklist

- [ ] ProjectionEngine::projectSong() < 25ms
- [ ] Audio processing < 5ms per buffer
- [ ] FFI calls < 1ms overhead
- [ ] App startup < 3s
- [ ] Screen transitions < 100ms
- [ ] Touch response < 50ms
- [ ] File load (10MB) < 1s
- [ ] File save (10MB) < 500ms

## Need Help?

- **Full Documentation**: See `PROFILING_INSTRUMENTATION_GUIDE.md`
- **Detailed Plan**: See `Performance_Profiling_and_Optimization_Plan.md`
- **Implementation Summary**: See `Performance_Profiling_Summary.md`

## Key Files

- **C++ Profiler**: `juce_backend/include/audio/ProjectionTimer.h`
- **Swift Profiler**: `swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/Performance/PerformanceProfiler.swift`
- **Profiling Script**: `infrastructure/performance/run_profiling.sh`
- **Regression Checker**: `infrastructure/performance/check_regressions.py`

## Troubleshooting

### "Command not found: instruments"
**Solution**: Instruments only available on macOS. Use Xcode Instruments app.

### "No profiling data found"
**Solution**: Ensure you've built with profiling flags and run the app.

### "Performance thresholds not met"
**Solution**: This is expected initially! Focus on worst offenders first.

### "gprof not found"
**Solution**: Install binutils or skip C++ profiling (comment out gprof section).

## Next Steps

1. ✅ Add instrumentation to critical paths
2. ✅ Run profiling script
3. ✅ Analyze results
4. ✅ Implement top 3 optimizations
5. ✅ Validate improvements
6. ✅ Set up continuous monitoring

---

**Ready to profile? Run this now:**

```bash
cd /Users/bretbouchard/apps/schill/white_room
./infrastructure/performance/run_profiling.sh
```

**Status**: Infrastructure complete, ready for profiling!
**Issue**: white_room-412
