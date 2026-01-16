/**
 * Schillinger SDK C ABI
 *
 * @file schillinger_cabi.h
 * @brief C Application Binary Interface for Schillinger SDK
 * @version 2.1.0
 *
 * This header defines the stable C ABI for the Schillinger SDK,
 * enabling FFI integration with Dart and other native languages.
 *
 * All memory management follows explicit create/destroy patterns.
 * All strings are UTF-8 encoded and null-terminated.
 * Callers are responsible for freeing returned strings.
 */

#ifndef SCHILLINGER_CABI_H
#define SCHILLINGER_CABI_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stddef.h>
#include <stdint.h>

// ===========================================================================
// Version Information
// ===========================================================================

#define SCHILLINGER_CABI_VERSION_MAJOR 2
#define SCHILLINGER_CABI_VERSION_MINOR 1
#define SCHILLINGER_CABI_VERSION_PATCH 0

typedef struct {
  int major;
  int minor;
  int patch;
} SchillingerCABIVersion;

/**
 * Get the C ABI version
 */
SchillingerCABIVersion schillinger_cabi_get_version(void);

// ===========================================================================
// Status Codes
// ===========================================================================

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

/**
 * Get human-readable status message
 */
const char* schillinger_status_string(SchillingerStatus status);

// ===========================================================================
// Forward Declarations (Opaque Handles)
// ===========================================================================

typedef struct SchillingerSDK SchillingerSDK;
typedef struct RhythmGenerator RhythmGenerator;
typedef struct HarmonyGenerator HarmonyGenerator;
typedef struct MelodyGenerator MelodyGenerator;
typedef struct CompositionGenerator CompositionGenerator;

// ===========================================================================
// Memory Management
// ===========================================================================

/**
 * Free strings returned from SDK functions
 *
 * @param str String to free (safe to pass NULL)
 */
void schillinger_string_free(char* str);

// ===========================================================================
// SDK Configuration
// ===========================================================================

/**
 * SDK initialization configuration
 */
typedef struct {
  const char* api_url;           /* Required: API base URL */
  int timeout_ms;                /* Default: 60000 */
  int max_retries;               /* Default: 1 */
  int enable_cache;              /* Default: 1 */
  int enable_offline;            /* Default: 0 */
  const char* environment;        /* "production" | "staging" | "development" */
  int debug_mode;                /* Default: 0 */
} SchillingerSDKConfig;

/**
 * Authentication credentials
 */
typedef struct {
  const char* api_key;           /* API key authentication */
  const char* clerk_token;       /* Clerk token authentication */
  const char* custom_token;      /* Custom token authentication */
} SchillingerCredentials;

// ===========================================================================
// SDK Lifecycle
// ===========================================================================

/**
 * Create SDK instance
 *
 * @param config Configuration options (NULL for defaults)
 * @param out_sdk Output parameter for SDK handle
 * @param out_error Output parameter for error message (must be freed by caller)
 * @return Status code
 */
SchillingerStatus schillinger_sdk_create(
  const SchillingerSDKConfig* config,
  SchillingerSDK** out_sdk,
  char** out_error
);

/**
 * Authenticate with SDK
 *
 * @param sdk SDK instance handle
 * @param creds Authentication credentials
 * @param out_error Output parameter for error message
 * @return Status code
 */
SchillingerStatus schillinger_sdk_authenticate(
  SchillingerSDK* sdk,
  const SchillingerCredentials* creds,
  char** out_error
);

/**
 * Check if SDK is authenticated
 *
 * @param sdk SDK instance handle
 * @return 1 if authenticated, 0 otherwise
 */
int schillinger_sdk_is_authenticated(SchillingerSDK* sdk);

/**
 * Get last error message from SDK
 *
 * @param sdk SDK instance handle
 * @return Error message (valid until next SDK call)
 */
const char* schillinger_sdk_get_last_error(SchillingerSDK* sdk);

/**
 * Destroy SDK instance and free resources
 *
 * @param sdk SDK instance handle (safe to pass NULL)
 */
