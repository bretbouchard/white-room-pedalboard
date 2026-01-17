#include <gtest/gtest.h>
#include <chrono>
#include "FilterGateProcessor.h"

using namespace FilterGate;

class PerformanceTest : public ::testing::Test {
protected:
    void SetUp() override {
        processor.prepareToPlay(48000.0, 512);
    }

    FilterGateProcessor processor;
};

TEST_F(PerformanceTest, AudioProcessingBenchmark) {
    constexpr int numSamples = 512;
    constexpr int numIterations = 10000;

    juce::AudioBuffer<float> buffer(2, numSamples);
    buffer.clear();
    juce::MidiBuffer midi;

    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < numIterations; ++i) {
        processor.processBlock(buffer, midi);
    }

    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

    double samplesPerSecond = (numSamples * numIterations) / (double)duration.count() * 1000.0;

    std::cout << "Processing speed: " << samplesPerSecond << " samples/second" << std::endl;
    std::cout << "Realtime factor: " << (samplesPerSecond / 48000.0) << "x" << std::endl;

    EXPECT_GT(samplesPerSecond, 48000.0 * 100); // Should handle at least 100x realtime
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
