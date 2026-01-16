/*
  SchemaValidator.h - JUCE C++ validation header

  Provides runtime validation for White Room data models according to their
  JSON Schema definitions. This mirrors the TypeScript validation in
  sdk/packages/sdk/src/validation/schema_validator.ts.

  Validation returns Result<T, ValidationError> with specific field paths
  and user-friendly error messages.
*/

#pragma once

#include <string>
#include <vector>
#include <optional>
#include <variant>
#include <map>
#include <functional>

namespace white_room {
namespace validation {

// =============================================================================
// Types
// =============================================================================

/**
 * Validation error with field path and message
 */
struct ValidationError {
    std::string fieldPath;      // e.g., "ensemble.voices[0].id"
    std::string message;        // User-friendly error
    std::optional<std::string> value;  // The invalid value (as string)

    ValidationError(const std::string& field,
                    const std::string& msg,
                    const std::optional<std::string>& val = std::nullopt)
        : fieldPath(field), message(msg), value(val) {}
};

/**
 * Validation result type (similar to Rust's Result)
 */
template<typename T>
class ValidationResult {
public:
    bool isSuccess() const { return std::holds_alternative<T>(data); }
    bool isError() const { return std::holds_alternative<ValidationError>(data); }

    T getValue() const {
        if (isSuccess()) {
            return std::get<T>(data);
        }
        throw std::runtime_error("Cannot get value from error result");
    }

    ValidationError getError() const {
        if (isError()) {
            return std::get<ValidationError>(data);
        }
        throw std::runtime_error("Cannot get error from success result");
    }

    static ValidationResult success(T value) {
        return ValidationResult(value);
    }

    static ValidationResult error(const std::string& field,
                                   const std::string& message,
                                   const std::optional<std::string>& value = std::nullopt) {
        return ValidationResult(ValidationError(field, message, value));
    }

private:
    std::variant<T, ValidationError> data;

    ValidationResult(T val) : data(val) {}
    ValidationResult(ValidationError err) : data(err) {}
};

/**
 * Multiple validation errors
 */
class ValidationErrors {
public:
    void add(const std::string& field, const std::string& message,
             const std::optional<std::string>& value = std::nullopt) {
        errors.push_back(ValidationError(field, message, value));
    }

    void addAll(const std::vector<ValidationError>& newErrors) {
        errors.insert(errors.end(), newErrors.begin(), newErrors.end());
    }

    bool isEmpty() const { return errors.empty(); }

    const std::vector<ValidationError>& getErrors() const { return errors; }

