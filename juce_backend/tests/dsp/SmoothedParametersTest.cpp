/*
  ==============================================================================

    SmoothedParametersTest.cpp
    Tests for universal parameter smoothing system

  ==============================================================================
*/

#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_template_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include "../include/SmoothedParametersMixin.h"
#include <chrono>
#include <thread>

using namespace SchillingerEcosystem::DSP;

//==============================================================================
// Test Suite: SmoothedParameter Basic Functionality
//==============================================================================

TEST_CASE("SmoothedParameter initializes correctly", "[dsp][smoothing]")
{
    SmoothedParameter<float> param;

    SECTION("Initial target value is default")
    {
        REQUIRE(param.get() == 0.0f);
    }

    SECTION("Can set and get target value")
    {
        param.set(0.5f);
        REQUIRE(param.get() == 0.5f);
    }
}

TEST_CASE("SmoothedParameter prepares correctly", "[dsp][smoothing]")
{
    SmoothedParameter<float> param;

    SECTION("Preparation succeeds with valid sample rate")
    {
        param.prepare(48000.0, 512);
        REQUIRE(param.get() == 0.0f);
    }

    SECTION("Preparation with different sample rates")
    {
        param.prepare(44100.0, 512);
        param.set(0.5f);
        REQUIRE(param.get() == 0.5f);

        param.prepare(96000.0, 512);
        REQUIRE(param.get() == 0.5f);
    }
}

//==============================================================================
// Test Suite: Smoothing Behavior
//==============================================================================

TEST_CASE("SmoothedParameter smooths transitions", "[dsp][smoothing]")
{
    SmoothedParameter<float> param;
    param.prepare(48000.0, 512);

    SECTION("Gradual transition from 0 to 1")
    {
        param.set(0.0f);
        param.setImmediate(0.0f); // Reset to known state
        param.set(1.0f);

        float previous = 0.0f;
        bool increasing = true;

        // Check that values gradually increase
        for (int i = 0; i < 100; ++i)
        {
            float current = param.getSmoothed();
            if (i > 0)
            {
                // Values should be monotonically increasing (or staying same)
                REQUIRE(current >= previous);
            }
            previous = current;
        }
    }

    SECTION("Smoothing time is approximately 50ms")
    {
        param.setImmediate(0.0f);
        param.set(1.0f);

        int samplesToSmooth = 0;
        const double sampleRate = 48000.0;
        const double targetTime = 0.05; // 50ms
        const int maxSamples = static_cast<int>(sampleRate * targetTime * 1.5); // 1.5x margin

        float value = 0.0f;
        while (std::abs(value - 1.0f) > 0.01f && samplesToSmooth < maxSamples)
        {
            value = param.getSmoothed();
            samplesToSmooth++;
        }

        // Should reach target within reasonable time
        REQUIRE(samplesToSmooth > 0);
        REQUIRE(samplesToSmooth < maxSamples);
    }
}

TEST_CASE("SmoothedParameter immediate setting works", "[dsp][smoothing]")
{
    SmoothedParameter<float> param;
    param.prepare(48000.0, 512);

    SECTION("Immediate set bypasses smoothing")
    {
        param.set(0.0f);
        param.setImmediate(1.0f);

        float value = param.getSmoothed();
        REQUIRE_THAT(value, Catch::Matchers::WithinAbs(1.0f, 0.001f));
    }

    SECTION("Multiple immediate sets work correctly")
    {
        param.setImmediate(0.2f);
        REQUIRE_THAT(param.getSmoothed(), Catch::Matchers::WithinAbs(0.2f, 0.001f));

        param.setImmediate(0.8f);
        REQUIRE_THAT(param.getSmoothed(), Catch::Matchers::WithinAbs(0.8f, 0.001f));

        param.setImmediate(0.0f);
        REQUIRE_THAT(param.getSmoothed(), Catch::Matchers::WithinAbs(0.0f, 0.001f));
    }
}

//==============================================================================
// Test Suite: Fast Smoothing Mode
//==============================================================================

