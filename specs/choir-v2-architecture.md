# Choir V2.0 Architecture Diagrams

**Specification:** specs/choir-v2-specification.md
**Quick Reference:** specs/choir-v2-quick-reference.md

---

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Choir V2.0 Plugin                          │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   MIDI       │───▶│   Parameter  │───▶│    Preset    │     │
│  │   Input      │    │   Changes    │    │    System    │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                    │                                  │
│         ▼                    ▼                                  │
│  ┌───────────────────────────────────────────────────────┐    │
│  │              Voice Manager (Single-Threaded SIMD)     │    │
│  │  - Voice allocation/deallocation                      │    │
│  │  - Priority-based voice stealing                     │    │
│  │  - Parameter smoothing dispatch                       │    │
│  │  - Real-time safe processing                          │    │
│  └───────────────────────────────────────────────────────┘    │
│         │                                                          │
│         │ (per voice)                                             │
│         ▼                                                          │
│  ┌───────────────────────────────────────────────────────┐    │
│  │                  Voice Object                         │    │
│  │  - Individual voice state                             │    │
│  │  - Per-voice parameter smoothing                      │    │
│  │  - DSP module chain management                        │    │
│  └───────────────────────────────────────────────────────┘    │
│         │                                                          │
│         ▼                                                          │
│  ┌───────────────────────────────────────────────────────┐    │
│  │                    DSP Chain                          │    │
│  │                                                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐ │    │
│  │  │ Formant  │──▶│Subharmonic│──▶│ Spectral │──▶│Stereo│ │    │
│  │  │Synthesis │  │Generator │  │Enhancer │  │Imager│ │    │
│  │  │(biquad) │  │  (PLL)   │  │(OLA FFT)│  │      │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────┘ │    │
│  └───────────────────────────────────────────────────────┘    │
│         │                                                          │
│         ▼                                                          │
│  ┌───────────────────────────────────────────────────────┐    │
│  │                 Mixing Bus                            │    │
│  │  - Sum all active voices                              │    │
│  │  - Apply master parameters                            │    │
│  │  - Stereo imaging                                      │    │
│  │  - Output limiter                                      │    │
│  └───────────────────────────────────────────────────────┘    │
│         │                                                          │
│         ▼                                                          │
│  ┌───────────────────────────────────────────────────────┐    │
│  │                    Audio Output                       │    │
│  └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## FormantSynthesis Module (CORRECTED)

```
┌────────────────────────────────────────────────────────┐
│             FormantSynthesis Module                   │
│                                                       │
│  Input (sawtooth/noise)                               │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │        Vibrato LFO (optional)            │       │
│  │  - Rate: 5 Hz (adjustable 0-20 Hz)       │       │
│  │  - Depth: 0% (adjustable 0-100%)         │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Parallel Formant Resonators (5)        │       │
│  │                                           │       │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │       │
│  │  │ F1      │  │ F2      │  │ F3      │  │       │
│  │  │ Biquad  │  │ Biquad  │  │ Biquad  │  │       │
│  │  └─────────┘  └─────────┘  └─────────┘  │       │
│  │  ┌─────────┐  ┌─────────┐               │       │
│  │  │ F4      │  │ F5      │               │       │
│  │  │ Biquad  │  │ Biquad  │               │       │
│  │  └─────────┘  └─────────┘               │       │
│  │                                           │       │
│  │  REAL Biquad Coefficients (CORRECTED)    │       │
│  │  Based on Audio EQ Cookbook              │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │      Sum and Normalize (× 0.2)            │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│     Output (vowel sound)                              │
└────────────────────────────────────────────────────────┘

Vowel Definitions (10 standard vowels):
┌────┬──────┬──────┬──────┬──────┬──────┐
│Vowel│ F1   │ F2   │ F3   │ F4   │ F5   │
├────┼──────┼──────┼──────┼──────┼──────┤
│AA  │ 800  │ 1150 │ 2800 │ 3500 │ 4500 │
│AE  │ 700  │ 1600 │ 2600 │ 3500 │ 4500 │
│AH  │ 600  │ 1200 │ 2600 │ 3400 │ 4400 │
│AO  │ 500  │  900 │ 2500 │ 3400 │ 4300 │
│EH  │ 500  │ 1700 │ 2600 │ 3500 │ 4500 │
│ER  │ 500  │ 1200 │ 2500 │ 3400 │ 4300 │
│IH  │ 400  │ 1900 │ 2600 │ 3400 │ 4300 │
│IY  │ 300  │ 2200 │ 2900 │ 3500 │ 4500 │
│UW  │ 300  │  850 │ 2200 │ 3400 │ 4200 │
│OW  │ 500  │  900 │ 2300 │ 3400 │ 4200 │
└────┴──────┴──────┴──────┴──────┴──────┘
```

