#pragma once

#include "InstrumentInstance.h"
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <memory>
#include <vector>
#include <array>
#include <atomic>
#include <mutex>

/**
 * @brief Base class for custom built-in synthesizers
 *
 * Provides common functionality for NEX FM, Sam Sampler, and LOCAL GAL:
 * - Advanced voice management
 * - Multi-channel audio processing
 * - Parameter smoothing and automation
 * - MIDI handling with advanced features
 * - Performance monitoring
 * - State management
 */

namespace SchillingerEcosystem::Instrument {

/**
 * @brief Voice structure for polyphonic instruments
 */
struct Voice
{
    int midiNote = -1;
    float velocity = 0.0f;
    bool active = false;
    bool sostenuto = false;
    double noteOnTime = 0.0;
    double noteOffTime = 0.0;
    int channel = 0;
    float pitchBend = 0.0f;

    // Voice-specific data that derived classes can extend
    std::array<double, 32> voiceData{};  // Flexible voice storage

    void reset()
    {
        midiNote = -1;
        velocity = 0.0f;
        active = false;
        sostenuto = false;
        noteOnTime = 0.0;
        noteOffTime = 0.0;
        channel = 0;
        pitchBend = 0.0f;
        voiceData.fill(0.0);
    }
};

/**
 * @brief MIDI state tracking
 */
struct MidiState
{
    std::array<float, 16> pitchBend = {0.0f};  // Per-channel pitch bend
    std::array<std::array<float, 128>, 16> controllers = {{0.0f}};  // Per-channel CC values
    std::array<bool, 16> sustainPedal = {false};
    std::array<bool, 16> sostenutoPedal = {false};
    std::array<bool, 16> softPedal = {false};
    std::array<bool, 128> noteStates = {false};  // Active note tracking
    std::array<std::vector<int>, 128> noteToVoices;  // Map note to voice indices
    std::array<std::vector<int>, 128> sustainedVoices;  // Voices held by sustain

    void reset()
    {
        pitchBend.fill(0.0f);
        for (auto& channel : controllers) channel.fill(0.0f);
        sustainPedal.fill(false);
        sostenutoPedal.fill(false);
        softPedal.fill(false);
        noteStates.fill(false);
        for (auto& voices : noteToVoices) voices.clear();
        for (auto& voices : sustainedVoices) voices.clear();
    }
};

/**
 * @brief Advanced parameter with smoothing and automation
 */
struct AdvancedParameter
{
    juce::String address;
    juce::String name;
    juce::String category;
    float minValue = 0.0f;
    float maxValue = 1.0f;
    float defaultValue = 0.0f;
    float currentValue = 0.0f;
    float targetValue = 0.0f;
    double smoothingTime = 0.0;
    double smoothingProgress = 0.0;
    bool isSmoothing = false;
    bool isAutomatable = true;
    bool isDiscrete = false;
    int numSteps = 0;
    juce::String unit;
    juce::String description;

    // Automation data
    std::vector<std::pair<double, float>> automationPoints;  // time, value
    bool hasAutomation = false;
    bool automationEnabled = true;

    // Parameter changed callback
    std::function<void(float)> valueChangedCallback;

    void setValue(float newValue, bool smooth = true)
    {
        targetValue = juce::jlimit(minValue, maxValue, newValue);

        if (smooth && smoothingTime > 0.0)
        {
            if (!isSmoothing)
            {
                currentValue = targetValue;
                isSmoothing = true;
                smoothingProgress = 0.0;
            }
        }
        else
        {
            currentValue = targetValue;
            isSmoothing = false;
            smoothingProgress = 1.0;
        }

        if (valueChangedCallback)
            valueChangedCallback(currentValue);
    }

    float getValue() const { return currentValue; }
    float getTargetValue() const { return targetValue; }
    bool isChanging() const { return isSmoothing && (currentValue != targetValue); }
};

/**
 * @brief Base class for custom synthesizers
 */
class CustomInstrumentBase : public InstrumentInstance
{
public:
    CustomInstrumentBase(const juce::String& identifier, const juce::String& name);
    ~CustomInstrumentBase() override;

