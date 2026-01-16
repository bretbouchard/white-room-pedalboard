# Schillinger SDK C ABI Design

**Phase**: 3.1 - C ABI Wrapper Design
**Date**: 2025-12-30
**Status**: In Progress

---

## Overview

This document defines the C ABI (Application Binary Interface) for the Schillinger SDK, enabling Dart FFI integration and future native language bindings.

### Design Principles

1. **C ABI Compatibility**: Use standard C types for maximum compatibility
2. **Explicit Memory Management**: All opaque handles have create/destroy functions
3. **Error Handling**: Return status codes with error message retrieval
4. **String Handling**: All strings are UTF-8 encoded, caller frees returned strings
5. **Type Safety**: Strong typing for enums, handles, and parameters

---

## Architecture

### Layer Structure

```
┌─────────────────────────────────────┐
│  Dart SDK (Typed API Layer)         │
├─────────────────────────────────────┤
│  Dart FFI Bindings (ffigen)         │
├─────────────────────────────────────┤
│  C ABI Wrapper (this document)      │
├─────────────────────────────────────┤
│  TypeScript SDK Core (via Node-API) │
└─────────────────────────────────────┘
```

### Implementation Strategy

For **Phase 3**, we use a **hybrid approach**:
- **C ABI** defines the interface contract
- **Node-API wrapper** bridges to existing TypeScript SDK
- **Future**: Pure C++ implementation for performance-critical paths

---

## Core Types

### Opaque Handles

All SDK objects are represented as opaque pointers:

```c
typedef struct SchillingerSDK SchillingerSDK;
typedef struct RhythmGenerator RhythmGenerator;
typedef struct HarmonyGenerator HarmonyGenerator;
typedef struct MelodyGenerator MelodyGenerator;
typedef struct CompositionGenerator CompositionGenerator;
```

### Status Codes

```c
typedef enum {
  SCHILLINGER_OK = 0,
  SCHILLINGER_ERROR = -1,
  SCHILLINGER_ERROR_INVALID_ARGUMENT = -2,
  SCHILLINGER_ERROR_OUT_OF_MEMORY = -3,
  SCHILLINGER_ERROR_NOT_INITIALIZED = -4,
  SCHILLINGER_ERROR_ALREADY_INITIALIZED = -5,
  SCHILLINGER_ERROR_AUTH_FAILED = -6,
  SCHILLINGER_ERROR_NETWORK = -7,
  SCHILLINGER_ERROR_RATE_LIMITED = -8,
  SCHILLINGER_ERROR_QUOTA_EXCEEDED = -9,
} SchillingerStatus;
```

### String Handling

- **Input strings**: `const char*` (UTF-8, null-terminated)
- **Output strings**: `char*` (caller must free using `schillinger_string_free()`)

---

## Memory Management

### Create/Destroy Pattern

All handles follow this pattern:

```c
// Create - returns handle, status indicates success
SchillingerStatus schillinger_sdk_create(
  SchillingerSDK** out_sdk,
  char** out_error
);

// Destroy - releases resources
void schillinger_sdk_destroy(SchillingerSDK* sdk);
```

### String Memory

```c
// Free strings returned from SDK
void schillinger_string_free(char* str);
```

---

## SDK Lifecycle

### Initialization

```c
// Configuration
typedef struct {
  const char* api_url;           // Required
  int timeout_ms;                // Default: 60000
  int max_retries;               // Default: 1
  int enable_cache;              // Default: 1
  int enable_offline;            // Default: 0
  const char* environment;        // "production" | "staging" | "development"
  int debug_mode;                // Default: 0
} SchillingerSDKConfig;

// Create SDK instance
SchillingerStatus schillinger_sdk_create(
  const SchillingerSDKConfig* config,
  SchillingerSDK** out_sdk,
  char** out_error
);
```

### Authentication

```c
typedef struct {
  const char* api_key;           // API key authentication
  const char* clerk_token;       // Clerk token authentication
  const char* custom_token;      // Custom token authentication
} SchillingerCredentials;

SchillingerStatus schillinger_sdk_authenticate(
  SchillingerSDK* sdk,
  const SchillingerCredentials* creds,
  char** out_error
);
```

### Disposal

```c
void schillinger_sdk_destroy(SchillingerSDK* sdk);
```

---

## RhythmGenerator API

### Creation

```c
typedef struct {
  int default_tempo;             // Default: 120
  int default_time_sig_num;      // Default: 4
  int default_time_sig_den;      // Default: 4
  double default_swing;           // Default: 0.0
  double default_complexity;      // Default: 0.5
  int enable_cache;               // Default: 1
} RhythmGeneratorConfig;

SchillingerStatus rhythm_generator_create(
  SchillingerSDK* sdk,
  const RhythmGeneratorConfig* config,
  RhythmGenerator** out_generator,
  char** out_error
);
```

### Methods

#### Generate Resultant

```c
typedef struct {
  char* json;                    // JSON-serialized RhythmPattern
  char* error;                   // Null if success
} RhythmResult;

RhythmResult rhythm_generator_generate_resultant(
  RhythmGenerator* generator,
  int a,
  int b,
  char** out_error
);
```

#### Generate Complex

