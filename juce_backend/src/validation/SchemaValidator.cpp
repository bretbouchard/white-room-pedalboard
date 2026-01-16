/*
  SchemaValidator.cpp - JUCE C++ validation implementation

  Implements runtime validation for White Room data models according to their
  JSON Schema definitions. This mirrors the TypeScript validation in
  sdk/packages/sdk/src/validation/schema_validator.ts.

  Provides comprehensive validation for:
  - SchillingerSong_v1 (SongContract)
  - SongModel_v1 (SongState)
  - PerformanceState_v1
*/

#include "validation/SchemaValidator.h"
#include <regex>
#include <sstream>
#include <algorithm>
#include <cctype>

namespace white_room {
namespace validation {

// =============================================================================
// UUID Validation
// =============================================================================

bool isValidUUID(const std::string& value) {
    // UUID regex pattern: 8-4-4-4-12 hex digits
    static const std::regex uuidRegex(
        "^[0-9a-fA-F]{8}-"
        "[0-9a-fA-F]{4}-"
        "[0-9a-fA-F]{4}-"
        "[0-9a-fA-F]{4}-"
        "[0-9a-fA-F]{12}$"
    );

    return std::regex_match(value, uuidRegex);
}

bool isValidISO8601(const std::string& value) {
    // Basic ISO 8601 validation
    // Format: YYYY-MM-DDTHH:MM:SSZ or with timezone offset
    static const std::regex iso8601Regex(
        "^\\d{4}-\\d{2}-\\d{2}"
        "T\\d{2}:\\d{2}:\\d{2}"
        "(\\.\\d+)?"
        "(Z|[+-]\\d{2}:\\d{2})?$"
    );

    return std::regex_match(value, iso8601Regex);
}

// =============================================================================
// JSON Helper Implementation
// =============================================================================

bool JsonHelper::isValidJson(const std::string& json) {
    // Basic JSON validation - check for matching braces
    int braceCount = 0;
    int bracketCount = 0;
    bool inString = false;
    bool escapeNext = false;

    for (char c : json) {
        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (c == '\\' && inString) {
            escapeNext = true;
            continue;
        }

        if (c == '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (c == '{') braceCount++;
            else if (c == '}') braceCount--;
            else if (c == '[') bracketCount++;
            else if (c == ']') bracketCount--;
        }
    }

    return braceCount == 0 && bracketCount == 0 && !inString;
}

std::optional<std::string> JsonHelper::getString(const std::string& json,
                                                  const std::string& field) {
    // Simple JSON field extraction - look for "field":"value" pattern
    std::string pattern = "\"" + field + "\"\\s*:\\s*\"([^\"]*)\"";
    std::regex searchPattern(pattern);
    std::smatch match;

    if (std::regex_search(json, match, searchPattern) && match.size() > 1) {
        return match[1].str();
    }

    return std::nullopt;
}

std::optional<double> JsonHelper::getNumber(const std::string& json,
                                            const std::string& field) {
    // Simple JSON number field extraction
    std::string pattern = "\"" + field + "\"\\s*:\\s*([-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)";
    std::regex searchPattern(pattern);
    std::smatch match;

    if (std::regex_search(json, match, searchPattern) && match.size() > 1) {
        try {
            return std::stod(match[1].str());
        } catch (...) {
            return std::nullopt;
        }
    }

    return std::nullopt;
}

std::optional<bool> JsonHelper::getBool(const std::string& json,
                                        const std::string& field) {
    // Simple JSON boolean field extraction
    std::string pattern = "\"" + field + "\"\\s*:\\s*(true|false)";
    std::regex searchPattern(pattern);
    std::smatch match;

    if (std::regex_search(json, match, searchPattern) && match.size() > 1) {
        return match[1].str() == "true";
    }

    return std::nullopt;
}

std::optional<std::vector<std::string>> JsonHelper::getStringArray(
    const std::string& json,
    const std::string& field) {

    // Look for array field: "field": ["value1", "value2", ...]
    std::string pattern = "\"" + field + "\"\\s*:\\s*\\[([^\\]]*)\\]";
    std::regex searchPattern(pattern);
    std::smatch match;

    if (std::regex_search(json, match, searchPattern) && match.size() > 1) {
        std::vector<std::string> result;
        std::string arrayContent = match[1].str();

        // Split by comma and extract quoted strings
        std::regex itemPattern("\"([^\"]*)\"");
        std::sregex_iterator it(arrayContent.begin(), arrayContent.end(), itemPattern);
        std::sregex_iterator end;

        for (; it != end; ++it) {
            if (it->size() > 1) {
                result.push_back((*it)[1].str());
            }
        }

        return result;
    }

    return std::nullopt;
}

std::optional<std::string> JsonHelper::getObject(const std::string& json,
                                                  const std::string& field) {
    // Extract object as substring
    std::string pattern = "\"" + field + "\"\\s*:\\s*(\\{[^}]*\\})";
    std::regex searchPattern(pattern);
    std::smatch match;

    if (std::regex_search(json, match, searchPattern) && match.size() > 1) {
        return match[1].str();
    }

    return std::nullopt;
}

bool JsonHelper::hasField(const std::string& json, const std::string& field) {
    std::string pattern = "\"" + field + "\"\\s*:";
    std::regex searchPattern(pattern);
    return std::regex_search(json, searchPattern);
}

// =============================================================================
// Validation Helper Implementation
// =============================================================================

bool validateVersion(const std::string& version, const std::string& expected) {
    return version == expected || version == expected.substr(0, expected.find_first_of('.'));
}

bool validateUUIDField(const std::string& value, const std::string& fieldPath,
                       ValidationErrors& errors) {
    if (!isValidUUID(value)) {
        errors.add(fieldPath, "ID must be a valid UUID", value);
        return false;
    }
    return true;
}

bool validateStringField(const std::string& value,
                         size_t minLength,
                         size_t maxLength,
                         const std::string& fieldPath,
                         ValidationErrors* errors) {
    if (value.length() < minLength) {
        if (errors) {
            errors->add(fieldPath,
                       "String must be at least " + std::to_string(minLength) + " characters",
                       value);
        }
        return false;
    }

    if (value.length() > maxLength) {
        if (errors) {
            errors->add(fieldPath,
                       "String must be at most " + std::to_string(maxLength) + " characters",
                       value);
        }
        return false;
    }

    return true;
}

bool validateNumberField(double value,
                         double min,
                         double max,
                         bool minInclusive,
                         bool maxInclusive,
                         const std::string& fieldPath,
                         ValidationErrors* errors) {
    bool valid = true;

    if (minInclusive) {
        if (value < min) valid = false;
    } else {
        if (value <= min) valid = false;
    }

    if (maxInclusive) {
        if (value > max) valid = false;
    } else {
        if (value >= max) valid = false;
    }

    if (!valid && errors) {
        std::stringstream ss;
        ss << "Number must be between " << min << " and " << max;
        if (!minInclusive) ss << " (exclusive minimum)";
        if (!maxInclusive) ss << " (exclusive maximum)";
        errors->add(fieldPath, ss.str(), std::to_string(value));
    }

    return valid;
}

bool validateIntegerField(int64_t value,
                          int64_t min,
                          int64_t max,
                          const std::string& fieldPath,
                          ValidationErrors* errors) {
    if (value < min || value > max) {
        if (errors) {
            errors->add(fieldPath,
                       "Integer must be between " + std::to_string(min) +
                       " and " + std::to_string(max),
                       std::to_string(value));
        }
        return false;
    }
    return true;
}

// =============================================================================
// SchillingerSong_v1 Validation
// =============================================================================

ValidationResult<std::string> validateSchillingerSong(const std::string& json) {
    ValidationErrors errors;

    // Check if valid JSON
    if (!JsonHelper::isValidJson(json)) {
        return ValidationResult<std::string>::error("root", "Invalid JSON format");
    }

    // Version (const: "1.0")
    auto version = JsonHelper::getString(json, "version");
    if (!version.has_value() || !validateVersion(version.value(), "1.0")) {
        errors.add("version", "Version must be \"1.0\"", version.value_or(""));
    }

    // ID (UUID)
    auto id = JsonHelper::getString(json, "id");
    if (!id.has_value()) {
        errors.add("id", "ID is required");
    } else if (!validateUUIDField(id.value(), "id", errors)) {
        // Error already added
    }

    // createdAt (Unix timestamp, >= 0)
    auto createdAt = JsonHelper::getNumber(json, "createdAt");
    if (!createdAt.has_value()) {
        errors.add("createdAt", "createdAt is required");
    } else if (createdAt.value() < 0) {
        errors.add("createdAt", "createdAt must be a non-negative number",
                   std::to_string(createdAt.value()));
    }

    // modifiedAt (Unix timestamp, >= 0)
    auto modifiedAt = JsonHelper::getNumber(json, "modifiedAt");
    if (!modifiedAt.has_value()) {
        errors.add("modifiedAt", "modifiedAt is required");
    } else if (modifiedAt.value() < 0) {
        errors.add("modifiedAt", "modifiedAt must be a non-negative number",
                   std::to_string(modifiedAt.value()));
    }

    // author (string)
    auto author = JsonHelper::getString(json, "author");
    if (!author.has_value() || author.value().empty()) {
        errors.add("author", "author must be a non-empty string");
    }

    // name (string, minLength: 1, maxLength: 256)
    auto name = JsonHelper::getString(json, "name");
    if (!name.has_value()) {
        errors.add("name", "name is required");
    } else if (!validateStringField(name.value(), 1, 256, "name", &errors)) {
        // Error already added
    }

    // seed (integer, min: 0, max: 4294967295)
    auto seed = JsonHelper::getNumber(json, "seed");
    if (!seed.has_value()) {
        errors.add("seed", "seed is required");
    } else if (!validateIntegerField(static_cast<int64_t>(seed.value()),
                                      0, 4294967295, "seed", &errors)) {
        // Error already added
    }

    // Check required objects
    if (!JsonHelper::hasField(json, "ensemble")) {
        errors.add("ensemble", "ensemble is required");
    }

    if (!JsonHelper::hasField(json, "bindings")) {
        errors.add("bindings", "bindings is required");
    }

    if (!JsonHelper::hasField(json, "constraints")) {
        errors.add("constraints", "constraints is required");
    }

    if (!JsonHelper::hasField(json, "console")) {
        errors.add("console", "console is required");
    }

    // book4 is required (FormSystem)
    if (!JsonHelper::hasField(json, "book4")) {
        errors.add("book4", "book4 is required");
    }

    return errors.toResult(json);
}

// =============================================================================
// SongModel_v1 Validation
// =============================================================================

ValidationResult<std::string> validateSongModel(const std::string& json) {
    ValidationErrors errors;

    // Check if valid JSON
    if (!JsonHelper::isValidJson(json)) {
        return ValidationResult<std::string>::error("root", "Invalid JSON format");
    }

    // Version (const: "1.0")
    auto version = JsonHelper::getString(json, "version");
    if (!version.has_value() || !validateVersion(version.value(), "1.0")) {
        errors.add("version", "Version must be \"1.0\"", version.value_or(""));
    }

    // ID (UUID)
    auto id = JsonHelper::getString(json, "id");
    if (!id.has_value()) {
        errors.add("id", "ID is required");
    } else if (!validateUUIDField(id.value(), "id", errors)) {
        // Error already added
    }

    // sourceSongId (UUID)
    auto sourceSongId = JsonHelper::getString(json, "sourceSongId");
    if (!sourceSongId.has_value()) {
        errors.add("sourceSongId", "sourceSongId is required");
    } else if (!validateUUIDField(sourceSongId.value(), "sourceSongId", errors)) {
        // Error already added
    }

    // derivationId (UUID)
    auto derivationId = JsonHelper::getString(json, "derivationId");
    if (!derivationId.has_value()) {
        errors.add("derivationId", "derivationId is required");
    } else if (!validateUUIDField(derivationId.value(), "derivationId", errors)) {
        // Error already added
    }

    // duration (integer, min: 0)
    auto duration = JsonHelper::getNumber(json, "duration");
    if (!duration.has_value()) {
        errors.add("duration", "duration is required");
    } else if (duration.value() < 0) {
        errors.add("duration", "duration must be a non-negative number",
                   std::to_string(duration.value()));
    }

    // tempo (number, exclusiveMin: 0, max: 500)
    auto tempo = JsonHelper::getNumber(json, "tempo");
    if (!tempo.has_value()) {
        errors.add("tempo", "tempo is required");
    } else if (!validateNumberField(tempo.value(), 0.0, 500.0, false, true,
                                   "tempo", &errors)) {
        // Error already added
    }

    // sampleRate (enum: 44100, 48000, 96000)
    auto sampleRate = JsonHelper::getNumber(json, "sampleRate");
    if (!sampleRate.has_value()) {
        errors.add("sampleRate", "sampleRate is required");
    } else {
        int sr = static_cast<int>(sampleRate.value());
        if (sr != 44100 && sr != 48000 && sr != 96000) {
            errors.add("sampleRate", "sampleRate must be 44100, 48000, or 96000",
                       std::to_string(sr));
        }
    }

    // Check required objects
    if (!JsonHelper::hasField(json, "timeline")) {
        errors.add("timeline", "timeline is required");
    }

    if (!JsonHelper::hasField(json, "notes")) {
        errors.add("notes", "notes array is required");
    }

    if (!JsonHelper::hasField(json, "voiceAssignments")) {
        errors.add("voiceAssignments", "voiceAssignments array is required");
    }

    if (!JsonHelper::hasField(json, "console")) {
        errors.add("console", "console is required");
    }

    // derivedAt (integer, min: 0)
    auto derivedAt = JsonHelper::getNumber(json, "derivedAt");
    if (!derivedAt.has_value()) {
        errors.add("derivedAt", "derivedAt is required");
    } else if (derivedAt.value() < 0) {
        errors.add("derivedAt", "derivedAt must be a non-negative number",
                   std::to_string(derivedAt.value()));
    }

    // Optional activePerformanceId (UUID)
    auto activePerformanceId = JsonHelper::getString(json, "activePerformanceId");
    if (activePerformanceId.has_value() && !isValidUUID(activePerformanceId.value())) {
        errors.add("activePerformanceId", "activePerformanceId must be a valid UUID",
                   activePerformanceId.value());
    }

    return errors.toResult(json);
}

// =============================================================================
// PerformanceState_v1 Validation
// =============================================================================

ValidationResult<std::string> validatePerformanceState(const std::string& json) {
    ValidationErrors errors;

    // Check if valid JSON
    if (!JsonHelper::isValidJson(json)) {
        return ValidationResult<std::string>::error("root", "Invalid JSON format");
    }

    // version (const: "1")
    auto version = JsonHelper::getString(json, "version");
    if (!version.has_value() || version.value() != "1") {
        errors.add("version", "Version must be \"1\"", version.value_or(""));
    }

    // id (UUID)
    auto id = JsonHelper::getString(json, "id");
    if (!id.has_value()) {
        errors.add("id", "ID is required");
    } else if (!validateUUIDField(id.value(), "id", errors)) {
        // Error already added
    }

    // name (string, minLength: 1, maxLength: 256)
    auto name = JsonHelper::getString(json, "name");
    if (!name.has_value()) {
        errors.add("name", "name is required");
    } else if (!validateStringField(name.value(), 1, 256, "name", &errors)) {
        // Error already added
    }

    // arrangementStyle (enum)
    auto arrangementStyle = JsonHelper::getString(json, "arrangementStyle");
    if (!arrangementStyle.has_value()) {
        errors.add("arrangementStyle", "arrangementStyle is required");
    } else {
        const std::vector<std::string> validStyles = {
            "SOLO_PIANO", "SATB", "CHAMBER_ENSEMBLE", "FULL_ORCHESTRA",
            "JAZZ_COMBO", "JAZZ_TRIO", "ROCK_BAND", "AMBIENT_TECHNO",
            "ELECTRONIC", "ACAPPELLA", "STRING_QUARTET", "CUSTOM"
        };

        bool isValid = std::find(validStyles.begin(), validStyles.end(),
                                arrangementStyle.value()) != validStyles.end();

        if (!isValid) {
            std::string validList;
            for (const auto& style : validStyles) {
                if (!validList.empty()) validList += ", ";
                validList += style;
            }
            errors.add("arrangementStyle",
                       "arrangementStyle must be one of: " + validList,
                       arrangementStyle.value());
        }
    }

    // Optional density (number, min: 0, max: 1)
    auto density = JsonHelper::getNumber(json, "density");
    if (density.has_value()) {
        if (!validateNumberField(density.value(), 0.0, 1.0, true, true,
                                "density", &errors)) {
            // Error already added
        }
    }

    // Optional grooveProfileId (string)
    auto grooveProfileId = JsonHelper::getString(json, "grooveProfileId");
    if (grooveProfileId.has_value() && grooveProfileId.value().empty()) {
        errors.add("grooveProfileId", "grooveProfileId must be a non-empty string",
                   grooveProfileId.value());
    }

    // Optional consoleXProfileId (string)
    auto consoleXProfileId = JsonHelper::getString(json, "consoleXProfileId");
    if (consoleXProfileId.has_value() && consoleXProfileId.value().empty()) {
        errors.add("consoleXProfileId", "consoleXProfileId must be a non-empty string",
                   consoleXProfileId.value());
    }

    // Optional createdAt (ISO 8601)
    auto createdAt = JsonHelper::getString(json, "createdAt");
    if (createdAt.has_value() && !isValidISO8601(createdAt.value())) {
        errors.add("createdAt", "createdAt must be a valid ISO 8601 date-time string",
                   createdAt.value());
    }

    // Optional modifiedAt (ISO 8601)
    auto modifiedAt = JsonHelper::getString(json, "modifiedAt");
    if (modifiedAt.has_value() && !isValidISO8601(modifiedAt.value())) {
        errors.add("modifiedAt", "modifiedAt must be a valid ISO 8601 date-time string",
                   modifiedAt.value());
    }

    return errors.toResult(json);
}

} // namespace validation
} // namespace white_room
