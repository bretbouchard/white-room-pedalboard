/*
  ==============================================================================

    AetherDrivePureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Pure DSP implementation of Aether Drive
    Guitar effects pedal emulator with bridge nonlinearity and body resonator

  ==============================================================================
*/

#pragma once

#include <vector>
#include <cmath>
#include <cstring>

namespace DSP {

//==============================================================================
// Aether Drive - Guitar Effects Pedal Emulator
//==============================================================================

/**
 * Pure DSP engine for Aether Drive guitar effects pedal
 *
 * Extracted from KaneMarcoAetherString's bridge coupling and body resonator
 * to create a standalone guitar effects pedal emulator.
 *
 * Features:
 * - Bridge nonlinear saturation (soft clipping distortion)
 * - Modal body resonator (acoustic guitar body emulation)
 * - Warm, musical distortion character
 * - Tone control with shelving EQ
 * - Mix control (dry/wet)
 */
class AetherDrivePureDSP
{
public:
    //==============================================================================
    // Constructors
    //==============================================================================

    AetherDrivePureDSP();
    ~AetherDrivePureDSP();

    //==============================================================================
    // DSP Lifecycle
    //==============================================================================

    /**
     * Prepare the DSP engine for processing
     * @param sampleRate Sample rate in Hz
     * @param blockSize Maximum block size
     * @return true if successful
     */
    bool prepare(double sampleRate, int blockSize);

    /**
     * Reset all DSP state
     */
    void reset();

    /**
     * Process a block of audio samples
     * @param inputs Input buffers [numChannels][numSamples]
     * @param outputs Output buffers [numChannels][numSamples]
     * @param numChannels Number of channels (1=mono, 2=stereo)
     * @param numSamples Number of samples to process
     */
    void process(float** inputs, float** outputs, int numChannels, int numSamples);

    //==============================================================================
    // Parameters
    //==============================================================================

    /**
     * Get parameter value by ID
     * @param paramId Parameter ID string
     * @return Parameter value (0.0-1.0)
     */
    float getParameter(const char* paramId) const;

    /**
     * Set parameter value by ID
     * @param paramId Parameter ID string
     * @param value Parameter value (0.0-1.0)
     */
    void setParameter(const char* paramId, float value);

    //==============================================================================
    // Preset System
    //==============================================================================

    /**
     * Save current parameters to JSON buffer
     * @param jsonBuffer Output buffer for JSON
     * @param jsonBufferSize Size of JSON buffer
     * @return true if successful
     */
    bool savePreset(char* jsonBuffer, int jsonBufferSize) const;

    /**
     * Load parameters from JSON buffer
     * @param jsonData JSON string with parameter values
     * @return true if successful
     */
    bool loadPreset(const char* jsonData);

    //==============================================================================
    // Factory Presets
    //==============================================================================

    static constexpr int NUM_FACTORY_PRESETS = 8;

    /**
     * Load factory preset by index
     * @param index Preset index (0 to NUM_FACTORY_PRESETS-1)
     * @return true if successful
     */
    bool loadFactoryPreset(int index);

    /**
     * Get factory preset name
     * @param index Preset index
     * @return Preset name
     */
    static const char* getFactoryPresetName(int index);

private:
    //==============================================================================
    // Internal DSP Classes
    //==============================================================================

    /**
     * Bridge Nonlinear Saturation Circuit
     *
     * Based on KaneMarcoAetherString's bridge coupling nonlinearity.
     * Uses tanh() for soft clipping that simulates tube amp distortion.
     */
    class BridgeNonlinearity
    {
    public:
        BridgeNonlinearity();

        void prepare(double sampleRate);
        void reset();

        float processSample(float input);
        void setDrive(float drive);        // 0-1, controls amount of nonlinearity
        void setTone(float tone);          // 0-1, controls tone filtering

    private:
        float driveAmount = 0.5f;          // Nonlinearity amount
        float toneAmount = 0.5f;           // Tone control
        float state = 0.0f;                // Filter state
        double sampleRate = 48000.0;
    };

    /**
     * Modal Body Resonator
     *
     * Based on KaneMarcoAetherString's modal body resonator.
     * Simulates acoustic guitar body response using 8 modal resonators.
     */
    class ModalBodyResonator
    {
    public:
        struct Mode
        {
            float frequency = 440.0f;      // Resonant frequency
            float amplitude = 1.0f;        // Resonance strength
            float decay = 1.0f;            // Decay time in seconds
            float phase = 0.0f;            // Oscillator phase
            float energy = 0.0f;           // Current energy level