```c
typedef struct {
  int generator_a;
  int generator_b;
  double complexity;
  const char* style;             // "classical" | "jazz" | "contemporary" | "experimental"
} ComplexRhythmParams;

RhythmResult rhythm_generator_generate_complex(
  RhythmGenerator* generator,
  const ComplexRhythmParams* params,
  char** out_error
);
```

#### Analyze Pattern

```c
typedef struct {
  char* json;                    // JSON-serialized RhythmAnalysis
} RhythmAnalysisResult;

RhythmAnalysisResult rhythm_generator_analyze_pattern(
  RhythmGenerator* generator,
  const char* pattern_json,       // JSON-serialized RhythmPattern
  char** out_error
);
```

### Disposal

```c
void rhythm_generator_destroy(RhythmGenerator* generator);
void rhythm_result_free(RhythmResult* result);
void rhythm_analysis_result_free(RhythmAnalysisResult* result);
```

---

## HarmonyGenerator API

### Creation

```c
typedef struct {
  int default_tempo;
  double default_complexity;
  const char* default_scale;     // "major" | "minor" | etc.
  int enable_cache;
} HarmonyGeneratorConfig;

SchillingerStatus harmony_generator_create(
  SchillingerSDK* sdk,
  const HarmonyGeneratorConfig* config,
  HarmonyGenerator** out_generator,
  char** out_error
);
```

### Methods

```c
typedef struct {
  char* json;                    // JSON-serialized ChordProgression
} HarmonyResult;

HarmonyResult harmony_generator_generate_progression(
  HarmonyGenerator* generator,
  const char* key_root,          // "C" | "F#" | "Bb" | etc.
  const char* scale_type,        // "major" | "minor" | etc.
  int length,
  char** out_error
);
```

---

## MelodyGenerator API

### Creation

```c
typedef struct {
  int default_tempo;
  double default_complexity;
  const char* default_scale;
  int enable_cache;
} MelodyGeneratorConfig;

SchillingerStatus melody_generator_create(
  SchillingerSDK* sdk,
  const MelodyGeneratorConfig* config,
  MelodyGenerator** out_generator,
  char** out_error
);
```

### Methods

```c
typedef struct {
  char* json;                    // JSON-serialized MelodyPattern
} MelodyResult;

MelodyResult melody_generator_generate(
  MelodyGenerator* generator,
  const char* key_root,
  const char* scale_type,
  int length_bars,
  char** out_error
);
```

---

## CompositionGenerator API

### Creation

```c
typedef struct {
  int default_tempo;
  double default_complexity;
  int enable_cache;
} CompositionGeneratorConfig;

SchillingerStatus composition_generator_create(
  SchillingerSDK* sdk,
  const CompositionGeneratorConfig* config,
  CompositionGenerator** out_generator,
  char** out_error
);
```

### Methods

```c
typedef struct {
  char* json;                    // JSON-serialized Composition
} CompositionResult;

CompositionResult composition_generator_generate(
  CompositionGenerator* generator,
  const char* params_json,       // JSON-serialized composition parameters
  char** out_error
);
```

---

## Error Handling

### Error Message Retrieval

```c
// Get last error message
const char* schillinger_sdk_get_last_error(SchillingerSDK* sdk);

// Get error message for status code
const char* schillinger_status_string(SchillingerStatus status);
```

---

## Implementation Notes

### Phase 3 Strategy

For initial implementation, we use **Node-API (N-API)** to bridge to existing TypeScript:

1. **C ABI header** defines the interface
2. **Node-API wrapper** implements C functions by calling TypeScript SDK
3. **Dart FFI** binds to C ABI header

### Future Optimizations

- **Pure C++ implementation** for performance-critical algorithms
- **WASM compilation** for browser support
- **Mobile native** (iOS/Android) via same C ABI

---

## Testing Strategy

### Unit Tests

- Test each C API function with various inputs
- Verify memory management (no leaks, use-after-free)
- Validate error handling

### Integration Tests

- Dart SDK calls C ABI via FFI
- End-to-end workflow tests
- Performance benchmarks

### Validation Tests

- Compare results between TypeScript SDK and Dart SDK
- Verify JSON serialization consistency
- Test cross-platform compatibility

---

## Versioning

### ABI Versioning

The C ABI includes version information:

```c
#define SCHILLINGER_CABI_VERSION_MAJOR 2
#define SCHILLINGER_CABI_VERSION_MINOR 1
#define SCHILLINGER_CABI_VERSION_PATCH 0

typedef struct {
  int major;
  int minor;
  int patch;
} SchillingerCABIVersion;

SchillingerCABIVersion schillinger_cabi_get_version(void);
```

---

## Next Steps

1. ✅ Design C ABI header (this document)
2. ⏳ Implement `schillinger_cabi.h`
3. ⏳ Implement C ABI wrapper (Node-API bridge)
4. ⏳ Create CMakeLists.txt for building
5. ⏳ Set up Dart FFI bindings generation
6. ⏳ Implement typed Dart API layer
7. ⏳ Create comprehensive tests

---

**Author**: Claude Code (Phase 3 Implementation)
**Last Updated**: 2025-12-30
**Status**: In Progress
