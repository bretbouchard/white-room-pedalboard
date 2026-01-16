/*
  ==============================================================================

   SharedBridgeCoupling.h
   Multi-string bridge coupling for Aether String v2

   Simulates a shared mechanical bridge that multiple strings connect to,
   enabling:
   - Energy accumulation from all active strings
   - Bridge motion with mass simulation
   - Cross-string sympathetic vibration
   - Feedback from bridge to individual strings

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <array>
#include <vector>

//==============================================================================
/**
 * Shared bridge coupling between multiple strings
 *
 * Physics:
 * - Multiple strings transfer energy to shared bridge
 * - Bridge has mass (lowpass filtering effect)
 * - Bridge motion feeds back to strings (sympathetic vibration)
 * - Energy accumulates over time (blooms when many notes played)
 *
 * Use Cases:
 * - Giant instrument simulation (massive bridge)
 * - String-to-string coupling
 * - Resonant bloom effects
 */
class SharedBridgeCoupling
{
public:
    //==============================================================================
    SharedBridgeCoupling();
    ~SharedBridgeCoupling();

    //==============================================================================
    /** Initialize shared bridge for multiple strings

        @param sampleRate      Audio sample rate
        @param numStrings      Number of strings connected to bridge
    */
    void prepare(double sampleRate, int numStrings);

    /** Reset bridge to silence */
    void reset();

    //==============================================================================
    /** Add energy from a string to the bridge

        @param stringEnergy    Energy from string vibration
        @param stringIndex     Which string is contributing (0 to numStrings-1)

        @returns               Reflected energy back to string
    */
    float addStringEnergy(float stringEnergy, int stringIndex);

    /** Get current bridge motion (output to body resonator)

        @returns    Bridge displacement/velocity
    */
    float getBridgeMotion() const { return bridgeMotion; }

    /** Get feedback energy from bridge to specific string

        @param stringIndex     Which string to get feedback for

        @returns               Feedback energy (can be 0.0 if feedback disabled)
    */
    float getStringFeedback(int stringIndex) const;

    //==============================================================================
    /** Set bridge mass (affects coupling speed)

        Higher mass = slower response, more "weight"
        Lower mass = faster response, more "bounce"

        Range: 0.1 (light) to 10.0 (heavy)
        Default: 1.0 (medium)

        @param mass    Bridge mass multiplier
    */
    void setBridgeMass(float mass);

    /** Set cross-string coupling strength

        Controls how much energy bleeds between strings via bridge

        Range: 0.0 (no coupling) to 1.0 (strong coupling)
        Default: 0.1 (light coupling)

        @param coupling    Coupling coefficient
    */
    void setCrossStringCoupling(float coupling);

    /** Enable/disable feedback from bridge to strings

        @param enableFeedback    If true, bridge feeds energy back to strings
    */
    void setFeedbackEnabled(bool enableFeedback) { feedbackEnabled = enableFeedback; }

    //==============================================================================
    /** Get number of strings connected to bridge */
    int getNumStrings() const { return numStrings; }

private:
    //==============================================================================
    // Bridge state
    float bridgeMotion = 0.0f;              // Current bridge position/velocity
    float bridgeTargetMotion = 0.0f;         // Target motion (before mass filtering)
    float bridgeMass = 1.0f;                 // Mass multiplier (affects response speed)
    float crossStringCoupling = 0.1f;        // Energy bleed between strings
    bool feedbackEnabled = false;            // Bridge → string feedback

    // Per-string state
    std::vector<float> stringEnergy;         // Energy contribution from each string
    std::vector<float> stringFeedback;       // Feedback to each string
    int numStrings = 0;

    // Audio processing
    double sr = 48000.0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SharedBridgeCoupling)
};
