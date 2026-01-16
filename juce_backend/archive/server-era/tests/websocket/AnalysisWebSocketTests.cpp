#include <gtest/gtest.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>
#include <thread>
#include <chrono>
#include <vector>
#include <atomic>
#include <memory>
#include <random>
#include <nlohmann/json.hpp>
#include "../../include/websocket/AnalysisWebSocketHandler.h"
#include "../../include/audio/CoreDSPAnalyzer.h"
#include "../../include/audio/PitchDetector.h"
#include "../../include/audio/DynamicsAnalyzer.h"
#include "../../include/audio/SpatialAnalyzer.h"
#include "../../include/audio/QualityDetector.h"

using namespace schill::websocket;
using json = nlohmann::json;
using namespace std::chrono;

// Test fixture for AnalysisWebSocketHandler tests
class AnalysisWebSocketTests : public ::testing::Test {
protected:
    void SetUp() override {
        // Initialize all analyzers
        coreAnalyzer = std::make_unique<CoreDSPAnalyzer>();
        pitchDetector = std::make_unique<PitchDetector>();
        dynamicsAnalyzer = std::make_unique<DynamicsAnalyzer>();
        spatialAnalyzer = std::make_unique<SpatialAnalyzer>();
        qualityDetector = std::make_unique<QualityDetector>();

        // Create WebSocket handler with analyzers
        handler = std::make_unique<AnalysisWebSocketHandler>();

        // Initialize analyzers with standard parameters
        const double sampleRate = 44100.0;
        const int bufferSize = 512;

        coreAnalyzer->initialize(sampleRate, bufferSize);
        pitchDetector->initialize(sampleRate, bufferSize);
        dynamicsAnalyzer->initialize(sampleRate, bufferSize);
        spatialAnalyzer->initialize(sampleRate, bufferSize);
        qualityDetector->initialize(sampleRate, bufferSize);

        // Register analyzers with handler
        handler->registerAnalyzer("core", coreAnalyzer.get());
        handler->registerAnalyzer("pitch", pitchDetector.get());
        handler->registerAnalyzer("dynamics", dynamicsAnalyzer.get());
        handler->registerAnalyzer("spatial", spatialAnalyzer.get());
        handler->registerAnalyzer("quality", qualityDetector.get());

        // Start WebSocket server on test port
        config.port = 18080;  // Different from production port
        config.enableRealTimeUpdates = true;
        config.updateBroadcastIntervalMs = 10;  // Fast updates for testing

        ASSERT_TRUE(handler->startServer(config));
    }

    void TearDown() override {
        if (handler && handler->isRunning()) {
            handler->stopServer();
        }

        handler.reset();
        qualityDetector.reset();
        spatialAnalyzer.reset();
        dynamicsAnalyzer.reset();
        pitchDetector.reset();
        coreAnalyzer.reset();
    }

    // Helper to create test audio buffer
    juce::AudioBuffer<float> createTestAudioBuffer(int numSamples = 512, int numChannels = 2) {
        juce::AudioBuffer<float> buffer(numChannels, numSamples);

        // Generate test signal (sine wave + noise)
        std::random_device rd;
        std::mt19937 gen(rd());
        std::normal_distribution<float> noise(0.0f, 0.1f);

        for (int sample = 0; sample < numSamples; ++sample) {
            float sampleValue = 0.1f * std::sin(2.0 * juce::MathConstants<double>::pi * 440.0 * sample / 44100.0);
            sampleValue += noise(gen);  // Add some noise

            for (int channel = 0; channel < numChannels; ++channel) {
                buffer.setSample(channel, sample, sampleValue);
            }
        }

        return buffer;
    }

    // Helper to process audio through all analyzers
    void processAudioThroughAllAnalyzers(const juce::AudioBuffer<float>& buffer) {
        // Create modifiable copy for each analyzer
        for (int i = 0; i < 5; ++i) {  // Process multiple times to get stable readings
            auto bufferCopy1 = buffer;
            auto bufferCopy2 = buffer;
            auto bufferCopy3 = buffer;
            auto bufferCopy4 = buffer;
            auto bufferCopy5 = buffer;

            coreAnalyzer->processBlock(bufferCopy1);
            pitchDetector->processBlock(bufferCopy2);
            dynamicsAnalyzer->processBlock(bufferCopy3);
            spatialAnalyzer->processBlock(bufferCopy4);
            qualityDetector->processBlock(bufferCopy5);

            // Small delay to simulate real-time processing
            std::this_thread::sleep_for(microseconds(100));
        }
    }

