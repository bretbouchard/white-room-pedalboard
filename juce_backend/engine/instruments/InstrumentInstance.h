#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <memory>
#include <vector>
#include <unordered_map>
#include <atomic>
#include <mutex>

namespace SchillingerEcosystem::Instrument {

/**
 * @brief Base class for all instrument instances
 *
 * Provides unified interface for:
 * - Built-in synthesizers (NEX, Sam, LOCAL GAL)
 * - External plugin instances
 * - Common functionality for audio processing, MIDI handling, parameter control
 */

class InstrumentInstance
{
public:
    InstrumentInstance(const juce::String& identifier, const juce::String& name);
    virtual ~InstrumentInstance() = default;

    //==============================================================================
    // LIFECYCLE MANAGEMENT
    //==============================================================================

    /**
     * Initialize the instrument for audio processing
     * @param sampleRate Audio sample rate
     * @param bufferSize Preferred buffer size
     * @return true if initialization successful
     */
    virtual bool initialize(double sampleRate, int bufferSize) = 0;

    /**
     * Prepare for playback
     * @param sampleRate Sample rate
     * @param samplesPerBlock Samples per block
     */
    virtual void prepareToPlay(double sampleRate, int samplesPerBlock) = 0;

    /**
     * Release resources
     */
    virtual void releaseResources() = 0;

    /**
     * Check if instrument is initialized and ready
     */
    virtual bool isInitialized() const { return initialized; }

    //==============================================================================
    // AUDIO PROCESSING
    //==============================================================================

    /**
     * Process audio block
     * @param buffer Audio buffer to process
     * @param midiMessages MIDI messages to process
     */
    virtual void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) = 0;

    /**
     * Process audio block (no MIDI)
     * @param buffer Audio buffer to process
     */
    virtual void processAudioOnly(juce::AudioBuffer<float>& buffer);

    /**
     * Get current audio latency in samples
     */
    virtual int getLatencySamples() const = 0;

    /**
     * Get tail length in seconds
     */
    virtual double getTailLengthSeconds() const = 0;

    //==============================================================================
    // MIDI HANDLING
    //==============================================================================

    /**
     * Check if instrument accepts MIDI input
     */
    virtual bool acceptsMidi() const = 0;

    /**
     * Check if instrument produces MIDI output
     */
    virtual bool producesMidi() const = 0;

    /**
     * Send MIDI note on
     * @param midiNote MIDI note number (0-127)
     * @param velocity Velocity (0.0-1.0)
     * @param channel MIDI channel (0-15)
     */
    virtual void noteOn(int midiNote, float velocity, int channel = 0);

    /**
     * Send MIDI note off
     * @param midiNote MIDI note number (0-127)
     * @param velocity Release velocity (0.0-1.0)
     * @param channel MIDI channel (0-15)
     */
    virtual void noteOff(int midiNote, float velocity, int channel = 0);

    /**
     * Send all notes off
     * @param channel MIDI channel (-1 for all channels)
     */
    virtual void allNotesOff(int channel = -1);

    /**
     * Send pitch bend
     * @param value Pitch bend value (-1.0 to 1.0)
     * @param channel MIDI channel (0-15)
     */
    virtual void pitchBend(float value, int channel = 0);

    /**
     * Send control change
     * @param controller Controller number (0-127)
     * @param value Controller value (0.0-1.0)
     * @param channel MIDI channel (0-15)
     */
    virtual void controlChange(int controller, float value, int channel = 0);

    //==============================================================================
    // PARAMETER CONTROL
    //==============================================================================

    /**
     * Parameter information structure
     */
    struct ParameterInfo
    {
        juce::String address;        // Unique parameter address
        juce::String name;           // Display name
        juce::String category;       // Parameter category
        float minValue;              // Minimum value
        float maxValue;              // Maximum value
        float defaultValue;          // Default value
        float currentValue;          // Current value
        bool isAutomatable;          // Can be automated
        bool isDiscrete;             // Has discrete steps
        int numSteps;                // Number of discrete steps (0 = continuous)
        juce::String unit;           // Unit (Hz, %, ms, etc.)
        juce::String description;    // Parameter description
    };

