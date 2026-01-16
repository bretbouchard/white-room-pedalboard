#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <memory>
#include <vector>
#include <unordered_map>
#include <atomic>
#include <mutex>

namespace SchillingerEcosystem::Routing {

/**
 * @brief Audio Routing Engine
 *
 * Provides comprehensive audio routing capabilities:
 * - Multi-channel routing with sends/returns
 * - Effects chains and signal processing
 * - Mixer with bus architecture
 * - Real-time routing changes
 * - Performance optimization
 */

class InstrumentInstance; // Forward declaration

/**
 * @brief Audio routing node (source or destination)
 */
struct AudioNode
{
    enum class Type
    {
        Instrument,      // Instrument output
        Bus,            // Mixer bus
        Effect,         // Audio effect
        Output,         // Audio output device
        Input           // Audio input device
    };

    enum class State
    {
        Inactive,       // Node is not active
        Active,         // Node is processing audio
        Muted,          // Node is muted
        Soloed,         // Node is soloed
        Bypassed        // Node is bypassed
    };

    juce::String identifier;      // Unique identifier
    juce::String name;            // Display name
    Type type;                    // Node type
    State state = State::Inactive;  // Current state
    int numInputChannels = 2;      // Input channels
    int numOutputChannels = 2;     // Output channels
    double sampleRate = 44100.0;   // Sample rate
    int blockSize = 512;           // Buffer size

    // Audio processing
    std::unique_ptr<juce::AudioProcessor> processor;  // For effects nodes
    float gain = 1.0f;             // Gain in dB
    float pan = 0.0f;              // Pan (-1.0 to 1.0)
    bool muted = false;             // Mute state
    bool soloed = false;             // Solo state
    bool bypassed = false;           // Bypass state

    // Performance monitoring
    double cpuUsage = 0.0;          // CPU usage percentage
    double latency = 0.0;           // Latency in milliseconds
    int clippingCount = 0;          // Clipping detection count

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioNode)
};

/**
 * @brief Audio routing connection between nodes
 */
struct AudioRoute
{
    juce::String identifier;            // Unique route identifier
    juce::String sourceNodeId;          // Source node ID
    juce::String destinationNodeId;     // Destination node ID
    int sourceChannel = -1;              // Source channel (-1 = all)
    int destinationChannel = -1;         // Destination channel (-1 = all)
    float gain = 1.0f;                   // Route gain
    bool enabled = true;                 // Route enabled state
    bool isActive = false;               // Currently processing audio

    // Advanced routing options
    bool crossfadeEnabled = false;       // Enable crossfading
    float crossfadeTime = 10.0f;         // Crossfade time in milliseconds
    bool phaseInvert = false;            // Phase inversion
    bool monoToStereo = false;           // Mono to stereo conversion

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioRoute)
};

/**
 * @brief Effects chain for audio processing
 */
class EffectsChain
{
public:
    EffectsChain(const juce::String& identifier, int maxChannels = 2);
    ~EffectsChain();

    /**
     * Add effect to chain
     */
    bool addEffect(std::unique_ptr<juce::AudioProcessor> effect, const juce::String& name = "");

    /**
     * Remove effect from chain
     */
    bool removeEffect(int index);
    bool removeEffect(const juce::String& identifier);

    /**
     * Reorder effects in chain
     */
    bool moveEffect(int fromIndex, int toIndex);

    /**
     * Get effect by index
     */
    juce::AudioProcessor* getEffect(int index);
    const juce::AudioProcessor* getEffect(int index) const;

    /**
     * Get effect by identifier
     */
    juce::AudioProcessor* getEffect(const juce::String& identifier);
    const juce::AudioProcessor* getEffect(const juce::String& identifier) const;