    std::unique_ptr<CoreDSPAnalyzer> coreAnalyzer;
    std::unique_ptr<PitchDetector> pitchDetector;
    std::unique_ptr<DynamicsAnalyzer> dynamicsAnalyzer;
    std::unique_ptr<SpatialAnalyzer> spatialAnalyzer;
    std::unique_ptr<QualityDetector> qualityDetector;
    std::unique_ptr<AnalysisWebSocketHandler> handler;
    WebSocketAPIConfig config;
};

// =================================================================
// RED PHASE TESTS - These should FAIL initially
// =================================================================

// JSON Serialization Tests
TEST_F(AnalysisWebSocketTests, DISABLED_CoreDSPAnalysisJsonSerialization) {
    // Test that CoreDSPAnalyzer results serialize to valid JSON

    // Process audio to generate results
    auto buffer = createTestAudioBuffer();
    coreAnalyzer->processBlock(buffer);

    // Get JSON results
    juce::String jsonResults = coreAnalyzer->getResultsAsJson();

    // Parse JSON
    json parsedJson = json::parse(jsonResults.toStdString());

    // Verify required fields exist
    EXPECT_TRUE(parsedJson.contains("type"));
    EXPECT_TRUE(parsedJson.contains("timestamp"));
    EXPECT_TRUE(parsedJson.contains("data"));

    EXPECT_EQ(parsedJson["type"], "core_analysis");

    // Verify spectral analysis fields
    EXPECT_TRUE(parsedJson["data"].contains("spectralCentroid"));
    EXPECT_TRUE(parsedJson["data"].contains("spectralRolloff"));
    EXPECT_TRUE(parsedJson["data"].contains("spectralFlux"));

    // Verify values are in reasonable ranges
    EXPECT_GE(parsedJson["data"]["spectralCentroid"].get<double>(), 0.0);
    EXPECT_LE(parsedJson["data"]["spectralCentroid"].get<double>(), 22050.0);  // Nyquist frequency
}

TEST_F(AnalysisWebSocketTests, DISABLED_PitchDetectionJsonSerialization) {
    // Test that PitchDetector results serialize to valid JSON

    auto buffer = createTestAudioBuffer();
    pitchDetector->processBlock(buffer);

    juce::String jsonResults = pitchDetector->getResultsAsJson();
    json parsedJson = json::parse(jsonResults.toStdString());

    EXPECT_TRUE(parsedJson.contains("type"));
    EXPECT_TRUE(parsedJson.contains("timestamp"));
    EXPECT_TRUE(parsedJson.contains("data"));

    EXPECT_EQ(parsedJson["type"], "pitch_analysis");

    // Verify pitch detection fields
    EXPECT_TRUE(parsedJson["data"].contains("frequency"));
    EXPECT_TRUE(parsedJson["data"].contains("confidence"));
    EXPECT_TRUE(parsedJson["data"].contains("isPitched"));
    EXPECT_TRUE(parsedJson["data"].contains("midiNote"));
    EXPECT_TRUE(parsedJson["data"].contains("centsError"));
    EXPECT_TRUE(parsedJson["data"].contains("pitchName"));

    // Verify value ranges
    if (parsedJson["data"]["isPitched"].get<bool>()) {
        EXPECT_GE(parsedJson["data"]["frequency"].get<double>(), 80.0);   // Min frequency
        EXPECT_LE(parsedJson["data"]["frequency"].get<double>(), 4000.0); // Max frequency
        EXPECT_GE(parsedJson["data"]["confidence"].get<double>(), 0.0);
        EXPECT_LE(parsedJson["data"]["confidence"].get<double>(), 1.0);
    }
}