    //==============================================================================
    // CONFIGURATION
    //==============================================================================

    /**
     * Set maximum polyphony
     * @param maxVoices Maximum number of voices
     */
    void setMaxVoices(int maxVoices);

    /**
     * Get maximum polyphony
     */
    int getMaxVoices() const { return maxVoices; }

    /**
     * Get current active voice count
     */
    int getActiveVoiceCount() const { return activeVoiceCount.load(); }

    /**
     * Set voice stealing strategy
     */
    enum class VoiceStealingStrategy
    {
        Oldest,      // Steal oldest voice
        Quietest,    // Steal quietest voice
        Newest,      // Steal newest voice
        LowPriority  // Steal lowest priority voice
    };

    void setVoiceStealingStrategy(VoiceStealingStrategy strategy);

    /**
     * Enable/disable voice stealing
     */
    void setVoiceStealingEnabled(bool enabled) { voiceStealingEnabled = enabled; }

    //==============================================================================
    // PARAMETER MANAGEMENT
    //==============================================================================

    /**
     * Add parameter to instrument
     */
    void addParameter(const AdvancedParameter& parameter);

    /**
     * Get parameter by address
     */
    AdvancedParameter* getAdvancedParameter(const juce::String& address);
    const AdvancedParameter* getAdvancedParameter(const juce::String& address) const;

    /**
     * Set parameter smoothing time
     */
    void setParameterSmoothingTime(const juce::String& address, double timeMs);

    /**
     * Add automation point for parameter
     */
    void addAutomationPoint(const juce::String& address, double timeMs, float value);

    /**
     * Clear automation for parameter
     */
    void clearAutomation(const juce::String& address);

    //==============================================================================
    // MIDI ADVANCED FEATURES
    //==============================================================================

    /**
     * Enable MPE (MIDI Polyphonic Expression)
     */
    void setMPEEnabled(bool enabled) { mpeEnabled = enabled; }

    /**
     * Set MIDI channel range (0-15)
     */
    void setMIDIChannelRange(int startChannel, int endChannel);

    /**
     * Enable MIDI learn mode
     */
    void setMidiLearnEnabled(bool enabled) { midiLearnEnabled = enabled; }

    /**
     * Map MIDI CC to parameter
     */
    void mapMidiCC(int ccNumber, const juce::String& parameterAddress);

    /**
     * Get parameter mapped to MIDI CC
     */
    juce::String getMidiCCMapping(int ccNumber) const;

    //==============================================================================
    // AUDIO PROCESSING CALLBACKS
    //==============================================================================

protected:
    /**
     * Called to render a specific voice
     * Override in derived classes
     */
    virtual void renderVoice(Voice& voice, juce::AudioBuffer<float>& buffer, int startSample, int numSamples) = 0;

    /**
     * Called when voice starts
     */
    virtual void voiceStarted(Voice& voice) {}

    /**
     * Called when voice stops
     */
    virtual void voiceStopped(Voice& voice) {}

    /**
     * Called to apply global effects
     */
    virtual void applyGlobalEffects(juce::AudioBuffer<float>& buffer) {}

    /**
     * Called for per-sample processing
     */
    virtual void processSample(float& left, float& right, int channel) {}

    /**
     * Get voice data pointer for derived classes
     */
    Voice* getVoice(int index) { return index < voices.size() ? &voices[index] : nullptr; }
    const Voice* getVoice(int index) const { return index < voices.size() ? &voices[index] : nullptr; }

public:
    //==============================================================================
    // INSTRUMENTINSTANCE IMPLEMENTATION
    //==============================================================================

    bool initialize(double sampleRate, int bufferSize) override;
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    int getLatencySamples() const override { return 0; }
    double getTailLengthSeconds() const override { return tailLengthSeconds; }

    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }

