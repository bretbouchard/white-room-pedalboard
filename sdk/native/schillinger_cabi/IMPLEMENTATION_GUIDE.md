# C ABI Implementation Guide

Comprehensive guide for implementing the Schillinger C ABI using Node-API (N-API).

## Table of Contents

1. [Node-API Fundamentals](#node-api-fundamentals)
2. [Project Structure](#project-structure)
3. [Type Conversion](#type-conversion)
4. [Memory Management](#memory-management)
5. [Error Handling](#error-handling)
6. [Async Operations](#async-operations)
7. [Complete Implementation Examples](#complete-implementation-examples)
8. [Testing Strategy](#testing-strategy)
9. [Build and Debug](#build-and-debug)

---

## Node-API Fundamentals

### What is Node-API?

Node-API (N-API) is a stable API for building native addons for Node.js. It's the recommended way to create C++ extensions that can interface with JavaScript/TypeScript code.

**Key Benefits:**
- **ABI Stability**: Compiled against one Node.js version works across versions
- **No JavaScript Dependencies**: Pure C API, no need to understand V8 internals
- **Cross-Platform**: Works on Windows, macOS, and Linux

### Basic Concepts

#### napi_env

The `napi_env` type represents the Node.js environment and is used for all Node-API calls:

```cpp
struct SchillingerSDK {
  napi_env env;        // Node.js environment
  napi_value js_sdk;   // JavaScript SDK object reference
  char* last_error;    // Last error message
};
```

#### napi_value

The `napi_value` type is an opaque reference to a JavaScript value:

```cpp
napi_value js_string;    // Represents a JavaScript string
napi_value js_object;    // Represents a JavaScript object
napi_value js_number;    // Represents a JavaScript number
```

#### Reference Counting

Node-API uses reference counting to manage object lifetimes:

```cpp
napi_ref ref;  // A persistent reference to a JavaScript value

// Create a reference
napi_create_reference(env, js_value, 1, &ref);

// Delete a reference
napi_delete_reference(env, ref);
```

---

## Project Structure

```
native/schillinger_cabi/
├── include/
│   └── schillinger_cabi.h          # Public C ABI header (stable interface)
├── src/
│   ├── schillinger_cabi.cpp        # Node-API implementation
│   ├── node_api_bridge.cpp         # Node-API utility functions
│   └── type_converters.cpp         # Type conversion utilities
├── tests/
│   ├── test_basic.cpp              # Basic C ABI tests
│   └── test_node_api_integration.cpp # Node-API integration tests
├── package.json                     # Node.js package config
├── CMakeLists.txt                   # CMake build configuration
└── binding.gyp                      # Alternate node-gyp build config
```

---

## Type Conversion

### C to JavaScript (TypeScript)

#### Primitive Types

**Integer to JavaScript:**

```cpp
napi_value int_to_js(napi_env env, int value) {
  napi_value result;
  napi_create_int32(env, value, &result);
  return result;
}

// Usage
napi_value js_num = int_to_js(env, 42);
```

**String to JavaScript:**

```cpp
napi_value string_to_js(napi_env env, const char* str) {
  napi_value result;
  napi_create_string_utf8(env, str, NAPI_AUTO_LENGTH, &result);
  return result;
}

// Usage
napi_value js_str = string_to_js(env, "Hello, World!");
```

**Boolean to JavaScript:**

```cpp
napi_value bool_to_js(napi_env env, bool value) {
  napi_value result;
  napi_get_boolean(env, value, &result);
  return result;
}
```

#### Complex Types

**Struct to JavaScript Object:**

```cpp
// C struct
struct RhythmPattern {
  int tempo;
  int time_signature_numerator;
  int time_signature_denominator;
  // ... more fields
};

napi_value rhythm_pattern_to_js(napi_env env, const RhythmPattern* pattern) {
  napi_value obj;
  napi_create_object(env, &obj);

  // Set tempo property
  napi_value tempo = int_to_js(env, pattern->tempo);
  napi_set_named_property(env, obj, "tempo", tempo);

  // Set timeSignature property
  napi_value time_sig;
  napi_create_object(env, &time_sig);

  napi_value ts_num = int_to_js(env, pattern->time_signature_numerator);
  napi_set_named_property(env, time_sig, "numerator", ts_num);

  napi_value ts_den = int_to_js(env, pattern->time_signature_denominator);
  napi_set_named_property(env, time_sig, "denominator", ts_den);

  napi_set_named_property(env, obj, "timeSignature", time_sig);

  return obj;
}
```

**Array to JavaScript Array:**

```cpp
napi_value string_array_to_js(napi_env env, const char** strings, size_t count) {
  napi_value arr;
  napi_create_array_with_length(env, count, &arr);

  for (size_t i = 0; i < count; i++) {
    napi_value elem = string_to_js(env, strings[i]);
    napi_set_element(env, arr, i, elem);
  }

  return arr;
}
```

### JavaScript to C (TypeScript)

#### Primitive Types

**JavaScript to Integer:**

```cpp
int js_to_int(napi_env env, napi_value js_value) {
  int32_t result;
  napi_get_value_int32(env, js_value, &result);
  return result;
}

// Usage
int num = js_to_int(env, js_number);
```

**JavaScript to String:**

```cpp
char* js_to_string(napi_env env, napi_value js_value) {
  size_t length;
  napi_get_value_string_utf8(env, js_value, nullptr, 0, &length);

  char* buffer = (char*)malloc(length + 1);
  napi_get_value_string_utf8(env, js_value, buffer, length + 1, &length);

  return buffer;  // Caller must free()
}

// Usage
char* str = js_to_string(env, js_string);
// ... use str
free(str);
```

#### Complex Types

**JavaScript Object to Struct:**

```cpp
bool js_object_to_config(napi_env env, napi_value js_obj, SchillingerSDKConfig* config) {
  // Get apiUrl property
  napi_value api_url_value;
  if (napi_get_named_property(env, js_obj, "apiUrl", &api_url_value) != napi_ok) {
    return false;
  }
  config->api_url = js_to_string(env, api_url_value);

  // Get timeoutMs property
  napi_value timeout_value;
  if (napi_get_named_property(env, js_obj, "timeoutMs", &timeout_value) != napi_ok) {
    return false;
  }
  config->timeout_ms = js_to_int(env, timeout_value);

  return true;
}
```

---

## Memory Management

### Memory Allocation

**Custom Memory Allocator Pattern:**

```cpp
// Global memory functions (can be customized)
static void* (*g_malloc_fn)(size_t) = malloc;
static void (*g_free_fn)(void*) = free;

// Exported function to set custom allocator
void schillinger_set_memory_allocator(
  void* (*malloc_fn)(size_t),
  void (*free_fn)(void*)
) {
  if (malloc_fn) g_malloc_fn = malloc_fn;
  if (free_fn) g_free_fn = free_fn;
}

// Usage in implementation
SchillingerSDK* sdk = (SchillingerSDK*)g_malloc_fn(sizeof(SchillingerSDK));
// ... use sdk
g_free_fn(sdk);
```

### String Ownership

**Caller-Frees Pattern:**

```cpp
// When returning strings to caller, allocate with malloc
char* create_error_message(const char* msg) {
  char* buffer = (char*)g_malloc_fn(strlen(msg) + 1);
  strcpy(buffer, msg);
  return buffer;  // Caller must free()
}

// C API function
SchillingerStatus schillinger_sdk_create(
  const SchillingerSDKConfig* config,
  SchillingerSDK** out_sdk,
  char** out_error
) {
  if (config == nullptr) {
    *out_error = create_error_message("config cannot be null");
    return SCHILLINGER_ERROR_INVALID_ARGUMENT;
  }

  // ... create sdk
  return SCHILLINGER_OK;
}
```

**Caller Must Free:**

```dart
// Dart side
final errorPtr = ptr out_error;
final status = sdk_create(config, out_sdk, errorPtr);

if (status != SchillingerStatus.ok) {
  final error = errorPtr.value.toDartString();
  calloc.free(errorPtr);  // Free the string
  throw SchillingerException(status, error);
}
```

### Reference Management

**JavaScript Object References:**

```cpp
// Create SDK instance
SchillingerStatus schillinger_sdk_create(
  const SchillingerSDKConfig* config,
  SchillingerSDK** out_sdk,
  char** out_error
) {
  SchillingerSDK* sdk = new SchillingerSDK();
  sdk->env = g_env;

  // Create JavaScript SDK object
  napi_value js_sdk_class = get_js_sdk_class(g_env);
  napi_value js_sdk;
  napi_new_instance(g_env, js_sdk_class, 0, nullptr, &js_sdk);

  // Create persistent reference
  napi_create_reference(g_env, js_sdk, 1, &sdk->js_sdk_ref);

  *out_sdk = sdk;
  return SCHILLINGER_OK;
}

// Destroy SDK instance
void schillinger_sdk_destroy(SchillingerSDK* sdk) {
  if (sdk) {
    // Release JavaScript reference
    if (sdk->js_sdk_ref) {
      napi_delete_reference(sdk->env, sdk->js_sdk_ref);
    }

    // Free error message
    if (sdk->last_error) {
      g_free_fn(sdk->last_error);
    }

    g_free_fn(sdk);
  }
}
```

---

## Error Handling

### Error Propagation Pattern

```cpp
// Helper to set last error
void set_last_error(SchillingerSDK* sdk, const char* error) {
  if (sdk->last_error) {
    g_free_fn(sdk->last_error);
  }
  sdk->last_error = create_error_message(error);
}

// Function with error handling
SchillingerStatus some_sdk_function(
  SchillingerSDK* sdk,
  int some_param,
  char** out_error
) {
  if (!sdk) {
    *out_error = create_error_message("SDK is null");
    return SCHILLINGER_ERROR_NOT_INITIALIZED;
  }

  if (some_param < 0) {
    *out_error = create_error_message("Parameter must be positive");
    return SCHILLINGER_ERROR_INVALID_ARGUMENT;
  }

  // ... perform operation

  return SCHILLINGER_OK;
}
```

### JavaScript Exception Handling

```cpp
// Check for JavaScript exceptions
bool has_js_exception(napi_env env) {
  bool pending;
  napi_is_exception_pending(env, &pending);
  return pending;
}

// Get JavaScript exception as C string
char* get_js_exception(napi_env env) {
  napi_value exception;
  napi_get_and_clear_last_exception(env, &exception);

  napi_value message;
  napi_get_named_property(env, exception, "message", &message);

  return js_to_string(env, message);
}

// Wrap JavaScript call with error handling
napi_value call_js_method_safe(
  napi_env env,
  napi_value receiver,
  const char* method_name,
  napi_value* args,
  size_t arg_count
) {
  napi_value method;
  if (napi_get_named_property(env, receiver, method_name, &method) != napi_ok) {
    return nullptr;
  }

  napi_value result;
  napi_status status = napi_call_function(
    env, receiver, method, arg_count, args, &result
  );

  if (status != napi_ok || has_js_exception(env)) {
    char* error = get_js_exception(env);
    // ... handle error
    return nullptr;
  }

  return result;
}
```

---

## Async Operations

### Promise to C Callback Pattern

**JavaScript Side (TypeScript SDK):**

```typescript
// SDK method that returns a Promise
export class RhythmGenerator {
  async generateResultant(a: number, b: number): Promise<RhythmResult> {
    // ... async operation
    return result;
  }
}
```

**C Side (Node-API Bridge):**

```cpp
// Thread-safe data for async operation
struct AsyncWorkData {
  napi_env env;
  napi_ref sdk_ref;
  napi_deferred deferred;
  int a;
  int b;
  RhythmResult* result;
  char* error;
};

// Execute on worker thread
void execute_async_work(napi_threadsafe_function* ts_fn, void* data, void* hint) {
  AsyncWorkData* work_data = (AsyncWorkData*)data;

  // Call JavaScript Promise
  napi_value sdk;
  napi_get_reference_value(work_data->env, work_data->sdk_ref, &sdk);

  napi_value rhythm_gen;
  napi_get_named_property(work_data->env, sdk, "rhythm", &rhythm_gen);

  napi_value a_arg = int_to_js(work_data->env, work_data->a);
  napi_value b_arg = int_to_js(work_data->env, work_data->b);
  napi_value args[] = { a_arg, b_arg };

  napi_value js_promise = call_js_method_safe(
    work_data->env, rhythm_gen, "generateResultant", args, 2
  );

  if (js_promise) {
    // Handle promise resolution
    work_data->result = extract_rhythm_result(work_data->env, js_promise);
  } else {
    work_data->error = create_error_message("Failed to generate rhythm");
  }
}

// Complete on main thread
void complete_async_work(napi_env env, void* data, void* hint) {
  AsyncWorkData* work_data = (AsyncWorkData*)data;

  napi_value js_result;
  if (work_data->error) {
    napi_value error_msg = string_to_js(env, work_data->error);
    napi_reject_deferred(env, work_data->deferred, error_msg);
  } else {
    js_result = rhythm_result_to_js(env, work_data->result);
    napi_resolve_deferred(env, work_data->deferred, js_result);
  }

  // Cleanup
  napi_delete_reference(env, work_data->sdk_ref);
  free(work_data);
}

// C ABI function (blocking for simplicity)
RhythmResult rhythm_generator_generate_resultant(
  RhythmGenerator* generator,
  int a,
  int b,
  char** out_error
) {
  // For blocking implementation, use uv_run() to process event loop
  // Or use async callback pattern (see below)
}
```

**Better Approach: Async Callback Pattern**

```cpp
// Async callback type
typedef void (*RhythmCallback)(
  RhythmResult* result,
  const char* error,
  void* user_data
);

// Non-blocking async function
void rhythm_generator_generate_resultant_async(
  RhythmGenerator* generator,
  int a,
  int b,
  RhythmCallback callback,
  void* user_data
) {
  AsyncWorkData* work_data = new AsyncWorkData();
  work_data->generator = generator;
  work_data->a = a;
  work_data->b = b;
  work_data->callback = callback;
  work_data->user_data = user_data;

  // Queue to Node.js thread pool
  napi_threadsafe_function ts_fn = create_threadsafe_function(generator->env);
  napi_call_threadsafe_function(ts_fn, work_data, napi_tsfn_nonblocking);
}
```

---

## Complete Implementation Examples

### Example 1: SDK Initialization

**schillinger_cabi.cpp:**

```cpp
#include "schillinger_cabi.h"
#include <node_api.h>
#include <string.h>
#include <stdlib.h>

// Global environment (initialized once)
static napi_env g_env = nullptr;
static napi_value g_global = nullptr;

// Initialize Node-API environment
__attribute__((constructor))
static void initialize_node_api() {
  // In a real Node-API addon, this would be initialized in NodeAPI_Register
}

// SDK structure
struct SchillingerSDK {
  napi_env env;
  napi_ref js_sdk_ref;  // Persistent reference to JS SDK
  char* last_error;
};

// Create SDK instance
SchillingerStatus schillinger_sdk_create(
  const SchillingerSDKConfig* config,
  SchillingerSDK** out_sdk,
  char** out_error
) {
  if (!config) {
    *out_error = create_error_message("config cannot be null");
    return SCHILLINGER_ERROR_INVALID_ARGUMENT;
  }

  // Allocate SDK structure
  SchillingerSDK* sdk = (SchillingerSDK*)malloc(sizeof(SchillingerSDK));
  if (!sdk) {
    *out_error = create_error_message("Failed to allocate SDK");
    return SCHILLINGER_ERROR_OUT_OF_MEMORY;
  }

  memset(sdk, 0, sizeof(SchillingerSDK));
  sdk->env = g_env;

  // Create JavaScript SDK configuration object
  napi_value js_config;
  napi_create_object(sdk->env, &js_config);

  napi_value api_url = string_to_js(sdk->env, config->api_url);
  napi_set_named_property(sdk->env, js_config, "apiUrl", api_url);

  napi_value timeout = int_to_js(sdk->env, config->timeout_ms);
  napi_set_named_property(sdk->env, js_config, "timeoutMs", timeout);

  // Get JavaScript SDK class
  napi_value global;
  napi_get_global(sdk->env, &global);

  napi_value schillinger_module;
  napi_get_named_property(sdk->env, global, "SchillingerSDK", &schillinger_module);

  // Create JavaScript SDK instance
  napi_value js_sdk;
  napi_value constructor_args[] = { js_config };
  napi_new_instance(
    sdk->env,
    schillinger_module,
    1,
    constructor_args,
    &js_sdk
  );

  // Create persistent reference
  napi_create_reference(sdk->env, js_sdk, 1, &sdk->js_sdk_ref);

  *out_sdk = sdk;
  return SCHILLINGER_OK;
}

// Destroy SDK instance
void schillinger_sdk_destroy(SchillingerSDK* sdk) {
  if (sdk) {
    if (sdk->js_sdk_ref) {
      napi_delete_reference(sdk->env, sdk->js_sdk_ref);
    }
    if (sdk->last_error) {
      free(sdk->last_error);
    }
    free(sdk);
  }
}
```

### Example 2: Rhythm Generation

```cpp
// RhythmGenerator structure
struct RhythmGenerator {
  napi_env env;
  napi_ref js_generator_ref;
  char* last_error;
};

// Generate resultant pattern
RhythmResult rhythm_generator_generate_resultant(
  RhythmGenerator* generator,
  int a,
  int b,
  char** out_error
) {
  if (!generator) {
    *out_error = create_error_message("generator is null");
    return nullptr;
  }

  // Get JavaScript generator object
  napi_value js_generator;
  napi_get_reference_value(generator->env, generator->js_generator_ref, &js_generator);

  // Call generateResultant(a, b)
  napi_value a_arg = int_to_js(generator->env, a);
  napi_value b_arg = int_to_js(generator->env, b);
  napi_value args[] = { a_arg, b_arg };

  napi_value js_result = call_js_method_safe(
    generator->env, js_generator, "generateResultant", args, 2
  );

  if (!js_result) {
    *out_error = create_error_message("Failed to generate resultant");
    return nullptr;
  }

  // Extract result data
  napi_value pattern_value;
  napi_get_named_property(generator->env, js_result, "pattern", &pattern_value);

  // Convert RhythmPattern to C struct
  RhythmPattern* pattern = extract_rhythm_pattern(generator->env, pattern_value);

  RhythmResult result;
  result.pattern = pattern;
  // ... extract other fields

  return result;
}

// Extract rhythm pattern from JavaScript
RhythmPattern* extract_rhythm_pattern(napi_env env, napi_value js_pattern) {
  RhythmPattern* pattern = (RhythmPattern*)malloc(sizeof(RhythmPattern));

  // Get tempo
  napi_value tempo;
  napi_get_named_property(env, js_pattern, "tempo", &tempo);
  napi_get_value_int32(env, tempo, &pattern->tempo);

  // Get time signature
  napi_value time_sig;
  napi_get_named_property(env, js_pattern, "timeSignature", &time_sig);

  napi_value ts_num;
  napi_get_named_property(env, time_sig, "numerator", &ts_num);
  napi_get_value_int32(env, ts_num, &pattern->time_signature_numerator);

  napi_value ts_den;
  napi_get_named_property(env, time_sig, "denominator", &ts_den);
  napi_get_value_int32(env, ts_den, &pattern->time_signature_denominator);

  // Get notes array
  napi_value notes;
  napi_get_named_property(env, js_pattern, "notes", &notes);
  uint32_t note_count;
  napi_get_array_length(env, notes, &note_count);

  pattern->notes = (Note**)malloc(sizeof(Note*) * note_count);
  pattern->note_count = note_count;

  for (uint32_t i = 0; i < note_count; i++) {
    napi_value note;
    napi_get_element(env, notes, i, &note);
    pattern->notes[i] = extract_note(env, note);
  }

  return pattern;
}
```

### Example 3: Error Handling

```cpp
// Validate SDK instance
bool validate_sdk(SchillingerSDK* sdk, char** out_error) {
  if (!sdk) {
    *out_error = create_error_message("SDK instance is null");
    return false;
  }
  if (!sdk->js_sdk_ref) {
    *out_error = create_error_message("SDK not initialized");
    return false;
  }
  return true;
}

// Authentication with error handling
SchillingerStatus schillinger_sdk_authenticate(
  SchillingerSDK* sdk,
  const SchillingerCredentials* credentials,
  char** out_error
) {
  // Validate inputs
  if (!validate_sdk(sdk, out_error)) {
    return SCHILLINGER_ERROR_NOT_INITIALIZED;
  }

  if (!credentials || !credentials->token) {
    *out_error = create_error_message("credentials.token cannot be null");
    return SCHILLINGER_ERROR_INVALID_ARGUMENT;
  }

  // Get JavaScript SDK object
  napi_value js_sdk;
  napi_get_reference_value(sdk->env, sdk->js_sdk_ref, &js_sdk);

  // Create credentials object
  napi_value js_creds;
  napi_create_object(sdk->env, &js_creds);

  napi_value token = string_to_js(sdk->env, credentials->token);
  napi_set_named_property(sdk->env, js_creds, "token", token);

  napi_value creds_type = int_to_js(sdk->env, credentials->type);
  napi_set_named_property(sdk->env, js_creds, "type", creds_type);

  // Call authenticate method
  napi_value args[] = { js_creds };
  napi_value js_promise = call_js_method_safe(
    sdk->env, js_sdk, "authenticate", args, 1
  );

  if (!js_promise) {
    *out_error = create_error_message("Failed to call authenticate");
    return SCHILLINGER_ERROR;
  }

  // For simplicity, assume sync success (real impl should handle Promise)
  // TODO: Implement proper Promise handling or use callback pattern

  return SCHILLINGER_OK;
}
```

---

## Testing Strategy

### Unit Tests

**test_basic.cpp:**

```cpp
#include "../src/schillinger_cabi.cpp"
#include <assert.h>

void test_sdk_creation() {
  SchillingerSDKConfig config = {
    .api_url = "https://api.schillinger.ai/v1",
    .timeout_ms = 30000,
  };

  SchillingerSDK* sdk = nullptr;
  char* error = nullptr;

  SchillingerStatus status = schillinger_sdk_create(&config, &sdk, &error);

  assert(status == SCHILLINGER_OK);
  assert(sdk != nullptr);
  assert(error == nullptr);

  schillinger_sdk_destroy(sdk);
}

void test_invalid_config() {
  SchillingerSDK* sdk = nullptr;
  char* error = nullptr;

  SchillingerStatus status = schillinger_sdk_create(nullptr, &sdk, &error);

  assert(status == SCHILLINGER_ERROR_INVALID_ARGUMENT);
  assert(error != nullptr);
  assert(strcmp(error, "config cannot be null") == 0);

  free(error);
}

int main() {
  test_sdk_creation();
  test_invalid_config();
  printf("All tests passed!\n");
  return 0;
}
```

### Integration Tests

**test_node_api_integration.cpp:**

```cpp
#include <node_api.h>
#include "../include/schillinger_cabi.h"

static napi_env test_env = nullptr;

void setup_test_env() {
  // Initialize Node-API environment for testing
  // This would typically be done by the Node.js test runner
}

void test_rhythm_generation() {
  // Create SDK
  SchillingerSDKConfig config = {};
  SchillingerSDK* sdk = nullptr;
  char* error = nullptr;

  assert(schillinger_sdk_create(&config, &sdk, &error) == SCHILLINGER_OK);

  // Create rhythm generator
  RhythmGenerator* rhythm = nullptr;
  assert(schillinger_sdk_get_rhythm_generator(sdk, &rhythm, &error) == SCHILLINGER_OK);

  // Generate resultant
  RhythmResult result = rhythm_generator_generate_resultant(rhythm, 3, 4, &error);

  assert(result.pattern != nullptr);
  assert(result.pattern->tempo > 0);

  // Cleanup
  rhythm_generator_destroy(rhythm);
  schillinger_sdk_destroy(sdk);
}
```

### JavaScript Tests

**test/test_js_interop.js:**

```javascript
const assert = require('assert');
const native = require('../build/Release/schillinger_cabi');

describe('C ABI JavaScript Interop', () => {
  let sdk;

  beforeEach(() => {
    const config = {
      apiUrl: 'https://api.schillinger.ai/v1',
      timeoutMs: 30000,
    };
    sdk = native.schillinger_sdk_create(config);
  });

  afterEach(() => {
    native.schillinger_sdk_destroy(sdk);
  });

  it('should generate rhythm resultant', async () => {
    const rhythm = native.schillinger_sdk_get_rhythm_generator(sdk);
    const result = native.rhythm_generator_generate_resultant(rhythm, 3, 4);

    assert(result.pattern);
    assert(result.pattern.tempo > 0);
    assert(Array.isArray(result.pattern.notes));
  });

  it('should handle authentication', async () => {
    const credentials = { token: 'test-token', type: 0 };
    const status = native.schillinger_sdk_authenticate(sdk, credentials);

    assert.strictEqual(status, native.SCHILLINGER_OK);
  });
});
```

---

## Build and Debug

### Build Commands

```bash
# Build with CMake
cd native/schillinger_cabi
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release

# Build with node-gyp (alternate)
npm install
npm run build:debug
npm run build:release
```

### Debug Tips

**1. Enable Debug Output:**

```cpp
#define DEBUG_LOG(msg) \
  if (getenv("SCHILLINGER_DEBUG")) { \
    fprintf(stderr, "[DEBUG] %s\n", msg); \
  }

DEBUG_LOG("Creating SDK instance");
```

**2. Use GDB:**

```bash
# Build with debug symbols
cmake -DCMAKE_BUILD_TYPE=Debug ..

# Run with GDB
gdb --args node test.js
```

**3. Memory Leak Detection:**

```bash
# Use Valgrind (Linux)
valgrind --leak-check=full --show-leak-kinds=all node test.js

# Use Address Sanitizer
cmake -DCMAKE_BUILD_TYPE=Debug -DSANITIZE_ADDRESS=ON ..
```

**4. Node-API Error Checking:**

```cpp
#define NAPI_CALL(env, call) \
  do { \
    napi_status status = (call); \
    if (status != napi_ok) { \
      const napi_extended_error_info* error_info = nullptr; \
      napi_get_last_error_info((env), &error_info); \
      fprintf(stderr, "NAPI Error: %s\n", error_info->error_message); \
      exit(1); \
    } \
  } while (0)

// Usage
NAPI_CALL(env, napi_create_object(env, &obj));
```

---

## Next Steps

1. **Implement Core Functions**: Complete all stub implementations in `schillinger_cabi.cpp`
2. **Add Promise Support**: Implement proper async handling for generator methods
3. **Write Tests**: Comprehensive test coverage for all C ABI functions
4. **Performance Testing**: Benchmark FFI overhead vs pure TypeScript
5. **Document Edge Cases**: Error conditions, thread safety, resource cleanup

For additional resources, see:
- [Node-API Documentation](https://nodejs.org/api/n-api.html)
- [Dart FFI Documentation](https://dart.dev/guides/libraries/c-interop)
- [ffigen Documentation](https://pub.dev/packages/ffigen)
