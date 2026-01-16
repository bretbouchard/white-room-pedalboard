#include <gtest/gtest.h>
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include <thread>
#include <chrono>
#include <atomic>
#include <memory>
#include "../src/protocol/MessageHandler.h"
#include "../src/backend/AudioEngine.h"
#include "../src/parameter/ParameterSync.h"

class MessageHandlerTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        audioEngine = std::make_unique<AudioEngine>();
        parameterSync = std::make_unique<ParameterSync>();
        messageHandler = std::make_unique<MessageHandler>();

        // Initialize components
        audioEngine->initialize();
        parameterSync->setAudioEngine(audioEngine.get());
        messageHandler->setParameterSync(parameterSync.get());
    }

    void TearDown() override
    {
        messageHandler.reset();
        parameterSync.reset();
        audioEngine.reset();
    }

    std::unique_ptr<AudioEngine> audioEngine;
    std::unique_ptr<ParameterSync> parameterSync;
    std::unique_ptr<MessageHandler> messageHandler;
};

// RED PHASE TESTS - These MUST FAIL initially

TEST_F(MessageHandlerTest, ProcessesAllMessageTypes)
{
    // Test processing all supported message types

    // Parameter update message
    juce::String paramMsg = R"({
        "type": "parameter_update",
        "paramId": "gain",
        "value": 0.75,
        "timestamp": 1234567890
    })";

    auto paramResult = messageHandler->processMessage(paramMsg);
    EXPECT_TRUE(paramResult.success);
    EXPECT_EQ(paramResult.responseType, "acknowledgment");

    // Audio state message
    juce::String audioMsg = R"({
        "type": "audio_state",
        "playing": true,
        "sampleRate": 44100.0,
        "bufferSize": 512,
        "timestamp": 1234567891
    })";

    auto audioResult = messageHandler->processMessage(audioMsg);
    EXPECT_TRUE(audioResult.success);
    EXPECT_EQ(audioResult.responseType, "audio_state_update");

    // Heartbeat message
    juce::String heartbeatMsg = R"({
        "type": "heartbeat",
        "timestamp": 1234567892
    })";

    auto heartbeatResult = messageHandler->processMessage(heartbeatMsg);
    EXPECT_TRUE(heartbeatResult.success);
    EXPECT_EQ(heartbeatResult.responseType, "pong");

    // Preset loading message
    juce::String presetMsg = R"({
        "type": "load_preset",
        "name": "test_preset",
        "timestamp": 1234567893
    })";

    auto presetResult = messageHandler->processMessage(presetMsg);
    EXPECT_TRUE(presetResult.success);
    EXPECT_EQ(presetResult.responseType, "preset_loaded");

    // Get parameters message
    juce::String getParamsMsg = R"({
        "type": "get_parameters",
        "timestamp": 1234567894
    })";

    auto getParamsResult = messageHandler->processMessage(getParamsMsg);
    EXPECT_TRUE(getParamsResult.success);
    EXPECT_EQ(getParamsResult.responseType, "parameter_list");
}

TEST_F(MessageHandlerTest, HandlesParameterUpdateMessages)
{
    // Test parameter update message handling
    juce::String message = R"({
        "type": "parameter_update",
        "paramId": "frequency",
        "value": 440.0,
        "rampTime": 0.0,
        "timestamp": 1234567890
    })";

    auto result = messageHandler->processMessage(message);

    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.responseType, "acknowledgment");

    // Verify parameter was actually updated in audio engine
    float currentValue = audioEngine->getParameter("frequency");
    EXPECT_FLOAT_EQ(currentValue, 440.0f);

    // Test parameter with ramping
    juce::String rampMessage = R"({
        "type": "parameter_update",
        "paramId": "volume",
        "value": 1.0,
        "rampTime": 100.0,
        "timestamp": 1234567891
    })";

    auto rampResult = messageHandler->processMessage(rampMessage);
    EXPECT_TRUE(rampResult.success);

    // Parameter should be ramping
    EXPECT_TRUE(parameterSync->isParameterRamping("volume"));
}