TEST_CASE("SmoothedParameter fast smoothing is faster", "[dsp][smoothing]")
{
    SmoothedParameter<float> param;
    param.prepare(48000.0, 512);

    SECTION("Fast smoothing completes quickly")
    {
        param.setImmediate(0.0f);
        param.set(1.0f);

        // Fast smoothing should be nearly instant
        float value = param.getFast();
        REQUIRE_THAT(value, Catch::Matchers::WithinAbs(1.0f, 0.1f));
    }

    SECTION("Fast and standard smoothing differ in speed")
    {
        param.setImmediate(0.0f);
        param.set(1.0f);

        float fastValue = param.getFast();
        float stdValue = param.getSmoothed();

        // Fast should be closer to target
        REQUIRE(std::abs(fastValue - 1.0f) < std::abs(stdValue - 1.0f));
    }
}

//==============================================================================
// Test Suite: SmoothedParameterArray
//==============================================================================

TEST_CASE("SmoothedParameterArray manages multiple parameters", "[dsp][smoothing]")
{
    SmoothedParameterArray<float, 16> array;

    SECTION("Initializes all parameters")
    {
        array.prepare(48000.0, 512);

        for (size_t i = 0; i < 16; ++i)
        {
            REQUIRE(array.get(i) == 0.0f);
        }
    }

    SECTION("Can set individual parameters")
    {
        array.prepare(48000.0, 512);

        array.set(0, 0.1f);
        array.set(5, 0.5f);
        array.set(15, 1.0f);

        REQUIRE(array.get(0) == 0.1f);
        REQUIRE(array.get(5) == 0.5f);
        REQUIRE(array.get(15) == 1.0f);
    }

    SECTION("Can smooth individual parameters")
    {
        array.prepare(48000.0, 512);

        array.setImmediate(0, 0.0f);
        array.setImmediate(1, 0.0f);
        array.set(0, 1.0f);  // Smoothed
        array.setImmediate(1, 1.0f);  // Immediate

        float smoothed = array.getSmoothed(0);
        float immediate = array.getSmoothed(1);

        REQUIRE(smoothed < immediate);
        REQUIRE(immediate == 1.0f);
    }

    SECTION("Array access operators work")
    {
        array.prepare(48000.0, 512);

        array[5].set(0.7f);
        REQUIRE(array[5].get() == 0.7f);

        const auto& constArray = array;
        REQUIRE(constArray[5].get() == 0.7f);
    }
}

//==============================================================================
// Test Suite: Thread Safety
//==============================================================================

TEST_CASE("SmoothedParameter is thread-safe", "[dsp][smoothing][thread-safety]")
{
    SmoothedParameter<float> param;
    param.prepare(48000.0, 512);

    SECTION("Concurrent reads and writes")
    {
        std::atomic<bool> running{true};
        std::atomic<int> writeCount{0};
        std::atomic<int> readCount{0};

        // Writer thread
        std::thread writer([&]()
        {
            float value = 0.0f;
            while (running.load())
            {
                param.set(value);
                value = std::fmod(value + 0.1f, 1.0f);
                writeCount++;
                std::this_thread::sleep_for(std::chrono::microseconds(100));
            }
        });

        // Reader thread
        std::thread reader([&]()
        {
            while (running.load())
            {
                float value = param.get();
                (void)value; // Suppress unused warning
                readCount++;
                std::this_thread::sleep_for(std::chrono::microseconds(50));
            }
        });

        // Let them run for a bit
        std::this_thread::sleep_for(std::chrono::milliseconds(100));

        running = false;
        writer.join();
        reader.join();

        REQUIRE(writeCount > 0);
        REQUIRE(readCount > 0);
    }
}

//==============================================================================
// Test Suite: Zipper Noise Prevention
//==============================================================================

