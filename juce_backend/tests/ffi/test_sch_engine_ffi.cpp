//
//  test_sch_engine_ffi.cpp
//  White Room JUCE FFI Bridge Tests
//
//  Test suite for sch_engine_ffi.cpp FFI bridge
//  Tests engine lifecycle (create/destroy/version) and basic operations
//

#include <gtest/gtest.h>
#include "ffi/sch_engine_ffi.h"
#include "ffi/sch_engine_ffi.h"
#include <cstring>

//==============================================================================
// Test Fixture
//==============================================================================

class SchEngineFFITest : public ::testing::Test {
protected:
    sch_engine_handle engine = nullptr;

    void SetUp() override {
        // Create fresh engine for each test
        sch_result_t result = sch_engine_create(&engine);
        ASSERT_EQ(result, SCH_OK);
        ASSERT_NE(engine, nullptr);
    }

    void TearDown() override {
        // Clean up engine after each test
        if (engine) {
            sch_engine_destroy(engine);
            engine = nullptr;
        }
    }
};

//==============================================================================
// Engine Lifecycle Tests
//==============================================================================

TEST_F(SchEngineFFITest, CreateEngine_ValidHandle) {
    // Engine should be created in SetUp()
    EXPECT_NE(engine, nullptr);
}

TEST_F(SchEngineFFITest, CreateEngine_NullHandle_ReturnsInvalidArg) {
    sch_engine_handle null_handle = nullptr;
    sch_result_t result = sch_engine_create(&null_handle);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, CreateEngine_NullPtr_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_create(nullptr);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, DestroyEngine_ValidHandle_ReturnsOk) {
    sch_result_t result = sch_engine_destroy(engine);
    EXPECT_EQ(result, SCH_OK);
    engine = nullptr; // Prevent double-destroy in TearDown()
}

TEST_F(SchEngineFFITest, DestroyEngine_NullHandle_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_destroy(nullptr);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, GetVersion_ValidPtr_ReturnsVersion) {
    sch_string_t version;
    sch_result_t result = sch_engine_get_version(&version);

    EXPECT_EQ(result, SCH_OK);
    EXPECT_NE(version.data, nullptr);
    EXPECT_GT(version.length, 0);

    // Version should contain expected text
    EXPECT_NE(strstr(version.data, "White Room"), nullptr);

    // Clean up
    sch_free_string(&version);
}

