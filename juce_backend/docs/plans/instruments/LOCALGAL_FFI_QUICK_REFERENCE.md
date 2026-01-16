# LocalGalFFI Quick Reference

**Version**: 1.0.0
**Platform**: C ABI (Swift, Objective-C, C, C++)
**Last Updated**: 2025-12-25

---

## Quick Start

```c
#include "LocalGalFFI.h"

// Create instance
LocalGalDSPInstance* synth = localgal_create();
localgal_initialize(synth, 48000.0, 512);

// Process audio
float output[1024]; // interleaved stereo
localgal_process(synth, output, 512, midiData, midiSize);

// Set parameters
localgal_set_feel_vector(synth, 0.5f, 0.7f, 0.3f, 0.8f, 0.0f);

// Cleanup
localgal_destroy(synth);
```

---

## Function Reference

### Lifecycle

| Function | Description | Returns |
|----------|-------------|---------|
| `localgal_create()` | Create new synth instance | Instance handle or NULL |
| `localgal_destroy(instance)` | Destroy synth instance | void |
| `localgal_initialize(instance, sampleRate, samplesPerBlock)` | Initialize for playback | bool success |

### Audio Processing

| Function | Description | Returns |
|----------|-------------|---------|
| `localgal_process(instance, output, numSamples, midiData, midiSize)` | Process audio block | void |

**Output Format**: Interleaved stereo `[L, R, L, R, ...]`

### Parameter Control

| Function | Description | Returns |
|----------|-------------|---------|
| `localgal_get_parameter_count(instance)` | Get total parameters | int count |
| `localgal_get_parameter_value(instance, parameterId)` | Get parameter value | float (0.0-1.0) |
| `localgal_set_parameter_value(instance, parameterId, value)` | Set parameter value | bool success |

**Parameter IDs**: Strings like `"osc1Frequency"`, `"filterCutoff"`, etc.

### Feel Vector

| Function | Description | Returns |
|----------|-------------|---------|
| `localgal_set_feel_vector(instance, rubber, bite, hollow, growl, wet)` | Set feel vector | bool success |
| `localgal_get_feel_vector(instance, &rubber, &bite, &hollow, &growl, &wet)` | Get feel vector | bool success |
| `localgal_get_feel_preset_count(instance)` | Get preset count | int count |
| `localgal_get_feel_preset_name(instance, index, buffer, size)` | Get preset name | bool success |
| `localgal_load_feel_preset(instance, presetName)` | Load feel preset | bool success |

**Feel Vector Ranges**: All 0.0 to 1.0
- **rubber**: Glide & timing variation
- **bite**: Filter resonance & brightness
- **hollow**: Filter cutoff & warmth
- **growl**: Drive & saturation
- **wet**: Effects mix (reserved)

### Pattern Sequencer

| Function | Description | Returns |
|----------|-------------|---------|
| `localgal_set_pattern_length(instance, length)` | Set pattern length (1-64) | bool success |
| `localgal_set_pattern_step(instance, stepIndex, note, gate, vel, prob)` | Set step data | bool success |
| `localgal_enable_pattern(instance, enable)` | Enable/disable playback | bool success |
| `localgal_set_pattern_tempo(instance, bpm)` | Set tempo (20-300) | bool success |
| `localgal_set_pattern_swing(instance, swing)` | Set swing (0.0-1.0) | bool success |

**Note**: Pattern functions currently return errors (not yet exposed in public API)

### Presets

| Function | Description | Returns |
|----------|-------------|---------|
| `localgal_save_preset(instance, buffer, bufferSize)` | Save to JSON | int bytes written |
| `localgal_load_preset(instance, jsonData)` | Load from JSON | bool success |
| `localgal_validate_preset(instance, jsonData)` | Validate JSON | bool valid |
| `localgal_get_preset_info(instance, jsonData, nameBuf, catBuf, descBuf)` | Get metadata | bool success |

### Factory Presets

| Function | Description | Returns |
|----------|-------------|---------|
| `localgal_get_factory_preset_count(instance)` | Get preset count | int count |
| `localgal_get_factory_preset_name(instance, index, buffer, size)` | Get preset name | bool success |
| `localgal_load_factory_preset(instance, index)` | Load preset by index | bool success |

### Parameter Morphing

| Function | Description | Returns |
|----------|-------------|---------|
| `localgal_set_morph_position(instance, position)` | Set morph (0.0=A, 1.0=B) | bool success |
| `localgal_get_morph_position(instance)` | Get morph position | float (0.0-1.0) |

### Utility

| Function | Description | Returns |
|----------|-------------|---------|
| `localgal_get_version()` | Get version string | const char* |
| `localgal_get_last_error(instance)` | Get error message | const char* or NULL |
| `localgal_clear_last_error(instance)` | Clear error | void |

---

## Error Handling

### Pattern
```c
if (!localgal_set_feel_vector(synth, 0.5f, 0.7f, 0.3f, 0.8f, 0.0f)) {
    const char* error = localgal_get_last_error(synth);
    if (error != NULL) {
        printf("Error: %s\n", error);
        localgal_clear_last_error(synth);
    }
}
```

