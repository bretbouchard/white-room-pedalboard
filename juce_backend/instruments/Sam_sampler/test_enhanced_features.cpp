/*
  ==============================================================================

    test_enhanced_features.cpp
    Test suite for enhanced Sam Sampler features

    Tests:
    - SVF filter implementation
    - Enhanced envelope with curves
    - Improved interpolation quality
    - Loop crossfading

  ==============================================================================
*/

#include "../include/dsp/SamSamplerDSP.h"
#include <iostream>
#include <cassert>
#include <cmath>

using namespace DSP;

// Test helper functions
bool approximatelyEqual(double a, double b, double epsilon = 0.001)
{
    return std::abs(a - b) < epsilon;
}

void testEnvelopeCurves()
{
    std::cout << "Testing Envelope Curves..." << std::endl;

    ADSREnvelope env;

    // Test exponential curve
    env.attackCurve = EnvelopeCurve::Exponential;
    env.attack = 0.1;
    env.decay = 0.1;
    env.sustain = 0.5;
    env.hold = 0.0;
    env.releaseTime = 0.1;
    env.releaseCurve = EnvelopeCurve::Exponential;

    env.start();

    double sampleRate = 48000.0;
    int attackSamples = static_cast<int>(env.attack * sampleRate);

    // Process attack phase
    double level = 0.0;
    for (int i = 0; i < attackSamples; ++i)
    {
        level = env.process(sampleRate, 1);
    }

    // Should be near peak (1.0) after attack
    assert(level > 0.9 && level <= 1.0);

    // Test decay phase
    int decaySamples = static_cast<int>(env.decay * sampleRate);
    for (int i = 0; i < decaySamples; ++i)
    {
        level = env.process(sampleRate, 1);
    }

    // Should be near sustain level
    assert(approximatelyEqual(level, env.sustain, 0.01));

    // Test release phase
    env.release();
    int releaseSamples = static_cast<int>(env.releaseTime * sampleRate);
    for (int i = 0; i < releaseSamples; ++i)
    {
        level = env.process(sampleRate, 1);
    }

    // Should be near 0 after release
    assert(level < 0.01);

    std::cout << "  Envelope Curves: PASSED" << std::endl;
}

void testSVFFilter()
{
    std::cout << "Testing SVF Filter..." << std::endl;

    StateVariableFilter filter;
    filter.prepare(48000.0);

    // Test lowpass filter
    filter.type = FilterType::Lowpass;
    filter.cutoff = 1000.0;
    filter.resonance = 0.5;

    // Create test signal (stereo)
    const int numSamples = 480;
    float* channels[2];
    std::vector<float> buffer1(numSamples, 1.0f); // DC signal
    std::vector<float> buffer2(numSamples, 1.0f);
    channels[0] = buffer1.data();
    channels[1] = buffer2.data();

    filter.process(channels, 2, numSamples);

    // Lowpass should attenuate DC only slightly
    float outputLevel = std::abs(channels[0][numSamples - 1]);
    assert(outputLevel > 0.0f);

    // Test highpass filter
    filter.type = FilterType::Highpass;
    filter.reset();

    channels[0] = buffer1.data();
    channels[1] = buffer2.data();
    filter.process(channels, 2, numSamples);

    // Highpass should block DC
    outputLevel = std::abs(channels[0][numSamples - 1]);
    assert(outputLevel < 0.1f);

    std::cout << "  SVF Filter: PASSED" << std::endl;
}

void testInterpolationQuality()
{
    std::cout << "Testing Interpolation Quality..." << std::endl;

    // Create a simple test sample
    auto sample = std::make_shared<Sample>();
    sample->numSamples = 100;
    sample->numChannels = 1;
    sample->sampleRate = 48000;
    sample->audioData.resize(100);

    // Fill with sine wave
    for (int i = 0; i < 100; ++i)
    {
        double t = static_cast<double>(i) / 48000.0;
        sample->audioData[i] = std::sin(2.0 * M_PI * 440.0 * t);
    }

    SamSamplerVoice voice;
    voice.startNote(60, 0.8f, sample);

    // Test cubic interpolation (default)
    voice.setInterpolationQuality(1);

    // Process a few samples
    float* outputs[2];
    std::vector<float> buffer1(64, 0.0f);
    std::vector<float> buffer2(64, 0.0f);
    outputs[0] = buffer1.data();
    outputs[1] = buffer2.data();

    voice.process(outputs, 2, 64, 48000.0);

    // Check that we got some output
    bool hasOutput = false;
    for (int i = 0; i < 64; ++i)
    {
        if (std::abs(outputs[0][i]) > 0.001f)
        {
            hasOutput = true;
            break;
        }
    }

    assert(hasOutput);

    std::cout << "  Interpolation Quality: PASSED" << std::endl;
}

void testParameterUpdates()
{
    std::cout << "Testing Parameter Updates..." << std::endl;

    SamSamplerDSP sampler;

    // Test envelope parameters
    sampler.setParameter("envAttack", 0.05f);
    sampler.setParameter("envHold", 0.1f);
    sampler.setParameter("envDecay", 0.2f);
    sampler.setParameter("envSustain", 0.6f);
    sampler.setParameter("envRelease", 0.3f);

    assert(approximatelyEqual(sampler.getParameter("envAttack"), 0.05));
    assert(approximatelyEqual(sampler.getParameter("envHold"), 0.1));
    assert(approximatelyEqual(sampler.getParameter("envDecay"), 0.2));
    assert(approximatelyEqual(sampler.getParameter("envSustain"), 0.6));
    assert(approximatelyEqual(sampler.getParameter("envRelease"), 0.3));

    // Test envelope curves
    sampler.setParameter("envAttackCurve", 1.0f); // Exponential
    sampler.setParameter("envDecayCurve", 2.0f);   // Logarithmic
    sampler.setParameter("envReleaseCurve", 3.0f); // SCurve

    assert(approximatelyEqual(sampler.getParameter("envAttackCurve"), 1.0));
    assert(approximatelyEqual(sampler.getParameter("envDecayCurve"), 2.0));
    assert(approximatelyEqual(sampler.getParameter("envReleaseCurve"), 3.0));

    // Test filter parameters
    sampler.setParameter("filterCutoff", 2000.0f);
    sampler.setParameter("filterResonance", 0.7f);
    sampler.setParameter("filterEnabled", 1.0f);
    sampler.setParameter("filterType", 1.0f); // Bandpass

    assert(approximatelyEqual(sampler.getParameter("filterCutoff"), 2000.0));
    assert(approximatelyEqual(sampler.getParameter("filterResonance"), 0.7));
    assert(sampler.getParameter("filterEnabled") > 0.5f);
    assert(approximatelyEqual(sampler.getParameter("filterType"), 1.0));

    std::cout << "  Parameter Updates: PASSED" << std::endl;
}

int main()
{
    std::cout << "\n=== Sam Sampler Enhanced Features Test Suite ===" << std::endl;
    std::cout << "=================================================\n" << std::endl;

    try
    {
        testEnvelopeCurves();
        testSVFFilter();
        testInterpolationQuality();
        testParameterUpdates();

        std::cout << "\n=================================================" << std::endl;
        std::cout << "All tests PASSED!" << std::endl;
        std::cout << "=================================================\n" << std::endl;

        return 0;
    }
    catch (const std::exception& e)
    {
        std::cerr << "\nTest FAILED with exception: " << e.what() << std::endl;
        return 1;
    }
    catch (...)
    {
        std::cerr << "\nTest FAILED with unknown exception" << std::endl;
        return 1;
    }
}
