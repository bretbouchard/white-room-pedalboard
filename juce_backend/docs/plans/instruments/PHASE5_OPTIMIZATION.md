# Phase 5: Performance Optimization Plan

**Date:** December 31, 2025
**Status:** 🟡 IN PROGRESS
**Goal:** Optimize DSP instruments for <10% CPU usage

---

## Overview

Phase 5 focuses on performance optimization of instrument DSP code through:
- **SIMD vectorization** for parallel sample processing
- **Fast math approximations** for trigonometric functions
- **Memory pool management** to reduce allocation overhead
- **CPU profiling** to identify and optimize bottlenecks

---

## Current Performance Baselines (from Phase 4A)

| Instrument | CPU % | Status | Target |
|-----------|-------|--------|--------|
| NexSynth | 12.6% | ✅ Within budget (15%) | <10% |
| LocalGal | 2.9% | ✅ Excellent (6%) | Maintain |
| KaneMarco | 2.6% | ✅ Excellent (7%) | Maintain |
| KaneMarcoAether | 5.1% | ✅ Good (10%) | Maintain |
| SamSampler | 0.3% | ✅ Excellent (8%) | Maintain |

**Primary target:** NexSynth (highest CPU usage)

---

## Optimization Strategy

### 1. Fast Math Approximations

#### sin() Optimization
**Current:** `std::sin(2.0 * M_PI * phase)` called ~50,000 times/second
**Approach:** Parabolic approximation with 0.1% error

```cpp
// Fast sin approximation (3x faster than std::sin)
inline float fastSin(float x)
{
    // Wrap to [0, 2π]
    constexpr float TWO_PI = 2.0f * M_PI;
    x = fmodf(x, TWO_PI);
    if (x < 0.0f) x += TWO_PI;

    // Parabolic approximation
    if (x < M_PI)
    {
        return 4.0f / M_PI * x * (1.0f - x / M_PI);
    }
    else
    {
        float y = x - M_PI;
        return 4.0f / M_PI * y * (1.0f - y / M_PI);
    }
}
```

**Expected speedup:** 3-4x faster than std::sin
**Error:** <0.1% (inaudible for audio)

#### pow(2.0, x) Optimization
**Current:** `std::pow(2.0, detune/1200.0)` called every sample
**Approach:** Precompute or use exp2(x) = exp2(x) = 2^x

```cpp
// Fast pow2 approximation (using exp2 intrinsic)
inline float fastPow2(float x)
{
    // x * log2(e) = x * 1.4427f
    return std::exp(x * 1.4426950408889634f); // ln(2)
}

// Or precompute for detune values:
// Since detune is parameter, compute when parameter changes
double detuneFactor = std::exp((detune / 1200.0) * 0.6931471805599453); // ln(2)
```

**Expected speedup:** 5-10x faster than std::pow

### 2. SIMD Vectorization

#### Buffer Operations (SSE/AVX)
**Current:** Sample-by-sample loops
**Target:** Process 8 samples at once with AVX256

```cpp
#include <immintrin.h>

// SIMD buffer clearing (8x faster)
void clearBufferSIMD(float* buffer, int numSamples)
{
    int simdEnd = numSamples - 7;
    int i = 0;

    // Process 8 floats at a time
    for (; i <= simdEnd; i += 8)
    {
        _mm256_store_ps(buffer + i, _mm256_setzero_ps());
    }

    // Handle remaining samples
    for (; i < numSamples; ++i)
    {
        buffer[i] = 0.0f;
    }
}
```

**Expected speedup:** 4-8x for buffer operations

### 3. Memory Pool Management

#### Audio Thread Buffer Pool
**Problem:** Frequent small allocations cause fragmentation
**Solution:** Pre-allocated buffer pool

```cpp
class AudioBufferPool
{
public:
    float* acquire(int size)
    {
        // Find or create buffer of appropriate size
        for (auto& buf : buffers_)
        {
            if (!buf.inUse && buf.size >= size)
            {
                buf.inUse = true;
                return buf.data;
            }
        }
        // Create new buffer if needed
        return createBuffer(size);
    }

    void release(float* buffer)
    {
        // Mark as available for reuse
        // (no deallocation)
    }

private:
    struct Buffer { float* data; int size; bool inUse; };
    std::vector<Buffer> buffers_;
};
```

**Expected benefit:** Eliminates allocation overhead, improves cache locality