    /**
     * Get all parameter information
     */
    virtual std::vector<ParameterInfo> getAllParameters() const = 0;

    /**
     * Get parameter by address
     * @param address Parameter address
     * @return Parameter info or nullptr if not found
     */
    virtual const ParameterInfo* getParameterInfo(const juce::String& address) const = 0;

    /**
     * Get parameter value by address
     * @param address Parameter address
     * @return Parameter value
     */
    virtual float getParameterValue(const juce::String& address) const = 0;

    /**
     * Set parameter value by address
     * @param address Parameter address
     * @param value New parameter value
     */
    virtual void setParameterValue(const juce::String& address, float value) = 0;

    /**
     * Set parameter with smooth interpolation
     * @param address Parameter address
     * @param targetValue Target value
     * @param timeMs Interpolation time in milliseconds
     */
    virtual void setParameterSmooth(const juce::String& address, float targetValue, double timeMs);

    /**
     * Get all current parameter values as a map
     */
    virtual std::unordered_map<juce::String, float> getAllParameterValues() const;

    /**
     * Set multiple parameters at once
     * @param parameters Map of address->value pairs
     */
    virtual void setParameters(const std::unordered_map<juce::String, float>& parameters);

    //==============================================================================
    // PRESET AND STATE MANAGEMENT
    //==============================================================================

    /**
     * Get current state as memory block
     */
    virtual juce::MemoryBlock getStateInformation() const = 0;

    /**
     * Set state from memory block
     */
    virtual void setStateInformation(const void* data, int sizeInBytes) = 0;

    /**
     * Load preset
     * @param presetData Preset data
     * @return true if loaded successfully
     */
    virtual bool loadPreset(const juce::MemoryBlock& presetData) = 0;

    /**
     * Save current state as preset
     * @param name Preset name
     * @return Preset data
     */
    virtual juce::MemoryBlock savePreset(const juce::String& name) const = 0;

    //==============================================================================
    // CUSTOM UI INTEGRATION
    //==============================================================================

    /**
     * Check if instrument has custom UI
     */
    virtual bool hasCustomUI() const = 0;

    /**
     * Get custom UI component class name
     */
    virtual juce::String getCustomUIClassName() const = 0;

    /**
     * Create custom UI component
     */
    virtual std::unique_ptr<juce::Component> createCustomUI() = 0;

    //==============================================================================
    // PERFORMANCE MONITORING
    //==============================================================================

    /**
     * Performance statistics
     */
    struct PerformanceStats
    {
        double cpuUsagePercent = 0.0;     // CPU usage percentage
        int activeVoices = 0;             // Number of active voices
        int maxVoices = 0;                 // Maximum voices
        double averageProcessingTime = 0.0; // Average processing time per block (ms)
        int bufferUnderruns = 0;          // Number of buffer underruns
        double audioLatency = 0.0;       // Current audio latency (ms)
        size_t memoryUsage = 0;           // Memory usage in bytes
        int midiMessagesProcessed = 0;     // MIDI messages in last block
    };

    /**
     * Get current performance statistics
     */
    virtual PerformanceStats getPerformanceStats() const;

    /**
     * Reset performance counters
     */
    virtual void resetPerformanceStats();

    //==============================================================================
    // INSTRUMENT INFORMATION
    //==============================================================================

    /**
     * Get instrument identifier
     */
    const juce::String& getIdentifier() const { return identifier; }

    /**
     * Get instrument name
     */
    const juce::String& getName() const { return name; }

    /**
     * Get instrument type
     */
    virtual juce::String getType() const = 0;

    /**
     * Get instrument version
     */
    virtual juce::String getVersion() const = 0;

    /**
     * Get supported MIDI channels
     */
    virtual juce::Array<int> getSupportedMIDIChannels() const { return {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15}; }