TEST_CASE("SmoothedParameter prevents zipper noise", "[dsp][smoothing][audio]")
{
    SmoothedParameter<float> param;
    param.prepare(48000.0, 512);

    SECTION("Rapid parameter changes are smoothed")
    {
        param.setImmediate(0.0f);

        // Simulate rapid automation changes
        std::vector<float> output;
        for (int i = 0; i < 100; ++i)
        {
            param.set(static_cast<float>(i) / 100.0f);
            output.push_back(param.getSmoothed());
        }

        // Check that adjacent samples don't jump too much
        float maxDelta = 0.0f;
        for (size_t i = 1; i < output.size(); ++i)
        {
            float delta = std::abs(output[i] - output[i - 1]);
            maxDelta = std::max(maxDelta, delta);
        }

        // Max delta should be reasonable (not zipper noise)
        REQUIRE(maxDelta < 0.1f);
    }

    SECTION("Audio-rate parameter modulation")
    {
        param.setImmediate(0.5f);

        std::vector<float> audio;
        for (int i = 0; i < 480; ++i) // 10ms at 48kHz
        {
            audio.push_back(param.getSmoothed());
        }

        // Check signal characteristics
        float min = *std::min_element(audio.begin(), audio.end());
        float max = *std::max_element(audio.begin(), audio.end());

        // Should be stable around target
        REQUIRE(min >= 0.4f);
        REQUIRE(max <= 0.6f);
    }
}

//==============================================================================
// Test Suite: Utility Functions
//==============================================================================

TEST_CASE("SmoothedParameterUtils functions work correctly", "[dsp][smoothing]")
{
    using namespace SmoothedParameterUtils;

    SECTION("Linear to log frequency conversion")
    {
        float linear1 = 0.0f;
        float linear2 = 0.5f;
        float linear3 = 1.0f;

        float freq1 = linearToLogFrequency(linear1);
        float freq2 = linearToLogFrequency(linear2);
        float freq3 = linearToLogFrequency(linear3);

        REQUIRE(freq1 == 20.0f);  // Min frequency
        REQUIRE(freq3 == 20000.0f); // Max frequency
        REQUIRE(freq2 > freq1);
        REQUIRE(freq2 < freq3);

        // Round-trip conversion
        float backToLinear = logFrequencyToLinear(freq2);
        REQUIRE_THAT(backToLinear, Catch::Matchers::WithinAbs(linear2, 0.01f));
    }

    SECTION("Clamp function")
    {
        REQUIRE(clamp(0.5f, 0.0f, 1.0f) == 0.5f);
        REQUIRE(clamp(-0.5f, 0.0f, 1.0f) == 0.0f);
        REQUIRE(clamp(1.5f, 0.0f, 1.0f) == 1.0f);
    }
}

//==============================================================================
// Test Suite: Edge Cases
//==============================================================================

TEST_CASE("SmoothedParameter handles edge cases", "[dsp][smoothing]")
{
    SmoothedParameter<float> param;
    param.prepare(48000.0, 512);

    SECTION("Extreme values")
    {
        param.set(-1000.0f);
        REQUIRE(param.get() == -1000.0f);

        param.set(1000.0f);
        REQUIRE(param.get() == 1000.0f);
    }

    SECTION("Same value set multiple times")
    {
        param.set(0.5f);
        param.set(0.5f);
        param.set(0.5f);

        REQUIRE(param.get() == 0.5f);
    }

    SECTION("Reset functionality")
    {
        param.set(0.7f);
        param.reset(0.0f);

        REQUIRE(param.get() == 0.0f);
    }

    SECTION("Very small smoothing times")
    {
        param.setImmediate(0.0f);
        param.set(1.0f);

        // Get a few samples
        for (int i = 0; i < 10; ++i)
        {
            param.getSmoothed();
        }

        // Should be approaching target
        REQUIRE(param.get() == 1.0f);
    }
}

//==============================================================================
// Test Suite: Double Precision
//==============================================================================

TEST_CASE("SmoothedParameter works with double precision", "[dsp][smoothing]")
{
    SmoothedParameter<double> param;
    param.prepare(48000.0, 512);

    SECTION("Basic functionality")
    {
        param.set(0.5);
        REQUIRE(param.get() == 0.5);

        param.setImmediate(1.0);
        double value = param.getSmoothed();
        REQUIRE_THAT(value, Catch::Matchers::WithinAbs(1.0, 0.001));
    }

    SECTION("High precision values")
    {
        param.set(0.123456789);
        REQUIRE(param.get() == 0.123456789);
    }
}

