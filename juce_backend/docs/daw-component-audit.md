# DAW Component Audit and AI Action Hooks

This document outlines the audit of the existing DAW components and proposes AI action hooks to enable AI-driven mixing.

## Audited Components

The following components have been audited:

- `MixingConsole.tsx`: The main view of the mixing console.
- `ChannelStrip.tsx`: Represents a single channel strip in the mixing console.
- `MasterSection.tsx`: Represents the master section of the mixing console.

## Component Analysis

### `MixingConsole.tsx`

This is the main container for the mixing console. It manages the state of the mixer and passes down props and actions to the channel strips and the master section.

**State Management:**

- Uses a `useAudioStore` to manage the mixer state.
- The store provides the following actions:
    - `setTrackVolume`
    - `setTrackPan`
    - `toggleTrackMute`
    - `toggleTrackSolo`
    - `updateTrack`
    - `selectTrack`
    - `setMasterVolume`
    - `toggleMasterMute`
    - `addTrack`

**Local State:**

- Manages local state for EQ and effects, which is intended to be integrated with a plugin system.

### `ChannelStrip.tsx`

Represents a single channel strip.

**Controls:**

- Volume fader
- Pan knob
- Mute button
- Solo button
- Arm button
- Sends knobs
- 3-band EQ knobs

**Actions:**

- All actions are passed down from `MixingConsole.tsx` as callbacks.

### `MasterSection.tsx`

Represents the master section.

**Controls:**

- Master volume fader
- Master mute button
- Master EQ sliders
- Limiter controls (enable, threshold, release)

**Displays:**

- Spectrum analyzer
- Level meters

**Actions:**

- All actions are passed down from `MixingConsole.tsx` as callbacks.

## Proposed AI Action Hooks

Based on the component analysis, the following AI action hooks are proposed. These hooks should be implemented in the `useAudioStore` to allow the AI to interact with the DAW.

- **`ai_set_track_volume(trackId: string, volume: number, reason: string)`**: Sets the volume of a track.
- **`ai_set_track_pan(trackId: string, pan: number, reason: string)`**: Sets the pan of a track.
- **`ai_set_track_eq(trackId: string, eqSettings: EQSettings, reason: string)`**: Sets the EQ for a track.
- **`ai_set_master_eq(eqSettings: EQSettings, reason: string)`**: Sets the master EQ.
- **`ai_apply_mixing_plan(plan: MixingPlan, reason: string)`**: Applies a full mixing plan, which is a sequence of actions.
- **`ai_suggest_mixing_action(action: MixingAction, reason: string)`**: Suggests a single mixing action, which the user can then accept or reject.

These hooks will enable the AI to perform automated mixing, provide mixing suggestions, and collaborate with the user in the mixing process.
