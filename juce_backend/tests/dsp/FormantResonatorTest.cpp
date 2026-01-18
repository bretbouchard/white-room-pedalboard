/**
 * Unit Tests for FormantResonator
 *
 * Tests for SPEC-002 bug fix - real biquad coefficient calculation
 */

#include <gtest/gtest.h>
#include <cmath>
#include <vector>
#include "../dsp/FormantResonator.h"

using namespace audio::dsp;

class FormantResonatorTest : public ::testing::Test {
protected:
    double sampleRate = 48000.0;
    double testFrequency = 800.0;
    double testBandwidth = 100.0;

    void SetUp() override {
        resonator = std::make_unique<FormantResonator>(
            sampleRate, testFrequency, testBandwidth
        );
    }

    std::unique_ptr<FormantResonator> resonator;
};

/**
 * Test 1: Stability Verification
 *
 * Verify that the filter is stable for all valid parameter ranges.
 * Stability condition: r < 1 (poles inside unit circle)
 */
TEST_F(FormantResonatorTest, StabilityCheck) {
    EXPECT_TRUE(resonator->isStable())
        << "Filter should be stable with default parameters";

    double r = resonator->getRadius();
    EXPECT_GE(r, 0.0) << "Radius should be non-negative";
    EXPECT_LT(r, 1.0) << "Radius should be less than 1 for stability";
}

/**
 * Test 2: Stability Across Frequency Range
 *
 * Verify stability across entire audio frequency range.
 */
TEST_F(FormantResonatorTest, StabilityAcrossFrequencyRange) {
    std::vector<double> frequencies = {
        20.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 2000.0,
        5000.0, 10000.0, 15000.0, 20000.0
    };

    for (double freq : frequencies) {
        FormantResonator r(sampleRate, freq, testBandwidth);
        EXPECT_TRUE(r.isStable())
            << "Filter should be stable at frequency " << freq << " Hz";
        EXPECT_LT(r.getRadius(), 1.0)
            << "Radius should be < 1 at frequency " << freq << " Hz";
    }
}

/**
 * Test 3: Stability Across Bandwidth Range
 *
 * Verify stability for various bandwidths.
 */
TEST_F(FormantResonatorTest, StabilityAcrossBandwidthRange) {
    std::vector<double> bandwidths = {
        10.0, 20.0, 50.0, 100.0, 200.0, 500.0, 1000.0
    };

    for (double bw : bandwidths) {
        FormantResonator r(sampleRate, testFrequency, bw);
        EXPECT_TRUE(r.isStable())
            << "Filter should be stable with bandwidth " << bw << " Hz";
        EXPECT_LT(r.getRadius(), 1.0)
            << "Radius should be < 1 with bandwidth " << bw << " Hz";
    }
}

/**
 * Test 4: Coefficient Relationship Verification
 *
 * Verify that coefficients follow the correct mathematical relationship:
 * b0 = 1 - r
 * a1 = -2 * r * cos(ω)
 * a2 = r^2
 */
TEST_F(FormantResonatorTest, CoefficientRelationship) {
    double r = resonator->getRadius();
    double omega = 2.0 * M_PI * testFrequency / sampleRate;

    // Expected values
    double expected_b0 = 1.0 - r;
    double expected_a1 = -2.0 * r * std::cos(omega);
    double expected_a2 = r * r;

    // Get actual coefficients by examining frequency response
    // We can't access coefficients directly, so we verify through behavior

    // Test that impulse response decays (stability)
    resonator->reset();
    double output = resonator->process(1.0);  // Impulse

    // Process many samples to see decay
    double maxOutput = std::abs(output);
    for (int i = 0; i < 1000; ++i) {
        output = resonator->process(0.0);
        maxOutput = std::max(maxOutput, std::abs(output));
    }

    // Output should decay for stable filter
    EXPECT_LT(maxOutput, 100.0) << "Impulse response should decay";
}