### 4. Loop Unrolling

#### Envelope Processing
**Current:** Branch-heavy envelope calculation
**Target:** Branchless SIMD implementation

```cpp
// Process 4 envelope stages simultaneously
void processEnvelopeSIMD(float* output, int numSamples)
{
    // Use SIMD to process attack, decay, sustain, release
    // without per-sample branching
}
```

---

## Implementation Plan

### Phase 5.1: Fast Math Implementation
- [ ] Add fast sin() approximation to NexSynth
- [ ] Add fast pow2() for detune calculation
- [ ] Create fast math unit tests
- [ ] Benchmark vs. standard library

### Phase 5.2: SIMD Buffer Operations
- [ ] Implement SIMD buffer clearing
- [ ] Implement SIMD soft clipping
- [ ] Add CPU detection for SSE/AVX support
- [ ] Fallback to scalar for older CPUs

### Phase 5.3: Memory Pool
- [ ] Design AudioBufferPool class
- [ ] Integrate into NexSynthDSP
- [ ] Add pool statistics monitoring
- [ ] Verify no allocations in audio thread

### Phase 5.4: Profiling & Validation
- [ ] Profile before/after optimization
- [ ] Update Phase 4A baselines
- [ ] Verify audio quality unchanged
- [ ] Document speedup achieved

---

## Performance Targets

### NexSynth Optimization Goals
| Component | Current (CPU) | Target | Speedup |
|-----------|--------------|--------|---------|
| FMOperator::process | ~8% | <4% | 2x |
| Envelope processing | ~2% | <1% | 2x |
| Buffer operations | ~1% | <0.5% | 2x |
| **Total** | **12.6%** | **<8%** | **1.5x** |

### Quality Requirements
- **Audio difference:** < -100 dB SNR from original
- **Determinism:** Must remain 100% deterministic
- **Realtime safety:** No allocations in audio thread
- **Compatibility:** Must work on all target platforms

---

## Success Metrics

✅ **Phase 5 Complete When:**
1. NexSynth CPU usage reduced from 12.6% to <8%
2. All regression tests still pass (100%)
3. Audio quality degradation < -100 dB SNR
4. No allocations in audio thread (verified)
5. SIMD fallback for non-AVX CPUs
6. Documentation updated with benchmarks

---

## Files to Modify

### Core DSP
- `instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp` - Add fast math, SIMD
- `instruments/Nex_synth/include/dsp/NexSynthDSP.h` - Add optimization flags

### New Files
- `include/dsp/FastMath.h` - Fast math approximations
- `include/dsp/SIMDBufferOps.h` - SIMD buffer operations
- `include/dsp/AudioBufferPool.h` - Memory pool

### Tests
- `tests/optimization/` - New directory for Phase 5
- `FastMathTest.cpp` - Verify fast math accuracy
- `SIMDPerformanceTest.cpp` - Benchmark SIMD vs scalar
- `OptimizationReport.md` - Before/after comparison

---

## Risks & Mitigation

### Risk 1: Audio Quality Degradation
**Mitigation:** Comprehensive golden tests to verify < -100 dB difference

### Risk 2: Platform Compatibility
**Mitigation:** CPU feature detection with scalar fallback

### Risk 3: Code Complexity
**Mitigation:** Isolate optimizations in separate files, clear documentation

### Risk 4: Maintenance Burden
**Mitigation:** Extensive unit tests, performance benchmarks

---

## Timeline Estimate

- **Phase 5.1 (Fast Math):** 2-3 hours
- **Phase 5.2 (SIMD):** 4-6 hours
- **Phase 5.3 (Memory Pool):** 2-3 hours
- **Phase 5.4 (Profiling):** 1-2 hours

**Total:** ~10-14 hours of development time

---

## References

- [Intel Intrinsics Guide](https://www.intel.com/content/www/us/en/docs/intrinsics-guide/)
- [Fast Math Approximations](https://www.researchgate.net/publication/3314971_Fast_math_approximations_for_unreal)
- [JUCE SIMD Tutorial](https://docs.juce.com/master/tutorial_simd_intro.html)
- [Audio DSP Optimization](https://www.cs.cmu.edu/~music/icm-paper/readings/moore-dsp.pdf)

---

**Status:** 🟡 READY TO IMPLEMENT
**Priority:** MEDIUM (nice-to-have, not blocking production)
**Confidence:** HIGH (well-understood optimization techniques)