TEST_F(SchEngineFFITest, GetVersion_NullPtr_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_get_version(nullptr);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

//==============================================================================
// Song Operations Tests
//==============================================================================

TEST_F(SchEngineFFITest, CreateDefaultSong_ValidEngine_ReturnsOk) {
    sch_result_t result = sch_engine_create_default_song(engine);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, CreateDefaultSong_NullEngine_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_create_default_song(nullptr);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, LoadSong_ValidJSON_ReturnsOk) {
    // First create default song
    ASSERT_EQ(sch_engine_create_default_song(engine), SCH_OK);

    // Get the song
    sch_string_t json;
    ASSERT_EQ(sch_engine_get_song(engine, &json), SCH_OK);

    // Load it back
    sch_result_t result = sch_engine_load_song(engine, json.data);
    EXPECT_EQ(result, SCH_OK);

    // Clean up
    sch_free_string(&json);
}

TEST_F(SchEngineFFITest, LoadSong_NullEngine_ReturnsInvalidArg) {
    const char* json = "{}";
    sch_result_t result = sch_engine_load_song(nullptr, json);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, LoadSong_NullJSON_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_load_song(engine, nullptr);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, GetSong_ValidEngine_ReturnsJSON) {
    // Create default song first
    ASSERT_EQ(sch_engine_create_default_song(engine), SCH_OK);

    sch_string_t json;
    sch_result_t result = sch_engine_get_song(engine, &json);

    EXPECT_EQ(result, SCH_OK);
    EXPECT_NE(json.data, nullptr);
    EXPECT_GT(json.length, 0);

    // Should contain valid JSON
    EXPECT_NE(strstr(json.data, "{"), nullptr);

    // Clean up
    sch_free_string(&json);
}

TEST_F(SchEngineFFITest, GetSong_NullEngine_ReturnsInvalidArg) {
    sch_string_t json;
    sch_result_t result = sch_engine_get_song(nullptr, &json);
    EXPECT_EQ(result, SCH_ERR_ENGINE_NULL);
}

TEST_F(SchEngineFFITest, GetSong_NullPtr_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_get_song(engine, nullptr);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

//==============================================================================
// Audio Control Tests
//==============================================================================

TEST_F(SchEngineFFITest, AudioInit_ValidConfig_ReturnsOk) {
    sch_audio_config_t config = {
        .sample_rate = 48000.0,
        .buffer_size = 512,
        .input_channels = 2,
        .output_channels = 2
    };

    sch_result_t result = sch_engine_audio_init(engine, &config);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, AudioInit_NullEngine_ReturnsInvalidArg) {
    sch_audio_config_t config = {};
    sch_result_t result = sch_engine_audio_init(nullptr, &config);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, AudioInit_NullConfig_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_audio_init(engine, nullptr);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, AudioStart_ValidEngine_ReturnsOk) {
    sch_result_t result = sch_engine_audio_start(engine);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, AudioStop_ValidEngine_ReturnsOk) {
    sch_result_t result = sch_engine_audio_stop(engine);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, GetAudioStatus_ValidEngine_ReturnsStatus) {
    sch_string_t status;
    sch_result_t result = sch_engine_get_audio_status(engine, &status);

    EXPECT_EQ(result, SCH_OK);
    EXPECT_NE(status.data, nullptr);
    EXPECT_GT(status.length, 0);

    // Should contain valid JSON
    EXPECT_NE(strstr(status.data, "{"), nullptr);

    // Clean up
    sch_free_string(&status);
}

//==============================================================================
// Transport Control Tests
//==============================================================================

TEST_F(SchEngineFFITest, SetTransportPlaying_ValidEngine_ReturnsOk) {
    sch_result_t result = sch_engine_set_transport(engine, SCH_TRANSPORT_PLAYING);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, SetTransportStopped_ValidEngine_ReturnsOk) {
    sch_result_t result = sch_engine_set_transport(engine, SCH_TRANSPORT_STOPPED);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, SetTransportPaused_ValidEngine_ReturnsOk) {
    sch_result_t result = sch_engine_set_transport(engine, SCH_TRANSPORT_PAUSED);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, SetTempo_ValidTempo_ReturnsOk) {
    sch_result_t result = sch_engine_set_tempo(engine, 140.0);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, SetTempo_InvalidTempo_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_set_tempo(engine, -10.0);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, SetPosition_ValidPosition_ReturnsOk) {
    sch_result_t result = sch_engine_set_position(engine, 1.5);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, SetPosition_InvalidPosition_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_set_position(engine, -1.0);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

//==============================================================================
// MIDI Event Tests
//==============================================================================

TEST_F(SchEngineFFITest, SendNoteOn_ValidParams_ReturnsOk) {
    sch_result_t result = sch_engine_send_note_on(engine, 0, 60, 0.8f);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, SendNoteOn_InvalidChannel_ReturnsInvalidArg) {
    sch_result_t result = sch_engine_send_note_on(engine, 16, 60, 0.8f);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, SendNoteOff_ValidParams_ReturnsOk) {
    sch_result_t result = sch_engine_send_note_off(engine, 0, 60, 0.5f);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, AllNotesOff_ValidEngine_ReturnsOk) {
    sch_result_t result = sch_engine_all_notes_off(engine);
    EXPECT_EQ(result, SCH_OK);
}

//==============================================================================
// Performance Blend Tests
//==============================================================================

TEST_F(SchEngineFFITest, SetPerformanceBlend_ValidParams_ReturnsOk) {
    const char* perf_a = "00000000-0000-0000-0000-000000000001";
    const char* perf_b = "00000000-0000-0000-0000-000000000002";

    sch_result_t result = sch_engine_set_performance_blend(engine, perf_a, perf_b, 0.5);
    EXPECT_EQ(result, SCH_OK);
}

TEST_F(SchEngineFFITest, SetPerformanceBlend_InvalidBlendValue_ReturnsInvalidArg) {
    const char* perf_a = "00000000-0000-0000-0000-000000000001";
    const char* perf_b = "00000000-0000-0000-0000-000000000002";

    sch_result_t result = sch_engine_set_performance_blend(engine, perf_a, perf_b, 1.5);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

TEST_F(SchEngineFFITest, SetPerformanceBlend_InvalidUUIDs_ReturnsInvalidArg) {
    const char* invalid_uuid = "not-a-uuid";

    sch_result_t result = sch_engine_set_performance_blend(
        engine, invalid_uuid, invalid_uuid, 0.5);
    EXPECT_EQ(result, SCH_ERR_INVALID_ARG);
}

//==============================================================================
// Memory Management Tests
//==============================================================================

TEST_F(SchEngineFFITest, FreeString_ValidString_FreesMemory) {
    sch_string_t str;
    str.data = static_cast<char*>(std::malloc(100));
    str.length = 100;

    sch_free_string(&str);

    EXPECT_EQ(str.data, nullptr);
    EXPECT_EQ(str.length, 0);
}

TEST_F(SchEngineFFITest, FreeString_NullString_DoesNotCrash) {
    sch_string_t str = {nullptr, 0};
    sch_free_string(&str); // Should not crash
}

TEST_F(SchEngineFFITest, ResultToString_ValidResult_ReturnsString) {
    const char* result_str = sch_result_to_string(SCH_OK);
    EXPECT_NE(result_str, nullptr);
    EXPECT_STREQ(result_str, "OK");

    result_str = sch_result_to_string(SCH_ERR_INVALID_ARG);
    EXPECT_NE(result_str, nullptr);
    EXPECT_STREQ(result_str, "Invalid argument");
}

TEST_F(SchEngineFFITest, UUIDValidate_ValidUUID_ReturnsTrue) {
    const char* valid_uuid = "123e4567-e89b-12d3-a456-426614174000";
    bool result = sch_uuid_validate(valid_uuid);
    EXPECT_TRUE(result);
}

TEST_F(SchEngineFFITest, UUIDValidate_InvalidUUID_ReturnsFalse) {
    const char* invalid_uuid = "not-a-uuid";
    bool result = sch_uuid_validate(invalid_uuid);
    EXPECT_FALSE(result);
}

//==============================================================================
// Main
//==============================================================================

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