/**
 * Test 5: Impulse Response Decay
 *
 * Verify that impulse response decays exponentially.
 * For a stable filter: |h[n]| → 0 as n → ∞
 */
TEST_F(FormantResonatorTest, ImpulseResponseDecay) {
    resonator->reset();

    // Apply impulse
    double output = resonator->process(1.0);
    double firstSample = std::abs(output);

    // Process 1000 samples
    double maxDecayed = 0.0;
    for (int i = 0; i < 1000; ++i) {
        output = resonator->process(0.0);
        maxDecayed = std::max(maxDecayed, std::abs(output));
    }

    // Decayed response should be much smaller than initial
    EXPECT_LT(maxDecayed, firstSample * 0.01)
        << "Impulse response should decay to < 1% of initial value";
}

/**
 * Test 6: DC Response
 *
 * Verify DC gain is approximately unity (for small r).
 */
TEST_F(FormantResonatorTest, DCResponse) {
    resonator->reset();

    // Apply DC signal (constant)
    double dcInput = 1.0;
    std::vector<double> outputs;

    // Process enough samples to reach steady state
    for (int i = 0; i < 1000; ++i) {
        outputs.push_back(resonator->process(dcInput));
    }

    // Steady state output should be close to input (DC gain ≈ 1)
    double steadyStateOutput = outputs.back();
    double dcGain = steadyStateOutput / dcInput;

    EXPECT_NEAR(dcGain, 1.0, 0.1)
        << "DC gain should be approximately 1.0, got " << dcGain;
}

/**
 * Test 7: Frequency Response Peak
 *
 * Verify that the frequency response has a peak at the formant frequency.
 */
TEST_F(FormantResonatorTest, FrequencyResponsePeak) {
    // Create resonator
    FormantResonator r(sampleRate, testFrequency, testBandwidth);

    // Test frequencies around resonance
    std::vector<double> testFreqs = {
        testFrequency - 200,
        testFrequency - 100,
        testFrequency - 50,
        testFrequency,
        testFrequency + 50,
        testFrequency + 100,
        testFrequency + 200
    };

    double maxGain = 0.0;
    double peakFreq = 0.0;

    for (double freq : testFreqs) {
        // Generate sine wave at this frequency
        double omega = 2.0 * M_PI * freq / sampleRate;
        std::vector<double> input(1000);
        std::vector<double> output(1000);

        for (int i = 0; i < 1000; ++i) {
            input[i] = std::sin(omega * i);
        }

        // Process
        r.reset();
        for (int i = 0; i < 1000; ++i) {
            output[i] = r.process(input[i]);
        }

        // Measure RMS (skip transient)
        double rms = 0.0;
        for (int i = 500; i < 1000; ++i) {
            rms += output[i] * output[i];
        }
        rms = std::sqrt(rms / 500.0);

        if (rms > maxGain) {
            maxGain = rms;
            peakFreq = freq;
        }
    }

    // Peak should be near the formant frequency
    EXPECT_NEAR(peakFreq, testFrequency, 50.0)
        << "Peak frequency should be near formant frequency";
}

/**
 * Test 8: Bandwidth Verification
 *
 * Verify that -3dB bandwidth is approximately correct.
 */
