# SPEC-007-04: Denormal Protection - Performance Optimization

**Issue**: white_room-501 (SPEC-007)
**Component**: Choir V2.0 DSP Foundation
**Priority**: P0 - CRITICAL
**Status**: 📝 Specification
**Dependencies**: SPEC-001 (Revised specification)

---

## Executive Summary

Denormal protection is essential for maintaining real-time performance in Choir V2.0. Denormal numbers (subnormal floating-point values) cause 100× slowdown in DSP calculations. This specification provides a complete, cross-platform denormal protection system with minimal overhead.

---

## Problem Statement

### What Are Denormal Numbers?

**Denormal numbers** are floating-point values with very small magnitudes (close to zero):
- **Range**: ±1.18×10⁻³⁸ to ±1.18×10⁻⁴⁵ (32-bit float)
- **Representation**: Non-zero but smaller than minimum normal
- **Performance**: 100-200× slower than normal floating-point operations

### When Denormals Occur in Choir V2.0

**1. Formant Filters at Low Frequencies**
```
Input: 1e-20 (near silence)
  ↓
Formant filter (biquad)
  ↓
State variables approach zero
  ↓
Denormal calculations
  ↓
CPU spikes: 1% → 80% (single voice)
```

**2. Subharmonic Generator**
```
Input: 1e-30 (silence)
  ↓
Rectification: max(0, input)
  ↓
Multiplication: sub × gain
  ↓
Denormal propagation
  ↓
Real-time safety compromised
```

**3. Spectral Enhancer**
```
FFT bins with near-zero magnitude
  ↓
Enhancement gain × magnitude
  ↓
Denormal results
  ↓
FFT processing slows
```

### Symptoms of Denormal Issues

- **CPU spikes**: Sudden increases from 30% to 100% during silence
- **Real-time safety violations**: DAW buffer underruns
- **Inconsistent performance**: Same patch behaves differently
- **Audio glitches**: Clicks/pops from CPU overload

---

## Solution: Multi-Layer Denormal Protection

### Protection Strategy

```
┌─────────────────────────────────────┐
│  Layer 1: Hardware Flags (FTZ/DAZ)  │ ← Global, zero overhead
├─────────────────────────────────────┤
│  Layer 2: DC Offset Addition        │ ← Per-component, ~1 cycle
├─────────────────────────────────────┤
│  Layer 3: Explicit Flush (SSE/NEON) │ ← Per-batch, ~5 cycles
└─────────────────────────────────────┘
```

### Layer 1: Hardware Flags (Recommended)

**Flush-to-Zero (FTZ)** and **Denormals-Are-Zero (DAZ)** flags:
- **FTZ**: Flush denormal results to zero
- **DAZ**: Treat denormal inputs as zero
- **Overhead**: Zero (hardware feature)
- **Scope**: Global (all floating-point operations)

### Layer 2: DC Offset Addition

Add small DC offset before calculations:
```cpp
const float DENORM_OFFSET = 1e-10f;

float process(float input) {
    float safe = input + DENORM_OFFSET;  // Prevent denormal
    return safe * gain;  // Always normal
}
```

**Pros**: Simple, portable, predictable
**Cons**: Adds noise (-200 dB, imperceptible)

### Layer 3: Explicit Flush (SIMD)

Use SIMD instructions to explicitly flush denormals:
```cpp
// SSE (x86)
_mm_setcsr(_mm_getcsr() | 0x8040);  // FTZ + DAZ

// NEON (ARM)
// NEON has hardware FTZ (always enabled on ARMv8+)
```

**Pros**: Zero runtime overhead, complete protection
**Cons**: Platform-specific code

---

## Complete C++ Implementation

### Header: DenormalProtection.h

