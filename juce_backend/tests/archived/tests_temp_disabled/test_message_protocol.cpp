#include <gtest/gtest.h>
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include "../src/protocol/MessageProtocol.h"

class MessageProtocolTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        protocol = std::make_unique<MessageProtocol>();
    }

    void TearDown() override
    {
        protocol.reset();
    }

    std::unique_ptr<MessageProtocol> protocol;
};

// RED PHASE TESTS - These MUST FAIL initially

TEST_F(MessageProtocolTest, SerializesParametersCorrectly)
{
    // Test parameter serialization to JSON
    auto message = protocol->createParameterUpdateMessage("gain", 0.75f);

    // This will fail until we implement MessageProtocol
    EXPECT_FALSE(message.isEmpty());
    EXPECT_TRUE(message.contains("\"type\":\"parameter_update\""));
    EXPECT_TRUE(message.contains("\"paramId\":\"gain\""));
    EXPECT_TRUE(message.contains("\"value\":0.75"));
}

TEST_F(MessageProtocolTest, DeserializesMessagesCorrectly)
{
    // Test message deserialization from JSON
    juce::String jsonMessage = R"({
        "type": "parameter_update",
        "paramId": "frequency",
        "value": 440.0,
        "timestamp": 1234567890
    })";

    auto parsedMessage = protocol->parseMessage(jsonMessage);

    // This will fail until we implement message parsing
    EXPECT_FALSE(parsedMessage.isEmpty());
    EXPECT_EQ(parsedMessage["type"], "parameter_update");
    EXPECT_EQ(parsedMessage["paramId"], "frequency");
    EXPECT_FLOAT_EQ(parsedMessage["value"].getDoubleValue(), 440.0);
}

TEST_F(MessageProtocolTest, HandlesAllMessageTypes)
{
    // Test all supported message types

    // Parameter update message
    auto paramMsg = protocol->createParameterUpdateMessage("volume", 0.5f);
    EXPECT_FALSE(paramMsg.isEmpty());

    // Audio state message
    auto audioMsg = protocol->createAudioStateMessage(true, 44100.0, 512);
    EXPECT_FALSE(audioMsg.isEmpty());

    // Heartbeat message
    auto heartbeatMsg = protocol->createHeartbeatMessage();
    EXPECT_FALSE(heartbeatMsg.isEmpty());

    // Error message
    auto errorMsg = protocol->createErrorMessage("Test error", 400);
    EXPECT_FALSE(errorMsg.isEmpty());

    // Connection status message
    auto connectMsg = protocol->createConnectionStatusMessage("connected", 1);
    EXPECT_FALSE(connectMsg.isEmpty());
}

TEST_F(MessageProtocolTest, ValidatesMessageStructure)
{
    // Test message validation
    juce::String validMessage = R"({
        "type": "parameter_update",
        "paramId": "gain",
        "value": 0.5,
        "timestamp": 1234567890
    })";

    juce::String invalidMessage = R"({
        "paramId": "gain",
        "value": 0.5
    })";

    // This will fail until we implement message validation
    EXPECT_TRUE(protocol->validateMessage(validMessage));
    EXPECT_FALSE(protocol->validateMessage(invalidMessage));
}

TEST_F(MessageProtocolTest, HandlesTimestamps)
{
    // Test timestamp handling
    auto message = protocol->createParameterUpdateMessage("test", 1.0f);

    auto parsedMessage = protocol->parseMessage(message);

    // This will fail until we implement timestamp handling
    EXPECT_TRUE(parsedMessage.hasProperty("timestamp"));
    EXPECT_GT(parsedMessage["timestamp"].getInt64Value(), 0);
}

TEST_F(MessageProtocolTest, SupportsBatchOperations)
{
    // Test batch message operations
    juce::Array<juce::String> paramIds = {"gain", "frequency", "volume"};
    juce::Array<float> values = {0.5f, 440.0f, 0.75f};

    auto batchMessage = protocol->createBatchParameterUpdateMessage(paramIds, values);

    // This will fail until we implement batch operations
    EXPECT_FALSE(batchMessage.isEmpty());
    EXPECT_TRUE(batchMessage.contains("\"type\":\"batch_parameter_update\""));

    auto parsedMessage = protocol->parseMessage(batchMessage);
    auto parameters = parsedMessage["parameters"];

    // This will fail until we implement batch parsing
    EXPECT_EQ(parameters.size(), paramIds.size());
}

TEST_F(MessageProtocolTest, HandlesErrorConditions)
{
    // Test error handling in message processing

    // Invalid JSON
    auto result1 = protocol->parseMessage("invalid json");
    EXPECT_TRUE(result1.isEmpty());

    // Missing required fields
    juce::String incompleteMessage = R"({"type": "parameter_update"})";
    auto result2 = protocol->parseMessage(incompleteMessage);
    EXPECT_TRUE(result2.isEmpty());

    // Invalid parameter values
    juce::String invalidParamMessage = R"({
        "type": "parameter_update",
        "paramId": "gain",
        "value": "not_a_number"
    })";
    auto result3 = protocol->parseMessage(invalidParamMessage);
    EXPECT_TRUE(result3.isEmpty());
}

TEST_F(MessageProtocolTest, ProvidesMessageTypeDetection)
{
    // Test message type detection
    juce::String paramMessage = protocol->createParameterUpdateMessage("test", 0.5f);
    juce::String audioMessage = protocol->createAudioStateMessage(true, 44100.0, 512);
    juce::String errorMessage = protocol->createErrorMessage("test", 500);

    // This will fail until we implement type detection
    EXPECT_EQ(protocol->getMessageType(paramMessage), "parameter_update");
    EXPECT_EQ(protocol->getMessageType(audioMessage), "audio_state");
    EXPECT_EQ(protocol->getMessageType(errorMessage), "error");
}

TEST_F(MessageProtocolTest, SupportsCompression)
{
    // Test message compression for large messages
    juce::Array<juce::String> largeParamList;
    juce::Array<float> largeValueList;

    // Create a large parameter set
    for (int i = 0; i < 1000; ++i)
    {
        largeParamList.add("param_" + juce::String(i));
        largeValueList.add(i * 0.001f);
    }

    auto largeMessage = protocol->createBatchParameterUpdateMessage(largeParamList, largeValueList);

    // Test compression (if implemented)
    auto compressedMessage = protocol->compressMessage(largeMessage);
    EXPECT_FALSE(compressedMessage.isEmpty());

    auto decompressedMessage = protocol->decompressMessage(compressedMessage);
    EXPECT_EQ(largeMessage, decompressedMessage);
}

TEST_F(MessageProtocolTest, MaintainsThreadSafety)
{
    // Test thread safety of message protocol operations
    std::atomic<int> successfulOperations{0};
    std::vector<std::thread> threads;

    for (int i = 0; i < 10; ++i)
    {
        threads.emplace_back([&, i]() {
            for (int j = 0; j < 100; ++j)
            {
                auto message = protocol->createParameterUpdateMessage(
                    "param_" + juce::String(i),
                    static_cast<float>(j) / 100.0f
                );

                if (!message.isEmpty())
                {
                    successfulOperations++;
                }
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }

    EXPECT_EQ(successfulOperations.load(), 1000); // All operations should succeed
}