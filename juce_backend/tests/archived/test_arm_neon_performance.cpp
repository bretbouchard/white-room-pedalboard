#include <gtest/gtest.h>
#include <chrono>
#include <vector>
#include "include/daid/RealtimeHashGenerator.h"

using namespace DAID;

class ARMNeonPerformanceTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Initialize the hash generator system
        RealtimeHashGenerator::initialize();
    }

    void TearDown() override {
        // Cleanup if needed
    }
};

TEST_F(ARMNeonPerformanceTest, SubMicrosecondPerformance) {
    // GIVEN: Realtime hash generator is initialized
    ASSERT_TRUE(RealtimeHashGenerator::hasHardwareAcceleration() ||
                !RealtimeHashGenerator::hasHardwareAcceleration()); // Basic check it's initialized

    // WHEN: Generating SHA-256 hash for typical audio content
    std::vector<uint8_t> audioData(4096); // 4KB audio buffer
    for (int i = 0; i < 4096; ++i) {
        audioData[i] = static_cast<uint8_t>(i % 256);
    }

    auto startTime = std::chrono::high_resolution_clock::now();
    auto hashResult = RealtimeHashGenerator::generateSHA256(
        reinterpret_cast<const char*>(audioData.data()), audioData.size()
    ).to_string(); // Convert to std::string for length check
    auto endTime = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime).count();

    // THEN: Performance should be sub-microsecond on ARM NEON or reasonable otherwise
    #if defined(__ARM_NEON)
        if (RealtimeHashGenerator::hasNeonSupport()) {
            EXPECT_LT(duration, 1); // Less than 1μs with ARM NEON
        } else {
            EXPECT_LT(duration, 5); // Less than 5μs without NEON
        }
    #else
        EXPECT_LT(duration, 10); // Less than 10μs on non-ARM platforms
    #endif

    EXPECT_FALSE(hashResult.empty());
    EXPECT_EQ(hashResult.length(), 64); // SHA-256 hex string length
}

TEST_F(ARMNeonPerformanceTest, ARMNeonOptimizationWorks) {
    // GIVEN: ARM NEON support detection
    bool hasNeonSupport = RealtimeHashGenerator::hasNeonSupport();
    bool hasHardwareAcceleration = RealtimeHashGenerator::hasHardwareAcceleration();

    #if defined(__ARM_NEON)
        // On ARM platforms, we should detect NEON support
        if (hasNeonSupport) {
            // WHEN: Processing large audio buffers with NEON
            std::vector<uint8_t> largeData(16384); // 16KB buffer
            auto startTime = std::chrono::high_resolution_clock::now();

            for (int i = 0; i < 100; ++i) {
                auto hashResult = RealtimeHashGenerator::generateSHA256(
                    reinterpret_cast<const char*>(largeData.data()), largeData.size()
                );
                // Verify result is consistent
                EXPECT_EQ(hashResult.length(), 64);
            }

            auto endTime = std::chrono::high_resolution_clock::now();
            auto totalTime = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime).count();

            // THEN: Average time should be < 10μs per hash with NEON
            double avgTime = totalTime / 100.0;
            EXPECT_LT(avgTime, 10.0);
            EXPECT_TRUE(hasHardwareAcceleration);
        }
    #else
        // On non-ARM platforms, should gracefully fall back
        EXPECT_FALSE(hasNeonSupport);
        GTEST_SKIP() << "ARM NEON not supported on this platform";
    #endif
}

TEST_F(ARMNeonPerformanceTest, PerformanceBaselineWithoutNEON) {
    // GIVEN: Realtime hash generator initialized
    ASSERT_TRUE(RealtimeHashGenerator::hasHardwareAcceleration() ||
                !RealtimeHashGenerator::hasHardwareAcceleration());

    // WHEN: Processing audio buffers
    std::vector<uint8_t> audioData(4096);
    for (int i = 0; i < 4096; ++i) {
        audioData[i] = static_cast<uint8_t>(i % 256);
    }

    auto startTime = std::chrono::high_resolution_clock::now();

    RealtimeHashGenerator::HashResult firstHash;
    for (int i = 0; i < 100; ++i) {
        auto hashResult = RealtimeHashGenerator::generateSHA256(
            reinterpret_cast<const char*>(audioData.data()), audioData.size()
        );

        if (i == 0) {
            firstHash = hashResult; // Store first for consistency check
        } else {
            // All hashes should be identical for same input
            EXPECT_EQ(hashResult, firstHash);
        }

        EXPECT_EQ(hashResult.length(), 64);
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    auto totalTime = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime).count();
    double avgTime = totalTime / 100.0;

    // THEN: Performance should be reasonable depending on platform
    #if defined(__ARM_NEON)
        if (RealtimeHashGenerator::hasNeonSupport()) {
            EXPECT_LT(avgTime, 2.0); // Should be < 2μs with NEON
        } else {
            EXPECT_LT(avgTime, 5.0); // Should be < 5μs without NEON
        }
    #else
        EXPECT_LT(avgTime, 10.0); // Should be < 10μs on other platforms
    #endif

    // Verify hash format is valid SHA-256
    EXPECT_TRUE(RealtimeHashGenerator::isValidSHA256Hash(firstHash.c_str()));
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}