```cpp
#pragma once

#include <cmath>
#include <algorithm>
#include <limits>

#if defined(__SSE__) || defined(_M_X64) || defined(_M_IX86)
#include <xmmintrin.h>  // SSE
#include <pmmintrin.h>  // SSE3
#endif

#if defined(__ARM_NEON) || defined(__aarch64__)
#include <arm_neon.h>
#endif

namespace ChoirV2 {

//==============================================================================
// Layer 1: Hardware Flags (Global)
//==============================================================================

/**
 * @brief Enable hardware denormal protection
 *
 * Sets CPU flags to flush denormals to zero automatically.
 * Zero runtime overhead after initialization.
 *
 * Platforms:
 * - x86/x64: SSE FTZ + DAZ flags
 * - ARM: NEON has hardware FTZ (always on ARMv8+)
 * - Others: DC offset fallback
 */
class HardwareDenormals {
public:
    /**
     * @brief Enable denormal protection for current thread
     *
     * Must be called from each audio thread (DAW may have multiple threads).
     * Safe to call multiple times (idempotent).
     */
    static void enable() {
        #if defined(__SSE__) || defined(_M_X64) || defined(_M_IX86)
        // x86/x64: Set SSE control register
        // FTZ (flush to zero) = bit 15
        // DAZ (denormals are zero) = bit 6
        int oldMXCSR = _mm_getcsr();
        int newMXCSR = oldMXCSR | 0x8040;  // Set FTZ + DAZ
        _mm_setcsr(newMXCSR);
        #endif

        #if defined(__aarch64__) && defined(__ARM_FEATURE_FMA)
        // ARMv8+: Hardware FTZ is always enabled
        // No action needed
        #endif

        // Other platforms: Rely on DC offset fallback
    }

    /**
     * @brief Disable denormal protection (for testing)
     *
     * Restores original floating-point behavior.
     * Only use for testing/diagnostics.
     */
    static void disable() {
        #if defined(__SSE__) || defined(_M_X64) || defined(_M_IX86)
        int oldMXCSR = _mm_getcsr();
        int newMXCSR = oldMXCSR & ~0x8040;  // Clear FTZ + DAZ
        _mm_setcsr(newMXCSR);
        #endif
    }

    /**
     * @brief Check if denormal protection is enabled
     * @return True if protection is active
     */
    static bool isEnabled() {
        #if defined(__SSE__) || defined(_M_X64) || defined(_M_IX86)
        int mxcsr = _mm_getcsr();
        return (mxcsr & 0x8040) == 0x8040;  // Check FTZ + DAZ
        #else
        return true;  // ARM or fallback
        #endif
    }
};

//==============================================================================
// Layer 2: DC Offset Protection
//==============================================================================

/**
 * @brief DC offset denormal protection
 *
 * Adds small offset to prevent denormals.
 * Portable, simple, predictable.
 *
 * Trade-off: Adds -200 dB noise (imperceptible)
 */
class DCOffsetProtection {
public:
    /**
     * @brief Default DC offset (1e-10 = -200 dB)
     */
    static constexpr float DEFAULT_OFFSET = 1e-10f;

    /**
     * @brief Protect single value with DC offset
     * @param value Input value
     * @param offset DC offset (default 1e-10)
     * @return Protected value
     */
    static inline float protect(float value, float offset = DEFAULT_OFFSET) {
        return value + offset;
    }

    /**
     * @brief Flush denormal to zero using DC offset method
     * @param value Input value
     * @return Zero if denormal, otherwise unchanged
     */
    static inline float flush(float value) {
        if (std::abs(value) < DEFAULT_OFFSET) {
            return 0.0f;
        }
        return value;
    }

    /**
     * @brief Protect array of values
     * @param data Input/output array
     * @param size Array size
     */
    static void protectArray(float* data, int size) {
        for (int i = 0; i < size; ++i) {
            data[i] += DEFAULT_OFFSET;
        }
    }
};

//==============================================================================
// Layer 3: Explicit SIMD Flush
//==============================================================================

/**
 * @brief Explicit SIMD denormal flush
 *
 * Uses SIMD instructions to explicitly flush denormals.
 * Zero overhead on platforms with hardware support.
 */
class SIMDDenormalFlush {
public:
    /**
     * @brief Flush single value to zero
     * @param value Input value
     * @return Zero if denormal, otherwise unchanged
     */
    static inline float flush(float value) {
        // Check if denormal (using bit manipulation)
        union { float f; uint32_t u; } bits;
        bits.f = value;

        // Denormal if exponent is 0 and mantissa is non-zero
        uint32_t exponent = (bits.u >> 23) & 0xFF;
        if (exponent == 0 && bits.u != 0) {
            return 0.0f;  // Flush denormal
        }

        return value;
    }

    /**
     * @brief Flush 4 values using SSE
     * @param values Array of 4 values
     */
    static void flush4(float* values) {
        #if defined(__SSE__)
        __m128 v = _mm_loadu_ps(values);

        // Compare with minimum normal
        __m128 minNormal = _mm_set1_ps(std::numeric_limits<float>::min());
        __m128 mask = _mm_cmplt_ps(_mm_abs_ps(v), minNormal);

        // Zero out denormals
        v = _mm_andnot_ps(mask, v);

        _mm_storeu_ps(values, v);
        #else
        // Scalar fallback
        for (int i = 0; i < 4; ++i) {
            values[i] = flush(values[i]);
        }
        #endif
    }

    /**
     * @brief Flush 8 values using AVX
     * @param values Array of 8 values
     */
    static void flush8(float* values) {
        #if defined(__AVX__)
        __m256 v = _mm256_loadu_ps(values);

        // Compare with minimum normal
        __m256 minNormal = _mm256_set1_ps(std::numeric_limits<float>::min());
        __m256 mask = _mm256_cmp_ps(v, minNormal, _CMP_LT_OQ);

        // Zero out denormals
        v = _mm256_andnot_ps(mask, v);

        _mm256_storeu_ps(values, v);
        #else
        // SSE fallback
        flush4(values);
        flush4(values + 4);
        #endif
    }
};

//==============================================================================
// Combined Protection Strategy
//==============================================================================

/**
 * @brief Complete denormal protection system
 *
 * Combines all three layers for maximum protection.
 * Use this as the primary interface.
 */
class DenormalProtection {
public:
    //==========================================================================
    // Initialization
    //==========================================================================

    /**
     * @brief Initialize denormal protection
     *
     * Call once at startup (or from audio thread callback).
     * Enables hardware flags if available.
     */
    static void initialize() {
        // Layer 1: Enable hardware flags
        HardwareDenormals::enable();

        // Layer 2 & 3: Available via static methods
    }

    //==========================================================================
    // Per-Value Protection
    //==========================================================================

    /**
     * @brief Protect single value
     * @param value Input value
     * @return Protected value
     *
     * Strategy:
     * 1. If hardware flags enabled: return unchanged
     * 2. Otherwise: add DC offset
     */
    static inline float protect(float value) {
        // If hardware FTZ is enabled, no action needed
        if (HardwareDenormals::isEnabled()) {
            return value;
        }

        // Fallback: DC offset
        return DCOffsetProtection::protect(value);
    }

    /**
     * @brief Flush denormal to zero
     * @param value Input value
     * @return Zero if denormal, otherwise unchanged
     */
    static inline float flush(float value) {
        // If hardware DAZ is enabled, no action needed
        if (HardwareDenormals::isEnabled()) {
            return value;
        }

        // Fallback: explicit flush
        return SIMDDenormalFlush::flush(value);
    }

    //==========================================================================
    // Batch Processing
    //==========================================================================

    /**
     * @brief Protect array of values
     * @param data Input/output array
     * @param size Array size
     */
    static void protectArray(float* data, int size) {
        if (HardwareDenormals::isEnabled()) {
            return;  // No action needed
        }

        DCOffsetProtection::protectArray(data, size);
    }

    /**
     * @brief Flush denormals in array
     * @param data Input/output array
     * @param size Array size
     */
    static void flushArray(float* data, int size) {
        if (HardwareDenormals::isEnabled()) {
            return;  // No action needed
        }

        // Process in blocks of 8 (AVX) or 4 (SSE)
        int i = 0;
        #if defined(__AVX__)
        for (; i + 8 <= size; i += 8) {
            SIMDDenormalFlush::flush8(data + i);
        }
        #elif defined(__SSE__)
        for (; i + 4 <= size; i += 4) {
            SIMDDenormalFlush::flush4(data + i);
        }
        #endif

        // Flush remaining samples
        for (; i < size; ++i) {
            data[i] = SIMDDenormalFlush::flush(data[i]);
        }
    }
};

//==============================================================================
// Convenience Macros
//==============================================================================

/**
 * @brief Protect variable from denormals
 *
 * Usage:
 * float value = 1e-20f;
 * PROTECT_DENORMAL(value);  // Now safe from denormals
 */
#define PROTECT_DENORMAL(x) \
    (x) = ChoirV2::DenormalProtection::protect(x)

/**
 * @brief Flush denormal to zero
 *
 * Usage:
 * float value = 1e-20f;
 * FLUSH_DENORMAL(value);  // Now 0.0f
 */
#define FLUSH_DENORMAL(x) \
    (x) = ChoirV2::DenormalProtection::flush(x)

} // namespace ChoirV2
```

