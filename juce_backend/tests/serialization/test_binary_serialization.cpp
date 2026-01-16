#include <gtest/gtest.h>
#include <chrono>
#include <nlohmann/json.hpp>
#include "serialization/MessagePackSerializer.h"

using namespace FlutterOptimized::Serialization;
using json = nlohmann::json;
using namespace std::chrono;

// Test fixture for MessagePack serialization performance tests
class MessagePackSerializationTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Create comprehensive test data
        createTestAudioMessage();
        createTestChannelStripState();
        createTestAudioParameters();
    }

    void createTestAudioParameters() {
        test_parameters = {
            {0.75f, 0.0f, 1.0f, "Volume", 1001, true, 0.5f},
            {0.0f, -1.0f, 1.0f, "Pan", 1002, false, std::nullopt},
            {-6.0f, -60.0f, 12.0f, "Gain", 1003, true, 0.0f},
            {0.5f, 0.0f, 1.0f, "Send1", 1004, true, 0.0f},
            {0.0f, 20.0f, 20000.0f, "FilterFreq", 1005, false, 1000.0f}
        };
    }

    void createTestChannelStripState() {
        test_channel_state = {
            42,  // channel_id
            0.75f,  // volume
            -0.2f,  // pan
            false,  // mute
            false,  // solo
            test_parameters,
            "abc123def456"  // plugin_chain_hash
        };
    }

    void createTestAudioMessage() {
        // Create test audio buffer (small for performance testing)
        std::vector<float> test_buffer(256);
        for (size_t i = 0; i < test_buffer.size(); ++i) {
            test_buffer[i] = std::sin(2.0 * M_PI * 440.0 * i / 44100.0) * 0.5f;
        }

        test_message = {
            1640995200000000000ULL,  // timestamp
            12345,  // message_id
            "AudioStateUpdate",  // message_type
            {test_channel_state},  // channel_states
            test_buffer,  // audio_buffer
            44100,  // sample_rate
            256  // buffer_size
        };
    }

    // Helper to create JSON equivalent for size comparison
    std::string createJsonEquivalent(const AudioMessage& msg) {
        json j;
        j["timestamp"] = msg.timestamp;
        j["message_id"] = msg.message_id;
        j["message_type"] = msg.message_type;

        json channels = json::array();
        for (const auto& channel : msg.channel_states) {
            json ch;
            ch["channel_id"] = channel.channel_id;
            ch["volume"] = channel.volume;
            ch["pan"] = channel.pan;
            ch["mute"] = channel.mute;
            ch["solo"] = channel.solo;
            ch["plugin_chain_hash"] = channel.plugin_chain_hash;

            json params = json::array();
            for (const auto& param : channel.parameters) {
                json p;
                p["value"] = param.value;
                p["min_value"] = param.min_value;
                p["max_value"] = param.max_value;
                p["name"] = param.name;
                p["parameter_id"] = param.parameter_id;
                p["is_automated"] = param.is_automated;
                if (param.default_value) {
                    p["default_value"] = *param.default_value;
                }
                params.push_back(p);
            }
            ch["parameters"] = params;
            channels.push_back(ch);
        }
        j["channel_states"] = channels;
        j["audio_buffer"] = msg.audio_buffer;
        j["sample_rate"] = msg.sample_rate;
        j["buffer_size"] = msg.buffer_size;

        return j.dump();
    }

    AudioParameter test_parameter;
    ChannelStripState test_channel_state;
    AudioMessage test_message;
    std::vector<AudioParameter> test_parameters;
};

// RED PHASE TESTS - These should FAIL initially
// =================================================================