TEST_F(MessageHandlerTest, HandlesBatchParameterUpdates)
{
    // Test batch parameter update message handling
    juce::String batchMessage = R"({
        "type": "batch_parameter_update",
        "parameters": [
            {"paramId": "gain", "value": 0.5},
            {"paramId": "frequency", "value": 880.0},
            {"paramId": "volume", "value": 0.75},
            {"paramId": "pan", "value": -0.25}
        ],
        "timestamp": 1234567890
    })";

    auto result = messageHandler->processMessage(batchMessage);

    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.responseType, "batch_acknowledgment");

    // Verify all parameters were updated
    EXPECT_FLOAT_EQ(audioEngine->getParameter("gain"), 0.5f);
    EXPECT_FLOAT_EQ(audioEngine->getParameter("frequency"), 880.0f);
    EXPECT_FLOAT_EQ(audioEngine->getParameter("volume"), 0.75f);
    EXPECT_FLOAT_EQ(audioEngine->getParameter("pan"), -0.25f);
}

TEST_F(MessageHandlerTest, ProvidesErrorResponses)
{
    // Test error handling and error responses

    // Invalid JSON
    auto result1 = messageHandler->processMessage("invalid json");
    EXPECT_FALSE(result1.success);
    EXPECT_EQ(result1.responseType, "error");
    EXPECT_TRUE(result1.errorMessage.contains("Invalid JSON"));

    // Missing required fields
    juce::String incompleteMessage = R"({"type": "parameter_update"})";
    auto result2 = messageHandler->processMessage(incompleteMessage);
    EXPECT_FALSE(result2.success);
    EXPECT_EQ(result2.responseType, "error");
    EXPECT_TRUE(result2.errorMessage.contains("Missing required fields"));

    // Invalid parameter ID
    juce::String invalidParamMessage = R"({
        "type": "parameter_update",
        "paramId": "",
        "value": 0.5
    })";
    auto result3 = messageHandler->processMessage(invalidParamMessage);
    EXPECT_FALSE(result3.success);
    EXPECT_EQ(result3.responseType, "error");

    // Invalid parameter value
    juce::String invalidValueMessage = R"({
        "type": "parameter_update",
        "paramId": "gain",
        "value": "not_a_number"
    })";
    auto result4 = messageHandler->processMessage(invalidValueMessage);
    EXPECT_FALSE(result4.success);
    EXPECT_EQ(result4.responseType, "error");
}

TEST_F(MessageHandlerTest, ValidatesMessageStructure)
{
    // Test message structure validation
    juce::String validMessage = R"({
        "type": "parameter_update",
        "paramId": "test_param",
        "value": 0.5,
        "timestamp": 1234567890
    })";

    juce::String invalidMessage1 = R"({
        "paramId": "test_param",
        "value": 0.5
    })"; // Missing type

    juce::String invalidMessage2 = R"({
        "type": "parameter_update",
        "paramId": "test_param"
    })"; // Missing value

    juce::String invalidMessage3 = R"({
        "type": "unknown_type",
        "data": "test"
    })"; // Unknown message type

    EXPECT_TRUE(messageHandler->validateMessage(validMessage));
    EXPECT_FALSE(messageHandler->validateMessage(invalidMessage1));
    EXPECT_FALSE(messageHandler->validateMessage(invalidMessage2));
    EXPECT_FALSE(messageHandler->validateMessage(invalidMessage3));
}

TEST_F(MessageHandlerTest, MaintainsMessageQueue)
{
    // Test message queue functionality for processing order
    juce::String message1 = R"({"type":"parameter_update","paramId":"gain","value":0.1,"timestamp":1})";
    juce::String message2 = R"({"type":"parameter_update","paramId":"gain","value":0.2,"timestamp":2})";
    juce::String message3 = R"({"type":"parameter_update","paramId":"gain","value":0.3,"timestamp":3})";

    // Add messages to queue
    messageHandler->queueMessage(message1);
    messageHandler->queueMessage(message2);
    messageHandler->queueMessage(message3);

    // Process queue
    EXPECT_EQ(messageHandler->getQueueSize(), 3);
    EXPECT_TRUE(messageHandler->processQueuedMessages());
    EXPECT_EQ(messageHandler->getQueueSize(), 0);

    // Verify final parameter value (should be from last message)
    EXPECT_FLOAT_EQ(audioEngine->getParameter("gain"), 0.3f);
}