//==============================================================================
// Test Suite: Integration Example
//==============================================================================

// Example instrument using the mixin
class ExampleInstrument : public SmoothedParametersMixin<ExampleInstrument, 32>
{
public:
    void prepare(double sampleRate, int samplesPerBlock)
    {
        prepareSmoothedParameters(sampleRate, samplesPerBlock);
    }

    void process(float* output, int numSamples)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            float cutoff = getSmoothed(0);  // Filter cutoff
            float resonance = getSmoothed(1);  // Filter resonance
            float amplitude = getSmoothed(2);  // Amplitude

            // Simple synthesis example
            output[i] = amplitude * std::sin(cutoff * 0.01f * i);
        }
    }
};

TEST_CASE("Example instrument uses smoothed parameters", "[dsp][smoothing][integration]")
{
    ExampleInstrument inst;

    SECTION("Instrument prepares correctly")
    {
        inst.prepare(48000.0, 512);

        // Set some parameters
        inst.setSmoothedParameter(0, 0.5f);  // Cutoff
        inst.setSmoothedParameter(1, 0.7f);  // Resonance
        inst.setSmoothedParameter(2, 0.8f);  // Amplitude

        REQUIRE(inst.getParameterTarget(0) == 0.5f);
        REQUIRE(inst.getParameterTarget(1) == 0.7f);
        REQUIRE(inst.getParameterTarget(2) == 0.8f);
    }

    SECTION("Instrument processes audio")
    {
        inst.prepare(48000.0, 512);

        inst.setSmoothedParameter(0, 440.0f);  // A4
        inst.setSmoothedParameter(2, 0.5f);   // Amplitude

        std::vector<float> output(512);
        inst.process(output.data(), 512);

        // Check that output is generated
        bool hasSignal = false;
        for (float sample : output)
        {
            if (std::abs(sample) > 0.001f)
            {
                hasSignal = true;
                break;
            }
        }
        REQUIRE(hasSignal);
    }

    SECTION("Preset changes use immediate setting")
    {
        inst.prepare(48000.0, 512);

        // Simulate preset change
        inst.setParameterImmediate(0, 0.3f);
        inst.setParameterImmediate(1, 0.8f);
        inst.setParameterImmediate(2, 0.9f);

        std::vector<float> output(512);
        inst.process(output.data(), 512);

        // Output should reflect new preset immediately
        bool hasSignal = false;
        for (float sample : output)
        {
            if (std::abs(sample) > 0.001f)
            {
                hasSignal = true;
                break;
            }
        }
        REQUIRE(hasSignal);
    }
}

//==============================================================================
// Performance Tests
//==============================================================================

TEST_CASE("SmoothedParameter performance is acceptable", "[dsp][smoothing][performance]")
{
    SmoothedParameter<float> param;
    param.prepare(48000.0, 512);

    SECTION("Single parameter access speed")
    {
        param.set(0.5f);

        auto start = std::chrono::high_resolution_clock::now();

        constexpr int iterations = 1000000;
        float sum = 0.0f;
        for (int i = 0; i < iterations; ++i)
        {
            sum += param.getSmoothed();
        }

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

        // Should complete in reasonable time
        REQUIRE(duration.count() < 100000); // Less than 100ms for 1M iterations

        // Suppress unused warning
        REQUIRE(sum > 0.0f);
    }

    SECTION("Array parameter access speed")
    {
        SmoothedParameterArray<float, 32> array;
        array.prepare(48000.0, 512);

        for (size_t i = 0; i < 32; ++i)
        {
            array.set(i, static_cast<float>(i) / 32.0f);
        }

        auto start = std::chrono::high_resolution_clock::now();

        constexpr int iterations = 100000;
        float sum = 0.0f;
        for (int i = 0; i < iterations; ++i)
        {
            for (size_t j = 0; j < 32; ++j)
            {
                sum += array.getSmoothed(j);
            }
        }

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

        // Should complete in reasonable time
        REQUIRE(duration.count() < 200000); // Less than 200ms

        // Suppress unused warning
        REQUIRE(sum > 0.0f);
    }
}