    /**
     * Process audio through effects chain
     */
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages);

    /**
     * Prepare effects chain for processing
     */
    void prepareToPlay(double sampleRate, int samplesPerBlock);

    /**
     * Reset all effects
     */
    void reset();

    /**
     * Enable/disable bypass for all effects
     */
    void setBypassed(bool bypassed);

    /**
     * Get chain information
     */
    int getNumEffects() const { return static_cast<int>(effects.size()); }
    int getNumChannels() const { return numChannels; }
    double getSampleRate() const { return currentSampleRate; }
    int getBlockSize() const { return currentBlockSize; }

    /**
     * Wet/dry mix control
     */
    void setWetDryMix(float wetLevel, float dryLevel);
    std::pair<float, float> getWetDryMix() const { return {wetLevel, dryLevel}; }

private:
    juce::String chainIdentifier;
    int numChannels;
    double currentSampleRate = 44100.0;
    int currentBlockSize = 512;
    float wetLevel = 1.0f;
    float dryLevel = 0.0f;
    bool bypassed = false;

    std::vector<std::unique_ptr<juce::AudioProcessor>> effects;
    std::vector<juce::String> effectNames;
    juce::AudioBuffer<float> dryBuffer;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(EffectsChain)
};

/**
 * @brief Mixer bus for grouping channels
 */
class MixerBus
{
public:
    enum class Type
    {
        Audio,          // Audio bus
        Auxiliary,      // Aux/send bus
        Group,          // Group bus
        Master,         // Master output bus
        Monitor         // Monitor bus
    };

    MixerBus(const juce::String& identifier, Type type = Type::Audio, int channels = 2);
    ~MixerBus() = default;

    /**
     * Bus configuration
     */
    const juce::String& getIdentifier() const { return identifier; }
    Type getType() const { return busType; }
    int getNumChannels() const { return numChannels; }

    /**
     * Audio processing
     */
    void processAudio(juce::AudioBuffer<float>& buffer);
    void addInput(const juce::AudioBuffer<float>& input, float gain = 1.0f);

    /**
     * Bus controls
     */
    void setGain(float gainDb);
    float getGain() const { return gain; }

    void setPan(float panValue); // -1.0 to 1.0
    float getPan() const { return pan; }

    void setMute(bool muted);
    bool isMuted() const { return muted; }

    void setSolo(bool soloed);
    bool isSoloed() const { return soloed; }

    void setBypass(bool bypassed);
    bool isBypassed() const { return bypassed; }

    /**
     * Bus effects
     */
    EffectsChain* getEffectsChain() { return effectsChain.get(); }
    const EffectsChain* getEffectsChain() const { return effectsChain.get(); }

    /**
     * Bus routing
     */
    void addSend(const juce::String& busIdentifier, float sendLevel);
    void removeSend(const juce::String& busIdentifier);
    float getSendLevel(const juce::String& busIdentifier) const;

    /**
     * Bus monitoring
     */
    float getPeakLevel(int channel = 0) const;
    float getRMSLevel(int channel = 0) const;
    bool isClipping(int channel = 0) const;

    /**
     * Bus state
     */
    struct BusState
    {
        float peakLevel[16] = {0.0f};  // Peak levels per channel
        float rmsLevel[16] = {0.0f};   // RMS levels per channel
        bool clipping[16] = {false};   // Clipping detection
        double cpuUsage = 0.0;         // CPU usage
        int activeInputs = 0;           // Number of active inputs
    };

    BusState getState() const { return currentState; }

private:
    juce::String identifier;
    Type busType;
    int numChannels;
    float gain = 0.0f;         // dB
    float pan = 0.0f;           // -1.0 to 1.0
    bool muted = false;
    bool soloed = false;
    bool bypassed = false;

    std::unique_ptr<EffectsChain> effectsChain;
    std::unordered_map<juce::String, float> sends;

    juce::AudioBuffer<float> mixBuffer;
    BusState currentState;
    mutable std::mutex stateMutex;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MixerBus)
};

/**
 * @brief Main Audio Routing Engine
 */
class AudioRoutingEngine
{
public:
    AudioRoutingEngine();
    ~AudioRoutingEngine();

    //==============================================================================
    // NODE MANAGEMENT
    //==============================================================================

