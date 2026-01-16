/*
  ==============================================================================

    KaneMarcoAetherDSP.h
    Created: 25 Dec 2025
    Author:  Bret Bouchard

    Pure DSP implementation of Kane Marco Aether Physical Modeling Synthesizer
    - Exciter-resonator architecture
    - 32-mode modal synthesis
    - Feedback loop with saturation
    - 16-voice polyphony
    - JSON preset save/load system
    - FFI-compatible for Swift bridge

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include "../../tests/dsp/DSPTestFramework.h"
#include <memory>
#include <array>
#include <vector>
#include <cmath>

//==============================================================================
/**
 * @brief Kane Marco Aether - Physical Modeling Ambient Synthesizer
 *
 * Pure modal synthesis with exciter-resonator architecture.
 * Designed for tvOS deployment with realtime-safe processing.
 */
class KaneMarcoAetherDSP : public juce::AudioProcessor
{
public:
    //==============================================================================
    // Construction/Destruction
    //==============================================================================

    KaneMarcoAetherDSP();
    ~KaneMarcoAetherDSP() override;

    //==============================================================================
    // AudioProcessor Implementation (REQUIRED)
    //==============================================================================

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    //==============================================================================
    // Processor Information
    //==============================================================================

    const juce::String getName() const override { return "KaneMarcoAetherDSP"; }
    double getTailLengthSeconds() const override { return tailLengthSeconds; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }

    //==============================================================================
    // Editor Support (Headless - no GUI)
    //==============================================================================

    bool hasEditor() const override { return false; }
    juce::AudioProcessorEditor* createEditor() override { return nullptr; }

    //==============================================================================
    // Program/Preset Management
    //==============================================================================