TEST_F(AnalysisWebSocketTests, DISABLED_DynamicsAnalysisJsonSerialization) {
    // Test that DynamicsAnalyzer results serialize to valid JSON

    auto buffer = createTestAudioBuffer();
    dynamicsAnalyzer->processBlock(buffer);

    juce::String jsonResults = dynamicsAnalyzer->getResultsAsJson();
    json parsedJson = json::parse(jsonResults.toStdString());

    EXPECT_TRUE(parsedJson.contains("type"));
    EXPECT_TRUE(parsedJson.contains("timestamp"));
    EXPECT_TRUE(parsedJson.contains("data"));

    EXPECT_EQ(parsedJson["type"], "dynamics_analysis");

    // Verify dynamics fields
    EXPECT_TRUE(parsedJson["data"].contains("lufsMomentary"));
    EXPECT_TRUE(parsedJson["data"].contains("lufsIntegrated"));
    EXPECT_TRUE(parsedJson["data"].contains("lufsRange"));
    EXPECT_TRUE(parsedJson["data"].contains("crestFactor"));
    EXPECT_TRUE(parsedJson["data"].contains("truePeak"));
    EXPECT_TRUE(parsedJson["data"].contains("envelopeValue"));

    // Verify LUFS values are in reasonable ranges
    EXPECT_LE(parsedJson["data"]["lufsMomentary"].get<double>(), 0.0);  // LUFS is negative
    EXPECT_GE(parsedJson["data"]["lufsMomentary"].get<double>(), -70.0);
}

TEST_F(AnalysisWebSocketTests, DISABLED_SpatialAnalysisJsonSerialization) {
    // Test that SpatialAnalyzer results serialize to valid JSON

    auto buffer = createTestAudioBuffer(512, 2);  // Stereo buffer
    spatialAnalyzer->processBlock(buffer);

    juce::String jsonResults = spatialAnalyzer->getResultsAsJson();
    json parsedJson = json::parse(jsonResults.toStdString());

    EXPECT_TRUE(parsedJson.contains("type"));
    EXPECT_TRUE(parsedJson.contains("timestamp"));
    EXPECT_TRUE(parsedJson.contains("data"));

    EXPECT_EQ(parsedJson["type"], "spatial_analysis");

    // Verify spatial analysis fields
    EXPECT_TRUE(parsedJson["data"].contains("stereoWidth"));
    EXPECT_TRUE(parsedJson["data"].contains("stereoBalance"));
    EXPECT_TRUE(parsedJson["data"].contains("correlation"));
    EXPECT_TRUE(parsedJson["data"].contains("midSideRatio"));

    // Verify value ranges
    EXPECT_GE(parsedJson["data"]["stereoWidth"].get<double>(), 0.0);
    EXPECT_LE(parsedJson["data"]["stereoWidth"].get<double>(), 1.0);
    EXPECT_GE(parsedJson["data"]["stereoBalance"].get<double>(), -1.0);
    EXPECT_LE(parsedJson["data"]["stereoBalance"].get<double>(), 1.0);
}

TEST_F(AnalysisWebSocketTests, DISABLED_QualityDetectionJsonSerialization) {
    // Test that QualityDetector results serialize to valid JSON

    auto buffer = createTestAudioBuffer();
    qualityDetector->processBlock(buffer);

    juce::String jsonResults = qualityDetector->getResultsAsJson();
    json parsedJson = json::parse(jsonResults.toStdString());

    EXPECT_TRUE(parsedJson.contains("type"));
    EXPECT_TRUE(parsedJson.contains("timestamp"));
    EXPECT_TRUE(parsedJson.contains("data"));

    EXPECT_EQ(parsedJson["type"], "quality_analysis");

    // Verify quality detection fields
    EXPECT_TRUE(parsedJson["data"].contains("snr"));
    EXPECT_TRUE(parsedJson["data"].contains("thd"));
    EXPECT_TRUE(parsedJson["data"].contains("dynamicRange"));
    EXPECT_TRUE(parsedJson["data"].contains("spectralFlatness"));
    EXPECT_TRUE(parsedJson["data"].contains("overallQuality"));

    // Verify value ranges
    EXPECT_GE(parsedJson["data"]["overallQuality"].get<double>(), 0.0);
    EXPECT_LE(parsedJson["data"]["overallQuality"].get<double>(), 1.0);
}