    template<typename T>
    ValidationResult<T> toResult(T value) const {
        if (isEmpty()) {
            return ValidationResult<T>::success(value);
        }
        // Return first error for simplicity
        return ValidationResult<T>::error(errors[0].fieldPath, errors[0].message, errors[0].value);
    }

private:
    std::vector<ValidationError> errors;
};

// =============================================================================
// UUID Validation
// =============================================================================

/**
 * Check if string is valid UUID format
 */
bool isValidUUID(const std::string& value);

/**
 * Check if string is valid ISO 8601 date-time
 */
bool isValidISO8601(const std::string& value);

// =============================================================================
// Forward Declarations for Model Types
// =============================================================================

// These would be defined in the models directory
// For now, we'll use simple struct definitions

struct SchillingerSong_v1;
struct SongModel_v1;
struct PerformanceState_v1;

// =============================================================================
// SchillingerSong_v1 Validation
// =============================================================================

/**
 * Validate SchillingerSong_v1 (SongContract)
 *
 * Validation checks:
 * - version == "1.0"
 * - id is valid UUID
 * - createdAt, modifiedAt are non-negative numbers
 * - author, name are non-empty strings
 * - seed is between 0 and 2^32-1
 * - ensemble, bindings, constraints, console are present and valid
 * - Optional arrays are valid if present
 *
 * Returns: Result<SchillingerSong_v1, ValidationError>
 */
ValidationResult<std::string> validateSchillingerSong(const std::string& json);

// =============================================================================
// SongModel_v1 Validation
// =============================================================================

/**
 * Validate SongModel_v1 (SongState)
 *
 * Validation checks:
 * - version == "1.0"
 * - id, sourceSongId, derivationId are valid UUIDs
 * - duration, derivedAt are non-negative numbers
 * - tempo is > 0 and <= 500
 * - timeSignature is [numerator, denominator] array
 * - sampleRate is 44100, 48000, or 96000
 * - timeline is valid
 * - notes array is valid
 * - voiceAssignments array is valid
 * - console is valid
 *
 * Returns: Result<SongModel_v1, ValidationError>
 */
ValidationResult<std::string> validateSongModel(const std::string& json);

// =============================================================================
// PerformanceState_v1 Validation
// =============================================================================

/**
 * Validate PerformanceState_v1
 *
 * Validation checks:
 * - version == "1"
 * - id is valid UUID
 * - name is 1-256 characters
 * - arrangementStyle is valid enum value
 * - density is 0-1 if present
 * - Optional fields are valid if present
 * - instrumentationMap entries are valid
 * - mixTargets entries are valid
 *
 * Returns: Result<PerformanceState_v1, ValidationError>
 */
ValidationResult<std::string> validatePerformanceState(const std::string& json);

// =============================================================================
// JSON Parsing Helpers
// =============================================================================

/**
 * Helper class for JSON parsing
 * In production, use a proper JSON library (nlohmann/json, rapidjson, etc.)
 */
class JsonHelper {
public:
    /**
     * Parse JSON string to generic representation
     * Returns true if valid JSON
     */
    static bool isValidJson(const std::string& json);

    /**
     * Get string field from JSON
     */
    static std::optional<std::string> getString(const std::string& json,
                                                 const std::string& field);

    /**
     * Get number field from JSON
     */
    static std::optional<double> getNumber(const std::string& json,
                                           const std::string& field);

    /**
     * Get boolean field from JSON
     */
    static std::optional<bool> getBool(const std::string& json,
                                       const std::string& field);

    /**
     * Get array field from JSON
     */
    static std::optional<std::vector<std::string>> getStringArray(const std::string& json,
                                                                   const std::string& field);

    /**
     * Get object field from JSON
     */
    static std::optional<std::string> getObject(const std::string& json,
                                                 const std::string& field);

    /**
     * Check if field exists
     */
    static bool hasField(const std::string& json, const std::string& field);
};

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Validate version field
 */
bool validateVersion(const std::string& version, const std::string& expected);

/**
 * Validate UUID field
 */
bool validateUUIDField(const std::string& value, const std::string& fieldPath,
                       ValidationErrors& errors);

/**
 * Validate string field (non-empty, min/max length)
 */
bool validateStringField(const std::string& value,
                         size_t minLength = 1,
                         size_t maxLength = 256,
                         const std::string& fieldPath = "",
                         ValidationErrors* errors = nullptr);

/**
 * Validate number field (range check)
 */
bool validateNumberField(double value,
                         double min = std::numeric_limits<double>::lowest(),
                         double max = std::numeric_limits<double>::max(),
                         bool minInclusive = true,
                         bool maxInclusive = true,
                         const std::string& fieldPath = "",
                         ValidationErrors* errors = nullptr);

/**
 * Validate integer field
 */
bool validateIntegerField(int64_t value,
                          int64_t min = std::numeric_limits<int64_t>::min(),
                          int64_t max = std::numeric_limits<int64_t>::max(),
                          const std::string& fieldPath = "",
                          ValidationErrors* errors = nullptr);

/**
 * Validate enum field
 */
template<typename T>
bool validateEnumField(const std::string& value,
                       const std::map<std::string, T>& validValues,
                       const std::string& fieldPath,
                       ValidationErrors& errors) {
    if (validValues.find(value) == validValues.end()) {
        std::string validList;
        for (const auto& [key, _] : validValues) {
            if (!validList.empty()) validList += ", ";
            validList += key;
        }
        errors.add(fieldPath, "Must be one of: " + validList, value);
        return false;
    }
    return true;
}

} // namespace validation
} // namespace white_room
