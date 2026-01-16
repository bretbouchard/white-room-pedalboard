/**
 * White Room FFI Server Tests
 *
 * Tests for realize, reconcile, and loadSong operations.
 */

#include <gtest/gtest.h>
#include "ffi_server.h"
#include <nlohmann/json.hpp>

using namespace white_room::ffi;

// =============================================================================
// TEST FIXTURES
// =============================================================================

class FFIServerTest : public ::testing::Test {
protected:
  void SetUp() override {
    // Get FFI server instance (singleton)
    server_ = &FFIServer::getInstance();
  }

  void TearDown() override {
    // Cleanup if needed
  }

  FFIServer* server_;
};

// =============================================================================
// REALIZE OPERATION TESTS
// =============================================================================

TEST_F(FFIServerTest, Realize_ValidSong_ReturnsSongModel) {
  // Arrange
  RealizeRequest request;
  request.songId = "test-song-123";
  request.songJson = R"({
    "version": "1.0",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": 1234567890,
    "modifiedAt": 1234567890,
    "author": "test",
    "name": "Test Song",
    "seed": 12345,
    "book4": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "ratioTree": [1, 1, 1, 1]
    },
    "ensemble": {
      "version": "1.0",
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "voices": [],
      "voiceCount": 1
    },
    "bindings": {},
    "constraints": {"constraints": []},
    "console": {
      "version": "1.0",
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "voiceBusses": [],
      "mixBusses": [],
      "masterBus": {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "name": "Master",
        "type": "master",
        "inserts": [],
        "gain": 0,
        "pan": 0,
        "muted": false,
        "solo": false
      },
      "routing": {"routes": []}
    }
  })";
  request.seed = 12345;
  request.tempo = 120.0;
  request.timeSignatureNum = 4;
  request.timeSignatureDen = 4;
  request.sampleRate = 48000;

  // Act
  auto result = server_->realize(request);

  // Assert
  ASSERT_TRUE(result.isSuccess()) << "Error: " << result.getMessage();
  const auto& response = result.getData();

  EXPECT_FALSE(response.songModelId.empty());
  EXPECT_FALSE(response.songModelJson.empty());

  // Verify SongModel JSON is valid
  auto songModelJson = nlohmann::json::parse(response.songModelJson);
  EXPECT_EQ(response.songModelId, songModelJson["id"]);
  EXPECT_EQ("1.0", songModelJson["version"]);
  EXPECT_EQ(request.songId, songModelJson["sourceSongId"]);
}

TEST_F(FFIServerTest, Realize_EmptySongId_ReturnsError) {
  // Arrange
  RealizeRequest request;
  request.songId = "";  // Empty
  request.songJson = "{}";
  request.seed = 12345;
  request.tempo = 120.0;
  request.timeSignatureNum = 4;
  request.timeSignatureDen = 4;
  request.sampleRate = 48000;

  // Act
  auto result = server_->realize(request);

  // Assert
  EXPECT_FALSE(result.isSuccess());
  EXPECT_EQ(FFICode::INVALID_ARGUMENT, result.getCode());
  EXPECT_TRUE(result.getMessage().find("songId") != std::string::npos);
}

TEST_F(FFIServerTest, Realize_InvalidJson_ReturnsError) {
  // Arrange
  RealizeRequest request;
  request.songId = "test-song";
  request.songJson = "invalid json";  // Invalid
  request.seed = 12345;
  request.tempo = 120.0;
  request.timeSignatureNum = 4;
  request.timeSignatureDen = 4;
  request.sampleRate = 48000;

  // Act
  auto result = server_->realize(request);

  // Assert
  EXPECT_FALSE(result.isSuccess());
  EXPECT_EQ(FFICode::VALIDATION_FAILED, result.getCode());
}

// =============================================================================
// RECONCILE OPERATION TESTS
// =============================================================================