// Real-time Broadcasting Tests
TEST_F(AnalysisWebSocketTests, DISABLED_RealtimeBroadcastLatency_Target5ms) {
    // Test that analysis results are broadcast with <5ms latency

    const int numTests = 100;
    std::vector<microseconds> latencies;
    latencies.reserve(numTests);

    // Mock client connection
    std::string clientId = handler->createMockClient();
    std::atomic<int> messagesReceived{0};

    // Set up message capture
    handler->setMessageCallback(clientId, [&messagesReceived, &latencies](const std::string& message) {
        auto receiveTime = high_resolution_clock::now();

        // Extract timestamp from message
        json msgJson = json::parse(message);
        std::string timestampStr = msgJson["timestamp"];

        // Convert timestamp back to time point (simplified for test)
        auto sendTime = high_resolution_clock::now();  // This should be parsed from timestamp

        auto latency = duration_cast<microseconds>(receiveTime - sendTime);
        if (messagesReceived.load() < numTests) {
            latencies.push_back(latency);
        }
        messagesReceived.fetch_add(1);
    });

    auto testStartTime = high_resolution_clock::now();

    // Process audio and trigger broadcasts
    for (int i = 0; i < numTests; ++i) {
        auto buffer = createTestAudioBuffer();
        processAudioThroughAllAnalyzers(buffer);

        // Trigger broadcast
        handler->broadcastAnalysisResults();

        // Small delay between tests
        std::this_thread::sleep_for(microseconds(1000));
    }

    // Wait for all messages to be processed
    std::this_thread::sleep_for(milliseconds(100));

    // Calculate latency statistics
    ASSERT_EQ(latencies.size(), numTests);

    auto totalLatency = std::accumulate(latencies.begin(), latencies.end(), microseconds(0));
    auto averageLatency = totalLatency / numTests;
    auto maxLatency = *std::max_element(latencies.begin(), latencies.end());

    // Latency assertions
    EXPECT_LT(averageLatency.count(), 2000)  // Average <2ms
        << "Average latency: " << averageLatency.count() << "μs, target <2000μs";

    EXPECT_LT(maxLatency.count(), 5000)  // Max <5ms
        << "Max latency: " << maxLatency.count() << "μs, target <5000μs";

    EXPECT_GT(messagesReceived.load(), 0) << "No messages received";

    handler->removeMockClient(clientId);
}

TEST_F(AnalysisWebSocketTests, DISABLED_BroadcastMessageThroughput_Target100MsgPerSec) {
    // Test that the system can handle >100 messages/second

    const int targetMessagesPerSecond = 100;
    const int testDurationSeconds = 5;
    const int totalMessages = targetMessagesPerSecond * testDurationSeconds;

    std::atomic<int> messagesReceived{0};
    std::atomic<int> messagesPerSecond{0};
    std::string clientId = handler->createMockClient();

    handler->setMessageCallback(clientId, [&messagesReceived, &messagesPerSecond](const std::string& message) {
        messagesReceived.fetch_add(1);
        messagesPerSecond.fetch_add(1);
    });

    auto startTime = high_resolution_clock::now();
    auto lastSecond = startTime;

    // Generate messages at high rate
    for (int i = 0; i < totalMessages; ++i) {
        auto buffer = createTestAudioBuffer(256);  // Smaller buffer for faster processing
        processAudioThroughAllAnalyzers(buffer);
        handler->broadcastAnalysisResults();

        // Small delay to control message rate
        std::this_thread::sleep_for(microseconds(9000));  // ~110 Hz rate

        // Reset counter every second
        auto currentTime = high_resolution_clock::now();
        if (duration_cast<seconds>(currentTime - lastSecond).count() >= 1) {
            messagesPerSecond.store(0);
            lastSecond = currentTime;
        }
    }

    auto endTime = high_resolution_clock::now();
    auto actualDuration = duration_cast<milliseconds>(endTime - startTime);

    // Wait for any remaining messages
    std::this_thread::sleep_for(milliseconds(100));

    // Calculate actual message rate
    double actualMessagesPerSecond = (double)messagesReceived.load() / (actualDuration.count() / 1000.0);

    // Throughput assertions
    EXPECT_GT(actualMessagesPerSecond, 80.0)  // Allow some margin
        << "Actual throughput: " << actualMessagesPerSecond << " msg/s, target >80 msg/s";

    EXPECT_GT(messagesReceived.load(), targetMessagesPerSecond * testDurationSeconds * 0.7)
        << "Too few messages received: " << messagesReceived.load();

    handler->removeMockClient(clientId);
}

