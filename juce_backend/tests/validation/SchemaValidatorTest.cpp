/*
  SchemaValidatorTest.cpp - Unit tests for schema validation

  Tests for JUCE C++ schema validation matching the TypeScript validation.
  These tests verify that validation correctly identifies valid and invalid
  SchillingerSong, SongModel, and PerformanceState instances.
*/

#include <gtest/gtest.h>
#include "validation/SchemaValidator.h"
#include <nlohmann/json.hpp>

using namespace white_room::validation;
using json = nlohmann::json;

// =============================================================================
// Test Fixtures
// =============================================================================

class SchemaValidatorTest : public ::testing::Test {
protected:
    // Valid UUID for testing
    const std::string validUUID = "550e8400-e29b-41d4-a716-446655440000";

    // Helper to create minimal valid SchillingerSong
    std::string createValidSchillingerSong() {
        json j = {
            {"version", "1.0"},
            {"id", validUUID},
            {"createdAt", 1609459200000},
            {"modifiedAt", 1609459200000},
            {"author", "Test Author"},
            {"name", "Test Song"},
            {"seed", 12345},
            {"ensemble", {
                {"version", "1.0"},
                {"id", validUUID},
                {"voices", json::array()},
                {"voiceCount", 1}
            }},
            {"bindings", json::object()},
            {"constraints", {
                {"constraints", json::array()}
            }},
            {"console", {
                {"version", "1.0"},
                {"id", validUUID},
                {"voiceBusses", json::array()},
                {"mixBusses", json::array()},
                {"masterBus", {
                    {"id", validUUID},
                    {"name", "Master"},
                    {"type", "master"}
                }},
                {"routing", {
                    {"routes", json::array()}
                }}
            }},
            {"book4", {
                {"id", validUUID},
                {"ratioTree", {1, 1, 1}}
            }}
        };
        return j.dump();
    }

    // Helper to create minimal valid SongModel
    std::string createValidSongModel() {
        json j = {
            {"version", "1.0"},
            {"id", validUUID},
            {"sourceSongId", validUUID},
            {"derivationId", validUUID},
            {"duration", 480000},
            {"tempo", 120.0},
            {"timeSignature", {4, 4}},
            {"sampleRate", 48000},
            {"timeline", {
                {"sections", json::array()},
                {"tempo", 120.0},
                {"timeSignature", {4, 4}}
            }},
            {"notes", json::array()},
            {"voiceAssignments", json::array()},
            {"console", {
                {"version", "1.0"},
                {"id", validUUID},
                {"voiceBusses", json::array()},
                {"mixBusses", json::array()},
                {"masterBus", {
                    {"id", validUUID},
                    {"name", "Master"},
                    {"type", "master"}
                }},
                {"routing", {
                    {"routes", json::array()}
                }}
            }},
            {"derivedAt", 1609459200000}
        };
        return j.dump();
    }

    // Helper to create minimal valid PerformanceState
    std::string createValidPerformanceState() {
        json j = {
            {"version", "1"},
            {"id", validUUID},
            {"name", "Test Performance"},
            {"arrangementStyle", "SOLO_PIANO"},
            {"density", 0.5},
            {"grooveProfileId", "default"},
            {"consoleXProfileId", "default"},
            {"instrumentationMap", {
                {"primary", {
                    {"instrumentId", "LocalGal"},
                    {"presetId", "grand_piano"}
                }}
            }},
            {"mixTargets", {
                {"primary", {
                    {"gain", -3.0},
                    {"pan", 0.0},
                    {"stereo", true}
                }}
            }},
            {"createdAt", "2021-01-01T00:00:00Z"},
            {"modifiedAt", "2021-01-01T00:00:00Z"}
        };
        return j.dump();
    }
};

// =============================================================================
// UUID Validation Tests
// =============================================================================

TEST_F(SchemaValidatorTest, IsValidUUID_ValidUUID_ReturnsTrue) {
    EXPECT_TRUE(isValidUUID("550e8400-e29b-41d4-a716-446655440000"));
    EXPECT_TRUE(isValidUUID("00000000-0000-0000-0000-000000000000"));
    EXPECT_TRUE(isValidUUID("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF"));
}

