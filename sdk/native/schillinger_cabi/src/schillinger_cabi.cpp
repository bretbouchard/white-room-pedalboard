/**
 * Schillinger SDK C ABI Implementation
 *
 * @file schillinger_cabi.cpp
 * @brief Node-API implementation of C ABI wrapper
 *
 * This implementation uses Node-API (N-API) to bridge the C ABI
 * to the existing TypeScript SDK. For Phase 3, this is a stub
 * implementation that demonstrates the structure.
 *
 * Future optimizations:
 * - Pure C++ implementation for performance-critical paths
 * - WASM compilation for browser support
 */

#include "schillinger_cabi.h"
#include <node_api.h>
#include <string.h>
#include <stdlib.h>

// ===========================================================================
// Internal State
// ===========================================================================

// Custom memory allocator functions
static void* (*g_malloc_fn)(size_t) = malloc;
static void (*g_free_fn)(void*) = free;

// Node-API environment (initialized once)
static napi_env g_env = NULL;
static napi_ref g_sdk_constructor = NULL;

// ===========================================================================
// Helper Functions
// ===========================================================================

/**
 * Helper: Allocate string using custom allocator
 */
static char* alloc_string(const char* str) {
  if (!str) return NULL;
  size_t len = strlen(str) + 1;
  char* copy = (char*)g_malloc_fn(len);
  if (copy) {
    memcpy(copy, str, len);
  }
  return copy;
}

/**
 * Helper: Allocate and format error message
 */
static char* format_error(const char* func, const char* msg) {
  const char* prefix = "[Schillinger CABI] ";
  size_t prefix_len = strlen(prefix);
  size_t func_len = strlen(func);
  size_t msg_len = strlen(msg);
  size_t total_len = prefix_len + func_len + 2 + msg_len + 1; // ": " + null

  char* error = (char*)g_malloc_fn(total_len);
  if (error) {
    snprintf(error, total_len, "%s%s: %s", prefix, func, msg);
  }
  return error;
}

/**
 * Helper: Initialize Node-API environment
 */
static SchillingerStatus ensure_nodeapi_initialized(char** out_error) {
  if (g_env) {
    return SCHILLINGER_OK;
  }

  // TODO: Initialize Node-API environment
  // This would typically be done in the module initialization
  *out_error = alloc_string("Node-API environment not initialized. Call schillinger_init_module() first.");
  return SCHILLINGER_ERROR_NOT_INITIALIZED;
}

// ===========================================================================
// Version Information
// ===========================================================================

SchillingerCABIVersion schillinger_cabi_get_version(void) {
  SchillingerCABIVersion version = {
    SCHILLINGER_CABI_VERSION_MAJOR,
    SCHILLINGER_CABI_VERSION_MINOR,
    SCHILLINGER_CABI_VERSION_PATCH
  };
  return version;
}

const char* schillinger_status_string(SchillingerStatus status) {
  switch (status) {
    case SCHILLINGER_OK:
      return "OK";
    case SCHILLINGER_ERROR:
      return "Error";
    case SCHILLINGER_ERROR_INVALID_ARGUMENT:
      return "Invalid argument";
    case SCHILLINGER_ERROR_OUT_OF_MEMORY:
      return "Out of memory";
    case SCHILLINGER_ERROR_NOT_INITIALIZED:
      return "Not initialized";
    case SCHILLINGER_ERROR_ALREADY_INITIALIZED:
      return "Already initialized";
    case SCHILLINGER_ERROR_AUTH_FAILED:
      return "Authentication failed";
    case SCHILLINGER_ERROR_NETWORK:
      return "Network error";
    case SCHILLINGER_ERROR_RATE_LIMITED:
      return "Rate limited";
    case SCHILLINGER_ERROR_QUOTA_EXCEEDED:
      return "Quota exceeded";
    default:
      return "Unknown error";
  }
}

// ===========================================================================
// Memory Management
// ===========================================================================

void schillinger_string_free(char* str) {
  if (str) {
    g_free_fn(str);
  }
}

void schillinger_set_memory_allocator(
  void* (*malloc_fn)(size_t),
  void (*free_fn)(void*)
) {
  if (malloc_fn) g_malloc_fn = malloc_fn;
  if (free_fn) g_free_fn = free_fn;
}

// ===========================================================================
// SDK Lifecycle (Stub Implementation)
// ===========================================================================

struct SchillingerSDK {
  napi_env env;
  napi_value js_sdk;
  char* last_error;
};