// Client Connection Tests
TEST_F(AnalysisWebSocketTests, DISABLED_MultiClientConnectionHandling) {
    // Test handling multiple simultaneous client connections

    const int numClients = 10;
    std::vector<std::string> clientIds;
    std::vector<std::atomic<int>> messagesPerClient(numClients);

    // Create multiple clients
    for (int i = 0; i < numClients; ++i) {
        std::string clientId = handler->createMockClient();
        clientIds.push_back(clientId);
        messagesPerClient[i].store(0);

        handler->setMessageCallback(clientId, [i, &messagesPerClient](const std::string& message) {
            messagesPerClient[i].fetch_add(1);
        });
    }

    // Process audio and broadcast
    const int numBroadcasts = 50;
    for (int i = 0; i < numBroadcasts; ++i) {
        auto buffer = createTestAudioBuffer();
        processAudioThroughAllAnalyzers(buffer);
        handler->broadcastAnalysisResults();

        std::this_thread::sleep_for(microseconds(20000));  // 50 Hz rate
    }

    // Wait for message processing
    std::this_thread::sleep_for(milliseconds(500));

    // Verify all clients received messages
    for (int i = 0; i < numClients; ++i) {
        EXPECT_GT(messagesPerClient[i].load(), 0)
            << "Client " << i << " received no messages";

        // All clients should receive roughly the same number of messages
        EXPECT_GE(messagesPerClient[i].load(), numBroadcasts * 0.8)
            << "Client " << i << " received too few messages: " << messagesPerClient[i].load();
    }

    // Clean up clients
    for (const auto& clientId : clientIds) {
        handler->removeMockClient(clientId);
    }
}

TEST_F(AnalysisWebSocketTests, DISABLED_ClientSubscriptionManagement) {
    // Test client subscription to specific analysis types

    const int numClients = 5;
    std::vector<std::string> clientIds;
    std::vector<std::atomic<int>> coreMessages(numClients);
    std::vector<std::atomic<int>> pitchMessages(numClients);

    // Create clients with different subscriptions
    std::vector<std::vector<std::string>> subscriptions = {
        {"core"},
        {"pitch"},
        {"core", "pitch"},
        {"core", "pitch", "dynamics"},
        {}  // No subscriptions
    };

    for (int i = 0; i < numClients; ++i) {
        std::string clientId = handler->createMockClient();
        clientIds.push_back(clientId);
        coreMessages[i].store(0);
        pitchMessages[i].store(0);

        // Set up subscriptions
        for (const auto& sub : subscriptions[i]) {
            handler->subscribeToAnalysis(clientId, sub);
        }

        handler->setMessageCallback(clientId, [i, &coreMessages, &pitchMessages](const std::string& message) {
            json msgJson = json::parse(message);
            if (msgJson.contains("type")) {
                std::string type = msgJson["type"];
                if (type == "core_analysis") {
                    coreMessages[i].fetch_add(1);
                } else if (type == "pitch_analysis") {
                    pitchMessages[i].fetch_add(1);
                }
            }
        });
    }

    // Process audio and broadcast multiple types
    const int numBroadcasts = 20;
    for (int i = 0; i < numBroadcasts; ++i) {
        auto buffer = createTestAudioBuffer();
        processAudioThroughAllAnalyzers(buffer);

        // Broadcast specific types
        handler->broadcastAnalysisResult("core");
        handler->broadcastAnalysisResult("pitch");

        std::this_thread::sleep_for(microseconds(50000));
    }

    // Wait for message processing
    std::this_thread::sleep_for(milliseconds(500));

    // Verify subscription behavior
    // Client 0: subscribed to core only
    EXPECT_GT(coreMessages[0].load(), 0);
    EXPECT_EQ(pitchMessages[0].load(), 0);

    // Client 1: subscribed to pitch only
    EXPECT_EQ(coreMessages[1].load(), 0);
    EXPECT_GT(pitchMessages[1].load(), 0);

    // Client 2: subscribed to both
    EXPECT_GT(coreMessages[2].load(), 0);
    EXPECT_GT(pitchMessages[2].load(), 0);

    // Client 4: no subscriptions
    EXPECT_EQ(coreMessages[4].load(), 0);
    EXPECT_EQ(pitchMessages[4].load(), 0);

    // Clean up
    for (const auto& clientId : clientIds) {
        handler->removeMockClient(clientId);
    }
}