---

## SubharmonicGenerator Module (CORRECTED)

```
┌────────────────────────────────────────────────────────┐
│         SubharmonicGenerator Module (PLL-based)       │
│                                                       │
│  Input (audio signal)                                 │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │       PLL (Phase-Locked Loop)             │       │
│  │                                           │       │
│  │  ┌─────────────────────────────────┐     │       │
│  │  │ Phase Detector (Quadrature)     │     │       │
│  │  │                                  │     │       │
│  │  │  I[n] = x[n] * cos(θ[n])        │     │       │
│  │  │  Q[n] = x[n] * sin(θ[n])        │     │       │
│  │  │  φ_error = atan2(Q, I)          │     │       │
│  │  └─────────────────────────────────┘     │       │
│  │               │                           │       │
│  │               ▼                           │       │
│  │  ┌─────────────────────────────────┐     │       │
│  │  │ PI Controller                   │     │       │
│  │  │                                  │     │       │
│  │  │  f[n] = Kp*φ + Ki*∫φ            │     │       │
│  │  │                                  │     │       │
│  │  │  Kp = 0.01, Ki = 0.001          │     │       │
│  │  └─────────────────────────────────┘     │       │
│  │               │                           │       │
│  │               ▼                           │       │
│  │  ┌─────────────────────────────────┐     │       │
│  │  │ Phase Integrator                │     │       │
│  │  │                                  │     │       │
│  │  │  θ[n+1] = θ[n] + 2πf/Fs         │     │       │
│  │  └─────────────────────────────────┘     │       │
│  │                                           │       │
│  │  CORRECTED: Proper phase error detection  │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Subharmonic Generators                 │       │
│  │                                           │       │
│  │  ┌─────────────┐  ┌─────────────┐        │       │
│  │  │ Suboctave 1 │  │ Suboctave 2 │        │       │
│  │  │ (θ × 0.5)   │  │ (θ × 0.25)  │        │       │
│  │  │ 70% mix     │  │ 30% mix     │        │       │
│  │  └─────────────┘  └─────────────┘        │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │      Bass Enhancement Filter              │       │
│  │      (Low-shelf, 100 Hz, +12dB)           │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │        Wet/Dry Mix (0-100%)               │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│     Output (enriched bass)                            │
└────────────────────────────────────────────────────────┘
```

---

## SpectralEnhancer Module (CORRECTED)

```
┌────────────────────────────────────────────────────────┐
│      SpectralEnhancer Module (Overlap-Add FFT)       │
│                                                       │
│  Input (audio signal)                                 │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │       Input Buffer (Accumulate)           │       │
│  │       Buffer size: hop_size               │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │       Apply Window (Hann)                 │       │
│  │                                           │       │
│  │       w[n] = 0.5(1 - cos(2πn/N))         │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │       FFT (2048 points)                   │       │
│  │       Real → Complex spectrum             │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │       Process Spectrum                    │       │
│  │                                           │       │
│  │  For each frequency bin:                  │       │
│  │  1. Calculate magnitude & phase           │       │
│  │  2. Calculate harmonic weight             │       │
│  │  3. Apply enhancement (1 + amount * w)    │       │
│  │  4. Convert back to real/imag             │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │       IFFT (2048 points)                  │       │
│  │       Complex → Real time domain          │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │       Apply Window Again (Hann)          │       │
│  │       (for overlap-add)                   │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │       Overlap-Add Reconstruction          │       │
│  │                                           │       │
│  │       y[n] = Σ windowed_frames           │       │
│  │                                           │       │
│  │       Hop size: 512 (75% overlap)        │       │
│  │                                           │       │
│  │  CORRECTED: Prevents spectral leakage     │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│     Output (enhanced spectrum)                         │
└────────────────────────────────────────────────────────┘
```

---

## VoiceManager Module (CORRECTED)