TEST_F(MessagePackSerializationTest, SerializeAudioParameter_Targets25us) {
    // Test MessagePack serialization performance
    // Target: <25μs serialization time, <40% of JSON size

    auto start = high_resolution_clock::now();

    std::vector<uint8_t> serialized = FlutterOptimized::Serialization::serializeAudioParameter(test_parameter);

    auto end = high_resolution_clock::now();
    auto serialization_time = duration_cast<microseconds>(end - start);

    // Get JSON equivalent size for comparison
    json j = {
        {"value", test_parameter.value},
        {"min_value", test_parameter.min_value},
        {"max_value", test_parameter.max_value},
        {"name", test_parameter.name},
        {"parameter_id", test_parameter.parameter_id},
        {"is_automated", test_parameter.is_automated}
    };
    if (test_parameter.default_value) {
        j["default_value"] = *test_parameter.default_value;
    }
    size_t json_size = j.dump().length();

    // Performance assertions
    EXPECT_LT(serialization_time.count(), 25)
        << "Serialization took " << serialization_time.count() << "μs, target <25μs";

    EXPECT_LT(serialized.size(), json_size * 0.4)
        << "MessagePack size " << serialized.size() << " is "
        << (double)serialized.size() / json_size * 100
        << "% of JSON size, target <40%";

    // Verify round-trip integrity
    auto deserialized = FlutterOptimized::Serialization::deserializeAudioParameter(serialized);
    EXPECT_EQ(test_parameter, deserialized) << "Round-trip data integrity failed";
}

TEST_F(MessagePackSerializationTest, DISABLED_SerializeChannelStripState_Targets15us) {
    // Target: <15μs for complex channel state

    auto start = high_resolution_clock::now();

    // This will fail without implementation
    // std::vector<uint8_t> serialized = MessagePackSerializer::serialize(test_channel_state);

    auto end = high_resolution_clock::now();
    auto serialization_time = duration_cast<microseconds>(end - start);

    EXPECT_LT(serialization_time.count(), 15)
        << "Channel strip serialization took " << serialization_time.count() << "μs, target <15μs";
}

TEST_F(MessagePackSerializationTest, DISABLED_RoundTripComplexMessage_HighPerformance) {
    // Full round-trip test with strict performance targets

    std::string json_equivalent = createJsonEquivalent(test_message);
    size_t json_size = json_equivalent.length();

    auto start = high_resolution_clock::now();

    // This will fail without implementation
    // auto serialized = MessagePackSerializer::serialize(test_message);
    // auto deserialized = MessagePackSerializer::deserialize<AudioMessage>(serialized);

    auto end = high_resolution_clock::now();
    auto total_time = duration_cast<microseconds>(end - start);

    // Performance assertions
    EXPECT_LT(total_time.count(), 40)
        << "Round-trip took " << total_time.count() << "μs, target <40μs";

    // Uncomment when implemented:
    // EXPECT_LT(serialized.size(), json_size * 0.4)
    //     << "Size reduction target not met";

    // EXPECT_EQ(test_message, deserialized)
    //     << "Round-trip data integrity failed";
}

TEST_F(MessagePackSerializationTest, DISABLED_BatchSerialization_3xTo4xFasterThanJSON) {
    // Batch performance test - should be 3-4x faster than JSON

    const int num_messages = 100;
    std::vector<AudioMessage> messages(num_messages, test_message);

    // Test JSON performance baseline
    auto start = high_resolution_clock::now();
    std::vector<std::string> json_strings;
    json_strings.reserve(num_messages);
    for (int i = 0; i < num_messages; ++i) {
        json_strings.push_back(createJsonEquivalent(messages[i]));
    }
    auto end = high_resolution_clock::now();
    auto json_time = duration_cast<microseconds>(end - start);

    // Test MessagePack performance (will fail without implementation)
    start = high_resolution_clock::now();
    // std::vector<std::vector<uint8_t>> msgpack_data;
    // msgpack_data.reserve(num_messages);
    // for (int i = 0; i < num_messages; ++i) {
    //     msgpack_data.push_back(MessagePackSerializer::serialize(messages[i]));
    // }
    end = high_resolution_clock::now();
    auto msgpack_time = duration_cast<microseconds>(end - start);

    // Should be 3-4x faster
    EXPECT_LT(msgpack_time.count(), json_time.count() / 3)
        << "MessagePack took " << msgpack_time.count() << "μs vs JSON "
        << json_time.count() << "μs, target 3-4x faster";

    // Size reduction verification
    size_t total_json_size = 0;
    for (const auto& str : json_strings) {
        total_json_size += str.length();
    }

    // Uncomment when implemented:
    // size_t total_msgpack_size = 0;
    // for (const auto& data : msgpack_data) {
    //     total_msgpack_size += data.size();
    // }
    //
    // EXPECT_LT(total_msgpack_size, total_json_size * 0.6)
    //     << "MessagePack size reduction target not met";
}