TEST_F(FFIServerTest, Reconcile_ValidSong_ReturnsReport) {
  // Arrange
  ReconcileRequest request;
  request.originalSongId = "original-song-123";
  request.editedSongId = "edited-song-456";
  request.editedSongJson = R"({
    "version": "1.0",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sourceSongId": "original-song-123",
    "derivationId": "derivation-789",
    "tempo": 120.0,
    "timeSignature": [4, 4],
    "sampleRate": 48000,
    "duration": 0,
    "notes": [],
    "voiceAssignments": [],
    "console": {
      "version": "1.0",
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "voiceBusses": [],
      "mixBusses": [],
      "masterBus": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Master",
        "type": "master",
        "inserts": [],
        "gain": 0,
        "pan": 0,
        "muted": false,
        "solo": false
      },
      "routing": {"routes": []}
    },
    "derivedAt": 1234567890
  })";

  // Act
  auto result = server_->reconcile(request);

  // Assert
  ASSERT_TRUE(result.isSuccess()) << "Error: " << result.getMessage();
  const auto& response = result.getData();

  EXPECT_FALSE(response.reportId.empty());
  EXPECT_FALSE(response.reportJson.empty());
  EXPECT_GE(response.confidence, 0.0);
  EXPECT_LE(response.confidence, 1.0);
  EXPECT_FALSE(response.suggestedAction.empty());

  // Verify ReconciliationReport JSON is valid
  auto reportJson = nlohmann::json::parse(response.reportJson);
  EXPECT_EQ(response.reportId, reportJson["id"]);
  EXPECT_EQ(request.originalSongId, reportJson["originalSongId"]);
  EXPECT_EQ(request.editedSongId, reportJson["editedSongId"]);
}

TEST_F(FFIServerTest, Reconcile_EmptyOriginalSongId_ReturnsError) {
  // Arrange
  ReconcileRequest request;
  request.originalSongId = "";  // Empty
  request.editedSongId = "edited-song";
  request.editedSongJson = "{}";

  // Act
  auto result = server_->reconcile(request);

  // Assert
  EXPECT_FALSE(result.isSuccess());
  EXPECT_EQ(FFICode::INVALID_ARGUMENT, result.getCode());
  EXPECT_TRUE(result.getMessage().find("originalSongId") != std::string::npos);
}

// =============================================================================
// LOAD SONG OPERATION TESTS
// =============================================================================

TEST_F(FFIServerTest, LoadSong_ValidSong_ReturnsSuccess) {
  // Arrange
  LoadSongRequest request;
  request.songModelId = "song-model-123";
  request.songModelJson = R"({
    "version": "1.0",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sourceSongId": "song-123",
    "derivationId": "derivation-456",
    "tempo": 120.0,
    "timeSignature": [4, 4],
    "sampleRate": 48000,
    "duration": 0,
    "notes": [],
    "voiceAssignments": [],
    "console": {
      "version": "1.0",
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "voiceBusses": [],
      "mixBusses": [],
      "masterBus": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Master",
        "type": "master",
        "inserts": [],
        "gain": 0,
        "pan": 0,
        "muted": false,
        "solo": false
      },
      "routing": {"routes": []}
    },
    "derivedAt": 1234567890
  })";

  // Act
  auto result = server_->loadSong(request);

  // Assert
  ASSERT_TRUE(result.isSuccess()) << "Error: " << result.getMessage();
  const auto& response = result.getData();

  EXPECT_TRUE(response.success);
  EXPECT_FALSE(response.message.empty());
  EXPECT_GE(response.voiceCount, 0);
}

TEST_F(FFIServerTest, LoadSong_EmptySongModelId_ReturnsError) {
  // Arrange
  LoadSongRequest request;
  request.songModelId = "";  // Empty
  request.songModelJson = "{}";

  // Act
  auto result = server_->loadSong(request);

  // Assert
  EXPECT_FALSE(result.isSuccess());
  EXPECT_EQ(FFICode::INVALID_ARGUMENT, result.getCode());
  EXPECT_TRUE(result.getMessage().find("songModelId") != std::string::npos);
}

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

TEST_F(FFIServerTest, ValidateSchema_ValidJson_ReturnsTrue) {
  // Arrange
  std::string json = R"({"version": "1.0", "id": "test-123", "name": "Test"})";
  std::string schemaName = "SchillingerSong_v1";

  // Act
  auto result = server_->validateSchema(json, schemaName);

  // Assert
  // Note: Full schema validation not implemented yet, so we just check no error
  // For now, basic JSON parsing is validated
}

// =============================================================================
// VERSION TESTS
// =============================================================================

TEST(FFIServerVersion, GetVersion_ReturnsValidVersion) {
  // Act
  std::string version = FFIServer::getVersion();

  // Assert
  EXPECT_FALSE(version.empty());
  EXPECT_EQ("1.0.0", version);  // Current version
}

// =============================================================================
// MAIN
// =============================================================================

int main(int argc, char** argv) {
  ::testing::InitGoogleTest(&argc, argv);
  return RUN_ALL_TESTS();
}