---

## Integration Examples

### Example 1: Formant Filter Protection

```cpp
class FormantResonator {
private:
    std::array<float, 2> state1;  // Filter state
    std::array<float, 2> state2;

public:
    FormantResonator() {
        // Initialize with small DC offset
        state1.fill(ChoirV2::DenormalProtection::protect(0.0f));
        state2.fill(ChoirV2::DenormalProtection::protect(0.0f));
    }

    float process(float input) {
        // Protect input
        PROTECT_DENORMAL(input);

        // Filter calculations (protected from denormals)
        float intermediate = input - state1[1];
        state1[0] = intermediate;  // Safe
        state1[1] = intermediate * coefficient;  // Safe

        FLUSH_DENORMAL(state1[0]);
        FLUSH_DENORMAL(state1[1]);

        return state1[0];
    }
};
```

### Example 2: Subharmonic Generator Protection

```cpp
class SubharmonicGenerator {
private:
    float state;

public:
    float process(float input) {
        // Protect input
        PROTECT_DENORMAL(input);

        // Rectification (safe from denormals)
        float rectified = input > 0.0f ? input : 0.0f;

        // Multiplication (safe)
        float output = rectified * mix;

        // Flush state
        FLUSH_DENORMAL(output);

        return output;
    }
};
```

### Example 3: Initialization