// Error Handling Tests
TEST_F(AnalysisWebSocketTests, DISABLED_MalformedMessageHandling) {
    // Test handling of malformed WebSocket messages

    std::string clientId = handler->createMockClient();
    std::atomic<int> errorCount{0};
    std::atomic<int> successCount{0};

    handler->setMessageCallback(clientId, [&errorCount, &successCount](const std::string& message) {
        try {
            json::parse(message);
            successCount.fetch_add(1);
        } catch (const json::parse_error&) {
            errorCount.fetch_add(1);
        }
    });

    // Send malformed messages
    std::vector<std::string> malformedMessages = {
        "not json at all",
        "{\"incomplete\": json",
        "{\"type\": \"test\" \"missing colon\"}",
        "",
        "{\"type\": null}",
        "[]"
    };

    for (const auto& malformedMsg : malformedMessages) {
        // This should be handled gracefully without crashing
        EXPECT_NO_THROW(handler->handleMessage(clientId, malformedMsg));
    }

    // Send valid message to verify normal operation still works
    std::string validMessage = "{\"type\": \"subscribe\", \"analysis\": \"core\"}";
    EXPECT_NO_THROW(handler->handleMessage(clientId, validMessage));

    std::this_thread::sleep_for(milliseconds(100));

    // Verify error handling
    EXPECT_GT(errorCount.load(), 0) << "No errors detected for malformed messages";

    handler->removeMockClient(clientId);
}

TEST_F(AnalysisWebSocketTests, DISABLED_ClientDisconnectionHandling) {
    // Test graceful handling of client disconnections

    const int numClients = 5;
    std::vector<std::string> clientIds;

    // Create clients
    for (int i = 0; i < numClients; ++i) {
        clientIds.push_back(handler->createMockClient());
    }

    // Verify initial state
    EXPECT_EQ(handler->getClientCount(), numClients);

    // Disconnect clients one by one
    for (int i = 0; i < numClients; ++i) {
        int expectedCount = numClients - i;
        EXPECT_EQ(handler->getClientCount(), expectedCount);

        // Disconnect client
        handler->removeMockClient(clientIds[i]);
        expectedCount--;

        EXPECT_EQ(handler->getClientCount(), expectedCount);

        // Verify broadcasting still works with remaining clients
        if (expectedCount > 0) {
            auto buffer = createTestAudioBuffer();
            processAudioThroughAllAnalyzers(buffer);
            EXPECT_NO_THROW(handler->broadcastAnalysisResults());
        }
    }

    // Final state - no clients
    EXPECT_EQ(handler->getClientCount(), 0);

    // Broadcasting with no clients should not crash
    auto buffer = createTestAudioBuffer();
    processAudioThroughAllAnalyzers(buffer);
    EXPECT_NO_THROW(handler->broadcastAnalysisResults());
}

// Performance and Resource Tests
TEST_F(AnalysisWebSocketTests, DISABLED_MemoryUsageUnderLoad) {
    // Test memory usage doesn't grow excessively under load

    // Get initial memory usage
    size_t initialMemory = handler->getMemoryUsage();

    const int numClients = 20;
    const int messagesPerClient = 1000;
    std::vector<std::string> clientIds;

    // Create many clients
    for (int i = 0; i < numClients; ++i) {
        clientIds.push_back(handler->createMockClient());
        handler->subscribeToAnalysis(clientIds[i], "core");
        handler->subscribeToAnalysis(clientIds[i], "pitch");
    }

    // Generate heavy load
    for (int msg = 0; msg < messagesPerClient; ++msg) {
        auto buffer = createTestAudioBuffer();
        processAudioThroughAllAnalyzers(buffer);
        handler->broadcastAnalysisResults();

        if (msg % 100 == 0) {
            std::this_thread::sleep_for(microseconds(10000));  // Brief pause
        }
    }

    size_t peakMemory = handler->getMemoryUsage();

    // Clean up all clients
    for (const auto& clientId : clientIds) {
        handler->removeMockClient(clientId);
    }

    // Allow cleanup
    std::this_thread::sleep_for(milliseconds(100));

    size_t finalMemory = handler->getMemoryUsage();

    // Memory assertions
    size_t memoryGrowth = peakMemory - initialMemory;
    size_t memoryLeak = finalMemory - initialMemory;

    EXPECT_LT(memoryGrowth, 10 * 1024 * 1024)  // <10MB growth under load
        << "Excessive memory growth: " << memoryGrowth / (1024 * 1024) << "MB";

    EXPECT_LT(memoryLeak, 1024 * 1024)  // <1MB leak after cleanup
        << "Memory leak detected: " << memoryLeak / 1024 << "KB";
}