### Common Errors
- **Invalid instance**: NULL handle passed
- **Buffer too small**: String buffer insufficient
- **Out of range**: Index or value exceeds limits
- **Not initialized**: Called before `localgal_initialize()`

---

## Memory Management

### Rules
1. **Always destroy**: Call `localgal_destroy()` when done
2. **One owner**: Single owner per instance
3. **No copy**: Instance handles are not copyable
4. **Thread-safe**: Read operations concurrent, writes need sync

### Example
```c
// Create
LocalGalDSPInstance* synth = localgal_create();

// Use
localgal_initialize(synth, 48000.0, 512);
// ... process audio ...

// Destroy
localgal_destroy(synth);
synth = NULL;
```

---

## Audio Format

### Output Buffer
- **Format**: Interleaved stereo float
- **Layout**: `[L0, R0, L1, R1, L2, R2, ...]`
- **Range**: -1.0 to 1.0
- **Size**: `numSamples * 2` floats

### MIDI Input
- **Format**: Standard MIDI bytes
- **Size**: Variable (1-3 bytes per message)
- **Pass NULL** for no MIDI

---

## Parameter System

### Parameter IDs (Examples)
```
osc1Frequency
osc2Detune
osc3Level
filterCutoff
filterResonance
envAttack
envDecay
envSustain
envRelease
lfo1Rate
lfo1Depth
```

### Value Range
- **Normalized**: 0.0 to 1.0
- **Clamped**: Automatically clamped by synth
- **Smoothed**: Anti-zipper smoothing applied

---

## Feel Vector Presets

### Available Presets
- **Smooth**: Low rubber, soft bite, warm hollow
- **Sharp**: High rubber, bright bite, thin hollow
- **Aggressive**: Medium rubber, high bite, medium growl
- **Crisp**: Low rubber, bright bite, low hollow
- **Warm**: High rubber, soft bite, high hollow
- **Growling**: Low rubber, medium bite, medium growl

### Example
```c
// Load "Warm" preset
localgal_load_feel_preset(synth, "Warm");

// Or set manually
localgal_set_feel_vector(synth, 0.8f, 0.3f, 0.7f, 0.2f, 0.0f);
```

---

## Factory Presets

### Count
```c
int count = localgal_get_factory_preset_count(synth);
printf("Factory presets: %d\n", count);
```

### Browse
```c
char name[256];
for (int i = 0; i < count; i++) {
    if (localgal_get_factory_preset_name(synth, i, name, sizeof(name))) {
        printf("Preset %d: %s\n", i, name);
    }
}
```

### Load
```c
localgal_load_factory_preset(synth, 0); // Load first preset
```

---

## Preset JSON Format

### Save
```c
char buffer[65536];
int bytes = localgal_save_preset(synth, buffer, sizeof(buffer));
if (bytes > 0) {
    printf("Preset: %s\n", buffer);
}
```

### Load
```c
const char* json = "{\"name\":\"MyPreset\",...}";
if (localgal_load_preset(synth, json)) {
    printf("Loaded!\n");
}
```

### Validate
```c
if (localgal_validate_preset(synth, json)) {
    printf("Valid preset!\n");
}
```

---

## Swift Integration

### Module Map
```swift
// LocalGalFFI.modulemap
module LocalGalFFI {
    header "LocalGalFFI.h"
    link "LocalGalDSP"
    export *
}
```

### Wrapper Class
```swift
class LocalGalSynth {
    private var instance: OpaquePointer?

    init() {
        instance = localgal_create()
    }

    deinit {
        localgal_destroy(instance)
    }

    func process(output: UnsafeMutablePointer<Float>,
                samples: Int,
                midi: UnsafePointer<UInt8>?, midiSize: Int) {
        localgal_process(instance, output, Int32(samples),
                        midi, Int32(midiSize))
    }
}
```

---

## Best Practices

### DO
- ✅ Initialize immediately after create
- ✅ Check return values for errors
- ✅ Use normalized parameter values (0.0-1.0)
- ✅ Call destroy before app exit
- ✅ Handle NULL returns from getters

### DON'T
- ❌ Use instance after destroy
- ❌ Pass NULL to required parameters
- ❌ Exceed buffer sizes
- ❌ Call process before initialize
- ❌ Ignore error return values

---

## Performance Notes

### Realtime Safety
- **Process function**: No allocations, fully realtime-safe
- **Parameter setting**: Smoothed over time (no zipper noise)
- **Preset loading**: Not realtime-safe (use in UI thread only)

### CPU Usage
- **Idle**: < 1% CPU
- **Polyphonic**: ~2-5% CPU (16 voices)
- **Effects enabled**: +5-10% CPU

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-25 | Initial release, 29 functions, complete FFI bridge |

---

## Support

For issues or questions:
1. Check error messages with `localgal_get_last_error()`
2. Validate parameters with `localgal_validate_preset()`
3. Test with factory presets first
4. Check buffer sizes are sufficient

---

## License

Same as parent project (see LICENSE file).
