/*
  ==============================================================================

    LocalGalDSP.h
    Created: 25 Dec 2024
    Author:  Bret Bouchard

    Pure DSP implementation of LOCAL GAL Synthesizer for tvOS
    - Inherits from juce::AudioProcessor (no plugin hosting)
    - Uses AudioProcessorValueTreeState for parameters
    - Headless (no GUI components)
    - JSON preset save/load system
    - Feel vector control system
    - Pattern sequencing capability (Phase 2)
    - FFI-compatible for Swift bridge

  ==============================================================================
*/

#pragma once

#define JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED 1
#include <juce_core/juce_core.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include "../../tests/dsp/DSPTestFramework.h"
#include <memory>
#include <array>
#include <vector>

//==============================================================================
/**
 * @brief Feel Vector for Intuitive Sound Control
 *
 * 5D feel vector: rubber, bite, hollow, growl, wet
 * Maps to multiple synth parameters for intuitive control
 */
struct FeelVector
{
    float rubber = 0.5f;  // Glide & oscillator offset, timing variation
    float bite = 0.5f;    // Filter resonance & envelope amount, brightness
    float hollow = 0.5f;  // Base filter cutoff, warm character, fundamental
    float growl = 0.3f;   // Drive & distortion, character harshness, saturation
    float wet = 0.0f;     // Effects mix, space control, reverb (reserved)

    // Feel vector presets
    static FeelVector getPreset(const juce::String& name);
    static void applyPreset(FeelVector& feelVector, const juce::String& presetName);

    // Feel vector interpolation
    static FeelVector interpolate(const FeelVector& a, const FeelVector& b, float position);
    static float interpolate(const FeelVector& feelVector, int index);
    static FeelVector interpolateWithSmoothing(const FeelVector& target, const FeelVector& current, double smoothingTime);
};

//==============================================================================
/**
 * @brief Pure DSP LOCAL GAL Synthesizer for tvOS
 *
 * Full-featured synthesizer with:
 * - Feel vector control system for intuitive sound shaping
 * - Multi-oscillator architecture (Phase 2: oscillator sync, FM, PM)
 * - Multi-mode filter (LP, HP, BP, Notch)
 * - ADSR envelope with velocity sensitivity
 * - Pattern sequencing (Phase 2)
 * - 16-voice polyphony
 * - Real-time parameter morphing
 *
 * Architecture:
 * - No external plugin dependencies
 * - Headless operation (no GUI)
 * - All parameters via AudioProcessorValueTreeState
 * - Thread-safe parameter automation
 * - JSON preset system
 */
class LocalGalDSP : public juce::AudioProcessor
{
public:
    //==============================================================================
    // Construction/Destruction
    //==============================================================================

    LocalGalDSP();
    ~LocalGalDSP() override;

    //==============================================================================
    // AudioProcessor Implementation (REQUIRED)
    //==============================================================================

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    //==============================================================================
    // Processor Information
    //==============================================================================

    const juce::String getName() const override { return "LocalGalDSP"; }
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
    void changeProgramName(int index, const juce::String& newName) override { /* Factory presets are read-only */ }

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
    // Feel Vector Control (REQUIRED for LocalGal)
    //==============================================================================

    /**
     * Set feel vector for all voices
     */
    void setFeelVector(const FeelVector& feelVector);

    /**
     * Get current feel vector
     */
    FeelVector getCurrentFeelVector() const { return currentFeelVector; }

    /**
     * Morph to target feel vector
     */
    void morphToFeelVector(const FeelVector& targetFeelVector, double timeMs = 100.0);

    /**
     * Feel vector presets
     */
    static std::vector<juce::String> getFeelVectorPresets();
    void applyFeelVectorPreset(const juce::String& presetName);

    //==============================================================================
    // Preset System (REQUIRED for tvOS)
    //==============================================================================

    /**
     * Preset metadata structure (Phase 3 REFACTOR)
     */
    struct PresetInfo
    {
        juce::String name;
        juce::String author;
        juce::String description;
        juce::String version;
        juce::String category;        // Phase 3 REFACTOR: Category/tag
        juce::String creationDate;    // Phase 3 REFACTOR: ISO 8601 date
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
     * Validate preset JSON structure and parameters (Phase 3 REFACTOR)
     * Returns true if preset is valid, false otherwise
     */
    bool validatePreset(const std::string& jsonData) const;

    /**
     * Get preset metadata from JSON (Phase 3 REFACTOR)
     */
    PresetInfo getPresetInfo(const std::string& jsonData) const;

    //==============================================================================
    // State Serialization
    //==============================================================================

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    //==============================================================================
    // Program/Preset Management
    //==============================================================================

    bool loadPreset(const juce::MemoryBlock& presetData) { return false; } // Use JSON instead
    juce::MemoryBlock savePreset(const juce::String& name) const { return juce::MemoryBlock(); } // Use JSON instead

private:
    //==============================================================================
    // Phase 2: Pattern Sequencer
    //==============================================================================