TEST_F(MessagePackSerializationTest, DISABLED_MemoryUsage_TargetLessThan100MB) {
    // Memory usage test for large-scale operations

    const int num_operations = 10000;
    auto initial_memory = 0; // Would use actual memory tracking in implementation

    // Perform many serializations
    for (int i = 0; i < num_operations; ++i) {
        // This will fail without implementation
        // auto serialized = MessagePackSerializer::serialize(test_message);
        // auto deserialized = MessagePackSerializer::deserialize<AudioMessage>(serialized);
    }

    auto final_memory = 0; // Would use actual memory tracking

    // Should use less than 100MB peak
    EXPECT_LT(final_memory - initial_memory, 100 * 1024 * 1024)
        << "Memory usage exceeded 100MB target";
}

// Stress test with maximum message size
TEST_F(MessagePackSerializationTest, DISABLED_MaximumMessageSizePerformance) {
    // Create largest possible message
    AudioMessage max_message = test_message;
    max_message.audio_buffer.resize(1024, 0.5f);  // Max buffer size

    // Add multiple channels with many parameters
    for (int ch = 0; ch < 8; ++ch) {
        ChannelStripState channel = test_channel_state;
        channel.channel_id = ch;
        channel.parameters.clear();

        // Add many parameters
        for (int p = 0; p < 32; ++p) {
            AudioParameter param = test_parameter;
            param.parameter_id = ch * 100 + p;
            param.name = "Param_" + std::to_string(p);
            channel.parameters.push_back(param);
        }
        max_message.channel_states.push_back(channel);
    }

    auto start = high_resolution_clock::now();

    // This will fail without implementation
    // auto serialized = MessagePackSerializer::serialize(max_message);
    // auto deserialized = MessagePackSerializer::deserialize<AudioMessage>(serialized);

    auto end = high_resolution_clock::now();
    auto total_time = duration_cast<microseconds>(end - start);

    // Even large messages should be fast
    EXPECT_LT(total_time.count(), 100)
        << "Large message round-trip took " << total_time.count() << "μs, target <100μs";

    // Should be under size limit
    // EXPECT_LT(serialized.size(), MAX_MESSAGE_SIZE_BYTES)
    //     << "Message exceeded maximum size limit";
}

// Performance regression test
TEST_F(MessagePackSerializationTest, DISABLED_PerformanceRegression_NoDegradation) {
    // Ensure performance doesn't degrade over time

    const int iterations = 1000;
    std::vector<microseconds> times;
    times.reserve(iterations);

    for (int i = 0; i < iterations; ++i) {
        auto start = high_resolution_clock::now();

        // This will fail without implementation
        // auto serialized = MessagePackSerializer::serialize(test_message);

        auto end = high_resolution_clock::now();
        times.push_back(duration_cast<microseconds>(end - start));
    }

    // Calculate statistics
    auto total = std::accumulate(times.begin(), times.end(), microseconds(0));
    auto average = total / iterations;

    // Find slowest 5% to detect outliers
    std::sort(times.begin(), times.end());
    auto p95_percentile = times[static_cast<size_t>(iterations * 0.95)];

    // Performance assertions
    EXPECT_LT(average.count(), 30)
        << "Average serialization time degraded to " << average.count() << "μs";
    EXPECT_LT(p95_percentile.count(), 50)
        << "95th percentile time degraded to " << p95_percentile.count() << "μs";
}