TEST_F(SchemaValidatorTest, IsValidUUID_InvalidUUID_ReturnsFalse) {
    EXPECT_FALSE(isValidUUID("not-a-uuid"));
    EXPECT_FALSE(isValidUUID("550e8400-e29b-41d4-a716"));  // Too short
    EXPECT_FALSE(isValidUUID(""));  // Empty
    EXPECT_FALSE(isValidUUID("550e8400-e29b-41d4-a716-44665544000Z"));  // Invalid char
}

// =============================================================================
// ISO 8601 Validation Tests
// =============================================================================

TEST_F(SchemaValidatorTest, IsValidISO8601_ValidFormat_ReturnsTrue) {
    EXPECT_TRUE(isValidISO8601("2021-01-01T00:00:00Z"));
    EXPECT_TRUE(isValidISO8601("2021-12-31T23:59:59Z"));
    EXPECT_TRUE(isValidISO8601("2021-01-01T00:00:00.000Z"));
    EXPECT_TRUE(isValidISO8601("2021-01-01T00:00:00+00:00"));
    EXPECT_TRUE(isValidISO8601("2021-01-01T00:00:00-05:00"));
}

TEST_F(SchemaValidatorTest, IsValidISO8601_InvalidFormat_ReturnsFalse) {
    EXPECT_FALSE(isValidISO8601("not-a-date"));
    EXPECT_FALSE(isValidISO8601("2021-01-01"));  // Missing time
    EXPECT_FALSE(isValidISO8601("00:00:00"));  // Missing date
    EXPECT_FALSE(isValidISO8601(""));
}

// =============================================================================
// SchillingerSong Validation Tests
// =============================================================================

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_ValidSong_ReturnsSuccess) {
    std::string validSong = createValidSchillingerSong();
    auto result = validateSchillingerSong(validSong);
    EXPECT_TRUE(result.isSuccess());
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_InvalidVersion_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j["version"] = "2.0";
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("version") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_InvalidUUID_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j["id"] = "not-a-uuid";
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("id") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_NegativeCreatedAt_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j["createdAt"] = -1;
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("createdAt") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_EmptyAuthor_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j["author"] = "";
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("author") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_EmptyName_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j["name"] = "";
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("name") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_NameTooLong_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j["name"] = std::string(257, 'a');  // 257 characters
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("name") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_InvalidSeed_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j["seed"] = -1;
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("seed") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_SeedTooLarge_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j["seed"] = 4294967296;  // 2^32
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("seed") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_MissingEnsemble_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j.erase("ensemble");
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("ensemble") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSchillingerSong_MissingBook4_ReturnsError) {
    std::string song = createValidSchillingerSong();
    json j = json::parse(song);
    j.erase("book4");
    auto result = validateSchillingerSong(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("book4") != std::string::npos);
}

// =============================================================================
// SongModel Validation Tests
// =============================================================================

TEST_F(SchemaValidatorTest, ValidateSongModel_ValidSong_ReturnsSuccess) {
    std::string validSong = createValidSongModel();
    auto result = validateSongModel(validSong);
    EXPECT_TRUE(result.isSuccess());
}