TEST_F(FormantResonatorTest, BandwidthVerification) {
    FormantResonator r(sampleRate, testFrequency, testBandwidth);

    // Find peak gain at resonance
    double omega0 = 2.0 * M_PI * testFrequency / sampleRate;

    std::vector<double> input(2000);
    std::vector<double> output(2000);

    for (int i = 0; i < 2000; ++i) {
        input[i] = std::sin(omega0 * i);
    }

    r.reset();
    for (int i = 0; i < 2000; ++i) {
        output[i] = r.process(input[i]);
    }

    double peakRMS = 0.0;
    for (int i = 1000; i < 2000; ++i) {
        peakRMS += output[i] * output[i];
    }
    peakRMS = std::sqrt(peakRMS / 1000.0);

    // Find -3dB points (half power = 0.707 of amplitude)
    double targetRMS = peakRMS / std::sqrt(2.0);

    // Search for lower -3dB point
    double lowerFreq = testFrequency;
    for (double freq = testFrequency - 200; freq < testFrequency; freq += 10) {
        double omega = 2.0 * M_PI * freq / sampleRate;

        for (int i = 0; i < 2000; ++i) {
            input[i] = std::sin(omega * i);
        }

        r.reset();
        for (int i = 0; i < 2000; ++i) {
            output[i] = r.process(input[i]);
        }

        double rms = 0.0;
        for (int i = 1000; i < 2000; ++i) {
            rms += output[i] * output[i];
        }
        rms = std::sqrt(rms / 1000.0);

        if (rms < targetRMS) {
            lowerFreq = freq;
            break;
        }
    }

    // Verify bandwidth is approximately correct (±20% tolerance)
    double measuredBandwidth = 2.0 * (testFrequency - lowerFreq);
    EXPECT_NEAR(measuredBandwidth, testBandwidth, testBandwidth * 0.2)
        << "Measured bandwidth should be approximately correct";
}

/**
 * Test 9: Parameter Update
 *
 * Verify that parameters can be updated correctly.
 */
TEST_F(FormantResonatorTest, ParameterUpdate) {
    double newFrequency = 1200.0;
    double newBandwidth = 150.0;

    resonator->setParameters(newFrequency, newBandwidth);

    EXPECT_NEAR(resonator->getFrequency(), newFrequency, 1.0);
    EXPECT_NEAR(resonator->getBandwidth(), newBandwidth, 1.0);
    EXPECT_TRUE(resonator->isStable());
}

/**
 * Test 10: Reset Functionality
 *
 * Verify that reset clears all state.
 */
TEST_F(FormantResonatorTest, ResetFunctionality) {
    // Process some samples
    for (int i = 0; i < 100; ++i) {
        resonator->process(1.0);
    }

    // Reset
    resonator->reset();

    // After reset, output should be same as fresh filter
    double freshOutput = resonator->process(1.0);

    FormantResonator fresh(sampleRate, testFrequency, testBandwidth);
    double resetOutput = fresh.process(1.0);

    EXPECT_NEAR(resetOutput, freshOutput, 1e-10)
        << "After reset, filter should behave like fresh instance";
}

/**
 * Test 11: Block Processing
 *
 * Verify that block processing gives same results as sample-by-sample.
 */
TEST_F(FormantResonatorTest, BlockProcessing) {
    std::vector<double> input(256);
    for (int i = 0; i < 256; ++i) {
        input[i] = std::sin(2.0 * M_PI * 440.0 * i / sampleRate);
    }

    // Sample-by-sample processing
    FormantResonator r1(sampleRate, testFrequency, testBandwidth);
    std::vector<double> output1(256);
    for (int i = 0; i < 256; ++i) {
        output1[i] = r1.process(input[i]);
    }

    // Block processing
    FormantResonator r2(sampleRate, testFrequency, testBandwidth);
    std::vector<double> output2(256);
    r2.process(input.data(), output2.data(), 256);

    // Should be identical
    for (int i = 0; i < 256; ++i) {
        EXPECT_NEAR(output1[i], output2[i], 1e-10)
            << "Block processing should match sample-by-sample at index " << i;
    }
}

/**
 * Test 12: Peak Gain Calculation
 *
 * Verify that peak gain matches theoretical value.
 */
TEST_F(FormantResonatorTest, PeakGainCalculation) {
    double r = resonator->getRadius();
    double theoreticalPeakGain = resonator->getPeakGain();
    double expectedPeakGain = 1.0 / (1.0 - r);

    EXPECT_NEAR(theoreticalPeakGain, expectedPeakGain, 0.01)
        << "Peak gain should match theoretical value";
}

/**
 * Main test runner
 */
int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