```
┌────────────────────────────────────────────────────────┐
│    VoiceManager (Single-Threaded SIMD Processing)     │
│                                                       │
│  ┌───────────────────────────────────────────┐       │
│  │    Voice Allocator (Priority-Based)       │       │
│  │                                           │       │
│  │  Strategies:                              │       │
│  │  1. Priority (highest velocity wins)      │       │
│  │  2. Round-robin                           │       │
│  │  3. Steal oldest                          │       │
│  │  4. Steal lowest note                     │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Voice Pool (64 voices max)             │       │
│  │    Active: 40-60 voices (typical)         │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    SIMD Batch Processing                  │       │
│  │                                           │       │
│  │  Process 4 voices at once using SIMD:     │       │
│  │  ┌─────────┬─────────┬─────────┬───────┐ │       │
│  │  │ Voice 0 │ Voice 1 │ Voice 2 │ V3..  │ │       │
│  │  ├─────────┼─────────┼─────────┼───────┤ │       │
│  │  │Sample 0 │Sample 0 │Sample 0 │S0...  │ │       │
│  │  │Sample 1 │Sample 1 │Sample 1 │S1...  │ │       │
│  │  │Sample 2 │Sample 2 │Sample 2 │S2...  │ │       │
│  │  │   ...   │   ...   │   ...   │ ...   │ │       │
│  │  └─────────┴─────────┴─────────┴───────┘ │       │
│  │                                           │       │
│  │  SSE/AVX instructions:                    │       │
│  │  - _mm_mul_ps (4× float multiply)         │       │
│  │  - _mm_add_ps (4× float add)              │       │
│  │  - _mm_shuffle_ps (reorder)               │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Mix to Output Bus                      │       │
│  │                                           │       │
│  │    Master Gain: 1/√N (N = active voices)  │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│     Output (mixed audio)                              │
│                                                       │
│  CORRECTED: Single-threaded, real-time safe          │
│  - No thread pool (was causing xruns)                │
│  - SIMD for better performance                       │
│  - Deterministic execution time                      │
└────────────────────────────────────────────────────────┘
```

---

## Parameter Smoothing

```
┌────────────────────────────────────────────────────────┐
│          LinearSmoother (Parameter Interpolation)    │
│                                                       │
│  Parameter Change (user action)                       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Set Target Value                       │       │
│  │    targetValue_ = newValue                │       │
│  │    countdown_ = smoothingTime * Fs        │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Linear Interpolation (per sample)      │       │
│  │                                           │       │
│  │    if (countdown_ > 0) {                 │       │
│  │        step = (target - current) / count  │       │
│  │        current += step                    │       │
│  │        countdown--                        │       │
│  │    }                                      │       │
│  │    return current                        │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│     Smoothed Parameter Value                          │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Apply to DSP Module                    │       │
│  │    (no clicks, no zipper noise)           │       │
│  └───────────────────────────────────────────┘       │
│                                                       │
│  Default smoothing time: 10ms                         │
│  Prevents: Clicks, zipper noise, artifacts            │
└────────────────────────────────────────────────────────┘
```

---

## Anti-Aliasing

```
┌────────────────────────────────────────────────────────┐
│          AntiAliasingFilter (2x Oversampling)        │
│                                                       │
│  Input @ 44.1kHz                                      │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Upsample (2x zero-stuffing)            │       │
│  │    x[n] → [x[0], 0, x[1], 0, x[2], 0, ...]│       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Anti-Imaging Filter (Lowpass)          │       │
│  │    Cutoff: 0.45 * new_sample_rate         │       │
│  │    Remove images from zero-stuffing       │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Process @ 88.2kHz                      │       │
│  │    (Your DSP processing here)             │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Anti-Aliasing Filter (Lowpass)         │       │
│  │    Cutoff: 0.45 * new_sample_rate         │       │
│  │    Prevent aliasing before decimation     │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Downsample (Decimation)                │       │
│  │    Keep every 2nd sample                  │       │
│  │    [y0, y1, y2, y3, ...] → [y0, y2, y4...]│       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│     Output @ 44.1kHz (alias-free)                     │
│                                                       │
│  Result: Clean high-frequency content, no aliasing    │
└────────────────────────────────────────────────────────┘
```

---

## Denormal Protection

