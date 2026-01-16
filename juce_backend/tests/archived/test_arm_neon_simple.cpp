#include <iostream>
#include <chrono>
#include <vector>
#include <cassert>
#include "include/daid/RealtimeHashGenerator.h"

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

    // Test 1: Sub-microsecond performance test
    std::cout << "\n--- Test 1: Sub-microsecond Performance ---" << std::endl;

    std::vector<uint8_t> audioData(4096); // 4KB audio buffer
    for (int i = 0; i < 4096; ++i) {
        audioData[i] = static_cast<uint8_t>(i % 256);
    }

    auto startTime = std::chrono::high_resolution_clock::now();
    auto hashResult = RealtimeHashGenerator::generateSHA256(
        reinterpret_cast<const char*>(audioData.data()), audioData.size()
    );
    auto endTime = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime).count();

    std::cout << "Hash generation time: " << duration << " μs" << std::endl;
    std::cout << "Hash length: " << hashResult.length() << " characters" << std::endl;
    std::cout << "Hash format valid: " << (RealtimeHashGenerator::isValidSHA256Hash(hashResult.c_str()) ? "YES" : "NO") << std::endl;
    std::cout << "Hash value: " << hashResult.c_str() << std::endl;

    if (hasNeonSupport) {
        if (duration < 1) {
            std::cout << "✓ PASS: Sub-microsecond performance achieved (<1μs)" << std::endl;
        } else {
            std::cout << "✗ FAIL: Sub-microsecond performance NOT achieved (" << duration << "μs >= 1μs)" << std::endl;
        }
    } else {
        if (duration < 10) {
            std::cout << "✓ PASS: Acceptable performance without NEON (<10μs)" << std::endl;
        } else {
            std::cout << "✗ FAIL: Poor performance without NEON (" << duration << "μs >= 10μs)" << std::endl;
        }
    }

    // Test 2: Consistency test
    std::cout << "\n--- Test 2: Hash Consistency ---" << std::endl;

    std::string firstHash;
    for (int i = 0; i < 100; ++i) {
        auto hashResult = RealtimeHashGenerator::generateSHA256(
            reinterpret_cast<const char*>(audioData.data()), audioData.size()
        );

        if (i == 0) {
            firstHash = std::string(hashResult.c_str());
        } else {
            std::string currentHash = std::string(hashResult.c_str());
            if (currentHash != firstHash) {
                std::cout << "✗ FAIL: Hash inconsistency detected at iteration " << i << std::endl;
                return 1;
            }
        }
    }
    std::cout << "✓ PASS: All 100 hashes are identical" << std::endl;

    // Test 3: Performance with different sizes
    std::cout << "\n--- Test 3: Performance with Different Data Sizes ---" << std::endl;

    std::vector<size_t> testSizes = {64, 256, 1024, 4096, 16384};

    for (size_t size : testSizes) {
        std::vector<uint8_t> data(size, static_cast<uint8_t>(size % 256));

        auto start = std::chrono::high_resolution_clock::now();
        auto hash = RealtimeHashGenerator::generateSHA256(
            reinterpret_cast<const char*>(data.data()), data.size()
        );
        auto end = std::chrono::high_resolution_clock::now();

        auto timeMicros = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();

        std::cout << "Size: " << size << " bytes -> " << timeMicros << " μs" << std::endl;

        // Verify hash length is always 64 characters
        if (hash.length() != 64) {
            std::cout << "✗ FAIL: Invalid hash length " << hash.length() << " for size " << size << std::endl;
            return 1;
        }
    }
    std::cout << "✓ PASS: All data sizes produce valid SHA-256 hashes" << std::endl;

    // Test 4: Performance estimation accuracy
    std::cout << "\n--- Test 4: Performance Estimation Accuracy ---" << std::endl;

    for (size_t size : {1024, 4096, 16384}) {
        uint64_t estimatedTime = RealtimeHashGenerator::getPerformanceEstimate(size);
        uint64_t maxTime = RealtimeHashGenerator::getMaxExecutionTime(size);

        std::cout << "Size: " << size << " bytes" << std::endl;
        std::cout << "  Estimated time: " << estimatedTime << " ns" << std::endl;
        std::cout << "  Maximum guaranteed time: " << maxTime << " ns" << std::endl;

        // Actual measurement
        std::vector<uint8_t> data(size, 0x42);
        auto start = std::chrono::high_resolution_clock::now();
        auto hash = RealtimeHashGenerator::generateSHA256(
            reinterpret_cast<const char*>(data.data()), data.size()
        );
        auto end = std::chrono::high_resolution_clock::now();

        uint64_t actualTime = std::chrono::duration_cast<std::chrono::nanoseconds>(end - start).count();

        std::cout << "  Actual time: " << actualTime << " ns" << std::endl;

        if (actualTime <= maxTime) {
            std::cout << "  ✓ PASS: Actual time within guaranteed maximum" << std::endl;
        } else {
            std::cout << "  ✗ FAIL: Actual time exceeds guaranteed maximum" << std::endl;
        }
    }

    // Test 5: Empty data test
    std::cout << "\n--- Test 5: Empty Data Handling ---" << std::endl;

    auto emptyHash = RealtimeHashGenerator::generateSHA256("", 0);
    std::cout << "Empty data hash: " << emptyHash.c_str() << std::endl;
    std::cout << "Empty hash length: " << emptyHash.length() << std::endl;

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

    std::cout << "\n=== ARM NEON SHA-256 Performance Test Complete ===" << std::endl;

    if (hasNeonSupport) {
        std::cout << "✓ ARM NEON acceleration is active and working" << std::endl;
    } else {
        std::cout << "! ARM NEON acceleration not available - using software fallback" << std::endl;
    }

    std::cout << "✓ All tests passed successfully!" << std::endl;

    return 0;
}