    /**
     * Register an instrument node
     */
    bool registerInstrument(const juce::String& identifier, std::shared_ptr<InstrumentInstance> instrument);

    /**
     * Create and register an audio node
     */
    bool createNode(const juce::String& identifier, AudioNode::Type type, int channels = 2);

    /**
     * Register an existing audio processor as a node
     */
    bool registerEffectNode(const juce::String& identifier, std::unique_ptr<juce::AudioProcessor> processor);

    /**
     * Remove node from routing engine
     */
    bool removeNode(const juce::String& identifier);

    /**
     * Get node by identifier
     */
    AudioNode* getNode(const juce::String& identifier);
    const AudioNode* getNode(const juce::String& identifier) const;

    /**
     * Get all nodes
     */
    std::vector<AudioNode*> getAllNodes();
    std::vector<const AudioNode*> getAllNodes() const;

    /**
     * Get nodes by type
     */
    std::vector<AudioNode*> getNodesByType(AudioNode::Type type);
    std::vector<const AudioNode*> getNodesByType(AudioNode::Type type) const;

    //==============================================================================
    // ROUTING MANAGEMENT
    //==============================================================================

    /**
     * Create audio route between nodes
     */
    juce::String createRoute(const juce::String& sourceNode, const juce::String& destNode,
                            int sourceChannel = -1, int destChannel = -1);

    /**
     * Remove audio route
     */
    bool removeRoute(const juce::String& routeIdentifier);

    /**
     * Get route by identifier
     */
    AudioRoute* getRoute(const juce::String& routeIdentifier);
    const AudioRoute* getRoute(const juce::String& routeIdentifier) const;

    /**
     * Get all routes
     */
    std::vector<AudioRoute*> getAllRoutes();
    std::vector<const AudioRoute*> getAllRoutes() const;

    /**
     * Get routes from source node
     */
    std::vector<AudioRoute*> getRoutesFromNode(const juce::String& sourceNodeId);
    std::vector<const AudioRoute*> getRoutesFromNode(const juce::String& sourceNodeId) const;

    /**
     * Get routes to destination node
     */
    std::vector<AudioRoute*> getRoutesToNode(const juce::String& destNodeId);
    std::vector<const AudioRoute*> getRoutesToNode(const juce::String& destNodeId) const;

    //==============================================================================
    // MIXER BUS MANAGEMENT
    //==============================================================================

    /**
     * Create mixer bus
     */
    MixerBus* createBus(const juce::String& identifier, MixerBus::Type type = MixerBus::Type::Audio, int channels = 2);

    /**
     * Get bus by identifier
     */
    MixerBus* getBus(const juce::String& identifier);
    const MixerBus* getBus(const juce::String& identifier) const;

    /**
     * Get all buses
     */
    std::vector<MixerBus*> getAllBuses();
    std::vector<const MixerBus*> getAllBuses() const;

    /**
     * Remove bus
     */
    bool removeBus(const juce::String& identifier);

    //==============================================================================
    // AUDIO PROCESSING
    //==============================================================================

    /**
     * Prepare for audio processing
     */
    void prepareToPlay(double sampleRate, int samplesPerBlock);

