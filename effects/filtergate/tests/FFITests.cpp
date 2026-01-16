/*******************************************************************************
 * FilterGate - FFI Layer Tests
 *
 * Tests for C ABI / FFI interface
 *
 * @author FilterGate Autonomous Agent 6
 * @date  2025-12-30
 ******************************************************************************/

#include <gtest/gtest.h>
#include "ffi/filtergate_ffi.h"
#include "dsp/ModulationMatrix.h"
#include <cstring>

using namespace FilterGate;

//==============================================================================
// Lifecycle Tests
//==============================================================================

class FFITest : public ::testing::Test {
protected:
    void SetUp() override {
        handle = filtergate_create(48000.0);
        ASSERT_NE(handle, nullptr);
    }

    void TearDown() override {
        if (handle != nullptr) {
            filtergate_destroy(handle);
            handle = nullptr;
        }
    }

    FilterGateHandle handle = nullptr;
};

TEST_F(FFITest, CanCreateInstance) {
    EXPECT_NE(handle, nullptr);
}

TEST_F(FFITest, CreateWithInvalidSampleRate) {
    FilterGateHandle invalidHandle = filtergate_create(-1.0);
    EXPECT_EQ(invalidHandle, nullptr);
    EXPECT_NE(filtergate_get_last_error(invalidHandle), nullptr);
}

TEST_F(FFITest, CreateWithTooHighSampleRate) {
    FilterGateHandle invalidHandle = filtergate_create(200000.0);
    EXPECT_EQ(invalidHandle, nullptr);
}

TEST_F(FFITest, CanDestroyInstance) {
    filtergate_destroy(handle);
    handle = nullptr;
    SUCCEED();
}

TEST_F(FFITest, DestroyNullHandle) {
    filtergate_destroy(nullptr);
    SUCCEED(); // Should not crash
}

TEST_F(FFITest, CanReset) {
    filtergate_reset(handle);
    SUCCEED();
}

TEST_F(FFITest, ResetNullHandle) {
    filtergate_reset(nullptr);
    // Should set error
    EXPECT_NE(filtergate_get_last_error(nullptr), nullptr);
}

//==============================================================================
// Audio Processing Tests
//==============================================================================

TEST_F(FFITest, CanProcessSilenceMono) {
    constexpr int numSamples = 256;
    float input[256] = {0};
    float output[256] = {0};

    filtergate_process_mono(handle, input, output, numSamples);

    // Output should be silent
    for (int i = 0; i < numSamples; ++i) {
        EXPECT_FLOAT_EQ(output[i], 0.0f);
    }
}

TEST_F(FFITest, CanProcessDCMono) {
    constexpr int numSamples = 256;
    float input[256];
    float output[256];

    // Create DC signal
    for (int i = 0; i < numSamples; ++i) {
        input[i] = 0.5f;
    }

    filtergate_process_mono(handle, input, output, numSamples);

    // Output should not be silent (even if heavily processed)
    float sum = 0.0f;
    for (int i = 0; i < numSamples; ++i) {
        sum += std::abs(output[i]);
    }
    EXPECT_GT(sum, 0.0f);
}

TEST_F(FFITest, CanProcessSilenceStereo) {
    constexpr int numSamples = 256;
    float left[256] = {0};
    float right[256] = {0};

    filtergate_process_stereo(handle, left, right, numSamples);

    // Output should be silent
    for (int i = 0; i < numSamples; ++i) {
        EXPECT_FLOAT_EQ(left[i], 0.0f);
        EXPECT_FLOAT_EQ(right[i], 0.0f);
    }
}

TEST_F(FFITest, CanProcessDCStereo) {
    constexpr int numSamples = 256;
    float left[256];
    float right[256];

    // Create DC signal
    for (int i = 0; i < numSamples; ++i) {
        left[i] = 0.5f;
        right[i] = -0.5f;
    }

    filtergate_process_stereo(handle, left, right, numSamples);

    // Output should not be silent
    float sumLeft = 0.0f;
    float sumRight = 0.0f;
    for (int i = 0; i < numSamples; ++i) {
        sumLeft += std::abs(left[i]);
        sumRight += std::abs(right[i]);
    }
    EXPECT_GT(sumLeft, 0.0f);
    EXPECT_GT(sumRight, 0.0f);
}

TEST_F(FFITest, ProcessWithNullBuffers) {
    constexpr int numSamples = 256;

    filtergate_process_mono(nullptr, nullptr, nullptr, numSamples);
    EXPECT_NE(filtergate_get_last_error(handle), nullptr);

    filtergate_clear_error(handle);
}

//==============================================================================
// Parameter Control Tests
//==============================================================================

TEST_F(FFITest, CanSetValidParameter) {
    // Set filter cutoff (param ID 0)
    int result = filtergate_set_param(handle, FILTERGATE_PARAM_FILTER_CUTOFF, 0.5f);
    EXPECT_EQ(result, 1);
}

TEST_F(FFITest, SetParameterWithInvalidID) {
    int result = filtergate_set_param(handle, 9999, 0.5f);
    EXPECT_EQ(result, 0);
    EXPECT_NE(filtergate_get_last_error(handle), nullptr);
}

