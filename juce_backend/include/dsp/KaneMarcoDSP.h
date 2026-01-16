/*
  ==============================================================================

    KaneMarcoDSP.h
    Created: 25 Dec 2025
    Author:  Bret Bouchard

    Kane Marco Hybrid Virtual Analog Synthesizer
    - Oscillator WARP (-1.0 to +1.0 phase manipulation)
    - FM synthesis with carrier/modulator swap
    - 16-slot modulation matrix (thread-safe with std::atomic)
    - 8 macro controls (Serum-style)
    - 30 factory presets

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
#include <atomic>
#include <cmath>

//==============================================================================
/**
 * @brief Kane Marco Hybrid Virtual Analog Synthesizer
 *
 * Combines traditional subtractive synthesis with FM capabilities
 * and oscillator warp for experimental timbres.
 *
 * Key Features:
 * - Oscillator WARP: Phase manipulation -1.0 to +1.0
 * - FM Synthesis: Carrier/modulator swap, linear/exponential FM
 * - Sub-oscillator: -1 octave square wave
 * - SVF multimode filter: LP, HP, BP, NOTCH (zero-delay feedback)
 * - 16-slot modulation matrix with lock-free atomics
 * - 8 macro controls (Serum-style simplified)
 * - 16-voice polyphony with monophonic/legato modes
 */
class KaneMarcoDSP : public juce::AudioProcessor
{
public:
    //==============================================================================
    // Construction/Destruction
    //==============================================================================

    KaneMarcoDSP();
    ~KaneMarcoDSP() override;

    //==============================================================================
    // AudioProcessor Implementation (REQUIRED)
    //==============================================================================

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    //==============================================================================
    // Processor Information
    //==============================================================================

    const juce::String getName() const override { return "KaneMarcoDSP"; }
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
    void changeProgramName(int index, const juce::String& newName) override { /* Factory presets read-only */ }

    //==============================================================================
    // Parameter System (REQUIRED for tvOS)
    //==============================================================================

    /**
     * @brief All parameters managed by ValueTreeState
     *
     * Thread-safe parameter automation handled automatically
     */
    juce::AudioProcessorValueTreeState parameters;

    /**
     * Create parameter layout for AudioProcessorValueTreeState
     */
    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    /**
     * Get parameter value by ID (for FFI bridge)
     */
    float getParameterValue(const juce::String& paramID) const;

    /**
     * Set parameter value by ID (for FFI bridge)
     */
    void setParameterValue(const juce::String& paramID, float value);

    /**
     * Get list of all parameters with metadata (for Flutter UI)
     */
    std::vector<DSPTestFramework::PresetParameterInfo> getParameterList() const;

    //==============================================================================
    // Preset System (REQUIRED for tvOS)
    //==============================================================================

    /**
     * Preset metadata structure
     */
    struct PresetInfo
    {
        juce::String name;
        juce::String author;
        juce::String description;
        juce::String version;
        juce::String category;
        juce::String creationDate;
    };

    /**
     * Save current state to JSON string
     * Format compatible with Flutter UI preset system
     */
    std::string getPresetState() const;

    /**
     * Load state from JSON string
     */
    void setPresetState(const std::string& jsonData);

    /**
     * Validate preset JSON structure and parameters
     * Returns true if preset is valid, false otherwise
     */
    bool validatePreset(const std::string& jsonData) const;

    /**
     * Get preset metadata from JSON
     */
    PresetInfo getPresetInfo(const std::string& jsonData) const;

    //==============================================================================
    // State Serialization
    //==============================================================================

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==============================================================================
    // Voice Management (for testing)
    //==============================================================================

    /**
     * Get current active voice count
     */
    int getActiveVoiceCount() const;

private:
    //==============================================================================
    // OSCILLATOR IMPLEMENTATION
    //==============================================================================

    /**
     * @brief Oscillator waveform types
     */
    enum class Waveform
    {
        SAW = 0,
        SQUARE,
        TRIANGLE,
        SINE,
        PULSE
    };

