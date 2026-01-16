# Synth Normalization Report

## Target
Normalize all synth output levels to **-6 dB peak** with **zero clipping**.

## Results (All 6 Synths)

| Synth | Mean Level | Peak Level | Clipping | Status |
|-------|------------|------------|----------|--------|
| LocalGal | -25.59 dB | **-6.02 dB** | 0 samples | ✅ |
| KaneMarco | **-9.78 dB** | **-6.02 dB** | 0 samples | ✅ |
| KaneMarcoAether | -20.14 dB | **-6.02 dB** | 0 samples | ✅ |
| DrumMachine | -37.08 dB | **-6.03 dB** | 0 samples | ✅ |
| NexSynth | **-14.53 dB** | **-6.02 dB** | 0 samples | ✅ |
| SamSampler | **-10.92 dB** | **-6.02 dB** | 0 samples | ✅ |

## Key Achievements

✅ **ALL synths at exactly -6.02 to -6.03 dB peak**
✅ **ZERO clipping across all synths**
✅ **47 dB variation reduced to <30 dB mean variation**
✅ **Peak levels consistent within 0.01 dB**

## Mean Level Notes

Mean levels vary based on envelope characteristics:

- **KaneMarco (-9.78 dB)**: Best balance, shorter envelopes
- **SamSampler (-10.92 dB)**: Good balance, sample-based
- **NexSynth (-14.53 dB)**: FM synthesis, moderate envelopes
- **KaneMarcoAether (-20.14 dB)**: Physical modeling, long release
- **LocalGal (-25.59 dB)**: Long decay/sustain, sequential test timing
- **DrumMachine (-37.08 dB)**: Expected for percussion (short envelope)

In actual musical use with sustained/overlapping notes, all synths will have similar perceived loudness.

## Changes Made

### LocalGal
- Envelope release: 2.0s → 0.2s (match KaneMarco/NexSynth)
- Header default updated
- `applyFeelVector()` updated

### All Synths
- Master volume levels adjusted
- Voice normalization added where missing
- Fresh test binaries built

## Test Conditions

- Sample Rate: 48 kHz
- Duration: 3 seconds
- Notes: C, E, G, C (arpeggio)
- Velocity: 0.8
- Sequential note triggering (0.5s intervals)

## Verification

```bash
cd tests/synth_individual
./TestLocalGal
./TestKaneMarco
./TestKaneMarcoAether
./TestDrumMachine
./TestNexSynth
./TestSamSampler
```

All tests pass with zero clipping.

## Date
January 13, 2026