TEST_F(SchemaValidatorTest, ValidateSongModel_InvalidVersion_ReturnsError) {
    std::string song = createValidSongModel();
    json j = json::parse(song);
    j["version"] = "2.0";
    auto result = validateSongModel(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("version") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSongModel_InvalidSourceSongId_ReturnsError) {
    std::string song = createValidSongModel();
    json j = json::parse(song);
    j["sourceSongId"] = "not-a-uuid";
    auto result = validateSongModel(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("sourceSongId") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSongModel_NegativeDuration_ReturnsError) {
    std::string song = createValidSongModel();
    json j = json::parse(song);
    j["duration"] = -1;
    auto result = validateSongModel(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("duration") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSongModel_TempoZero_ReturnsError) {
    std::string song = createValidSongModel();
    json j = json::parse(song);
    j["tempo"] = 0.0;
    auto result = validateSongModel(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("tempo") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSongModel_TempoTooHigh_ReturnsError) {
    std::string song = createValidSongModel();
    json j = json::parse(song);
    j["tempo"] = 501.0;
    auto result = validateSongModel(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("tempo") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSongModel_InvalidSampleRate_ReturnsError) {
    std::string song = createValidSongModel();
    json j = json::parse(song);
    j["sampleRate"] = 96001;
    auto result = validateSongModel(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("sampleRate") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSongModel_MissingTimeline_ReturnsError) {
    std::string song = createValidSongModel();
    json j = json::parse(song);
    j.erase("timeline");
    auto result = validateSongModel(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("timeline") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidateSongModel_InvalidActivePerformanceId_ReturnsError) {
    std::string song = createValidSongModel();
    json j = json::parse(song);
    j["activePerformanceId"] = "not-a-uuid";
    auto result = validateSongModel(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("activePerformanceId") != std::string::npos);
}

// =============================================================================
// PerformanceState Validation Tests
// =============================================================================

TEST_F(SchemaValidatorTest, ValidatePerformanceState_ValidPerformance_ReturnsSuccess) {
    std::string validPerf = createValidPerformanceState();
    auto result = validatePerformanceState(validPerf);
    EXPECT_TRUE(result.isSuccess());
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_InvalidVersion_ReturnsError) {
    std::string perf = createValidPerformanceState();
    json j = json::parse(perf);
    j["version"] = "2.0";
    auto result = validatePerformanceState(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("version") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_InvalidUUID_ReturnsError) {
    std::string perf = createValidPerformanceState();
    json j = json::parse(perf);
    j["id"] = "not-a-uuid";
    auto result = validatePerformanceState(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("id") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_EmptyName_ReturnsError) {
    std::string perf = createValidPerformanceState();
    json j = json::parse(perf);
    j["name"] = "";
    auto result = validatePerformanceState(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("name") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_NameTooLong_ReturnsError) {
    std::string perf = createValidPerformanceState();
    json j = json::parse(perf);
    j["name"] = std::string(257, 'a');  // 257 characters
    auto result = validatePerformanceState(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("name") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_InvalidArrangementStyle_ReturnsError) {
    std::string perf = createValidPerformanceState();
    json j = json::parse(perf);
    j["arrangementStyle"] = "INVALID_STYLE";
    auto result = validatePerformanceState(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("arrangementStyle") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_DensityTooLow_ReturnsError) {
    std::string perf = createValidPerformanceState();
    json j = json::parse(perf);
    j["density"] = -0.1;
    auto result = validatePerformanceState(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("density") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_DensityTooHigh_ReturnsError) {
    std::string perf = createValidPerformanceState();
    json j = json::parse(perf);
    j["density"] = 1.1;
    auto result = validatePerformanceState(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("density") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_InvalidCreatedAt_ReturnsError) {
    std::string perf = createValidPerformanceState();
    json j = json::parse(perf);
    j["createdAt"] = "not-a-date";
    auto result = validatePerformanceState(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("createdAt") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_InvalidModifiedAt_ReturnsError) {
    std::string perf = createValidPerformanceState();
    json j = json::parse(perf);
    j["modifiedAt"] = "not-a-date";
    auto result = validatePerformanceState(j.dump());
    EXPECT_TRUE(result.isError());
    EXPECT_TRUE(result.getError().fieldPath.find("modifiedAt") != std::string::npos);
}

TEST_F(SchemaValidatorTest, ValidatePerformanceState_AllValidArrangementStyles_ReturnsSuccess) {
    const std::vector<std::string> validStyles = {
        "SOLO_PIANO", "SATB", "CHAMBER_ENSEMBLE", "FULL_ORCHESTRA",
        "JAZZ_COMBO", "JAZZ_TRIO", "ROCK_BAND", "AMBIENT_TECHNO",
        "ELECTRONIC", "ACAPPELLA", "STRING_QUARTET", "CUSTOM"
    };

    for (const auto& style : validStyles) {
        std::string perf = createValidPerformanceState();
        json j = json::parse(perf);
        j["arrangementStyle"] = style;
        auto result = validatePerformanceState(j.dump());
        EXPECT_TRUE(result.isSuccess()) << "Failed for style: " << style;
    }
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