    /**
     * @brief Pattern step for sequencer
     */
    struct PatternStep
    {
        int midiNote = 60;
        bool gate = false;
        bool tie = false;
        bool slide = false;
        bool accent = false;
        float velocity = 0.8f;
        double probability = 1.0;
        float noteOffset = 0.0f;     // semitone deviation
        float timingOffset = 0.0f;   // timing variation (ticks)
    };

    /**
     * @brief Pattern for sequencer playback
     */
    struct Pattern
    {
        juce::String id;
        juce::String name;
        std::vector<PatternStep> steps;
        int length = 16;              // steps
        double tempo = 120.0;         // BPM
        double swing = 0.0;           // 0-1
        bool isLooping = true;
        double currentPosition = 0.0;
    };

    //==============================================================================
    // Phase 2: LFO System
    //==============================================================================

    /**
     * @brief Low-Frequency Oscillator for modulation
     */
    struct LFO
    {
        enum class Waveform
        {
            Sine = 0,
            Triangle = 1,
            Sawtooth = 2,
            Square = 3,
            SampleAndHold = 4
        };

        Waveform waveform = Waveform::Sine;
        float rate = 5.0f;            // Hz
        float depth = 1.0f;           // modulation amount
        float offset = 0.0f;          // bipolar offset
        float phase = 0.0f;           // start phase (degrees)
        bool tempoSync = false;       // sync to BPM
        float tempoSyncRate = 0.0f;   // 1/4, 1/8, 1/16, etc.
        double phaseAccumulator = 0.0;
        float lastSampleHoldValue = 0.0f;

        float generateSample(double sampleRate, double hostBPM);
        void reset();
    };

    //==============================================================================
    // Phase 2: Modulation Matrix
    //==============================================================================

    /**
     * @brief Modulation routing
     */
    struct ModulationRouting
    {
        juce::String source;          // "LFO1", "Envelope1", "Velocity", etc.
        juce::String destination;     // "FilterCutoff", "OscPitch", etc.
        float amount = 0.0f;          // modulation depth
        bool bipolar = false;
    };

    /**
     * @brief Modulation matrix for routing signals
     */
    class ModulationMatrix
    {
    public:
        std::vector<ModulationRouting> routings;
        std::vector<LFO> lfos;
        juce::Array<float> lfoOutputs;  // Current LFO output values
        juce::Array<float> envelopeOutputs;  // Current envelope outputs

        ModulationMatrix();

        void prepare(double sampleRate);
        void reset();
        void processLFOs(double sampleRate, double hostBPM);

        float getModulationValue(const juce::String& source);
        float applyModulation(const juce::String& destination, float baseValue);
        void addRouting(const ModulationRouting& routing);
        void clearRoutings();

    private:
        double sampleRate = 48000.0;
    };

    //==============================================================================
    // Phase 2: Parameter Morphing
    //==============================================================================

    /**
     * @brief Morph target for parameter interpolation
     */
    struct MorphTarget
    {
        juce::String name;
        std::vector<std::pair<juce::String, float>> parameters; // param ID → value
    };

    /**
     * @brief Parameter morphing system
     */
    class ParameterMorpher
    {
    public:
        MorphTarget targetA;
        MorphTarget targetB;
        float currentPosition = 0.0f;  // 0.0 = A, 1.0 = B
        bool enabled = false;
        double morphTime = 0.1;  // seconds

        void updateMorph(LocalGalDSP* synth, float position);
        void morphTo(float newPosition);

    private:
        double currentMorphProgress = 0.0;
        double lastMorphTime = 0.0;
    };

    //==============================================================================
    // Phase 2: Unison Mode
    //==============================================================================

    /**
     * @brief Unison mode configuration
     */
    struct Unison
    {
        int numVoices = 4;            // 2-8 voices per note
        float detune = 5.0f;          // cents spread
        float spread = 0.5f;          // stereo spread
        bool enable = false;
    };

    //==============================================================================
    // Phase 2: Effects Chain
    //==============================================================================

    /**
     * @brief Effects chain configuration
     */
    struct EffectsChain
    {
        // Distortion
        float distortionAmount = 0.0f;
        float distortionType = 0.0f;  // 0=soft, 1=hard, 2=fuzz

        // Delay
        float delayTime = 0.0f;       // seconds
        float delayFeedback = 0.0f;
        float delayMix = 0.0f;

        // Reverb
        float reverbSize = 0.0f;
        float reverbDecay = 0.0f;
        float reverbMix = 0.0f;
    };

    //==============================================================================
    // DSP Components
    //==============================================================================

    /**
     * @brief Oscillator with waveform and modulation
     */
    struct Oscillator
    {
        enum class Waveform
        {
            Sine = 0,
            Sawtooth = 1,
            Square = 2,
            Triangle = 3,
            Noise = 4
        };