void schillinger_sdk_destroy(SchillingerSDK* sdk);

// ===========================================================================
// RhythmGenerator
// ===========================================================================

/**
 * RhythmGenerator configuration
 */
typedef struct {
  int default_tempo;             /* Default: 120 */
  int default_time_sig_num;      /* Default: 4 */
  int default_time_sig_den;      /* Default: 4 */
  double default_swing;           /* Default: 0.0 */
  double default_complexity;      /* Default: 0.5 */
  int enable_cache;               /* Default: 1 */
} RhythmGeneratorConfig;

/**
 * Complex rhythm generation parameters
 */
typedef struct {
  int generator_a;
  int generator_b;
  double complexity;
  const char* style;             /* "classical" | "jazz" | "contemporary" | "experimental" */
} ComplexRhythmParams;

/**
 * Rhythm pattern result (JSON-serialized)
 */
typedef struct {
  char* json;                    /* JSON-serialized RhythmPattern (must be freed) */
  char* error;                   /* Error message if failed (must be freed) */
} RhythmResult;

/**
 * Rhythm analysis result (JSON-serialized)
 */
typedef struct {
  char* json;                    /* JSON-serialized RhythmAnalysis (must be freed) */
  char* error;                   /* Error message if failed (must be freed) */
} RhythmAnalysisResult;

/**
 * Create RhythmGenerator instance
 *
 * @param sdk SDK instance handle
 * @param config Generator configuration (NULL for defaults)
 * @param out_generator Output parameter for generator handle
 * @param out_error Output parameter for error message
 * @return Status code
 */
SchillingerStatus rhythm_generator_create(
  SchillingerSDK* sdk,
  const RhythmGeneratorConfig* config,
  RhythmGenerator** out_generator,
  char** out_error
);

/**
 * Generate rhythmic resultant pattern
 *
 * @param generator Generator handle
 * @param a First generator (number of units)
 * @param b Second generator (number of units)
 * @param out_error Output parameter for error message
 * @return RhythmResult (must be freed using rhythm_result_free())
 */
RhythmResult rhythm_generator_generate_resultant(
  RhythmGenerator* generator,
  int a,
  int b,
  char** out_error
);

/**
 * Generate complex rhythm pattern
 *
 * @param generator Generator handle
 * @param params Generation parameters
 * @param out_error Output parameter for error message
 * @return RhythmResult (must be freed)
 */
RhythmResult rhythm_generator_generate_complex(
  RhythmGenerator* generator,
  const ComplexRhythmParams* params,
  char** out_error
);

/**
 * Analyze rhythm pattern
 *
 * @param generator Generator handle
 * @param pattern_json JSON-serialized RhythmPattern
 * @param out_error Output parameter for error message
 * @return RhythmAnalysisResult (must be freed)
 */
RhythmAnalysisResult rhythm_generator_analyze_pattern(
  RhythmGenerator* generator,
  const char* pattern_json,
  char** out_error
);

/**
 * Free RhythmResult resources
 */
void rhythm_result_free(RhythmResult* result);

/**
 * Free RhythmAnalysisResult resources
 */
void rhythm_analysis_result_free(RhythmAnalysisResult* result);

/**
 * Destroy RhythmGenerator instance
 */
void rhythm_generator_destroy(RhythmGenerator* generator);

// ===========================================================================
// HarmonyGenerator
// ===========================================================================

/**
 * HarmonyGenerator configuration
 */
typedef struct {
  int default_tempo;
  double default_complexity;
  const char* default_scale;     /* "major" | "minor" | etc. */
  int enable_cache;
} HarmonyGeneratorConfig;

/**
 * Chord progression result (JSON-serialized)
 */
typedef struct {
  char* json;                    /* JSON-serialized ChordProgression */
  char* error;
} HarmonyResult;

/**
 * Create HarmonyGenerator instance
 */
SchillingerStatus harmony_generator_create(
  SchillingerSDK* sdk,
  const HarmonyGeneratorConfig* config,
  HarmonyGenerator** out_generator,
  char** out_error
);

