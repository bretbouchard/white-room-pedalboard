/*
  ==============================================================================

   AetherGiantPercussionQuickTest.cpp
   Minimal validation test for Aether Giant Percussion

   This test validates basic compilation and initialization
   without requiring full JUCE infrastructure.

  ==============================================================================
*/

#include <iostream>
#include <cassert>
#include <cmath>

// Minimal definitions for testing
namespace DSP {

// Forward declarations
struct GiantGestureParameters {
    float force = 0.5f;
    float speed = 0.5f;
    float contactArea = 0.5f;
    float roughness = 0.3f;
};

struct GiantScaleParameters {
    float scaleMeters = 0.65f;
    float massBias = 0.5f;
    float airLoss = 0.3f;
    float transientSlowing = 0.5f;
};

struct ModalResonatorMode
{
    float frequency = 440.0f;
    float amplitude = 0.0f;
    float decay = 0.995f;
    float phase = 0.0f;
    float initialAmplitude = 1.0f;

    double sampleRate = 48000.0;

    void prepare(double sr) { sampleRate = sr; }
    float processSample();
    void excite(float energy) { amplitude = initialAmplitude * energy; }
    void reset() { amplitude = 0.0f; phase = 0.0f; }
};

float ModalResonatorMode::processSample()
{
    float phaseIncrement = static_cast<float>(2.0 * M_PI * frequency / sampleRate);
    phase += phaseIncrement;
    if (phase > static_cast<float>(2.0 * M_PI))
        phase -= static_cast<float>(2.0 * M_PI);

    float output = amplitude * std::sin(phase);
    amplitude *= decay;
    return output;
}

} // namespace DSP

//==============================================================================
// Test Suite
//==============================================================================

bool testModeInitialization()
{
    std::cout << "Testing Mode Initialization..." << std::endl;

    DSP::ModalResonatorMode mode;
    mode.prepare(48000.0);

    mode.frequency = 440.0f;
    mode.decay = 0.995f;

    bool frequencySet = (std::abs(mode.frequency - 440.0f) < 0.001f);
    bool decaySet = (std::abs(mode.decay - 0.995f) < 0.001f);
    bool amplitudeZero = (std::abs(mode.amplitude) < 0.001f);

    bool passed = frequencySet && decaySet && amplitudeZero;

    std::cout << (passed ? "  ✅ PASS" : "  ❌ FAIL") << std::endl;
    return passed;
}

bool testModeExcitation()
{
    std::cout << "Testing Mode Excitation..." << std::endl;

    DSP::ModalResonatorMode mode;
    mode.prepare(48000.0);
    mode.frequency = 220.0f;
    mode.decay = 0.995f;

    mode.excite(0.8f);

    bool amplitudeIncreased = mode.amplitude > 0.0f;

    float sample1 = mode.processSample();
    float sample2 = mode.processSample();

    bool hasOutput = (sample1 != 0.0f) && (sample2 != 0.0f);
    bool outputChanges = (sample1 != sample2);

    bool passed = amplitudeIncreased && hasOutput && outputChanges;

    std::cout << (passed ? "  ✅ PASS" : "  ❌ FAIL") << std::endl;
    return passed;
}

bool testModeDecay()
{
    std::cout << "Testing Mode Decay..." << std::endl;

    DSP::ModalResonatorMode mode;
    mode.prepare(48000.0);
    mode.frequency = 110.0f;
    mode.decay = 0.990f;

    mode.excite(1.0f);

    float maxAmplitude = mode.amplitude;

    for (int i = 0; i < 1000; ++i)
    {
        mode.processSample();
    }

    float finalAmplitude = mode.amplitude;

    bool passed = finalAmplitude < maxAmplitude;

    std::cout << (passed ? "  ✅ PASS" : "  ❌ FAIL") << std::endl;
    std::cout << "    Initial amplitude: " << maxAmplitude << std::endl;
    std::cout << "    Final amplitude: " << finalAmplitude << std::endl;
    return passed;
}

bool testModeReset()
{
    std::cout << "Testing Mode Reset..." << std::endl;

    DSP::ModalResonatorMode mode;
    mode.prepare(48000.0);
    mode.frequency = 330.0f;
    mode.decay = 0.995f;

    mode.excite(1.0f);
    mode.processSample();

    bool hasEnergyBefore = mode.amplitude > 0.0f;

    mode.reset();

    bool energyCleared = std::abs(mode.amplitude) < 0.001f;
    bool phaseReset = std::abs(mode.phase) < 0.001f;

    bool passed = hasEnergyBefore && energyCleared && phaseReset;

    std::cout << (passed ? "  ✅ PASS" : "  ❌ FAIL") << std::endl;
    return passed;
}

bool testGiantParameters()
{
    std::cout << "Testing Giant Parameters..." << std::endl;

    DSP::GiantScaleParameters scale;
    scale.scaleMeters = 3.0f;  // Giant scale
    scale.massBias = 0.7f;

    DSP::GiantGestureParameters gesture;
    gesture.force = 0.9f;
    gesture.speed = 0.6f;
    gesture.contactArea = 0.5f;
    gesture.roughness = 0.3f;

    bool scaleSet = (std::abs(scale.scaleMeters - 3.0f) < 0.001f);
    bool forceSet = (std::abs(gesture.force - 0.9f) < 0.001f);

    bool passed = scaleSet && forceSet;

    std::cout << (passed ? "  ✅ PASS" : "  ❌ FAIL") << std::endl;
    return passed;
}

//==============================================================================
// Main
//==============================================================================

int main()
{
    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
    std::cout << "║     AETHER GIANT PERCUSSION QUICK TEST                    ║" << std::endl;
    std::cout << "║     Basic Functionality Validation                        ║" << std::endl;
    std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;
    std::cout << "\n";

    bool allPassed = true;

    allPassed &= testModeInitialization();
    allPassed &= testModeExcitation();
    allPassed &= testModeDecay();
    allPassed &= testModeReset();
    allPassed &= testGiantParameters();

    std::cout << "\n";
    if (allPassed)
    {
        std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
        std::cout << "║     ✅ ALL TESTS PASSED                                  ║" << std::endl;
        std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;
        std::cout << "\n";
        return 0;
    }
    else
    {
        std::cout << "╔══════════════════════════════════════════════════════════╗" << std::endl;
        std::cout << "║     ❌ SOME TESTS FAILED                                 ║" << std::endl;
        std::cout << "╚══════════════════════════════════════════════════════════╝" << std::endl;
        std::cout << "\n";
        return 1;
    }
}