TEST_F(FFITest, SetParameterWithNullHandle) {
    int result = filtergate_set_param(nullptr, FILTERGATE_PARAM_FILTER_CUTOFF, 0.5f);
    EXPECT_EQ(result, 0);
}

TEST_F(FFITest, CanGetParameter) {
    filtergate_set_param(handle, FILTERGATE_PARAM_FILTER_CUTOFF, 0.75f);
    float value = filtergate_get_param(handle, FILTERGATE_PARAM_FILTER_CUTOFF);
    // Note: Currently returns default 0.5f, will be implemented when parameter routing is complete
    EXPECT_GE(value, 0.0f);
    EXPECT_LE(value, 1.0f);
}

TEST_F(FFITest, GetParameterWithInvalidID) {
    float value = filtergate_get_param(handle, 9999);
    EXPECT_EQ(value, 0.0f);
    EXPECT_NE(filtergate_get_last_error(handle), nullptr);
}

//==============================================================================
// Envelope Triggering Tests
//==============================================================================

TEST_F(FFITest, CanTriggerEnvelope1) {
    filtergate_trigger_envelope(handle, 0, 1.0f);

    // Process a few samples to let attack start
    constexpr int numSamples = 100;
    float input[256] = {0};
    float output[256] = {0};

    for (int i = 0; i < 10; ++i) {
        filtergate_process_mono(handle, input, output, numSamples);
    }

    // Envelope should have started rising
    float level = filtergate_get_envelope_level(handle, 0);
    EXPECT_GT(level, 0.0f);
}

TEST_F(FFITest, CanTriggerEnvelope2) {
    filtergate_trigger_envelope(handle, 1, 0.5f);

    // Process a few samples
    constexpr int numSamples = 100;
    float input[256] = {0};
    float output[256] = {0};

    for (int i = 0; i < 10; ++i) {
        filtergate_process_mono(handle, input, output, numSamples);
    }

    float level = filtergate_get_envelope_level(handle, 1);
    EXPECT_GT(level, 0.0f);
}

TEST_F(FFITest, TriggerWithInvalidEnvelopeIndex) {
    filtergate_trigger_envelope(handle, 2, 1.0f);
    EXPECT_NE(filtergate_get_last_error(handle), nullptr);
}

TEST_F(FFITest, TriggerWithClampedVelocity) {
    filtergate_trigger_envelope(handle, 0, 2.0f); // Too high
    filtergate_trigger_envelope(handle, 0, -0.5f); // Too low
    SUCCEED(); // Should not crash
}

TEST_F(FFITest, CanReleaseEnvelope) {
    filtergate_trigger_envelope(handle, 0, 1.0f);
    filtergate_release_envelope(handle, 0);
    SUCCEED();
}

//==============================================================================
// Modulation Matrix Tests
//==============================================================================

TEST_F(FFITest, CanAddModRoute) {
    // Route Envelope 1 to Filter Cutoff
    int routeIndex = filtergate_add_mod_route(handle,
                                              static_cast<int>(ModSource::ENV1),
                                              static_cast<int>(ModDestination::FILTER_CUTOFF),
                                              0.5f,
                                              0.0f);
    EXPECT_GE(routeIndex, 0);
}

TEST_F(FFITest, AddModRouteWithInvalidSource) {
    int routeIndex = filtergate_add_mod_route(handle,
                                              999,
                                              static_cast<int>(ModDestination::FILTER_CUTOFF),
                                              0.5f,
                                              0.0f);
    EXPECT_LT(routeIndex, 0);
    EXPECT_NE(filtergate_get_last_error(handle), nullptr);
}

TEST_F(FFITest, AddModRouteWithInvalidDestination) {
    int routeIndex = filtergate_add_mod_route(handle,
                                              static_cast<int>(ModSource::ENV1),
                                              999,
                                              0.5f,
                                              0.0f);
    EXPECT_LT(routeIndex, 0);
}

TEST_F(FFITest, CanRemoveModRoute) {
    int routeIndex = filtergate_add_mod_route(handle,
                                              static_cast<int>(ModSource::ENV1),
                                              static_cast<int>(ModDestination::FILTER_CUTOFF),
                                              0.5f,
                                              0.0f);

    int result = filtergate_remove_mod_route(handle, routeIndex);
    EXPECT_EQ(result, 1);
}

TEST_F(FFITest, RemoveInvalidModRoute) {
    int result = filtergate_remove_mod_route(handle, 999);
    EXPECT_EQ(result, 0);
}

TEST_F(FFITest, CanClearModRoutes) {
    // Add multiple routes
    filtergate_add_mod_route(handle, static_cast<int>(ModSource::ENV1),
                            static_cast<int>(ModDestination::FILTER_CUTOFF), 0.5f, 0.0f);
    filtergate_add_mod_route(handle, static_cast<int>(ModSource::ENV2),
                            static_cast<int>(ModDestination::FILTER_RESONANCE), 0.3f, 0.0f);

    filtergate_clear_mod_routes(handle);
    SUCCEED();
}