    /**
     * @brief Custom Oscillator with PolyBLEP anti-aliasing
     *
     * Implements oscillator WARP phase manipulation and FM synthesis
     */
    struct Oscillator
    {
        double phase = 0.0;
        double phaseIncrement = 0.0;
        float warp = 0.0f;           // -1.0 to 1.0 phase warp
        float pulseWidth = 0.5f;     // For pulse waveform
        Waveform waveform = Waveform::SAW;

        // FM synthesis state
        bool isFMCcarrier = false;   // True if this is FM carrier
        bool fmModulatorInputActive = false;
        float fmDepth = 0.0f;

        void prepare(double sampleRate);
        void reset();
        void setFrequency(float freqHz, double sampleRate);
        void setWarp(float warpAmount);
        void setWaveform(int waveformIndex);
        float processSample();
        float processSampleWithFM(float modulationInput);

    private:
        float generateWaveform(double phase) const;
        float polyBlep(double t, double dt) const;
        float polyBlepSaw(double phase) const;
        float polyBlepSquare(double phase) const;
        float polyBlepTriangle(double phase) const;
        float polyBlepPulse(double phase, double pulseWidth) const;
    };

    /**
     * @brief Sub-oscillator (-1 octave, square wave)
     */
    struct SubOscillator
    {
        double phase = 0.0;
        double phaseIncrement = 0.0;
        bool enabled = true;
        float level = 0.5f;

        void prepare(double sampleRate);
        void reset();
        void setFrequency(float baseFreq, double sampleRate);
        float processSample();
    };

    //==============================================================================
    // FILTER IMPLEMENTATION
    //==============================================================================

    /**
     * @brief Filter types
     */
    enum class FilterType
    {
        LOWPASS = 0,
        HIGHPASS,
        BANDPASS,
        NOTCH
    };

    /**
     * @brief State Variable Filter wrapper
     *
     * Uses juce::dsp::StateVariableTPTFilter for zero-delay feedback
     */
    struct Filter
    {
        juce::dsp::StateVariableTPTFilter<float> svf;
        FilterType type = FilterType::LOWPASS;
        float cutoff = 1000.0f;
        float resonance = 0.5f;
        float keyTrackingAmount = 0.0f;
        float velocityTrackingAmount = 0.0f;
        float envelopeAmount = 0.0f;

        void prepare(const juce::dsp::ProcessSpec& spec);
        void reset();
        void setType(FilterType t);
        void setCutoff(float freqHz);
        void setResonance(float res);
        void process(juce::dsp::ProcessContextReplacing<float>& context);
        void processSample(float& sample, float modulation = 0.0f);
    };

    //==============================================================================
    // ENVELOPE IMPLEMENTATION
    //==============================================================================

    /**
     * @brief ADSR Envelope with amount control
     */
    struct Envelope
    {
        juce::ADSR adsr;
        juce::ADSR::Parameters params;

        float attack = 0.01f;
        float decay = 0.1f;
        float sustain = 0.5f;
        float release = 0.2f;
        float amount = 1.0f;  // Envelope modulation depth

        void prepare(double sampleRate);
        void setParameters();
        void noteOn();
        void noteOff();
        float processSample();
        bool isActive() const;
    };

    //==============================================================================
    // LFO IMPLEMENTATION
    //==============================================================================

    /**
     * @brief LFO waveforms
     */
    enum class LFOWaveform
    {
        SINE = 0,
        TRIANGLE,
        SAWTOOTH,
        SQUARE,
        SAMPLE_AND_HOLD
    };

    /**
     * @brief Low-Frequency Oscillator
     */
    struct LFO
    {
        double phase = 0.0;
        double phaseIncrement = 0.0;
        float rate = 5.0f;           // Hz
        float depth = 1.0f;
        float output = 0.0f;
        LFOWaveform waveform = LFOWaveform::SINE;
        bool bipolar = true;
        juce::Random random;

        void prepare(double sampleRate);
        void reset();
        void setRate(float rateHz, double sampleRate);
        float processSample();

    private:
        float generateWaveform();
        float lastSandHValue = 0.0f;
    };

