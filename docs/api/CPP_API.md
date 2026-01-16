# White Room C++ API (FFI)

**C Foreign Function Interface (FFI) for White Room JUCE backend.**

---

## Table of Contents

1. [Engine Functions](#engine-functions)
2. [Transport Functions](#transport-functions)
3. [MIDI Functions](#midi-functions)
4. [Memory Functions](#memory-functions)

---

## Engine Functions

### Engine Lifecycle

**`sch_engine_create()`**

Creates a new audio engine instance.

```cpp
// Create engine
sch_engine_t* engine = sch_engine_create();

if (engine == nullptr) {
    // Handle error
}

// Use engine...

// Destroy when done
sch_engine_destroy(engine);
```

**Returns**: Pointer to engine instance, or `nullptr` on error.

**`sch_engine_destroy(engine)`**

Destroys an audio engine instance and releases resources.

```cpp
sch_engine_destroy(engine);
engine = nullptr;
```

**Parameters**:
- `engine` - Pointer to engine instance

**`sch_engine_get_version()`**

Returns the engine version string.

```cpp
const char* version = sch_engine_get_version();
printf("White Room Engine: %s\n", version);
```

**Returns**: Version string (e.g., "1.0.0").

### Configuration

**`sch_engine_set_sample_rate(engine, sample_rate)`**

Sets the audio sample rate.

```cpp
sch_engine_set_sample_rate(engine, 44100);
```

**Parameters**:
- `engine` - Engine instance
- `sample_rate` - Sample rate in Hz (44100, 48000, 96000)

**`sch_engine_set_buffer_size(engine, buffer_size)`**

Sets the audio buffer size.

```cpp
sch_engine_set_buffer_size(engine, 256);
```

**Parameters**:
- `engine` - Engine instance
- `buffer_size` - Buffer size in samples (128, 256, 512)

**`sch_engine_initialize(engine)`**

Initializes the audio engine (call after configuration).

```cpp
sch_result_t result = sch_engine_initialize(engine);
if (result != SCH_SUCCESS) {
    // Handle error
}
```

**Returns**: `SCH_SUCCESS` on success, error code on failure.

---

## Transport Functions

### Playback Control

**`sch_transport_play(engine)`**

Starts playback from current position.

```cpp
sch_result_t result = sch_transport_play(engine);
if (result != SCH_SUCCESS) {
    fprintf(stderr, "Failed to play: %s\n", sch_error_string(result));
}
```

**Returns**: `SCH_SUCCESS` on success.

**`sch_transport_pause(engine)`**

Pauses playback, maintaining current position.

```cpp
sch_transport_pause(engine);
```

**`sch_transport_stop(engine)`**

Stops playback and returns to start position.

```cpp
sch_transport_stop(engine);
```

**`sch_transport_toggle_playback(engine)`**

Toggles between play and pause.

```cpp
sch_transport_toggle_playback(engine);
```

### Position Control

**`sch_transport_set_position(engine, position)`**

Sets the playhead position.

```cpp
double position = 1920.0;  // 1 bar at 120 BPM, 4/4
sch_transport_set_position(engine, position);
```

**Parameters**:
- `engine` - Engine instance
- `position` - Position in ticks

**`sch_transport_get_position(engine)`**

Gets the current playhead position.

```cpp
double position = sch_transport_get_position(engine);
printf("Current position: %.2f ticks\n", position);
```

**Returns**: Current position in ticks.

**`sch_transport_move_to_start(engine)`**

Jumps to the start of the project.

```cpp
sch_transport_move_to_start(engine);
```

**`sch_transport_move_to_end(engine)`**

Jumps to the end of the project.

```cpp
sch_transport_move_to_end(engine);
```

### Loop Control

**`sch_transport_set_loop_start(engine, position)`**

Sets the loop start position.

```cpp
sch_transport_set_loop_start(engine, 0.0);
```

**`sch_transport_set_loop_end(engine, position)`**

Sets the loop end position.

```cpp
sch_transport_set_loop_end(engine, 7680.0);
```

**`sch_transport_enable_loop(engine, enabled)`**

Enables or disables loop playback.

```cpp
sch_transport_enable_loop(engine, true);
```

**`sch_transport_is_loop_enabled(engine)`**

Checks if loop is enabled.

```cpp
bool enabled = sch_transport_is_loop_enabled(engine);
if (enabled) {
    printf("Loop is enabled\n");
}
```

---

## MIDI Functions

### MIDI Input

**`sch_midi_register_callback(engine, callback, user_data)`**

Registers a callback for MIDI input.

```cpp
void midi_callback(const sch_midi_message_t* message, void* user_data) {
    printf("Note: %d, Velocity: %d\n", message->data1, message->data2);
}

sch_midi_register_callback(engine, midi_callback, nullptr);
```

**Parameters**:
- `engine` - Engine instance
- `callback` - Function to call when MIDI message received
- `user_data` - User data passed to callback

**`sch_midi_message_t` Structure**:
```cpp
typedef struct {
    uint8_t status;  // Status byte (note on, note off, etc.)
    uint8_t data1;   // First data byte (note number)
    uint8_t data2;   // Second data byte (velocity)
    double timestamp;  // Timestamp in seconds
} sch_midi_message_t;
```

### MIDI Output

**`sch_midi_send_note_on(engine, channel, note, velocity)`**

Sends a MIDI note on message.

```cpp
sch_midi_send_note_on(engine, 0, 60, 127);  // Channel 0, C4, max velocity
```

**Parameters**:
- `engine` - Engine instance
- `channel` - MIDI channel (0-15)
- `note` - Note number (0-127)
- `velocity` - Velocity (0-127)

**`sch_midi_send_note_off(engine, channel, note, velocity)`**

Sends a MIDI note off message.

```cpp
sch_midi_send_note_off(engine, 0, 60, 0);
```

**`sch_midi_send_control_change(engine, channel, controller, value)`**

Sends a MIDI control change message.

```cpp
sch_midi_send_control_change(engine, 0, 1, 64);  // Modulation wheel
```

**Parameters**:
- `engine` - Engine instance
- `channel` - MIDI channel (0-15)
- `controller` - Controller number (0-127)
- `value` - Controller value (0-127)

---

## Memory Functions

### Memory Allocation

**`sch_memory_alloc(size)`**

Allocates memory for use by the engine.

```cpp
void* buffer = sch_memory_alloc(1024);
if (buffer == nullptr) {
    // Handle out of memory
}
// Use buffer...
sch_memory_free(buffer);
```

**Parameters**:
- `size` - Size in bytes

**Returns**: Pointer to allocated memory, or `nullptr` on failure.

**`sch_memory_free(ptr)`**

Frees memory allocated by `sch_memory_alloc`.

```cpp
sch_memory_free(buffer);
```

**`sch_memory_copy(dest, src, size)`**

Copies memory from source to destination.

```cpp
sch_memory_copy(destination, source, 1024);
```

**Parameters**:
- `dest` - Destination pointer
- `src` - Source pointer
- `size` - Size in bytes

### String Utilities

**`sch_string_copy(dest, src, max_len)`**

Copies a string with length limit.

```cpp
char buffer[256];
sch_string_copy(buffer, source, sizeof(buffer));
```

**Parameters**:
- `dest` - Destination buffer
- `src` - Source string
- `max_len` - Maximum length (including null terminator)

**`sch_string_length(str)`**

Returns the length of a string.

```cpp
size_t len = sch_string_length("Hello");
printf("Length: %zu\n", len);  // Length: 5
```

---

## Error Handling

### Result Types

**`sch_result_t`**

Result codes for functions.

```cpp
typedef enum {
    SCH_SUCCESS = 0,
    SCH_ERROR_INVALID_ARGUMENT,
    SCH_ERROR_OUT_OF_MEMORY,
    SCH_ERROR_ENGINE_NOT_INITIALIZED,
    SCH_ERROR_AUDIO_DEVICE_ERROR,
    SCH_ERROR_FILE_NOT_FOUND,
    SCH_ERROR_PERMISSION_DENIED
} sch_result_t;
```

**`sch_error_string(result)`**

Gets a human-readable error message.

```cpp
sch_result_t result = sch_transport_play(engine);
if (result != SCH_SUCCESS) {
    fprintf(stderr, "Error: %s\n", sch_error_string(result));
}
```

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
**Previous**: [Swift API](SWIFT_API.md)

---

*For C++ implementation details, see `/juce_backend/src/ffi/`*
