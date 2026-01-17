# Pedals Parameters

This document describes the parameters for all pedals in the White Room pedals framework.

## Available Pedals

- OverdrivePedalPureDSP
- FuzzPedalPureDSP
- ChorusPedalPureDSP
- DelayPedalPureDSP
- OctavePedalPureDSP

## Parameter Structure

Each pedal implements the GuitarPedalPureDSP base interface with the following common parameters:

### Common Parameters

- **Drive** (0.0 - 1.0): Input gain/drive amount
- **Tone** (0.0 - 1.0): EQ/tone control
- **Level** (0.0 - 1.0): Output volume
- **Mix** (0.0 - 1.0): Dry/wet mix (0 = dry, 1 = wet)

### Pedal-Specific Parameters

Each pedal may have additional parameters specific to its effect type. See individual pedal documentation for details.

## Parameter Ranges

All parameters are normalized to 0.0 - 1.0 range for UI consistency, with internal scaling applied as needed.

## Modulation

All parameters can be automated/modulated via host automation or MIDI CC.