    //==============================================================================
    // MODULATION MATRIX
    //==============================================================================

    /**
     * @brief Modulation source enumeration
     */
    enum class ModSource
    {
        LFO1 = 0,
        LFO2,
        VELOCITY,
        AFTERTOUCH,
        PITCH_WHEEL,
        MOD_WHEEL,
        FILTER_ENV,
        AMP_ENV,
        MACRO_1,
        MACRO_2,
        MACRO_3,
        MACRO_4,
        MACRO_5,
        MACRO_6,
        MACRO_7,
        MACRO_8
    };

    /**
     * @brief Modulation destination enumeration
     */
    enum class ModDestination
    {
        OSC1_FREQ = 0,
        OSC1_PULSE_WIDTH,
        OSC1_WARP,
        OSC1_LEVEL,
        OSC1_PAN,
        OSC2_FREQ,
        OSC2_PULSE_WIDTH,
        OSC2_WARP,
        OSC2_LEVEL,
        OSC2_PAN,
        SUB_LEVEL,
        FILTER_CUTOFF,
        FILTER_RESONANCE,
        FM_DEPTH,
        FM_RATIO,
        LFO1_RATE,
        LFO1_DEPTH,
        LFO2_RATE,
        LFO2_DEPTH
    };

    /**
     * @brief Modulation routing slot
     *
     * Uses std::atomic<float> for lock-free realtime-safe modulation
     */
    struct ModulationSlot
    {
        ModSource source = ModSource::LFO1;
        ModDestination destination = ModDestination::FILTER_CUTOFF;
        std::atomic<float> amount{0.0f};
        bool bipolar = true;
        int curveType = 0;  // 0 = linear, 1 = exponential
        float maxValue = 1.0f;  // Maximum modulation range

        bool isEnabled() const { return amount.load() > 0.0001f; }
    };

    /**
     * @brief 16-slot modulation matrix
     *
     * Thread-safe modulation routing with lock-free atomic amounts
     */
    class ModulationMatrix
    {
    public:
        ModulationMatrix();

        void prepare(double sampleRate);
        void reset();

        // Call from UI thread (NOT realtime-safe)
        void setSlot(int index, const ModulationSlot& slot);
        const ModulationSlot& getSlot(int index) const;

        // Call from audio thread (realtime-safe, lock-free)
        float getModulationValue(int slotIndex) const;
        float applyModulation(ModDestination dest, float baseValue);

        // Process LFOs and envelopes (update modulation sources)
        void processModulationSources();

        // Direct source access (for audio thread)
        LFO lfo1;
        LFO lfo2;

        // Modulation amounts (atomic for lock-free access)
        std::array<std::atomic<float>, 16> modulationAmounts;

        // Source values (updated each sample)
        float sourceValues[16];  // LFO1, LFO2, Velocity, etc.

        // Routing configuration
        std::array<ModulationSlot, 16> slots;

    private:
        float getCurrentModSourceValue(ModSource source) const;
        float applyCurve(float value, int curveType) const;
    };

    //==============================================================================
    // MACRO SYSTEM
    //==============================================================================

    /**
     * @brief Macro control (Serum-style)
     *
     * Simplified parameter grouping for controlling multiple parameters
     * from a single macro knob.
     */
    struct MacroControl
    {
        float value = 0.0f;              // Current macro value (0-1)
        juce::String name = "Macro";     // User-defined name

        // Destinations (up to 4 per macro)
        struct MacroDestination
        {
            juce::String paramID;
            float amount = 1.0f;
            float minValue = 0.0f;
            float maxValue = 1.0f;
        };

        std::array<MacroDestination, 4> destinations;
        int numDestinations = 0;
    };

    /**
     * @brief 8-macro system
     */
    class MacroSystem
    {
    public:
        MacroSystem();

        void setMacroValue(int macroIndex, float value);
        float getMacroValue(int macroIndex) const;
        void setMacroName(int macroIndex, const juce::String& name);

        void addDestination(int macroIndex, const juce::String& paramID,
                           float amount, float minVal, float maxVal);

