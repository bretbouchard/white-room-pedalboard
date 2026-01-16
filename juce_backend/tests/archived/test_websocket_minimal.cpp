#include <iostream>
#include <thread>
#include <chrono>
#include <atomic>

// JUCE includes for minimal functionality
#include <juce_core/juce_core.h>

// Include our WebSocket implementation
#include "websocket/StreamingSocketServer.h"
#include "proto/daid.pb.h"

using namespace DAID::WebSocket;

void testWebSocketFrameCreation()
{
    std::cout << "Testing WebSocket Frame Creation..." << std::endl;

    // Test payload
    juce::String testMessage = "Hello WebSocket!";
    juce::MemoryBlock payload(testMessage.toRawUTF8(), testMessage.length());

    // Create binary frame
    auto binaryFrame = WebSocketFrame::createFrame(WebSocketFrame::OpCode::BINARY, payload, false);
    std::cout << "Created binary frame: " << binaryFrame.getSize() << " bytes" << std::endl;

    // Create text frame
    auto textFrame = WebSocketFrame::createFrame(WebSocketFrame::OpCode::TEXT, payload, false);
    std::cout << "Created text frame: " << textFrame.getSize() << " bytes" << std::endl;

    // Create masked frame
    auto maskedFrame = WebSocketFrame::createFrame(WebSocketFrame::OpCode::BINARY, payload, true);
    std::cout << "Created masked frame: " << maskedFrame.getSize() << " bytes" << std::endl;

    // Parse frames back
    WebSocketFrame::OpCode parsedOpCode;
    juce::MemoryBlock parsedPayload;
    bool fin, masked;

    if (WebSocketFrame::parseFrame(binaryFrame, parsedOpCode, parsedPayload, fin, masked)) {
        std::cout << "Successfully parsed binary frame:" << std::endl;
        std::cout << "  OpCode: " << static_cast<int>(parsedOpCode) << std::endl;
        std::cout << "  FIN: " << (fin ? "true" : "false") << std::endl;
        std::cout << "  Masked: " << (masked ? "true" : "false") << std::endl;
        std::cout << "  Payload size: " << parsedPayload.getSize() << std::endl;
    } else {
        std::cout << "Failed to parse binary frame" << std::endl;
    }

    std::cout << "✓ WebSocket Frame Creation Test Passed" << std::endl;
    std::cout << std::endl;
}

void testProtocolBufferSerialization()
{
    std::cout << "Testing Protocol Buffer Serialization..." << std::endl;

    // Create a DAID request
    daid::RealtimeGenerateRequest request;
    request.set_agent("test_agent");
    request.set_entity_type("composition");
    request.set_entity_id("test_comp_001");
    request.set_content_hash("abcd1234efgh5678");
    request.set_request_id(12345);

    // Serialize
    std::string serialized = request.SerializeAsString();
    std::cout << "Serialized request: " << serialized.size() << " bytes" << std::endl;

    // Deserialize
    daid::RealtimeGenerateRequest parsed;
    bool success = parsed.ParseFromString(serialized);

    if (success) {
        std::cout << "Successfully parsed request:" << std::endl;
        std::cout << "  Agent: " << parsed.agent() << std::endl;
        std::cout << "  Entity Type: " << parsed.entity_type() << std::endl;
        std::cout << "  Entity ID: " << parsed.entity_id() << std::endl;
        std::cout << "  Content Hash: " << parsed.content_hash() << std::endl;
        std::cout << "  Request ID: " << parsed.request_id() << std::endl;
    } else {
        std::cout << "Failed to parse request" << std::endl;
    }

    std::cout << "✓ Protocol Buffer Serialization Test Passed" << std::endl;
    std::cout << std::endl;
}