    int getNumPrograms() override { return static_cast<int>(factoryPresets.size()); }
    int getCurrentProgram() override { return currentPresetIndex; }
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int index, const juce::String& newName) override { }

    //==============================================================================
    // Parameter System (REQUIRED for tvOS)
    //==============================================================================

    juce::AudioProcessorValueTreeState parameters;
    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    float getParameterValue(const juce::String& paramID) const;
    void setParameterValue(const juce::String& paramID, float value);
    std::vector<DSPTestFramework::PresetParameterInfo> getParameterList() const;

    //==============================================================================
    // Preset System (REQUIRED for tvOS)
    //==============================================================================

    struct PresetInfo
    {
        juce::String name;
        juce::String author;
        juce::String description;
        juce::String version;
        juce::String category;
        juce::String creationDate;
    };

    std::string getPresetState() const;
    void setPresetState(const std::string& jsonData);
    bool validatePreset(const std::string& jsonData) const;
    PresetInfo getPresetInfo(const std::string& jsonData) const;

    //==============================================================================
    // State Serialization
    //==============================================================================

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==============================================================================
    // Public DSP Components (for testing)
    //==============================================================================

    //==========================================================================
    /**
     * @brief Single Modal Filter (Direct Form II Biquad)
     *
     * Implements 2nd-order resonant filter using Direct Form II transposed structure.
     * Each mode represents a single resonant frequency of the physical body.
     *
     * Transfer Function:
     * H(z) = (1 - r) / (1 - 2r*cos(ω₀T)z⁻¹ + r²z⁻²)
     *
     * Where:
     * - ω₀ = 2πf₀ (resonant frequency)
     * - r = e^(-π/T₆₀) (decay coefficient)
     * - T = sample period
     *
     * Reference: Smith, J.O. "Physical Audio Signal Processing" (CCRMA)
     */
    struct ModalFilter
    {
        //======================================================================
        // Modal Parameters
        //======================================================================

        float frequency = 440.0f;          ///< Resonant frequency (Hz)
        float amplitude = 1.0f;            ///< Mode amplitude (0.0 to 1.0)
        float decay = 0.995f;              ///< Per-sample decay coefficient (0.0 to 1.0)
        float decayTimeMs = 1000.0f;       ///< T60 decay time in milliseconds

        //======================================================================
        // Biquad Coefficients (Direct Form II)
        //======================================================================

        float b0 = 0.0f;                    ///< Feedforward coefficient
        float a1 = 0.0f;                    ///< First feedback coefficient
        float a2 = 0.0f;                    ///< Second feedback coefficient

        //======================================================================
        // State Variables (Direct Form II)
        //======================================================================

        float s1 = 0.0f;                    ///< First state variable
        float s2 = 0.0f;                    ///< Second state variable

        //======================================================================
        /**
         * @brief Calculate biquad coefficients from frequency and decay
         *
         * Uses resonator formula:
         * - omega = 2π * f / sr
         * - r = decay coefficient (calculated from T60)
         * - b0 = 1 - r
         * - a1 = -2r * cos(omega)
         * - a2 = r²
         *
         * @param sampleRate Sample rate in Hz
         */
        void updateCoefficients(double sampleRate)
        {
            // Convert T60 decay time to per-sample coefficient
            // r = e^(-π / (T60 * sr))
            double t60Seconds = decayTimeMs * 0.001;
            decay = static_cast<float>(std::exp(-juce::MathConstants<double>::pi / (t60Seconds * sampleRate)));

            // Calculate angular frequency
            double omega = 2.0 * juce::MathConstants<double>::pi * frequency / sampleRate;

            // Calculate coefficients (resonator formula)
            b0 = 1.0f - decay;
            a1 = -2.0f * decay * static_cast<float>(std::cos(omega));
            a2 = decay * decay;
        }

        //======================================================================
        /**
         * @brief Process single sample through modal filter
         *
         * Direct Form II biquad structure:
         * - w(n) = x(n) - a1*w(n-1) - a2*w(n-2)
         * - y(n) = b0*w(n)
         *
         * State variables:
         * - s1 = w(n-1)
         * - s2 = w(n-2)
         *
         * Denormal prevention: Add tiny DC offset (+1e-10f) to prevent
         * denormal numbers when processing low-level signals.
         *
         * @param input Input sample
         * @return Filtered output sample
         */
        float processSample(float input)
        {
            // Denormal prevention (critical for CPU performance)
            input += 1.0e-10f;

            // Direct Form II biquad
            float output = input * b0 + s1;
            s1 = s2 - a1 * output;
            s2 = -a2 * output;

            // Apply mode amplitude
            return output * amplitude;
        }

        //======================================================================
        /**
         * @brief Reset filter state variables
         *
         * Clears all state variables to zero. Use this when starting
         * a new note or clearing voice state.
         */
        void reset()
        {
            s1 = 0.0f;
            s2 = 0.0f;
        }
    };

    //==========================================================================
    /**
     * @brief Resonator Bank (Multiple Modal Filters)
     *
     * Container for 8-32 modal filters that sum to create complex
     * resonant spectra (metallic, wooden, inharmonic).
     *
     * Features:
     * - Equal-power normalization (1/sqrt(N)) prevents clipping
     * - Mode skipping optimization (amplitude < 0.001 skips processing)
     * - Harmonic + inharmonic frequency distribution strategies
     *
     * Task 1.2: Implement 8-mode bank (MVP), expand to 32 modes in Phase 2
     */
    class ResonatorBank
    {
    public:
        //======================================================================
        ResonatorBank()
        {
            // Initialize all modes to default values
            for (int i = 0; i < 32; ++i)
            {
                modes[i].frequency = 440.0f * (i + 1);
                modes[i].amplitude = 1.0f;
                modes[i].decayTimeMs = 1000.0f;
            }

            // Calculate equal-power normalization factor
            // 1/sqrt(N) where N = activeModeCount
            updateNormalization();
        }

        //======================================================================
        /**
         * @brief Prepare resonator bank for processing
         *
         * Recalculate coefficients for all modes based on sample rate.
         *
         * @param sampleRate Sample rate in Hz
         */
        void prepare(double sampleRate)
        {
            for (auto& mode : modes)
            {
                mode.updateCoefficients(sampleRate);
            }
        }

        //======================================================================
        /**
         * @brief Process sample through all active modes
         *
         * Sums output from all active modes with equal-power normalization.
         * Mode skipping optimization: skips modes with amplitude < 0.001.
         *
         * Equal-power normalization: output *= 1/sqrt(N)
         * This prevents clipping when all modes are in phase.
         *
         * @param input Input sample (excitation signal)
         * @return Filtered output sample
         */
        float processSample(float input)
        {
            float output = 0.0f;

            // Process all active modes with mode skipping optimization
            for (int i = 0; i < activeModeCount; ++i)
            {
                // Mode skipping: skip if amplitude is negligible
                if (modes[i].amplitude > 0.001f)
                {
                    output += modes[i].processSample(input);
                }
            }

            // Apply equal-power normalization (prevents clipping)
            output *= normalizationFactor;

            return output;
        }

        //======================================================================
        /**
         * @brief Set frequency of specific mode
         *
         * @param modeIndex Mode index (0-31)
         * @param frequency Frequency in Hz
         */
        void setModeFrequency(int modeIndex, float frequency)
        {
            if (modeIndex >= 0 && modeIndex < 32)
            {
                modes[modeIndex].frequency = frequency;
            }
        }

        //======================================================================
        /**
         * @brief Set decay time of specific mode
         *
         * @param modeIndex Mode index (0-31)
         * @param decayTimeMs T60 decay time in milliseconds
         * @param sampleRate Sample rate in Hz
         */
        void setModeDecay(int modeIndex, float decayTimeMs, double sampleRate)
        {
            if (modeIndex >= 0 && modeIndex < 32)
            {
                modes[modeIndex].decayTimeMs = decayTimeMs;
                modes[modeIndex].updateCoefficients(sampleRate);
            }
        }

        //======================================================================
        /**
         * @brief Set active mode count (8-32)
         *
         * Updates normalization factor when mode count changes.
         *
         * @param count Number of active modes (8-32)
         */
        void setModeCount(int count)
        {
            activeModeCount = juce::jlimit(8, 32, count);
            updateNormalization();
        }

        //======================================================================
        /**
         * @brief Reset all modes
         */
        void reset()
        {
            for (auto& mode : modes)
            {
                mode.reset();
            }
        }

        //======================================================================
        // Mode count (8-32, user-adjustable)
        int activeModeCount = 8;  // MVP: Start with 8 modes

        //======================================================================
        // Public access to modes (for testing)
        std::array<ModalFilter, 32> modes;  ///< 32 modal filters (expandable)

    private:
        //======================================================================
        float normalizationFactor = 1.0f;  ///< Equal-power normalization (1/sqrt(N))

        //======================================================================
        /**
         * @brief Update equal-power normalization factor
         *
         * Calculates 1/sqrt(N) where N = activeModeCount.
         * This prevents clipping when all modes sum in phase.
         */
        void updateNormalization()
        {
            normalizationFactor = 1.0f / std::sqrt(static_cast<float>(activeModeCount));
        }
    };