            void prepare(double sampleRate);
            float processSample(float excitation);
            void reset();
        };

        ModalBodyResonator();
        ~ModalBodyResonator() = default;

        void prepare(double sampleRate);
        void reset();

        float processSample(float input);
        void setResonance(float amount);   // 0-1, overall resonance amount

        void loadGuitarBodyPreset();
        void loadViolinBodyPreset();
        void loadCelloBodyPreset();
        void loadUprightBassPreset();

        int getNumModes() const { return static_cast<int>(modes.size()); }
        float getModeFrequency(int index) const;

    private:
        std::vector<Mode> modes;
        double sampleRate = 48000.0;
        float resonanceAmount = 1.0f;
    };

    //==============================================================================
    // Parameters Structure
    //==============================================================================

    struct Parameters
    {
        // Distortion
        float drive = 0.5f;                // Drive amount (0-1)

        // Tone
        float bass = 0.5f;                 // Bass shelving (0-1)
        float mid = 0.5f;                  // Mid presence (0-1)
        float treble = 0.5f;               // Treble shelving (0-1)

        // Resonance
        float bodyResonance = 0.5f;        // Body resonance amount (0-1)
        float resonanceDecay = 0.5f;       // Resonance decay time (0-1)

        // Mix
        float mix = 0.5f;                  // Dry/wet mix (0=dry, 1=wet)
        float outputLevel = 0.8f;          // Output level (0-1)

        // Cabinet simulation
        float cabinetSimulation = 0.3f;    // Cabinet resonance amount (0-1)
    } params_;

    //==============================================================================
    // Helper Functions
    //==============================================================================

    void applyParameters();
    bool writeJsonParameter(const char* name, double value,
                           char* buffer, int& offset, int bufferSize) const;
    bool parseJsonParameter(const char* json, const char* param, double& value) const;

    //==============================================================================
    // Member Variables
    //==============================================================================

    BridgeNonlinearity bridgeNonlinearity_;
    ModalBodyResonator bodyResonator_;

    double sampleRate_ = 48000.0;
    int blockSize_ = 512;

    // Temporary buffers for processing (avoid real-time allocations)
    static constexpr int MAX_BLOCK_SIZE = 512;
    float tempBuffer_[MAX_BLOCK_SIZE];
};

//==============================================================================
// Factory Preset Definitions
//==============================================================================

struct AetherDrivePreset
{
    const char* name;
    float drive;
    float bass;
    float mid;
    float treble;
    float bodyResonance;
    float resonanceDecay;
    float mix;
    float outputLevel;
    float cabinetSimulation;
};

static const AetherDrivePreset AETHER_DRIVE_FACTORY_PRESETS[AetherDrivePureDSP::NUM_FACTORY_PRESETS] =
{
    { "Clean Boost", 0.2f, 0.5f, 0.5f, 0.6f, 0.3f, 0.4f, 0.3f, 0.8f, 0.2f },
    { "Crunch", 0.5f, 0.6f, 0.5f, 0.5f, 0.5f, 0.5f, 0.6f, 0.8f, 0.3f },
    { "Overdrive", 0.7f, 0.6f, 0.6f, 0.5f, 0.6f, 0.6f, 0.8f, 0.7f, 0.4f },
    { "Distortion", 0.9f, 0.5f, 0.7f, 0.6f, 0.4f, 0.3f, 1.0f, 0.6f, 0.5f },
    { "Fuzz", 1.0f, 0.4f, 0.8f, 0.7f, 0.2f, 0.2f, 1.0f, 0.5f, 0.6f },
    { "Warm Tube", 0.6f, 0.7f, 0.5f, 0.4f, 0.8f, 0.7f, 0.7f, 0.7f, 0.4f },
    { "Acoustic Body", 0.3f, 0.8f, 0.5f, 0.6f, 0.9f, 0.8f, 0.5f, 0.8f, 0.3f },
    { "Bass Warmth", 0.4f, 0.9f, 0.6f, 0.4f, 0.7f, 0.6f, 0.6f, 0.8f, 0.5f }
};

} // namespace DSP