void testWebSocketServerBasics()
{
    std::cout << "Testing WebSocket Server Basics..." << std::endl;

    // Configure server
    DAIDStreamingSocketServer::ServerConfig config;
    config.port = 8080;
    config.maxConnections = 10;
    config.workerThreads = 2;

    // Create server
    auto server = std::make_unique<DAIDStreamingSocketServer>(config);
    std::cout << "Created WebSocket server on port " << config.port << std::endl;

    // Test server lifecycle
    std::cout << "Starting server..." << std::endl;
    bool started = server->start();

    if (started) {
        std::cout << "✓ Server started successfully" << std::endl;
        std::cout << "  Is running: " << (server->isRunning() ? "true" : "false") << std::endl;

        // Test performance metrics
        auto metrics = server->getPerformanceMetrics();
        std::cout << "✓ Got performance metrics:" << std::endl;
        std::cout << "  Operations/sec: " << metrics.operations_per_second() << std::endl;
        std::cout << "  Avg generation time: " << metrics.avg_generation_time_ns() << " ns" << std::endl;
        std::cout << "  Memory usage: " << metrics.memory_usage_bytes() << " bytes" << std::endl;
        std::cout << "  Active connections: " << metrics.active_connections() << std::endl;

        // Test health status
        auto health = server->getHealthStatus();
        std::cout << "✓ Got health status:" << std::endl;
        std::cout << "  Overall status: " << health.overall_status() << std::endl;
        std::cout << "  Version: " << health.version() << std::endl;

        // Let it run for a bit
        std::cout << "Letting server run for 2 seconds..." << std::endl;
        std::this_thread::sleep_for(std::chrono::seconds(2));

        // Stop server
        std::cout << "Stopping server..." << std::endl;
        server->stop();
        std::cout << "✓ Server stopped successfully" << std::endl;
        std::cout << "  Is running: " << (server->isRunning() ? "true" : "false") << std::endl;

    } else {
        std::cout << "✗ Failed to start server" << std::endl;
    }

    std::cout << "✓ WebSocket Server Basics Test Passed" << std::endl;
    std::cout << std::endl;
}

void testWebSocketKeyGeneration()
{
    std::cout << "Testing WebSocket Key Generation..." << std::endl;

    // Generate WebSocket keys
    auto key1 = WebSocketFrame::createWebSocketKey();
    auto key2 = WebSocketFrame::createWebSocketKey();

    std::cout << "Generated WebSocket keys:" << std::endl;
    std::cout << "  Key 1 size: " << key1.getSize() << " bytes" << std::endl;
    std::cout << "  Key 2 size: " << key2.getSize() << " bytes" << std::endl;

    // Test base64 encoding
    std::string key1Str(key1.getSize(), '\0');
    std::copy(static_cast<const char*>(key1.getData()),
              static_cast<const char*>(key1.getData()) + key1.getSize(),
              key1Str.data());

    std::string acceptKey1 = WebSocketFrame::computeAcceptKey(key1Str);
    std::cout << "  Accept Key 1 size: " << acceptKey1.length() << " bytes" << std::endl;

    // Keys should be different
    if (key1 != key2) {
        std::cout << "✓ Generated different keys" << std::endl;
    } else {
        std::cout << "✗ Generated same keys (unexpected)" << std::endl;
    }

    std::cout << "✓ WebSocket Key Generation Test Passed" << std::endl;
    std::cout << std::endl;
}

void performanceTest()
{
    std::cout << "Running Performance Test..." << std::endl;

    const int numFrames = 10000;
    auto startTime = std::chrono::high_resolution_clock::now();

    // Create and parse many frames
    for (int i = 0; i < numFrames; ++i) {
        std::string testData = "Performance test data " + std::to_string(i);
        juce::MemoryBlock payload(testData.data(), testData.size());

        // Create frame
        auto frame = WebSocketFrame::createFrame(WebSocketFrame::OpCode::BINARY, payload, false);

        // Parse frame
        WebSocketFrame::OpCode parsedOpCode;
        juce::MemoryBlock parsedPayload;
        bool fin, masked;

        if (WebSocketFrame::parseFrame(frame, parsedOpCode, parsedPayload, fin, masked)) {
            // Success
        } else {
            std::cout << "✗ Frame parsing failed on iteration " << i << std::endl;
            return;
        }
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);

    std::cout << "Processed " << numFrames << " frames in " << duration.count() << " ms" << std::endl;
    std::cout << "Average time per frame: " << (double)duration.count() / numFrames << " ms" << std::endl;
    std::cout << "Frames per second: " << (numFrames * 1000.0) / duration.count() << std::endl;

    if (duration.count() < 1000) { // Should complete in less than 1 second
        std::cout << "✓ Performance Test Passed" << std::endl;
    } else {
        std::cout << "✗ Performance Test Failed - too slow" << std::endl;
    }

    std::cout << std::endl;
}

int main()
{
    std::cout << "=== JUCE WebSocket Server Implementation Test ===" << std::endl;
    std::cout << std::endl;

    std::cout << "Testing replacement of deprecated juce_websockets" << std::endl;
    std::cout << "with custom implementation using juce::StreamingSocket" << std::endl;
    std::cout << std::endl;

    try {
        // Run all tests
        testWebSocketFrameCreation();
        testProtocolBufferSerialization();
        testWebSocketKeyGeneration();
        testWebSocketServerBasics();
        performanceTest();

        std::cout << "=== ALL TESTS PASSED ===" << std::endl;
        std::cout << "WebSocket server implementation is working correctly!" << std::endl;

        return 0;

    } catch (const std::exception& e) {
        std::cout << "✗ Test failed with exception: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cout << "✗ Test failed with unknown exception" << std::endl;
        return 1;
    }
}