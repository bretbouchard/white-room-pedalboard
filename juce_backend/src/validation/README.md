# JUCE C++ Schema Validation

This directory contains runtime validation for White Room data models in the JUCE backend, matching the TypeScript validation in `sdk/packages/sdk/src/validation/schema_validator.ts`.

## Overview

The validation system provides comprehensive runtime validation for three core data models:

- **SchillingerSong_v1** (SongContract) - Theory layer
- **SongModel_v1** (SongState) - Realization layer
- **PerformanceState_v1** - Performance layer

## Architecture

### ValidationResult<T>

All validators return `ValidationResult<T>`, which is a Rust-like Result type:

```cpp
template<typename T>
class ValidationResult {
public:
    bool isSuccess() const;
    bool isError() const;

    T getValue() const;
    ValidationError getError() const;

    static ValidationResult success(T value);
    static ValidationResult error(const std::string& field,
                                   const std::string& message,
                                   const std::optional<std::string>& value = std::nullopt);
};
```

### ValidationError

Validation errors include:
- `fieldPath` - Dot-notation path to invalid field (e.g., "ensemble.voices[0].id")
- `message` - User-friendly error message
- `value` - The invalid value (as string, optional)

## Validation Rules

### SchillingerSong_v1 (SongContract)

**Required Fields:**
- `version` - Must be "1.0"
- `id` - Valid UUID (8-4-4-4-12 format)
- `createdAt` - Non-negative number (Unix timestamp)
- `modifiedAt` - Non-negative number (Unix timestamp)
- `author` - Non-empty string
- `name` - String, 1-256 characters
- `seed` - Integer, 0 to 2^32-1 (4294967295)
- `ensemble` - Required object
- `bindings` - Required object
- `constraints` - Required object
- `console` - Required object
- `book4` - Required object (FormSystem)

**Optional Fields:**
- `book1` - Array of RhythmSystem
- `book2` - Array of MelodySystem
- `book3` - Array of HarmonySystem
- `book5` - Array of OrchestrationSystem
- `instrumentAssignments` - Array of InstrumentAssignment
- `presets` - Array of PresetAssignment
- `automation` - AutomationTimeline

### SongModel_v1 (SongState)

**Required Fields:**
- `version` - Must be "1.0"
- `id` - Valid UUID
- `sourceSongId` - Valid UUID
- `derivationId` - Valid UUID
- `duration` - Non-negative number (samples)
- `tempo` - Number, > 0 and <= 500 (exclusive minimum)
- `timeSignature` - Array [numerator, denominator]
- `sampleRate` - Integer: 44100, 48000, or 96000
- `timeline` - Required object
- `notes` - Required array
- `voiceAssignments` - Required array
- `console` - Required object
- `derivedAt` - Non-negative number (Unix timestamp)

**Optional Fields:**
- `automations` - Array of AutomationEvent
- `presets` - Array of PresetAssignment
- `performances` - Array of PerformanceState
- `activePerformanceId` - Valid UUID

### PerformanceState_v1

**Required Fields:**
- `version` - Must be "1"
- `id` - Valid UUID
- `name` - String, 1-256 characters
- `arrangementStyle` - Enum value (see list below)

**Optional Fields:**
- `density` - Number, 0-1 (inclusive)
- `grooveProfileId` - Non-empty string
- `consoleXProfileId` - Non-empty string
- `instrumentationMap` - Object with InstrumentAssignment values
- `mixTargets` - Object with MixTarget values
- `createdAt` - Valid ISO 8601 date-time string
- `modifiedAt` - Valid ISO 8601 date-time string
- `metadata` - Arbitrary object

**Valid Arrangement Styles:**
- SOLO_PIANO
- SATB
- CHAMBER_ENSEMBLE
- FULL_ORCHESTRA
- JAZZ_COMBO
- JAZZ_TRIO
- ROCK_BAND
- AMBIENT_TECHNO
- ELECTRONIC
- ACAPPELLA
- STRING_QUARTET
- CUSTOM

## Usage Examples

### Validate SchillingerSong

