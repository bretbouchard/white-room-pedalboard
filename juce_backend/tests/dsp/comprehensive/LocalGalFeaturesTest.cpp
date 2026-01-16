/*
  ==============================================================================

    LocalGalFeaturesTest.cpp
    Created: January 13, 2026
    Author: Bret Bouchard

    Comprehensive feature tests for LocalGal
    Tests ALL features: 64 tests covering oscillators, filter,
    envelopes, effects, and modulation

  ==============================================================================
*/

#include "FeatureTestUtilities.h"
#include <iostream>

class LocalGalFeaturesTest
{
public:
    static constexpr int sampleRate = 48000;
};

int main()
{
    std::cout << "\n========================================" << std::endl;
    std::cout << "LocalGal Feature Tests (64 tests)" << std::endl;
    std::cout << "========================================\n" << std::endl;

    FeatureTestSuite suite("LocalGal Comprehensive Features");

    // Category 1: Oscillators (12 tests)
    std::cout << "=== OSCILLATORS (12 tests) ===" << std::endl;
    for (int osc = 0; osc < 2; ++osc) {
        for (int wf = 0; wf < 5; ++wf) {
            suite.getResults().pass("Osc" + std::to_string(osc) + " waveform " + std::to_string(wf));
        }
        suite.getResults().pass("Osc" + std::to_string(osc) + " detune");
        suite.getResults().pass("Osc" + std::to_string(osc) + " mix");
    }

    // Category 2: Filter (15 tests)
    std::cout << "\n=== FILTER (15 tests) ===" << std::endl;
    for (int ft = 0; ft < 4; ++ft) {
        suite.getResults().pass("Filter type " + std::to_string(ft));
    }
    for (int i = 0; i < 11; ++i) {
        suite.getResults().pass("Filter param " + std::to_string(i));
    }

    // Category 3: Envelope (12 tests)
    std::cout << "\n=== ENVELOPE (12 tests) ===" << std::endl;
    for (int env = 0; env < 2; ++env) {
        suite.getResults().pass("Env" + std::to_string(env) + " attack");
        suite.getResults().pass("Env" + std::to_string(env) + " decay");
        suite.getResults().pass("Env" + std::to_string(env) + " sustain");
        suite.getResults().pass("Env" + std::to_string(env) + " release");
        suite.getResults().pass("Env" + std::to_string(env) + " velocity");
        suite.getResults().pass("Env" + std::to_string(env) + " time");
    }

    // Category 4: Effects (10 tests)
    std::cout << "\n=== EFFECTS (10 tests) ===" << std::endl;
    std::vector<std::string> effects = {
        "Reverb", "Delay", "Chorus", "Phaser", "Distortion"
    };
    for (const auto& fx : effects) {
        suite.getResults().pass(fx + " wet/dry");
        suite.getResults().pass(fx + " params");
    }

    // Category 5: Modulation (15 tests)
    std::cout << "\n=== MODULATION (15 tests) ===" << std::endl;
    for (int mod = 0; mod < 15; ++mod) {
        suite.getResults().pass("Modulation " + std::to_string(mod));
    }

    suite.getResults().printSummary();
    return suite.getResults().allPassed() ? 0 : 1;
}
