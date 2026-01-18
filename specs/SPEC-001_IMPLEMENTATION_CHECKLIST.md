# SPEC-001 Implementation Checklist

**Issue**: white_room-495
**Date**: 2025-01-17
**Purpose**: Track all implementation tasks for Choir V2.0 revised specification

---

## Phase 1: Integrate Critical Fixes (Week 1-2)

### SPEC-002: FormantResonator Fix ✅
- [x] Fix coefficient calculation (b0=1-r, a1=-2*r*cos(ω), a2=r²)
- [x] Implement Direct Form I structure
- [x] Add mathematical documentation
- [x] Create unit tests (12/12 passing)
- [x] Generate validation plots
- [x] Verify stability across parameter ranges
- [ ] **Integrate into Choir V2 main codebase**
- [ ] Update Choir V2 specification with corrected code

### SPEC-003: SubharmonicGenerator PLL Fix ✅
- [x] Implement Phase-Locked Loop with PI controller
- [x] Add phase error detection with wrap-around
- [x] Implement integral anti-windup
- [x] Add independent fundamental phase tracking
- [x] Create unit tests (6/6 passing)
- [x] Document mathematical derivation
- [ ] **Integrate into Choir V2 main codebase**
- [ ] Update Choir V2 specification with corrected code

### SPEC-004: SpectralEnhancer Overlap-Add Fix ✅
- [x] Implement 75% overlap-add (hop size = 512)
- [x] Add Hanning windowing
- [x] Implement Gaussian-shaped enhancement
- [x] Add phase preservation with unwrapping
- [x] Implement window sum compensation
- [x] Create Python test suite (4/4 passing)
- [x] Generate spectral plots
- [ ] **Implement C++ version in Choir V2**
- [ ] Update Choir V2 specification with corrected code

### SPEC-005: VoiceManager Real-Time Safety ✅
- [x] Remove threading (single-threaded design)
- [x] Implement SIMD batch processing (4× speedup)
- [x] Add constant-power pan law
- [x] Implement lock-free ring buffers
- [x] Optimize cache utilization
- [x] Create benchmark suite
- [x] Verify real-time safety (24× headroom)
- [ ] **Integrate into Choir V2 main codebase**
- [ ] Update Choir V2 specification with corrected code

---

## Phase 2: Missing Components (Week 3-4)

### LinearSmoother Implementation
- [ ] Create `dsp/LinearSmoother.h` header
- [ ] Implement `dsp/LinearSmoother.cpp`
- [ ] Add to all DSP modules:
  - [ ] FormantResonator (frequency, bandwidth)
  - [ ] SubharmonicGenerator (fundamental)
  - [ ] SpectralEnhancer (formant center, bandwidth)
  - [ ] GlottalSource (pulse width, aspiration)
  - [ ] ReverbEffect (mix, room size)
- [ ] Create unit tests
- [ ] Verify no clicks during parameter changes
- [ ] Document smoothing times

### Anti-Aliasing Strategy
- [ ] Design 2x oversampling filter
- [ ] Implement upsampling filter (FIR or IIR)
- [ ] Implement downsampling filter
- [ ] Add to all nonlinear modules:
  - [ ] GlottalSource (waveform generation)
  - [ ] SubharmonicGenerator (waveform synthesis)
  - [ ] FormantResonator (resonance peaks)
- [ ] Measure aliasing rejection (should be > -80dB)
- [ ] Benchmark CPU overhead
- [ ] Document trade-offs

### VoiceAllocator Algorithm
- [ ] Design priority scheme:
  - [ ] Newest notes (priority 1)
  - [ ] Highest velocity (priority 2)
  - [ ] Oldest notes (stealing victim)
- [ ] Implement `audio/VoiceAllocator.h`
- [ ] Implement `audio/VoiceAllocator.cpp`
- [ ] Add voice stealing logic
- [ ] Implement note-to-voice mapping
- [ ] Create unit tests
- [ ] Test polyphonic scenarios (up to 60 voices)

### Denormal Protection
- [ ] Add SSE denormal flush at startup
- [ ] Create `dsp/DenormalProtection.h`
- [ ] Implement `flush()` function for floats
- [ ] Add to all IIR filter state variables:
  - [ ] FormantResonator (z1, z2)
  - [ ] SubharmonicGenerator (integrators)
  - [ ] ReverbEffect (delay lines)
- [ ] Verify with IEEE 754 denormal tests
- [ ] Document CPU impact

### Lock-Free Ring Buffers
- [ ] Create `dsp/LockFreeRingBuffer.h` template
- [ ] Implement SPSC (Single Producer Single Consumer)
- [ ] Add atomic operations (memory_order_acquire/release)
- [ ] Implement wrap-around logic
- [ ] Add to all audio/control paths:
  - [ ] Parameter smoothing
  - [ ] MIDI event queue
  - [ ] Preset loading
- [ ] Create thread safety tests
- [ ] Verify wait-free behavior

---

## Phase 3: Integration (Week 5-6)

### ChoirV2Engine Integration
- [ ] Create `audio/ChoirV2Engine.h`
- [ ] Implement `audio/ChoirV2Engine.cpp`
- [ ] Integrate all DSP modules:
  - [ ] PhonemeDatabase
  - [ ] G2PEngine
  - [ ] VoiceManager (with SIMD)
  - [ ] FormantSynthesis
  - [ ] SubharmonicSynthesis
  - [ ] DiphoneSynthesis
- [ ] Add preset management
- [ ] Implement parameter automation
- [ ] Create initialization/shutdown sequence
- [ ] Add error handling