TEST_F(MessageHandlerTest, ProvidesMessageFiltering)
{
    // Test message filtering based on client permissions
    messageHandler->setClientPermissions("admin_client", {"*"}); // All permissions
    messageHandler->setClientPermissions("user_client", {"parameter_update", "get_parameters"});
    messageHandler->setClientPermissions("readonly_client", {"get_parameters"});

    juce::String paramMessage = R"({"type":"parameter_update","paramId":"gain","value":0.5})";
    juce::String getPresetMessage = R"({"type":"get_presets"})";

    // Admin client can do everything
    EXPECT_TRUE(messageHandler->canProcessMessage("admin_client", paramMessage));
    EXPECT_TRUE(messageHandler->canProcessMessage("admin_client", getPresetMessage));

    // User client can update parameters but not get presets
    EXPECT_TRUE(messageHandler->canProcessMessage("user_client", paramMessage));
    EXPECT_FALSE(messageHandler->canProcessMessage("user_client", getPresetMessage));

    // Read-only client can only get parameters
    EXPECT_FALSE(messageHandler->canProcessMessage("readonly_client", paramMessage));
    EXPECT_TRUE(messageHandler->canProcessMessage("readonly_client",
        R"({"type":"get_parameters"})"));
}

TEST_F(MessageHandlerTest, HandlesHighVolumeMessaging)
{
    // Test high-volume message processing
    std::atomic<int> successfulMessages{0};
    std::atomic<int> failedMessages{0};

    const int numMessages = 10000;

    // Process messages rapidly
    for (int i = 0; i < numMessages; ++i)
    {
        juce::String message = R"({
            "type": "parameter_update",
            "paramId": "test_param",
            "value": )" + juce::String(i / 10000.0f) + R"(,
            "timestamp": )" + juce::String(i) + R"(
        })";

        try {
            auto result = messageHandler->processMessage(message);
            if (result.success)
                successfulMessages++;
            else
                failedMessages++;
        } catch (...) {
            failedMessages++;
        }
    }

    // Most messages should succeed
    EXPECT_GT(successfulMessages.load(), numMessages * 0.95); // 95% success rate
    EXPECT_LT(failedMessages.load(), numMessages * 0.05);    // 5% failure rate
}

TEST_F(MessageHandlerTest, ProvidesMessageLogging)
{
    // Test message logging for debugging
    messageHandler->enableMessageLogging(true);

    juce::String testMessage = R"({
        "type": "parameter_update",
        "paramId": "logged_param",
        "value": 0.123
    })";

    auto result = messageHandler->processMessage(testMessage);
    EXPECT_TRUE(result.success);

    // Check if message was logged
    auto log = messageHandler->getMessageLog();
    EXPECT_GT(log.size(), 0);

    // Find our message in the log
    bool found = false;
    for (const auto& entry : log)
    {
        if (entry.message.contains("logged_param") &&
            entry.message.contains("0.123"))
        {
            found = true;
            EXPECT_EQ(entry.messageType, "parameter_update");
            EXPECT_TRUE(entry.success);
            break;
        }
    }
    EXPECT_TRUE(found);

    messageHandler->enableMessageLogging(false);
}

TEST_F(MessageHandlerTest, MaintainsThreadSafety)
{
    // Test thread safety of message processing
    std::atomic<int> successfulOperations{0};
    std::vector<std::thread> threads;

    for (int i = 0; i < 20; ++i)
    {
        threads.emplace_back([&, i]() {
            for (int j = 0; j < 100; ++j)
            {
                juce::String message = R"({
                    "type": "parameter_update",
                    "paramId": "thread_param_)" + juce::String(i) + R"(",
                    "value": )" + juce::String(j * 0.01f) + R"(,
                    "timestamp": )" + juce::String(i * 1000 + j) + R"(
                })";

                try {
                    auto result = messageHandler->processMessage(message);
                    if (result.success)
                        successfulOperations++;
                } catch (...) {
                    // Should not happen with proper thread safety
                }
            }
        });
    }

    for (auto& thread : threads)
    {
        thread.join();
    }

    EXPECT_EQ(successfulOperations.load(), 2000); // All operations should succeed
}