        float applyMacroModulation(const juce::String& paramID, float baseValue) const;

    private:
        std::array<MacroControl, 8> macros;
    };

    //==============================================================================
    // VOICE ARCHITECTURE
    //==============================================================================

    /**
     * @brief Polyphonic voice
     *
     * Contains all per-voice DSP processing
     */
    struct Voice
    {
        int midiNote = -1;
        float velocity = 0.0f;
        bool active = false;
        double startTime = 0.0;

        // Oscillators
        Oscillator osc1;
        Oscillator osc2;
        SubOscillator subOsc;

        // FM synthesis (shared between oscillators)
        bool fmEnabled = false;
        float fmModulatorRatio = 1.0f;
        float fmDepth = 0.0f;
        bool fmLinear = true;  // false = exponential
        int fmCarrierIndex = 0;  // 0 = OSC1, 1 = OSC2

        // Mixer
        float osc1Level = 0.7f;
        float osc2Level = 0.5f;
        float subLevel = 0.3f;
        float noiseLevel = 0.0f;
        juce::Random noiseGenerator;

        // Filter (per-voice)
        Filter filter;

        // Envelopes
        Envelope filterEnv;
        Envelope ampEnv;

        // Output
        float pan = 0.0f;  // -1 (left) to +1 (right)

        void prepare(const juce::dsp::ProcessSpec& spec, double sampleRate);
        void reset();
        void noteOn(int note, float vel, double currentSampleRate);
        void noteOff(float vel);
        bool isActive() const;
        float renderSample(KaneMarcoDSP* parent);
    };

    std::array<Voice, 16> voices;  // 16-voice polyphony

    // Voice allocation
    int allocateVoice(int midiNote, float velocity);
    void freeVoice(int voiceIndex);
    void updateVoices(double sampleRate);

    //==============================================================================
    // GLOBAL PARAMETERS
    //==============================================================================

    double currentSampleRate = 48000.0;
    double tailLengthSeconds = 2.0;

    // Pitch
    float currentPitchBend = 0.0f;
    float masterTune = 0.0f;  // Semitones

    // Glide (portamento)
    bool glideEnabled = false;
    float glideTime = 0.1f;  // Seconds
    float lastNoteFrequency = 0.0f;
    float targetNoteFrequency = 0.0f;
    double glideStartTime = 0.0;

    // Polyphony mode
    enum class PolyphonyMode
    {
        POLY = 0,
        MONO,
        LEGATO
    };
    PolyphonyMode polyMode = PolyphonyMode::POLY;
    int monoVoiceIndex = -1;  // For monophonic mode

    // Master effects
    juce::dsp::ProcessorChain<
        juce::dsp::Gain<float>  // Master volume
    > masterEffects;

    juce::dsp::Gain<float> masterGain;

    //==============================================================================
    // PRESET MANAGEMENT
    //==============================================================================

    struct FactoryPreset
    {
        juce::String name;
        juce::String state;  // JSON string
    };

    std::vector<FactoryPreset> factoryPresets;
    int currentPresetIndex = 0;
    void loadFactoryPresets();

    //==============================================================================
    // MODULATION SYSTEMS
    //==============================================================================

    ModulationMatrix modulationMatrix;
    MacroSystem macroSystem;

    //==============================================================================
    // AUDIO PROCESSING HELPERS
    //==============================================================================

    void renderVoices(juce::AudioBuffer<float>& buffer);
    void applyMasterEffects(juce::AudioBuffer<float>& buffer);
    float calculateFrequency(int midiNote, float bend = 0.0f) const;
    void processMIDIMessages(const juce::MidiBuffer& midiMessages);
    void handleNoteOn(const juce::MidiMessage& message);
    void handleNoteOff(const juce::MidiMessage& message);
    void handlePitchWheel(const juce::MidiMessage& message);
    void handleController(const juce::MidiMessage& message);
    void handleAllNotesOff();
    void updateModulationSources();
    void applyModulationToVoice(Voice& voice);

    //==============================================================================
    // JUCE DECLARATIONS
    //==============================================================================

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(KaneMarcoDSP)
};
