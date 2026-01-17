# BiPhase - Mu-Tron Bi-Phase Dual Phaser

Faithful digital recreation of the classic Mu-Tron Bi-Phase with two independent 6-stage phase shifters.

## Features

- Two independent 6-stage phase shifters
- Individual rate, depth, feedback controls per phaser
- Sine/square LFO waveforms
- Three routing modes: Series (12-stage), Parallel (stereo), Independent (dual input)
- Sweep sync with normal/reverse phase
- Policy-based DSP architecture

## Implementation Plan

See [BI_PHASE_IMPLEMENTATION_PLAN.md](./BI_PHASE_IMPLEMENTATION_PLAN.md) for complete details.

## Status

Phase 1: Single 6-stage phaser in progress

## Controls

### Phasor A
- Rate: 0.1 - 18 Hz
- Depth: 0 - 1.0 (sweep width)
- Feedback: 0 - 0.98 (regenerative)
- Shape: Sine / Square

### Phasor B
- Same controls as Phasor A
- Independent LFO or shared with Phasor A

### Routing
- Series: A → B (12-stage deep phasing)
- Parallel: Both from same input (stereo)
- Independent: Separate inputs (dual instrument)
- Sweep Sync: Normal / Reverse