    /**
     * Process audio through entire routing system
     */
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages);

    /**
     * Reset all audio processing
     */
    void reset();

    //==============================================================================
    // ROUTING ENGINE CONFIGURATION
    //==============================================================================

    /**
     * Set global sample rate and buffer size
     */
    void setAudioConfiguration(double sampleRate, int blockSize);

    /**
     * Get current audio configuration
     */
    std::pair<double, int> getAudioConfiguration() const;

    /**
     * Enable/disable real-time routing changes
     */
    void setRealtimeRoutingEnabled(bool enabled) { realtimeRoutingEnabled = enabled; }

    /**
     * Check if real-time routing is enabled
     */
    bool isRealtimeRoutingEnabled() const { return realtimeRoutingEnabled; }

    /**
     * Set maximum number of channels per node
     */
    void setMaxChannelsPerNode(int maxChannels) { maxChannelsPerNode = maxChannels; }

    //==============================================================================
    // MONITORING AND DIAGNOSTICS
    //==============================================================================

    /**
     * Get routing engine statistics
     */
    struct EngineStats
    {
        int totalNodes = 0;
        int activeNodes = 0;
        int totalRoutes = 0;
        int activeRoutes = 0;
        int totalBuses = 0;
        int activeBuses = 0;
        double totalCpuUsage = 0.0;
        double averageLatency = 0.0;
        int clippingDetections = 0;
        size_t memoryUsage = 0;
        double processingTime = 0.0;
    };

    EngineStats getStatistics() const;

    /**
     * Get detailed diagnostic information
     */
    juce::String getDiagnosticInfo() const;

    /**
     * Validate routing configuration
     */
    struct ValidationResult
    {
        bool isValid = true;
        juce::StringArray warnings;
        juce::StringArray errors;
        std::vector<juce::String> invalidRoutes;
        std::vector<juce::String> orphanedNodes;
    };

    ValidationResult validateRouting();

    /**
     * Check for audio loops in routing
     */
    std::vector<std::vector<juce::String>> detectLoops() const;

private:
    //==============================================================================
    // INTERNAL PROCESSING
    //==============================================================================

    void processNodes();
    void processRoutes();
    void processBuses();
    void mixOutputs(juce::AudioBuffer<float>& finalOutput);

    void validateRoute(const AudioRoute& route);
    void updateNodeStates();
    void updateBusStates();

    // Graph processing
    struct ProcessingNode
    {
        AudioNode* node = nullptr;
        std::vector<AudioRoute*> inputRoutes;
        std::vector<AudioRoute*> outputRoutes;
        std::vector<float> inputBuffers;
        std::vector<float> outputBuffers;
        bool processed = false;
    };

    void buildProcessingGraph();
    void processGraph();

    //==============================================================================
    // MEMBER VARIABLES
    //==============================================================================

    mutable std::mutex routingMutex;

    // Nodes and routing
    std::unordered_map<juce::String, std::unique_ptr<AudioNode>> nodes;
    std::unordered_map<juce::String, std::unique_ptr<AudioRoute>> routes;
    std::unordered_map<juce::String, std::shared_ptr<InstrumentInstance>> instrumentNodes;

    // Mixer system
    std::unordered_map<juce::String, std::unique_ptr<MixerBus>> buses;
    std::unique_ptr<MixerBus> masterBus;

    // Processing graph
    std::vector<std::unique_ptr<ProcessingNode>> processingGraph;
    std::vector<ProcessingNode*> processingOrder;

    // Audio configuration
    double currentSampleRate = 44100.0;
    int currentBlockSize = 512;
    bool realtimeRoutingEnabled = true;
    int maxChannelsPerNode = 32;

    // Temporary buffers
    std::vector<juce::AudioBuffer<float>> tempBuffers;
    juce::AudioBuffer<float> masterBuffer;

    // Statistics and monitoring
    mutable EngineStats cachedStats;
    mutable juce::Time lastStatsUpdate;
    std::atomic<int> processingIteration{0};

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AudioRoutingEngine)
};

/**
 * @brief Routing utilities and helpers
 */
namespace RoutingUtils
{
    /**
     * Convert pan value to stereo gains
     */
    std::pair<float, float> panToStereoGains(float pan);

    /**
     * Convert dB to linear gain
     */
    float dBToLinear(float dB);

    /**
     * Convert linear gain to dB
     */
    float linearToDB(float gain);

    /**
     * Check for routing conflicts
     */
    bool hasRoutingConflicts(const std::vector<AudioRoute*>& routes);

    /**
     * Optimize routing order for minimal latency
     */
    std::vector<AudioRoute*> optimizeRoutingOrder(const std::vector<AudioRoute*>& routes);

    /**
     * Calculate routing latency
     */
    double calculateRoutingLatency(const std::vector<AudioRoute*>& routes);
}

} // namespace SchillingerEcosystem::Routing