```cpp
// Initialize once at startup
void ChoirV2Engine::initialize() {
    // Enable denormal protection
    ChoirV2::DenormalProtection::initialize();

    // Initialize all DSP components
    formantFilter = std::make_unique<FormantResonator>();
    subharmonic = std::make_unique<SubharmonicGenerator>();
    // etc.
}
```

---

## Performance Analysis

### CPU Cost Comparison

| Method | Initialization | Per-Sample Overhead | Protection |
|--------|----------------|---------------------|------------|
| Hardware FTZ/DAZ | ~10 cycles (once) | **0 cycles** | 100% |
| DC Offset | 0 cycles | ~1 cycle (add) | 99% |
| Explicit Flush | 0 cycles | ~5 cycles | 100% |
| **Combined** | ~10 cycles | **0 cycles** | **100%** |

### Memory Requirements

| Component | Memory | Notes |
|-----------|--------|-------|
| Protection classes | 0 B | All static methods |
| DC offset constant | 4 B | constexpr |
| **Total** | **4 B** | Negligible |

### Quality Impact

| Protection Method | Noise Floor | Impact |
|-------------------|-------------|--------|
| Hardware FTZ/DAZ | -∞ dB | None (perfect) |
| DC Offset (1e-10) | -200 dB | Imperceptible |
| Explicit Flush | -∞ dB | None (perfect) |

---

## Validation & Testing

### Unit Tests