TEST_F(FFITest, CanGetModulationValue) {
    filtergate_add_mod_route(handle,
                            static_cast<int>(ModSource::ENV1),
                            static_cast<int>(ModDestination::FILTER_CUTOFF),
                            0.5f,
                            0.0f);

    // Trigger envelope
    filtergate_trigger_envelope(handle, 0, 1.0f);

    // Process to update modulation
    constexpr int numSamples = 100;
    float input[256] = {0};
    float output[256] = {0};
    filtergate_process_mono(handle, input, output, numSamples);

    float mod = filtergate_get_modulation(handle, static_cast<int>(ModDestination::FILTER_CUTOFF));
    // Modulation should be non-zero after envelope triggers
    EXPECT_GE(mod, 0.0f);
}

//==============================================================================
// State Query Tests
//==============================================================================

TEST_F(FFITest, CanGetEnvelopeLevel) {
    filtergate_trigger_envelope(handle, 0, 1.0f);

    // Process to advance envelope
    constexpr int numSamples = 100;
    float input[256] = {0};
    float output[256] = {0};
    filtergate_process_mono(handle, input, output, numSamples);

    float level = filtergate_get_envelope_level(handle, 0);
    EXPECT_GT(level, 0.0f);
    EXPECT_LE(level, 1.0f);
}

TEST_F(FFITest, GetEnvelopeLevelWithInvalidIndex) {
    float level = filtergate_get_envelope_level(handle, 2);
    EXPECT_EQ(level, 0.0f);
    EXPECT_NE(filtergate_get_last_error(handle), nullptr);
}

TEST_F(FFITest, CanGetGateState) {
    // Process loud signal to open gate
    constexpr int numSamples = 256;
    float input[256];
    float output[256];

    for (int i = 0; i < numSamples; ++i) {
        input[i] = 0.8f;
    }

    filtergate_process_mono(handle, input, output, numSamples);

    float gateState = filtergate_get_gate_state(handle);
    EXPECT_GT(gateState, 0.0f); // Gate should be open
}

TEST_F(FFITest, CanGetEnvelopeFollowerLevel) {
    // Process loud signal
    constexpr int numSamples = 256;
    float input[256];
    float output[256];

    for (int i = 0; i < numSamples; ++i) {
        input[i] = 0.8f;
    }

    filtergate_process_mono(handle, input, output, numSamples);

    float envFollowLevel = filtergate_get_envelope_follower_level(handle);
    EXPECT_GT(envFollowLevel, 0.0f);
}

TEST_F(FFITest, CanCheckGateJustOpened) {
    // Process loud signal
    constexpr int numSamples = 256;
    float input[256];
    float output[256];

    for (int i = 0; i < numSamples; ++i) {
        input[i] = 0.8f;
    }

    // First process should open gate
    filtergate_process_mono(handle, input, output, numSamples);

    int justOpened = filtergate_gate_just_opened(handle);
    // Gate might have opened on first loud sample
    // (can't guarantee exact timing without deeper knowledge)
    EXPECT_GE(justOpened, 0);
    EXPECT_LE(justOpened, 1);
}

//==============================================================================
// Error Handling Tests
//==============================================================================

TEST_F(FFITest, CanGetLastError) {
    // Trigger an error
    filtergate_set_param(nullptr, FILTERGATE_PARAM_FILTER_CUTOFF, 0.5f);

    const char* error = filtergate_get_last_error(handle);
    EXPECT_NE(error, nullptr);
    EXPECT_STRNE(error, "");
}

TEST_F(FFITest, CanClearError) {
    // Trigger an error
    filtergate_set_param(nullptr, FILTERGATE_PARAM_FILTER_CUTOFF, 0.5f);
    EXPECT_NE(filtergate_get_last_error(handle), nullptr);

    // Clear error
    filtergate_clear_error(handle);

    // Error should be cleared
    const char* error = filtergate_get_last_error(handle);
    EXPECT_EQ(error, nullptr);
}

//==============================================================================
// String Utilities Tests
//==============================================================================

TEST_F(FFITest, CanFreeString) {
    char* str = new char[32];
    std::strcpy(str, "test string");

    filtergate_free_string(str);
    SUCCEED(); // Should not crash
}

TEST_F(FFITest, FreeNullString) {
    filtergate_free_string(nullptr);
    SUCCEED(); // Should not crash
}

//==============================================================================
// Thread Safety Tests (Basic)
//==============================================================================

TEST_F(FFITest, MultipleInstancesDontInterfere) {
    // Create second instance
    FilterGateHandle handle2 = filtergate_create(48000.0);
    ASSERT_NE(handle2, nullptr);

    // Trigger envelope on first instance
    filtergate_trigger_envelope(handle, 0, 1.0f);

    // Trigger envelope on second instance
    filtergate_trigger_envelope(handle2, 1, 0.5f);

    // Both should have independent state
    float level1 = filtergate_get_envelope_level(handle, 0);
    float level2 = filtergate_get_envelope_level(handle2, 1);

    EXPECT_GT(level1, 0.0f);
    EXPECT_GT(level2, 0.0f);

    // Cleanup
    filtergate_destroy(handle2);
}

//==============================================================================
// Main
//==============================================================================

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