/**
 * Generate chord progression
 *
 * @param generator Generator handle
 * @param key_root Root note (e.g., "C", "F#", "Bb")
 * @param scale_type Scale type (e.g., "major", "minor")
 * @param length Number of chords to generate
 * @param out_error Output parameter for error message
 * @return HarmonyResult (must be freed)
 */
HarmonyResult harmony_generator_generate_progression(
  HarmonyGenerator* generator,
  const char* key_root,
  const char* scale_type,
  int length,
  char** out_error
);

/**
 * Free HarmonyResult resources
 */
void harmony_result_free(HarmonyResult* result);

/**
 * Destroy HarmonyGenerator instance
 */
void harmony_generator_destroy(HarmonyGenerator* generator);

// ===========================================================================
// MelodyGenerator
// ===========================================================================

/**
 * MelodyGenerator configuration
 */
typedef struct {
  int default_tempo;
  double default_complexity;
  const char* default_scale;
  int enable_cache;
} MelodyGeneratorConfig;

/**
 * Melody pattern result (JSON-serialized)
 */
typedef struct {
  char* json;                    /* JSON-serialized MelodyPattern */
  char* error;
} MelodyResult;

/**
 * Create MelodyGenerator instance
 */
SchillingerStatus melody_generator_create(
  SchillingerSDK* sdk,
  const MelodyGeneratorConfig* config,
  MelodyGenerator** out_generator,
  char** out_error
);

/**
 * Generate melody pattern
 *
 * @param generator Generator handle
 * @param key_root Root note
 * @param scale_type Scale type
 * @param length_bars Length in bars
 * @param out_error Output parameter for error message
 * @return MelodyResult (must be freed)
 */
MelodyResult melody_generator_generate(
  MelodyGenerator* generator,
  const char* key_root,
  const char* scale_type,
  int length_bars,
  char** out_error
);

/**
 * Free MelodyResult resources
 */
void melody_result_free(MelodyResult* result);

/**
 * Destroy MelodyGenerator instance
 */
void melody_generator_destroy(MelodyGenerator* generator);

// ===========================================================================
// CompositionGenerator
// ===========================================================================

/**
 * CompositionGenerator configuration
 */
typedef struct {
  int default_tempo;
  double default_complexity;
  int enable_cache;
} CompositionGeneratorConfig;

/**
 * Composition result (JSON-serialized)
 */
typedef struct {
  char* json;                    /* JSON-serialized Composition */
  char* error;
} CompositionResult;

/**
 * Create CompositionGenerator instance
 */
SchillingerStatus composition_generator_create(
  SchillingerSDK* sdk,
  const CompositionGeneratorConfig* config,
  CompositionGenerator** out_generator,
  char** out_error
);

/**
 * Generate composition
 *
 * @param generator Generator handle
 * @param params_json JSON-serialized composition parameters
 * @param out_error Output parameter for error message
 * @return CompositionResult (must be freed)
 */
CompositionResult composition_generator_generate(
  CompositionGenerator* generator,
  const char* params_json,
  char** out_error
);

/**
 * Free CompositionResult resources
 */
void composition_result_free(CompositionResult* result);

/**
 * Destroy CompositionGenerator instance
 */
void composition_generator_destroy(CompositionGenerator* generator);

// ===========================================================================
// Utility Functions
// ===========================================================================

/**
 * Set custom memory allocator (optional)
 *
 * If not set, standard malloc/free are used.
 *
 * @param malloc_fn Custom malloc function
 * @param free_fn Custom free function
 */
void schillinger_set_memory_allocator(
  void* (*malloc_fn)(size_t),
  void (*free_fn)(void*)
);

/**
 * Get SDK diagnostics
 *
 * @param sdk SDK instance handle
 * @param out_json Output parameter for JSON diagnostics
 * @return Status code
 */
SchillingerStatus schillinger_sdk_get_diagnostics(
  SchillingerSDK* sdk,
  char** out_json
);

#ifdef __cplusplus
}
#endif

#endif // SCHILLINGER_CABI_H