private:
    //==============================================================================
    // Internal DSP Components
    //==============================================================================


    //==========================================================================
    /**
     * @brief Exciter (Noise Burst Generator)
     *
     * Generates filtered noise bursts with envelope to excite resonator.
     * Task 1.3: Implementation
     */
    struct Exciter
    {
        juce::Random random;
        juce::dsp::StateVariableTPTFilter<float> colorFilter;

        float currentPressure = 0.0f;
        float targetPressure = 0.0f;
        float smoothPressure = 0.0f;

        bool isActive = false;

        Exciter()
        {
            colorFilter.setCutoffFrequency(1000.0f);
            colorFilter.setResonance(0.7f);
            colorFilter.setType(juce::dsp::StateVariableTPTFilter<float>::Type::bandpass);
        }

        void prepare(const juce::dsp::ProcessSpec& spec)
        {
            colorFilter.prepare(spec);
        }

        void noteOn(float velocity)
        {
            // Map velocity to pressure (0.3 to 1.0 range)
            targetPressure = juce::jmap(velocity, 0.0f, 1.0f, 0.3f, 1.0f);
            isActive = true;
        }

        void noteOff()
        {
            targetPressure = 0.0f;
        }

        float processSample()
        {
            if (!isActive && smoothPressure < 0.001f)
                return 0.0f;

            // Smooth pressure (10ms attack/release smoothing)
            float smoothingFactor = 0.001f; // ~1ms at 48kHz
            smoothPressure += (targetPressure - smoothPressure) * smoothingFactor;

            // Check if exciter is finished
            if (!isActive && smoothPressure < 0.001f)
                return 0.0f;

            // Generate white noise
            float noise = random.nextFloat() * 2.0f - 1.0f;

            // Apply color filter (bandpass for brightness control)
            float filtered = colorFilter.processSample(0, noise);

            // Apply pressure envelope
            return filtered * smoothPressure * 0.8f; // Scale to prevent clipping
        }

        void reset()
        {
            currentPressure = 0.0f;
            targetPressure = 0.0f;
            smoothPressure = 0.0f;
            isActive = false;
            colorFilter.reset();
        }

        void setColor(float frequency)
        {
            colorFilter.setCutoffFrequency(frequency);
        }
    };

    //==========================================================================
    /**
     * @brief Feedback Loop with Delay Line and Saturation
     *
     * Sustains resonance with soft clipping to prevent runaway oscillation.
     * Task 1.4: Implementation
     */
    class FeedbackLoop
    {
    public:
        //======================================================================
        FeedbackLoop() : writeIndex(0), delaySamples(100), feedbackAmount(0.5f),
                         saturationDrive(2.0f), feedbackMix(0.3f)
        {
            delayBuffer.resize(4096, 0.0f);
        }

        //======================================================================
        void prepare(double sampleRate, int maxDelaySamples)
        {
            delayBuffer.resize(maxDelaySamples, 0.0f);
            std::fill(delayBuffer.begin(), delayBuffer.end(), 0.0f);
            writeIndex = 0;
        }

        //======================================================================
        float processSample(float input)
        {
            // Read delayed sample with linear interpolation
            float delayed = readDelay();

            // Apply saturation (SOFT CLIPPING - CRITICAL for stability)
            float saturated = std::tanh(delayed * feedbackAmount * saturationDrive);

            // Mix input with feedback
            float excitation = input + saturated * feedbackMix;

            // Write to delay
            writeDelay(excitation);

            return excitation;
        }

        //======================================================================
        void setFeedbackAmount(float amount)
        {
            // HARD LIMIT to prevent runaway (NEVER >= 1.0)
            feedbackAmount = juce::jlimit(0.0f, 0.95f, amount);
        }

        //======================================================================
        void setDelayTime(float timeMs, double sampleRate)
        {
            delaySamples = static_cast<int>(timeMs * 0.001f * sampleRate);
            delaySamples = juce::jmin(delaySamples, static_cast<int>(delayBuffer.size()) - 1);
        }

        //======================================================================
        void setSaturationDrive(float drive)
        {
            saturationDrive = drive;
        }

        //======================================================================
        void reset()
        {
            std::fill(delayBuffer.begin(), delayBuffer.end(), 0.0f);
            writeIndex = 0;
        }

    private:
        //======================================================================
        std::vector<float> delayBuffer;
        int writeIndex;
        int delaySamples;
        float feedbackAmount;
        float saturationDrive;
        float feedbackMix;

        //======================================================================
        float readDelay()
        {
            int readIndex = writeIndex - delaySamples;
            if (readIndex < 0)
                readIndex += static_cast<int>(delayBuffer.size());

            // Linear interpolation
            int index0 = readIndex % static_cast<int>(delayBuffer.size());
            int index1 = (index0 + 1) % static_cast<int>(delayBuffer.size());

            return delayBuffer[index0];
        }

        //======================================================================
        void writeDelay(float sample)
        {
            delayBuffer[writeIndex] = sample;
            writeIndex = (writeIndex + 1) % static_cast<int>(delayBuffer.size());
        }
    };

    //==========================================================================
    /**
     * @brief Complete Voice Structure
     *
     * Integrates Exciter + Resonator + Feedback + Filter + Envelope
     * Task 1.5: Implementation
     */
    struct Voice
    {
        Exciter exciter;
        ResonatorBank resonator;
        FeedbackLoop feedback;
        juce::dsp::StateVariableTPTFilter<float> filter;
        juce::ADSR envelope;

        int midiNote = -1;
        float velocity = 0.0f;
        bool active = false;

        //======================================================================
        void prepare(const juce::dsp::ProcessSpec& spec)
        {
            exciter.prepare(spec);
            resonator.prepare(spec.sampleRate);
            feedback.prepare(spec.sampleRate, 4096);
            filter.prepare(spec);
            filter.setType(juce::dsp::StateVariableTPTFilter<float>::Type::lowpass);
            envelope.setSampleRate(spec.sampleRate);
        }

        //======================================================================
        void noteOn(int note, float vel)
        {
            midiNote = note;
            velocity = vel;
            active = true;
            exciter.noteOn(vel);
            envelope.noteOn();
        }

        //======================================================================
        void noteOff(float vel)
        {
            exciter.noteOff();
            envelope.noteOff();
        }

        //======================================================================
        void process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples)
        {
            if (!active)
                return;

            for (int sample = startSample; sample < startSample + numSamples; ++sample)
            {
                // 1. Generate excitation
                float excitation = exciter.processSample();

                // 2. Apply feedback
                float withFeedback = feedback.processSample(excitation);

                // 3. Process through resonator bank
                float resonant = resonator.processSample(withFeedback);

                // 4. Apply filter (TODO: requires processContext)
                float filtered = resonant; // Pass-through for now

                // 5. Apply amplitude envelope
                float env = envelope.getNextSample();
                float output = filtered * env * velocity;

                // 6. Write to output buffer (stereo)
                for (int channel = 0; channel < buffer.getNumChannels(); ++channel)
                {
                    buffer.addSample(channel, sample, output);
                }
            }

            // Check if voice ended
            if (!envelope.isActive())
            {
                active = false;
            }
        }

        //======================================================================
        void reset()
        {
            exciter.reset();
            resonator.reset();
            feedback.reset();
            filter.reset();
            envelope.reset();
            active = false;
            midiNote = -1;
        }
    };

    //==========================================================================
    std::array<Voice, 16> voices;
    int allocateVoice(int midiNote, float velocity);
    int findVoice(int midiNote);
    void freeVoice(int voiceIndex);

    //==========================================================================
    juce::dsp::ProcessorChain<
        juce::dsp::Gain<float>,
        juce::dsp::Reverb
    > masterEffects;

    //==========================================================================
    struct FactoryPreset
    {
        juce::String name;
        juce::String category;
        juce::MemoryBlock data;
    };

    std::vector<FactoryPreset> factoryPresets;
    int currentPresetIndex = 0;
    void loadFactoryPresets();

    //==========================================================================
    double currentSampleRate = 48000.0;
    double tailLengthSeconds = 3.0;
    float currentPitchBend = 0.0f;

    //==========================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(KaneMarcoAetherDSP)
};