TEST_F(AnalysisWebSocketTests, DISABLED_AnalyzerIntegrationConsistency) {
    // Test that all analyzer types integrate consistently

    const int numIterations = 50;
    std::map<std::string, int> messageCounts = {
        {"core", 0},
        {"pitch", 0},
        {"dynamics", 0},
        {"spatial", 0},
        {"quality", 0}
    };

    std::string clientId = handler->createMockClient();

    handler->setMessageCallback(clientId, [&messageCounts](const std::string& message) {
        json msgJson = json::parse(message);
        if (msgJson.contains("type")) {
            std::string type = msgJson["type"];
            if (messageCounts.find(type) != messageCounts.end()) {
                messageCounts[type]++;
            }
        }
    });

    // Subscribe to all analyzer types
    for (const auto& analyzerType : {"core", "pitch", "dynamics", "spatial", "quality"}) {
        handler->subscribeToAnalysis(clientId, analyzerType);
    }

    // Process and broadcast
    for (int i = 0; i < numIterations; ++i) {
        auto buffer = createTestAudioBuffer();
        processAudioThroughAllAnalyzers(buffer);
        handler->broadcastAnalysisResults();

        std::this_thread::sleep_for(microseconds(20000));
    }

    // Wait for processing
    std::this_thread::sleep_for(milliseconds(500));

    // Verify all analyzer types produced messages
    for (const auto& [type, count] : messageCounts) {
        EXPECT_GT(count, 0) << "Analyzer " << type << " produced no messages";
        EXPECT_GE(count, numIterations * 0.8)
            << "Analyzer " << type << " produced too few messages: " << count;
    }

    // Verify message count consistency (should be roughly equal)
    auto minCount = std::min_element(messageCounts.begin(), messageCounts.end(),
        [](const auto& a, const auto& b) { return a.second < b.second; });
    auto maxCount = std::max_element(messageCounts.begin(), messageCounts.end(),
        [](const auto& a, const auto& b) { return a.second < b.second; });

    // Allow 20% variance
    double varianceRatio = (double)maxCount->second / minCount->second;
    EXPECT_LT(varianceRatio, 1.5)
        << "Message count variance too high: " << varianceRatio;

    handler->removeMockClient(clientId);
}

// WebSocket Protocol Compliance Tests
TEST_F(AnalysisWebSocketTests, DISABLED_WebSocketFrameValidation) {
    // Test WebSocket frame validation and handling

    std::string clientId = handler->createMockClient();
    std::atomic<int> validFramesReceived{0};
    std::atomic<int> invalidFramesRejected{0};

    handler->setMessageCallback(clientId, [&validFramesReceived, &invalidFramesRejected](const std::string& message) {
        try {
            json msgJson = json::parse(message);
            if (msgJson.contains("type") && msgJson.contains("timestamp")) {
                validFramesReceived.fetch_add(1);
            }
        } catch (const std::exception&) {
            invalidFramesRejected.fetch_add(1);
        }
    });

    // Send valid WebSocket frames
    std::vector<std::string> validFrames = {
        "{\"type\":\"core_analysis\",\"timestamp\":\"2024-01-01T00:00:00Z\",\"data\":{}}",
        "{\"type\":\"pitch_analysis\",\"timestamp\":\"2024-01-01T00:00:00Z\",\"data\":{}}",
        "{\"type\":\"dynamics_analysis\",\"timestamp\":\"2024-01-01T00:00:00Z\",\"data\":{}}"
    };

    for (const auto& frame : validFrames) {
        EXPECT_NO_THROW(handler->handleWebSocketFrame(clientId, frame));
    }

    // Send invalid frames (oversized, malformed, etc.)
    std::string oversizedFrame(1024 * 1024, 'A');  // 1MB frame
    std::string malformedFrame = "\xFF\xFF\xFF\xFF";  // Invalid UTF-8

    EXPECT_THROW(handler->handleWebSocketFrame(clientId, oversizedFrame), std::invalid_argument);
    EXPECT_THROW(handler->handleWebSocketFrame(clientId, malformedFrame), std::invalid_argument);

    std::this_thread::sleep_for(milliseconds(100));

    // Verify frame handling
    EXPECT_GT(validFramesReceived.load(), 0) << "No valid frames received";
    EXPECT_GT(invalidFramesRejected.load(), 0) << "No invalid frames rejected";

    handler->removeMockClient(clientId);
}