    /**
     * Get audio format information
     */
    struct AudioFormat
    {
        int numInputChannels = 0;
        int numOutputChannels = 2;
        double sampleRate = 44100.0;
        int preferredBlockSize = 512;
        bool supportsDoublePrecision = false;
    };

    virtual AudioFormat getAudioFormat() const = 0;

    //==============================================================================
    // DEBUG AND DIAGNOSTICS
    //==============================================================================

    /**
     * Get diagnostic information
     */
    virtual juce::String getDiagnosticInfo() const;

    /**
     * Validate instrument state
     */
    virtual bool validateState() const;

    /**
     * Enable/disable debug mode
     */
    virtual void setDebugMode(bool enabled) { debugMode = enabled; }

protected:
    //==============================================================================
    // PROTECTED MEMBER VARIABLES
    //==============================================================================

    juce::String identifier;
    juce::String name;
    std::atomic<bool> initialized{false};
    std::atomic<bool> debugMode{false};

    // Performance tracking
    mutable std::atomic<int> activeVoiceCount{0};
    mutable std::atomic<double> processingTime{0.0};
    mutable std::atomic<int> bufferUnderrunCount{0};
    mutable std::atomic<int> midiMessageCount{0};

    // Parameter smoothing
    struct SmoothingTarget
    {
        juce::String address;
        float currentValue = 0.0f;
        float targetValue = 0.0f;
        double smoothingTime = 0.0;
        double currentTime = 0.0;
        bool isActive = false;
    };

    mutable std::unordered_map<juce::String, SmoothingTarget> smoothingTargets;
    mutable std::mutex smoothingMutex;

    // Internal processing helpers
    void updateParameterSmoothing(double deltaTime);
    void addMidiMessage(juce::MidiBuffer& buffer, const juce::MidiMessage& message);
    void updatePerformanceStats(double processingTimeMs, int voicesActive, int midiMessages);

    // Utility functions
    float linearInterpolate(float start, float end, float position) const;
    float smoothParameterValue(const SmoothingTarget& target, double deltaTime) const;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(InstrumentInstance)
};

/**
 * @brief Wrapper for external plugin instances
 *
 * Adapts juce::AudioPluginInstance to InstrumentInstance interface
 */
class PluginInstrumentInstance : public InstrumentInstance
{
public:
    PluginInstrumentInstance(const juce::String& identifier,
                           std::unique_ptr<juce::AudioPluginInstance> plugin,
                           const juce::String& name = "");

    bool initialize(double sampleRate, int bufferSize) override;
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;
    int getLatencySamples() const override;
    double getTailLengthSeconds() const override;

    bool acceptsMidi() const override;
    bool producesMidi() const override;

    std::vector<ParameterInfo> getAllParameters() const override;
    const ParameterInfo* getParameterInfo(const juce::String& address) const override;
    float getParameterValue(const juce::String& address) const override;
    void setParameterValue(const juce::String& address, float value) override;

    juce::MemoryBlock getStateInformation() const override;
    void setStateInformation(const void* data, int sizeInBytes) override;
    bool loadPreset(const juce::MemoryBlock& presetData) override;
    juce::MemoryBlock savePreset(const juce::String& name) const override;

    bool hasCustomUI() const override;
    juce::String getCustomUIClassName() const override;
    std::unique_ptr<juce::Component> createCustomUI() override;

    juce::String getType() const override;
    juce::String getVersion() const override;
    AudioFormat getAudioFormat() const override;

    // Plugin-specific methods
    juce::AudioPluginInstance* getPluginInstance() const { return plugin.get(); }
    bool isPluginLoaded() const { return plugin != nullptr; }

private:
    std::unique_ptr<juce::AudioPluginInstance> plugin;
    juce::String pluginType;
    std::unordered_map<int, juce::String> parameterIndexToAddress;
    mutable std::unordered_map<juce::String, int> addressToParameterIndex;

    void buildParameterMaps();
    int getParameterIndex(const juce::String& address) const;
    juce::String getParameterAddress(int index) const;
};

} // namespace SchillingerEcosystem::Instrument