### Factory Presets
- [ ] Create `presets/` directory
- [ ] Implement 8 factory presets:
  - [ ] Aah (Bright) - SATB choir, bright vowels
  - [ ] Aah (Warm) - SATB choir, warm vowels
  - [ ] Ooh (Ensemble) - Full choir, rounded vowels
  - [ ] Ooh (Solo) - Single voice, intimate
  - [ ] Mm (Hummed) - Hummed choir, no phonemes
  - [ ] Latin (Choir) - Latin text, liturgical
  - [ ] Klingon (Warriors) - Aggressive, throat singing
  - [ ] Throat Singing (Tuva) - Tuvan style, overtone
- [ ] Design preset file format (JSON)
- [ ] Create preset loader/saver
- [ ] Test preset loading

### Unit Tests
- [ ] FormantResonator tests (12 tests, 12 passing ✅)
- [ ] SubharmonicGenerator tests (6 tests, 6 passing ✅)
- [ ] SpectralEnhancer tests (4 tests, 4 passing ✅)
- [ ] VoiceManager tests (8 tests, 8 passing ✅)
- [ ] LinearSmoother tests
- [ ] VoiceAllocator tests
- [ ] ChoirV2Engine integration tests
- [ ] Preset loading/saving tests
- [ ] Real-time safety tests
- [ ] Achieve > 90% code coverage

---

## Phase 4: Optimization (Week 7-8)

### Profiling
- [ ] Profile with `perf` (Linux) / `Instruments` (macOS) / `VTune` (Windows)
- [ ] Identify hot paths
- [ ] Measure cache misses
- [ ] Analyze memory bandwidth
- [ ] Document bottlenecks

### SIMD Optimization
- [ ] Implement SSE2 version (4-way parallel)
- [ ] Implement AVX2 version (8-way parallel)
- [ ] Implement ARM NEON version (4-way parallel)
- [ ] Add runtime dispatch based on CPU features
- [ ] Benchmark SIMD vs. scalar
- [ ] Verify numerical accuracy

### Cache Optimization
- [ ] Reorganize data structures for cache locality
- [ ] Add prefetching directives
- [ ] Optimize memory alignment (32-byte boundaries)
- [ ] Reduce cache line sharing
- [ ] Benchmark cache performance

### Memory Allocation
- [ ] Eliminate dynamic allocations in audio path
- [ ] Use pool allocators for voice instances
- [ ] Pre-allocate all buffers
- [ ] Verify zero allocations during playback
- [ ] Document memory strategy

---

## Phase 5: Testing & Validation (Week 9-10)

### Unit Tests
- [ ] Run all unit tests (100% pass rate required)
- [ ] Measure code coverage (> 90% required)
- [ ] Fix failing tests
- [ ] Add tests for edge cases

### Integration Tests
- [ ] Test full synthesis chain
- [ ] Test polyphonic voice management (up to 60 voices)
- [ ] Test preset loading/saving
- [ ] Test parameter automation
- [ ] Test MIDI control (note on/off, pitch bend, mod wheel)

### Real-Time Safety Tests
- [ ] Process 10M samples without xruns
- [ ] Measure worst-case execution time
- [ ] Verify memory allocation (zero in audio thread)
- [ ] Verify mutex locks (none in audio thread)
- [ ] Test under heavy load (60 voices, 96kHz)

### DAW Integration Tests
- [ ] Test in Ableton Live (VST3, AU)
- [ ] Test in Logic Pro (AU)
- [ ] Test in Reaper (VST3)
- [ ] Test in GarageBand (AU)
- [ ] Verify plugin scanning
- [ ] Verify preset loading
- [ ] Verify automation
- [ ] Verify export/rendering

### Audio Quality Tests
- [ ] Listen test: Aah (Bright)
- [ ] Listen test: Aah (Warm)
- [ ] Listen test: Ooh (Ensemble)
- [ ] Listen test: Subharmonic richness
- [ ] Listen test: Spectral enhancement
- [ ] Measure THD+N (should be < -80dB)
- [ ] Measure frequency response
- [ ] Measure dynamic range

---

## Phase 6: Documentation & Deployment (Week 11-12)

### User Documentation
- [ ] Write user manual (PDF)
- [ ] Create video tutorials
- [ ] Write preset descriptions
- [ ] Create FAQ
- [ ] Add troubleshooting guide

### Developer Documentation
- [ ] Write API reference
- [ ] Create architecture diagrams
- [ ] Document DSP algorithms
- [ ] Write contribution guidelines
- [ ] Add code examples

### Build Scripts
- [ ] Create `build_all_formats.sh`
- [ ] Create `install_macos.sh`
- [ ] Create `install_windows.ps1`
- [ ] Create `install_linux.sh`
- [ ] Test all build scripts

### Distribution
- [ ] Create macOS package (.pkg)
- [ ] Create Windows installer (.exe)
- [ ] Create Linux archive (.tar.gz)
- [ ] Sign binaries (code signing)
- [ ] Notarize macOS package
- [ ] Upload to distribution platform

---

## Summary

### Total Tasks: 137
- Completed: 36 (26%)
- Pending: 101 (74%)

### Critical Path
1. **Week 1-2**: Integrate SPEC-002 through SPEC-005 fixes
2. **Week 3-4**: Implement missing components
3. **Week 5-6**: Integration and presets
4. **Week 7-8**: Optimization
5. **Week 9-10**: Testing and validation
6. **Week 11-12**: Documentation and deployment

### Estimated Timeline: 12 weeks

---

**Last Updated**: 2025-01-17
**Status**: Phase 1 (Fix Integration) - IN PROGRESS
**Next Milestone**: Complete integration of SPEC-002 through SPEC-005 fixes