```
┌────────────────────────────────────────────────────────┐
│          DenormalProtection (FTZ/DAZ Mode)           │
│                                                       │
│  Problem: Denormal numbers (very small floats)        │
│           Cause 100x performance degradation          │
│                                                       │
│  Solution: Flush to zero (FTZ) +                     │
│            Denormals are zero (DAZ)                   │
│                                                       │
│  ┌───────────────────────────────────────────┐       │
│  │    Enable DAZ Mode (CPU registers)        │       │
│  │                                           │       │
│  │    MXCSR register (x86/x64):              │       │
│  │    - Bit 15: FTZ (Flush To Zero)          │       │
│  │    - Bit 6:  DAZ (Denormals Are Zero)     │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│  ┌───────────────────────────────────────────┐       │
│  │    Manual Flush (if needed)               │       │
│  │                                           │       │
│  │    float flush(float x) {                 │       │
│  │        union { float f; uint32_t i; } u;  │       │
│  │        u.f = x;                           │       │
│  │        if ((u.i & 0x7f800000) == 0) {     │       │
│  │            u.i = 0;  // Flush to zero     │       │
│  │        }                                  │       │
│  │        return u.f;                        │       │
│  │    }                                      │       │
│  └───────────────────────────────────────────┘       │
│         │                                             │
│         ▼                                             │
│     Normal performance (no denormal slowdown)         │
│                                                       │
│  Result: Stable real-time performance                │
└────────────────────────────────────────────────────────┘
```

---

## Performance Comparison

```
┌────────────────────────────────────────────────────────┐
│         Performance: Original vs Revised Targets      │
│                                                       │
│  ┌────────────┬──────────────┬──────────────┬──────┐ │
│  │  Metric    │   Original   │   Revised    │ Note │ │
│  ├────────────┼──────────────┼──────────────┼──────┤ │
│  │ Polyphony  │ 100 @ 30% CPU│ 60 @ 30% CPU │ Real │ │
│  │            │              │ 40 @ 20% CPU │ istic│ │
│  ├────────────┼──────────────┼──────────────┼──────┤ │
│  │ Latency    │ < 3ms        │ < 5ms        │ Achie│ │
│  │            │              │              │ vable│ │
│  ├────────────┼──────────────┼──────────────┼──────┤ │
│  │ Memory     │ < 150MB      │ < 200MB      │ Achie│ │
│  │            │              │              │ vable│ │
│  ├────────────┼──────────────┼──────────────┼──────┤ │
│  │ Voice Cost │ ~0.3% CPU    │ ~0.5% CPU    │ Accu │ │
│  │            │ (underest.)  │ (measured)   │ rate │ │
│  ├────────────┼──────────────┼──────────────┼──────┤ │
│  │ Quality    │ "Studio"     │ "Professional│ Mana│ │
│  │            │              │  Grade"      │ ged │ │
│  └────────────┴──────────────┴──────────────┴──────┘ │
│                                                       │
│  Key Changes:                                         │
│  1. Realistic polyphony targets (40-60, not 100)      │
│  2. Achievable latency (<5ms with 128-sample buffer)  │
│  3. Slightly higher memory budget (still excellent)   │
│  4. Managed expectations for quality                  │
└────────────────────────────────────────────────────────┘
```

---

## Data Flow Summary

```
┌────────────────────────────────────────────────────────┐
│              Complete Data Flow (Per Voice)           │
│                                                       │
│  MIDI Note On                                         │
│       │                                               │
│       ▼                                               │
│  VoiceAllocator → VoiceObject → ParameterSmoother     │
│       │                                               │
│       ▼                                               │
│  ┌─────────────────────────────────────────────┐     │
│  │         DSP Chain (Single-Threaded SIMD)    │     │
│  │                                             │     │
│  │  Input → FormantSynthesis → Subharmonic     │     │
│  │         → SpectralEnhancer → StereoImager   │     │
│  │         → AntiAliasing → Output            │     │
│  └─────────────────────────────────────────────┘     │
│       │                                               │
│       ▼                                               │
│  MixingBus (sum all voices, apply master gain)        │
│       │                                               │
│       ▼                                               │
│  AudioOutput (stereo output to DAW)                   │
│                                                       │
│  All processing with:                                 │
│  - Parameter smoothing (10ms linear interp)           │
│  - Denormal protection (FTZ/DAZ mode)                 │
│  - SIMD optimization (SSE/AVX batches)                 │
│  - Real-time safety (no locks, no allocations)        │
└────────────────────────────────────────────────────────┘
```

---

**Document Status:** ✅ Complete
**Related Documents:**
- specs/choir-v2-specification.md (full spec)
- specs/choir-v2-quick-reference.md (quick guide)
