# FilterGate Preset File Format Specification

## Overview

FilterGate presets are stored in JSON format with a comprehensive set of parameters covering all DSP modules. This document specifies the JSON schema for preset files.

## File Format

- **File Extension**: `.json`
- **MIME Type**: `application/json`
- **Encoding**: UTF-8
- **Version**: 1.0

## JSON Schema

### Root Object

```json
{
  "name": "string (required)",
  "author": "string",
  "category": "string",
  "description": "string",
  "version": 1,
  "createdDate": "ISO 8601 date",
  "modifiedDate": "ISO 8601 date",
  "gate": { ... },
  "envelope1": { ... },
  "envelope2": { ... },
  "envelopeFollower": { ... },
  "preDrive": { ... },
  "postDrive": { ... },
  "phaserA": { ... },
  "phaserB": { ... },
  "dualPhaser": { ... },
  "filter": { ... },
  "mixer": { ... },
  "modulationMatrix": { ... }
}
```

### Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Preset name (max 255 chars) |
| author | string | No | Preset author |
| category | string | No | Category (e.g., "Phaser", "Filter", "Experimental") |
| description | string | No | Preset description |
| version | integer | Yes | Preset format version (currently 1) |
| createdDate | string | No | ISO 8601 creation timestamp |
| modifiedDate | string | No | ISO 8601 modification timestamp |

### Gate Parameters

```json
"gate": {
  "threshold": 0.5,      // 0.0 - 1.0
  "attack": 10.0,         // 0.0 - 1000.0 ms
  "hold": 100.0,          // 0.0 - 5000.0 ms
  "release": 200.0,       // 0.0 - 5000.0 ms
  "hysteresis": 0.05      // 0.0 - 0.5
}
```

### Envelope Parameters

```json
"envelope1": {
  "mode": 1,              // 0 = ADR, 1 = ADSR
  "attack": 10.0,         // 0.0 - 5000.0 ms
  "decay": 100.0,         // 0.0 - 5000.0 ms
  "sustain": 0.5,         // 0.0 - 1.0 (ignored in ADR mode)
  "release": 200.0,       // 0.0 - 5000.0 ms
  "loop": false,          // true/false (ADR only)
  "velocitySensitive": false
}
```

**Note**: `envelope2` has the same structure as `envelope1`.

### Envelope Follower

```json
"envelopeFollower": {
  "attack": 5.0,          // 0.0 - 100.0 ms
  "release": 50.0         // 0.0 - 1000.0 ms
}
```

### Drive Stage

```json
"preDrive": {
  "type": 0,              // 0 = SOFT_CLIP, 1 = HARD_CLIP, 2 = ASYMMETRIC, 3 = FUZZ
  "drive": 0.0,           // 0.0 - 1.0
  "output": 1.0,          // 0.0 - 2.0
  "tone": 0.5             // 0.0 - 1.0
}
```

**Note**: `postDrive` has the same structure as `preDrive`.

### Phaser Parameters

```json
"phaserA": {
  "stages": 4,            // 4, 6, or 8
  "rate": 0.5,            // 0.0 - 10.0 Hz
  "depth": 0.7,           // 0.0 - 1.0
  "feedback": 0.5,        // 0.0 - 0.95
  "center": 1000.0,       // 20.0 - 20000.0 Hz
  "spread": 2000.0,       // 0.0 - 10000.0 Hz
  "mix": 0.5              // 0.0 - 1.0
}
```

**Note**: `phaserB` has the same structure as `phaserA`.

### Dual Phaser

```json
"dualPhaser": {
  "routing": 0,           // 0 = SERIAL, 1 = PARALLEL, 2 = STEREO
  "lfoPhaseOffset": 0.0,  // 0.0 - 180.0 degrees
  "crossFeedback": 0.0    // 0.0 - 1.0
}
```

### Filter

```json
"filter": {
  "model": 0,             // 0 = SVF, 1 = LADDER, 2 = OTA, 3 = MS20, 4 = COMB, 5 = MORPH
  "cutoff": 1000.0,       // 20.0 - 20000.0 Hz
  "resonance": 0.5,       // 0.0 - 1.0
  "drive": 0.0,           // 0.0 - 1.0
  "postDrive": 0.0,       // 0.0 - 1.0
  "keyTrack": 0.0,        // 0.0 - 1.0
  "pitch": 69.0,          // 0.0 - 127.0 (MIDI note number)
  "oversampling": 1       // 1, 2, 4, or 8
}
```

### Mixer

```json
"mixer": {
  "dryLevel": 0.0,        // 0.0 - 1.0
  "wetLevel": 1.0,        // 0.0 - 1.0
  "phaserAMix": 1.0,      // 0.0 - 1.0
  "phaserBMix": 1.0,      // 0.0 - 1.0
  "filterMix": 1.0,       // 0.0 - 1.0
  "routing": 0,           // 0 = SERIES, 1 = PARALLEL, 2 = PHASER_FILTER, 3 = FILTER_PHASER, 4 = STEREO_SPLIT
  "outputLevel": 1.0      // 0.0 - 2.0
}
```

### Modulation Matrix

```json
"modulationMatrix": {
  "enabled": true,
  "routes": [
    "0,0,0.8,10.0",       // Format: "source,destination,amount,slewMs"
    "1,1,0.5,15.0"
  ]
}
```