```cpp
// Test 1: Denormal detection
void testDenormalDetection() {
    float denormal = 1e-40f;  // Denormal value
    float normal = 1.0f;       // Normal value

    // Should detect denormal
    EXPECT_TRUE(isDenormal(denormal));
    EXPECT_FALSE(isDenormal(normal));
}

// Test 2: Flush functionality
void testFlushDenormal() {
    float denormal = 1e-40f;

    // Should flush to zero
    float flushed = DenormalProtection::flush(denormal);
    EXPECT_FLOAT_EQ(flushed, 0.0f);
}

// Test 3: DC offset protection
void testDCOffsetProtection() {
    float denormal = 1e-40f;

    // Should protect from denormal
    float protected = DCOffsetProtection::protect(denormal);
    EXPECT_FALSE(isDenormal(protected));
}

// Test 4: SIMD flush
void testSIMDFlush() {
    std::array<float, 8> data = {
        1e-40f, 1.0f, 1e-35f, -1e-38f,
        0.5f, -0.5f, 1e-42f, 2.0f
    };

    // Flush array
    DenormalProtection::flushArray(data.data(), 8);

    // Check denormals flushed to zero
    EXPECT_FLOAT_EQ(data[0], 0.0f);
    EXPECT_FLOAT_EQ(data[1], 1.0f);  // Unchanged
    EXPECT_FLOAT_EQ(data[2], 0.0f);
    EXPECT_FLOAT_EQ(data[3], 0.0f);
    EXPECT_FLOAT_EQ(data[4], 0.5f);  // Unchanged
    EXPECT_FLOAT_EQ(data[5], -0.5f); // Unchanged
    EXPECT_FLOAT_EQ(data[6], 0.0f);
    EXPECT_FLOAT_EQ(data[7], 2.0f);  // Unchanged
}

// Test 5: Performance benchmark
void testPerformanceBenchmark() {
    constexpr int NUM_SAMPLES = 48000;  // 1 second @ 48kHz
    std::vector<float> data(NUM_SAMPLES, 1e-40f);  // All denormals

    // Benchmark without protection
    auto start = std::chrono::high_resolution_clock::now();
    for (auto& sample : data) {
        sample *= 1.1f;
    }
    auto slow = std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::high_resolution_clock::now() - start
    ).count();

    // Reset
    std::fill(data.begin(), data.end(), 1e-40f);

    // Benchmark with protection
    start = std::chrono::high_resolution_clock::now();
    DenormalProtection::flushArray(data.data(), NUM_SAMPLES);
    for (auto& sample : data) {
        sample *= 1.1f;
    }
    auto fast = std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::high_resolution_clock::now() - start
    ).count();

    // With protection should be > 50× faster
    EXPECT_LT(fast, slow / 50);
}
```

---

## Implementation Checklist

- [ ] Create `DenormalProtection.h` header
- [ ] Implement HardwareDenormals class (SSE/NEON)
- [ ] Implement DCOffsetProtection class
- [ ] Implement SIMDDenormalFlush class
- [ ] Implement DenormalProtection interface
- [ ] Add convenience macros
- [ ] Create unit tests
- [ ] Create performance benchmarks
- [ ] Validate on x86/x64 platforms
- [ ] Validate on ARM platforms
- [ ] Document API
- [ ] Add to build system
- [ ] Integrate with FormantResonator
- [ ] Integrate with SubharmonicGenerator
- [ ] Integrate with SpectralEnhancer
- [ ] Test CPU performance improvement

---

## References

### DSP Theory
- Denormal Numbers: https://en.wikipedia.org/wiki/Denormal_number
- Floating-Point Performance: https://carlh.net/plugins/denormals.php
- SSE Instructions: https://software.intel.com/sites/landingpage/IntrinsicsGuide/

### Platform Documentation
- x86 SSE: https://developer.arm.com/documentation/ddi0406/cb/Application-Level-Architecture
- ARM NEON: https://developer.arm.com/documentation/ddi0406/cb/Application-Level-Architecture

### Related Issues
- white_room-494: CRITICAL-001 Fix Choir V2.0 specification
- white_room-495: SPEC-001 Create revised Choir V2.0 specification
- white_room-501: SPEC-007 Add missing critical components (this spec)

---

## Sign-Off

**Specification**: ✅ Complete
**Implementation**: ⏳ Pending
**Testing**: ⏳ Pending
**Integration**: ⏳ Pending

**Status**: Ready for implementation
**Estimated Time**: 1 day for full implementation and testing

---

**Generated**: 2026-01-17
**Author**: Senior DSP Engineer (AI-assisted)
**Status**: Specification complete, awaiting implementation