    std::vector<ParameterInfo> getAllParameters() const override;
    const ParameterInfo* getParameterInfo(const juce::String& address) const override;
    float getParameterValue(const juce::String& address) const override;
    void setParameterValue(const juce::String& address, float value) override;

    juce::MemoryBlock getStateInformation() const override;
    void setStateInformation(const void* data, int sizeInBytes) override;
    bool loadPreset(const juce::MemoryBlock& presetData) override;
    juce::MemoryBlock savePreset(const juce::String& name) const override;

    bool hasCustomUI() const override { return true; }
    juce::String getCustomUIClassName() const override { return customUIClassName; }
    std::unique_ptr<juce::Component> createCustomUI() override;

    juce::String getType() const override { return "CustomSynthesizer"; }
    juce::String getVersion() const override { return "1.0.0"; }
    AudioFormat getAudioFormat() const override;

    //==============================================================================
    // EXTENDED MIDI PROCESSING
    //==============================================================================

protected:
    /**
     * Process MIDI messages
     */
    virtual void processMidiMessages(const juce::MidiBuffer& midiMessages);

    /**
     * Handle MIDI note on
     */
    virtual void handleNoteOn(int channel, int midiNote, float velocity);

    /**
     * Handle MIDI note off
     */
    virtual void handleNoteOff(int channel, int midiNote, float velocity);

    /**
     * Handle pitch bend
     */
    virtual void handlePitchBend(int channel, float value);

    /**
     * Handle control change
     */
    virtual void handleControlChange(int channel, int controller, float value);

    /**
     * Handle channel aftertouch
     */
    virtual void handleChannelAftertouch(int channel, float pressure);

    /**
     * Handle polyphonic aftertouch
     */
    virtual void handlePolyAftertouch(int channel, int midiNote, float pressure);

    //==============================================================================
    // VOICE MANAGEMENT
    //==============================================================================

    /**
     * Allocate a voice for a note
     */
    virtual int allocateVoice(int midiNote, float velocity, int channel = 0);

    /**
     * Free a voice
     */
    virtual void freeVoice(int voiceIndex);

    /**
     * Find best voice to steal
     */
    virtual int findVoiceToSteal();

    /**
     * Update voice envelopes
     */
    virtual void updateVoices(double deltaTime);

    /**
     * Calculate voice frequency with pitch bend
     */
    virtual double calculateVoiceFrequency(int midiNote, float pitchBend) const;

    //==============================================================================
    // PARAMETER PROCESSING
    //==============================================================================

    /**
     * Update parameter smoothing
     */
    void updateParameterSmoothing(double deltaTime);

    /**
     * Process automation
     */
    void processAutomation(double currentTime);

    //==============================================================================
    // MEMBER VARIABLES
    //==============================================================================

protected:
    // Voice management
    std::vector<Voice> voices;
    std::vector<int> freeVoices;
    int maxVoices = 16;
    std::atomic<int> activeVoiceCount{0};
    VoiceStealingStrategy voiceStealingStrategy = VoiceStealingStrategy::Oldest;
    bool voiceStealingEnabled = true;

    // MIDI state
    MidiState midiState;
    bool mpeEnabled = false;
    bool midiLearnEnabled = false;
    int midiChannelStart = 0;
    int midiChannelEnd = 15;
    std::unordered_map<int, juce::String> midiCCtoParameter;

    // Parameter management
    std::vector<AdvancedParameter> parameters;
    std::unordered_map<juce::String, int> parameterAddressToIndex;
    mutable std::mutex parameterMutex;

    // Audio processing
    double currentSampleRate = 44100.0;
    int currentBlockSize = 512;
    double tailLengthSeconds = 1.0;
    juce::String customUIClassName;

    // Processing buffers
    juce::AudioBuffer<float> voiceBuffer;
    juce::AudioBuffer<float> effectsBuffer;

    // Performance tracking
    juce::Time lastPerformanceUpdate;
    double totalProcessingTime = 0.0;
    int processCount = 0;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(CustomInstrumentBase)
};

} // namespace SchillingerEcosystem::Instrument