#### Modulation Sources

| ID | Name | Description |
|----|------|-------------|
| 0 | ENV1 | Envelope 1 |
| 1 | ENV2 | Envelope 2 |
| 2 | LFO1 | LFO 1 (future) |
| 3 | LFO2 | LFO 2 (future) |
| 4 | ENVELOPE_FOLLOWER | Envelope Follower |
| 5 | GATE | Gate output |
| 6 | VELOCITY | MIDI velocity (future) |
| 7 | RANDOM | Random/S&H (future) |

#### Modulation Destinations

| ID | Name | Description |
|----|------|-------------|
| 0 | FILTER_CUTOFF | Filter cutoff frequency |
| 1 | FILTER_RESONANCE | Filter resonance |
| 2 | FILTER_DRIVE | Filter drive |
| 3 | PHASER_A_CENTER | Phaser A center frequency |
| 4 | PHASER_A_DEPTH | Phaser A depth |
| 5 | PHASER_A_FEEDBACK | Phaser A feedback |
| 6 | PHASER_A_MIX | Phaser A mix |
| 7 | PHASER_B_CENTER | Phaser B center frequency |
| 8 | PHASER_B_DEPTH | Phaser B depth |
| 9 | PHASER_B_FEEDBACK | Phaser B feedback |
| 10 | PHASER_B_MIX | Phaser B mix |
| 11 | VCA_LEVEL | Output level |

## Example Preset

```json
{
  "name": "Subtle Phaser",
  "author": "FilterGate",
  "category": "Phaser",
  "description": "Gentle 4-stage phaser with slow sweep",
  "version": 1,
  "createdDate": "2025-12-30T12:00:00Z",
  "modifiedDate": "2025-12-30T12:00:00Z",
  "gate": {
    "threshold": 0.5,
    "attack": 10.0,
    "hold": 100.0,
    "release": 200.0,
    "hysteresis": 0.05
  },
  "envelope1": {
    "mode": 1,
    "attack": 10.0,
    "decay": 100.0,
    "sustain": 0.5,
    "release": 200.0,
    "loop": false,
    "velocitySensitive": false
  },
  "envelope2": {
    "mode": 1,
    "attack": 10.0,
    "decay": 100.0,
    "sustain": 0.5,
    "release": 200.0,
    "loop": false,
    "velocitySensitive": false
  },
  "envelopeFollower": {
    "attack": 5.0,
    "release": 50.0
  },
  "preDrive": {
    "type": 0,
    "drive": 0.0,
    "output": 1.0,
    "tone": 0.5
  },
  "postDrive": {
    "type": 0,
    "drive": 0.0,
    "output": 1.0,
    "tone": 0.5
  },
  "phaserA": {
    "stages": 4,
    "rate": 0.3,
    "depth": 0.4,
    "feedback": 0.3,
    "center": 800.0,
    "spread": 1500.0,
    "mix": 0.3
  },
  "phaserB": {
    "stages": 4,
    "rate": 0.3,
    "depth": 0.4,
    "feedback": 0.3,
    "center": 800.0,
    "spread": 1500.0,
    "mix": 0.3
  },
  "dualPhaser": {
    "routing": 0,
    "lfoPhaseOffset": 0.0,
    "crossFeedback": 0.0
  },
  "filter": {
    "model": 0,
    "cutoff": 1000.0,
    "resonance": 0.5,
    "drive": 0.0,
    "postDrive": 0.0,
    "keyTrack": 0.0,
    "pitch": 69.0,
    "oversampling": 1
  },
  "mixer": {
    "dryLevel": 0.5,
    "wetLevel": 0.5,
    "phaserAMix": 1.0,
    "phaserBMix": 1.0,
    "filterMix": 1.0,
    "routing": 0,
    "outputLevel": 1.0
  },
  "modulationMatrix": {
    "enabled": true,
    "routes": []
  }
}
```

## Validation Rules

1. **Required Fields**: `name`, `version`
2. **Name**: Cannot be empty or "Untitled"
3. **Parameter Ranges**: All numeric parameters must be within specified ranges
4. **Enum Values**: All enum values must be valid (see specifications above)
5. **Phaser Stages**: Must be 4, 6, or 8

## File Locations

### macOS
- **Factory Presets**: Bundled with application
- **User Presets**: `~/Documents/FilterGate/Presets/`

### Windows
- **Factory Presets**: `C:\Program Files\FilterGate\Presets\`
- **User Presets**: `%USERPROFILE%\Documents\FilterGate\Presets\`

### Linux
- **Factory Presets**: `/usr/share/filtergate/presets/`
- **User Presets**: `~/Documents/FilterGate/Presets/`

## Version Compatibility

- **Current Version**: 1
- **Backward Compatibility**: Format version 1 presets are compatible with all future FilterGate 1.x releases
- **Migration**: When format version changes, a migration path will be provided

## Extensibility

New parameters can be added in future versions without breaking compatibility. Unknown fields should be ignored when loading older presets.

## See Also

- [FilterGate C API Reference](./C_API_REFERENCE.md)
- [Swift Integration Guide](./SWIFT_INTEGRATION.md)
- [Factory Presets Reference](./FACTORY_PRESETS.md)