        juce::dsp::Oscillator<float> oscillator;
        juce::dsp::Gain<float> outputGain;
        Waveform waveform = Waveform::Sawtooth;
        float detune = 0.0f;      // Semitone detune
        float level = 0.8f;       // Oscillator level
        bool enabled = true;
        double phase = 0.0;       // Phase accumulator

        void prepare(const juce::dsp::ProcessSpec& spec);
        void reset();
        void setWaveform(Waveform wave);
        float generateSample(double frequency, double sampleRate);
        void process(juce::dsp::ProcessContextReplacing<float>& context);
    };

    /**
     * @brief Multi-mode Filter
     */
    struct Filter
    {
        enum class Type
        {
            LowPass = 0,
            HighPass = 1,
            BandPass = 2,
            Notch = 3
        };

        juce::dsp::LadderFilter<float> ladderFilter;
        Type type = Type::LowPass;
        double cutoff = 1000.0;
        float resonance = 0.7f;
        float drive = 1.0f;

        void prepare(const juce::dsp::ProcessSpec& spec);
        void reset();
        void setType(Type t);
        void process(juce::dsp::AudioBlock<float> block);
    };

    /**
     * @brief ADSR Envelope
     */
    struct Envelope
    {
        juce::ADSR adsr;
        juce::ADSR::Parameters parameters;

        void prepare(double sampleRate);
        void reset();
        void noteOn();
        void noteOff();
        void setParameters(float attack, float decay, float sustain, float release);
        float process();
    };

    /**
     * @brief Voice for polyphonic playback
     *
     * Contains oscillator, filter, and envelope
     */
    struct Voice
    {
        int midiNote = -1;
        float velocity = 0.0f;
        bool active = false;
        double startTime = 0.0;

        // Synth components
        Oscillator oscillator;
        Filter filter;
        Envelope envelope;

        // Phase tracking
        double oscillatorPhase = 0.0;

        void reset();
        void prepare(const juce::dsp::ProcessSpec& spec);
    };

    std::array<Voice, 16> voices;  // 16-voice polyphony
    int allocateVoice(int midiNote, float velocity);
    void freeVoice(int voiceIndex);
    void updateVoices(double sampleRate);

    /**
     * @brief Phase 2: Pattern sequencer instance
     */
    Pattern currentPattern;
    bool patternEnabled = false;
    double patternPosition = 0.0;  // Current step position
    juce::Random patternRandom;

    /**
     * @brief Phase 2: Modulation matrix instance
     */
    ModulationMatrix modulationMatrix;

    /**
     * @brief Phase 2: Parameter morpher instance
     */
    ParameterMorpher parameterMorpher;

    /**
     * @brief Phase 2: Unison configuration
     */
    Unison unisonConfig;

    /**
     * @brief Phase 2: Effects chain configuration
     */
    EffectsChain effectsConfig;

    /**
     * @brief Global effects chain (Phase 2: expanded)
     */
    juce::dsp::ProcessorChain<
        juce::dsp::Gain<float>,     // Master gain
        juce::dsp::Reverb            // Reverb effect (Phase 2)
    > masterEffects;

    // Delay buffers (Phase 2)
    std::vector<float> delayBufferLeft;
    std::vector<float> delayBufferRight;
    int delayWriteIndex = 0;

    //==============================================================================
    // Feel Vector System
    //==============================================================================

    FeelVector currentFeelVector;
    FeelVector targetFeelVector;
    double feelVectorMorphTime = 0.1;
    double feelVectorMorphProgress = 0.0;
    bool feelVectorMorphing = false;

    void updateFeelVector(double deltaTime);
    void applyFeelVectorToVoices(const FeelVector& feelVector);
    FeelVector calculateTargetFeelVector(double currentTime) const;

    //==============================================================================
    // Preset Management
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
    // Audio Processing Helpers
    //==============================================================================

    void renderVoice(Voice& voice, juce::AudioBuffer<float>& buffer);
    void applyGlobalEffects(juce::AudioBuffer<float>& buffer);
    float calculateFrequency(int midiNote, float bend) const;

    // Phase 2: Effects processing
    float applyDistortion(float sample, float amount, float type);
    void processDelay(juce::AudioBuffer<float>& buffer);
    void processReverb(juce::AudioBuffer<float>& buffer);
    void processEffectsChain(juce::AudioBuffer<float>& buffer);

    // Phase 2: Pattern sequencer
    void processPatternSequencer(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages);
    void advancePatternStep(int numSamples);

    // Phase 2: Unison rendering
    void renderUnisonVoice(Voice& baseVoice, juce::AudioBuffer<float>& buffer);
    float calculateUnisonDetune(int voiceIndex, int totalVoices, float detuneRange);
    float calculateUnisonPan(int voiceIndex, int totalVoices, float spread);

    //==============================================================================
    // Member Variables
    //==============================================================================

    double currentSampleRate = 48000.0;
    double tailLengthSeconds = 1.5;
    float currentPitchBend = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(LocalGalDSP)
};