SchillingerStatus schillinger_sdk_create(
  const SchillingerSDKConfig* config,
  SchillingerSDK** out_sdk,
  char** out_error
) {
  SchillingerStatus status = ensure_nodeapi_initialized(out_error);
  if (status != SCHILLINGER_OK) {
    return status;
  }

  if (!out_sdk) {
    *out_error = alloc_string("out_sdk cannot be NULL");
    return SCHILLINGER_ERROR_INVALID_ARGUMENT;
  }

  // Allocate SDK handle
  SchillingerSDK* sdk = (SchillingerSDK*)g_malloc_fn(sizeof(SchillingerSDK));
  if (!sdk) {
    *out_error = alloc_string("Failed to allocate SDK handle");
    return SCHILLINGER_ERROR_OUT_OF_MEMORY;
  }

  // Initialize SDK structure
  sdk->env = g_env;
  sdk->js_sdk = NULL;
  sdk->last_error = NULL;

  // TODO: Create JavaScript SDK instance
  // napi_value config_obj;
  // napi_create_object(g_env, &config_obj);
  // ... set config properties ...
  // napi_new_instance(g_env, g_sdk_constructor, 1, &config_obj, &sdk->js_sdk);

  *out_sdk = sdk;
  return SCHILLINGER_OK;
}

SchillingerStatus schillinger_sdk_authenticate(
  SchillingerSDK* sdk,
  const SchillingerCredentials* creds,
  char** out_error
) {
  if (!sdk) {
    *out_error = alloc_string("SDK handle cannot be NULL");
    return SCHILLINGER_ERROR_INVALID_ARGUMENT;
  }

  if (!creds) {
    *out_error = alloc_string("Credentials cannot be NULL");
    return SCHILLINGER_ERROR_INVALID_ARGUMENT;
  }

  // TODO: Call authenticate method on JavaScript SDK
  // napi_value auth_method;
  // napi_get_named_property(sdk->env, sdk->js_sdk, "authenticate", &auth_method);
  // ... call authenticate with credentials ...

  return SCHILLINGER_OK;
}

int schillinger_sdk_is_authenticated(SchillingerSDK* sdk) {
  if (!sdk) return 0;

  // TODO: Check authentication status
  // napi_value is_auth_method;
  // napi_get_named_property(sdk->env, sdk->js_sdk, "isAuthenticated", &is_auth_method);
  // ... call isAuthenticated and convert result ...

  return 0; // Stub: not authenticated
}

const char* schillinger_sdk_get_last_error(SchillingerSDK* sdk) {
  if (!sdk) return "SDK handle is NULL";
  return sdk->last_error ? sdk->last_error : "No error";
}

void schillinger_sdk_destroy(SchillingerSDK* sdk) {
  if (!sdk) return;

  // Clean up JavaScript reference
  if (sdk->js_sdk) {
    napi_delete_reference(sdk->env, g_sdk_constructor);
  }

  // Free error message
  if (sdk->last_error) {
    g_free_fn(sdk->last_error);
  }

  // Free SDK handle
  g_free_fn(sdk);
}

// ===========================================================================
// RhythmGenerator (Stub Implementation)
// ===========================================================================

struct RhythmGenerator {
  SchillingerSDK* sdk;
  napi_value js_generator;
  RhythmGeneratorConfig config;
};

SchillingerStatus rhythm_generator_create(
  SchillingerSDK* sdk,
  const RhythmGeneratorConfig* config,
  RhythmGenerator** out_generator,
  char** out_error
) {
  if (!sdk || !out_generator) {
    *out_error = alloc_string("Invalid arguments");
    return SCHILLINGER_ERROR_INVALID_ARGUMENT;
  }

  // Allocate generator handle
  RhythmGenerator* generator = (RhythmGenerator*)g_malloc_fn(sizeof(RhythmGenerator));
  if (!generator) {
    *out_error = alloc_string("Failed to allocate generator handle");
    return SCHILLINGER_ERROR_OUT_OF_MEMORY;
  }

  // Initialize generator
  generator->sdk = sdk;
  generator->js_generator = NULL;

  // Set config (use defaults if not provided)
  if (config) {
    generator->config = *config;
  } else {
    generator->config.default_tempo = 120;
    generator->config.default_time_sig_num = 4;
    generator->config.default_time_sig_den = 4;
    generator->config.default_swing = 0.0;
    generator->config.default_complexity = 0.5;
    generator->config.enable_cache = 1;
  }

  // TODO: Create JavaScript generator instance
  // napi_value generators_obj;
  // napi_get_named_property(sdk->env, sdk->js_sdk, "generators", &generators_obj);
  // napi_value rhythm_generator;
  // napi_get_named_property(sdk->env, generators_obj, "rhythm", &rhythm_generator);

  *out_generator = generator;
  return SCHILLINGER_OK;
}

