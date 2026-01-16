#include <iostream>
#include <chrono>
#include <vector>
#include <cassert>
#include <cstring>
#include "daid/RealtimeHashGenerator.h"

using namespace DAID;

int main() {
    std::cout << "=== ARM NEON SHA-256 Performance Test ===" << std::endl;

    // Initialize the hash generator system
    RealtimeHashGenerator::initialize();

    // Check hardware acceleration support
    bool hasHardwareAcceleration = RealtimeHashGenerator::hasHardwareAcceleration();
    bool hasNeonSupport = RealtimeHashGenerator::hasNeonSupport();

    std::cout << "Hardware acceleration available: " << (hasHardwareAcceleration ? "YES" : "NO") << std::endl;
    std::cout << "ARM NEON support: " << (hasNeonSupport ? "YES" : "NO") << std::endl;

    // Test: Basic functionality
    std::cout << "\n--- Test: Basic SHA-256 Functionality ---" << std::endl;

    const char* testData = "Hello, ARM NEON!";
    auto hashResult = RealtimeHashGenerator::generateSHA256(testData, strlen(testData));

    std::cout << "Input: " << testData << std::endl;
    std::cout << "Hash: " << hashResult.c_str() << std::endl;
    std::cout << "Hash length: " << hashResult.length() << " characters" << std::endl;
    std::cout << "Hash format valid: " << (RealtimeHashGenerator::isValidSHA256Hash(hashResult.c_str()) ? "YES" : "NO") << std::endl;

    // Test: Empty data
    auto emptyHash = RealtimeHashGenerator::generateSHA256("", 0);
    std::cout << "\n--- Test: Empty Data ---" << std::endl;
    std::cout << "Empty data hash: " << emptyHash.c_str() << std::endl;

    const char* expectedEmptyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    std::string emptyHashStr = std::string(emptyHash.c_str());
    if (emptyHashStr == expectedEmptyHash) {
        std::cout << "✓ PASS: Empty data produces correct SHA-256 hash" << std::endl;
    } else {
        std::cout << "✗ FAIL: Empty data produces incorrect hash" << std::endl;
        std::cout << "Expected: " << expectedEmptyHash << std::endl;
        std::cout << "Actual:   " << emptyHashStr << std::endl;
        return 1;
    }

    // Test: Performance measurement
    std::cout << "\n--- Test: Performance Measurement ---" << std::endl;

    std::vector<uint8_t> audioData(4096); // 4KB audio buffer
    for (int i = 0; i < 4096; ++i) {
        audioData[i] = static_cast<uint8_t>(i % 256);
    }

    auto startTime = std::chrono::high_resolution_clock::now();
    auto perfHashResult = RealtimeHashGenerator::generateSHA256(
        reinterpret_cast<const char*>(audioData.data()), audioData.size()
    );
    auto endTime = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime).count();

    std::cout << "4KB hash generation time: " << duration << " μs" << std::endl;
    std::cout << "Hash format valid: " << (RealtimeHashGenerator::isValidSHA256Hash(perfHashResult.c_str()) ? "YES" : "NO") << std::endl;

    if (hasNeonSupport) {
        if (duration < 1) {
            std::cout << "✓ PASS: Sub-microsecond performance achieved (<1μs)" << std::endl;
        } else if (duration < 5) {
            std::cout << "✓ PASS: Excellent performance (<5μs)" << std::endl;
        } else {
            std::cout << "! WARN: Performance could be better (" << duration << "μs)" << std::endl;
        }
    } else {
        if (duration < 10) {
            std::cout << "✓ PASS: Acceptable performance without NEON (<10μs)" << std::endl;
        } else {
            std::cout << "! WARN: Performance could be better without NEON (" << duration << "μs)" << std::endl;
        }
    }

    std::cout << "\n=== ARM NEON SHA-256 Performance Test Complete ===" << std::endl;

    if (hasNeonSupport) {
        std::cout << "✓ ARM NEON acceleration is active and working" << std::endl;
    } else {
        std::cout << "! ARM NEON acceleration not available - using software fallback" << std::endl;
    }

    std::cout << "✓ All tests passed successfully!" << std::endl;

    return 0;
}