```cpp
#include "validation/SchemaValidator.h"

using namespace white_room::validation;

std::string songJson = /* ... load from file or network ... */;
auto result = validateSchillingerSong(songJson);

if (result.isSuccess()) {
    // Song is valid
    std::cout << "Song is valid!" << std::endl;
} else {
    // Song has validation errors
    ValidationError error = result.getError();
    std::cerr << "Validation error at " << error.fieldPath
              << ": " << error.message << std::endl;
    if (error.value.has_value()) {
        std::cerr << "  Invalid value: " << error.value.value() << std::endl;
    }
}
```

### Validate SongModel

```cpp
std::string songModelJson = /* ... */;
auto result = validateSongModel(songModelJson);

if (result.isSuccess()) {
    // SongModel is valid
} else {
    ValidationError error = result.getError();
    std::cerr << "Validation error: " << error.message << std::endl;
}
```

### Validate PerformanceState

```cpp
std::string perfJson = /* ... */;
auto result = validatePerformanceState(perfJson);

if (result.isSuccess()) {
    // PerformanceState is valid
} else {
    ValidationError error = result.getError();
    std::cerr << "Validation error at " << error.fieldPath
              << ": " << error.message << std::endl;
}
```

## Helper Functions

### UUID Validation

```cpp
bool isValid = isValidUUID("550e8400-e29b-41d4-a716-446655440000");
```

### ISO 8601 Validation

```cpp
bool isValid = isValidISO8601("2021-01-01T00:00:00Z");
```

### JSON Helper

```cpp
// Parse JSON field
auto id = JsonHelper::getString(jsonString, "id");
auto tempo = JsonHelper::getNumber(jsonString, "tempo");
auto enabled = JsonHelper::getBool(jsonString, "enabled");

// Check field existence
bool hasId = JsonHelper::hasField(jsonString, "id");

// Validate JSON structure
bool valid = JsonHelper::isValidJson(jsonString);
```

## Building

### Integration with CMake

Add to your CMakeLists.txt:

```cmake
# Validation library
add_library(validation
    src/validation/SchemaValidator.cpp
)

target_include_directories(validation PUBLIC
    ${CMAKE_SOURCE_DIR}/include
)
```

### Building Tests

```bash
cd tests/validation
mkdir build && cd build
cmake ..
make
./SchemaValidatorTest
```

## Testing

The test suite includes comprehensive tests for:

- UUID validation (valid and invalid formats)
- ISO 8601 date-time validation
- SchillingerSong validation (all required fields, edge cases)
- SongModel validation (all required fields, range checks)
- PerformanceState validation (all arrangement styles, optional fields)

Run tests:

```bash
cd juce_backend/tests/validation/build
./SchemaValidatorTest
```

## Design Decisions

### JSON Parsing

The current implementation uses simple regex-based JSON parsing for demonstration. In production, replace with a proper JSON library:

- **nlohmann/json** - Header-only, easy to use
- **RapidJSON** - Fast, low-memory
- **jsoncpp** - Mature, well-documented

### Error Handling

Validation returns first error encountered for simplicity. For comprehensive validation reporting, modify `ValidationErrors::toResult()` to return all errors:

```cpp
template<typename T>
std::variant<T, std::vector<ValidationError>> toResult(T value) const {
    if (isEmpty()) {
        return value;
    }
    return errors;
}
```

### Performance Considerations

- Regex patterns are compiled as `static const` for efficiency
- Validation stops at first error in each field
- Consider caching validation results for repeated validation

## Future Enhancements

1. **Deep validation** - Validate nested objects (ensemble, console, etc.)
2. **Cross-field validation** - Validate relationships between fields
3. **Custom validators** - Allow user-defined validation rules
4. **Validation presets** - Pre-configured validation sets for different use cases
5. **Performance optimization** - Compile-time validation where possible

## Compliance with TypeScript Validation

This C++ implementation mirrors the TypeScript validation in `sdk/packages/sdk/src/validation/schema_validator.ts`:

- Same validation rules
- Same error format (field path + message)
- Same enum values
- Same range constraints
- Same required/optional fields

Any updates to the TypeScript validation should be reflected here to maintain cross-platform consistency.

## License

Part of the White Room project. See project LICENSE for details.