RhythmResult rhythm_generator_generate_resultant(
  RhythmGenerator* generator,
  int a,
  int b,
  char** out_error
) {
  RhythmResult result = {0};

  if (!generator) {
    result.error = alloc_string("Generator handle cannot be NULL");
    return result;
  }

  // TODO: Call generateResultant method
  // napi_value method;
  // napi_get_named_property(generator->sdk->env, generator->js_generator, "generateResultant", &method);
  // napi_value args[2];
  // napi_create_int32(generator->sdk->env, a, &args[0]);
  // napi_create_int32(generator->sdk->env, b, &args[1]);
  // napi_value js_result;
  // napi_call_function(...);
  // napi_get_value_string_utf8(...);

  // Stub: Return JSON pattern
  result.json = alloc_string("{\"notes\":[],\"metadata\":{\"generators\":[]}}");
  return result;
}

void rhythm_generator_destroy(RhythmGenerator* generator) {
  if (!generator) return;
  g_free_fn(generator);
}

void rhythm_result_free(RhythmResult* result) {
  if (!result) return;
  if (result->json) g_free_fn(result->json);
  if (result->error) g_free_fn(result->error);
}

// Additional generator stubs follow same pattern...
// (harmony_generator_create, melody_generator_create, etc.)

SchillingerStatus harmony_generator_create(
  SchillingerSDK* sdk,
  const HarmonyGeneratorConfig* config,
  HarmonyGenerator** out_generator,
  char** out_error
) {
  // Stub implementation
  return SCHILLINGER_OK;
}

void harmony_generator_destroy(HarmonyGenerator* generator) {
  if (!generator) return;
  g_free_fn(generator);
}

void harmony_result_free(HarmonyResult* result) {
  if (!result) return;
  if (result->json) g_free_fn(result->json);
  if (result->error) g_free_fn(result->error);
}

SchillingerStatus melody_generator_create(
  SchillingerSDK* sdk,
  const MelodyGeneratorConfig* config,
  MelodyGenerator** out_generator,
  char** out_error
) {
  // Stub implementation
  return SCHILLINGER_OK;
}

void melody_generator_destroy(MelodyGenerator* generator) {
  if (!generator) return;
  g_free_fn(generator);
}

void melody_result_free(MelodyResult* result) {
  if (!result) return;
  if (result->json) g_free_fn(result->json);
  if (result->error) g_free_fn(result->error);
}

SchillingerStatus composition_generator_create(
  SchillingerSDK* sdk,
  const CompositionGeneratorConfig* config,
  CompositionGenerator** out_generator,
  char** out_error
) {
  // Stub implementation
  return SCHILLINGER_OK;
}

void composition_generator_destroy(CompositionGenerator* generator) {
  if (!generator) return;
  g_free_fn(generator);
}

void composition_result_free(CompositionResult* result) {
  if (!result) return;
  if (result->json) g_free_fn(result->json);
  if (result->error) g_free_fn(result->error);
}

SchillingerStatus schillinger_sdk_get_diagnostics(
  SchillingerSDK* sdk,
  char** out_json
) {
  if (!sdk || !out_json) {
    return SCHILLINGER_ERROR_INVALID_ARGUMENT;
  }

  // Stub: Return diagnostics JSON
  *out_json = alloc_string("{\"version\":\"2.1.0\",\"status\":\"ok\"}");
  return SCHILLINGER_OK;
}

// ===========================================================================
// Module Initialization (Node-API)
// ===========================================================================

/**
 * Module initialization function called by Node.js
 *
 * This function is called when the native module is loaded.
 * It initializes the Node-API environment and stores global references.
 */
static napi_value Init(napi_env env, napi_value exports) {
  g_env = env;

  // TODO: Get SDK constructor from module exports
  // napi_value sdk_class;
  // napi_get_named_property(env, exports, "SchillingerSDK", &sdk_class);
  // napi_create_reference(env, sdk_class, 1, &g_sdk_constructor);

  return exports;
}

// Register module initialization
NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
