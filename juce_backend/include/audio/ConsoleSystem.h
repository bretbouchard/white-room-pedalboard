/**
 * White Room Console / Mixing System
 *
 * Bus graph with insert effects, send/return effects, routing matrix, and metering.
 * All effects initialized to bypass (silent by default).
 *
 * T023: Implement Console/Mixing System
 */

#pragma once

#include <cstdint>
#include <string>
#include <memory>
#include <vector>
#include <map>

// Define non-copyable macro for C++11 compatibility
#define WHITE_ROOM_DECLARE_NON_COPYABLE(Class) \
    Class(const Class&) = delete; \
    Class& operator=(const Class&) = delete;

// Use std::string instead of juce::String
using string = std::string;

namespace white_room {
namespace audio {

// Forward declaration for AudioBuffer (will be provided by audio engine)
class AudioBuffer;

// =============================================================================
// BUS TYPES
// =============================================================================

/**
 * Bus type
 */
enum class BusType {
    Voice,      // Individual voice bus
    Mix,        // Mix bus (group multiple voices)
    Master,     // Master output bus
    Aux         // Auxiliary send/return bus
};

/**
 * Bus configuration
 */
struct BusConfig {
    std::string name;
    BusType type;
    int busIndex;
    std::vector<int> voiceIndices;  // For voice/mix buses
    bool muted;
    double gain;                    // Linear gain (0.0 to 1.0+)
    double pan;                     // Pan (-1.0 to 1.0, 0 = center)

    BusConfig()
        : type(BusType::Voice), busIndex(0), muted(false), gain(1.0), pan(0.0) {}
};

// =============================================================================
// EFFECT TYPES
// =============================================================================

/**
 * Effect type
 */
enum class EffectType {
    Compressor,
    EQ,
    Reverb,
    Delay,
    Chorus,
    Phaser,
    Distortion,
    Filter,
    Limiter,
    Gate,
    Other
};

/**
 * Effect state
 */
enum class EffectState {
    Bypassed,   // Effect is disabled (default)
    Active,     // Effect is enabled
    Solo        // Effect is soloed (only this effect processes)
};

/**
 * Effect configuration
 */
struct EffectConfig {
    std::string name;
    EffectType type;
    EffectState state;
    std::map<std::string, double> parameters;  // Effect parameters
    int busIndex;                               // Parent bus index
    bool isInsert;                               // True = insert effect, false = send/return

    EffectConfig()
        : type(EffectType::Other), state(EffectState::Bypassed),
          busIndex(0), isInsert(true) {}
};

// =============================================================================
// METERING
// =============================================================================

/**
 * Peak and RMS levels
 */
struct LevelMeter {
    float peakL;      // Peak level left (dB)
    float peakR;      // Peak level right (dB)
    float rmsL;      // RMS level left (dB)
    float rmsR;      // RMS level right (dB)
    float peakHoldL; // Peak hold left (dB)
    float peakHoldR; // Peak hold right (dB)

    LevelMeter()
        : peakL(-60.0f), peakR(-60.0f), rmsL(-60.0f), rmsR(-60.0f),
          peakHoldL(-60.0f), peakHoldR(-60.0f) {}

    void reset() {
        peakL = peakR = rmsL = rmsR = peakHoldL = peakHoldR = -60.0f;
    }
};

/**
 * Metering configuration
 */
struct MeteringConfig {
    bool enablePeak;
    bool enableRMS;
    bool enablePeakHold;
    float peakHoldTime;  // Seconds
    float rmsWindow;     // Seconds

    MeteringConfig()
        : enablePeak(true), enableRMS(true), enablePeakHold(true),
          peakHoldTime(1.0f), rmsWindow(0.1f) {}
};

// =============================================================================
// ROUTING MATRIX
// =============================================================================

/**
 * Routing connection
 */
struct RoutingConnection {
    int sourceBus;     // Source bus index
    int destBus;       // Destination bus index
    double amount;     // Send amount (0.0 to 1.0)

    RoutingConnection() : sourceBus(-1), destBus(-1), amount(0.0) {}
    RoutingConnection(int src, int dst, double amt)
        : sourceBus(src), destBus(dst), amount(amt) {}
};

// =============================================================================
// CONSOLE / MIXING SYSTEM
// =============================================================================

/**
 * Console configuration
 */
struct ConsoleConfig {
    int numVoiceBuses;      // Number of voice buses
    int numMixBuses;        // Number of mix buses
    int numAuxBuses;        // Number of aux buses
    int numEffects;         // Max effects per bus

    ConsoleConfig()
        : numVoiceBuses(32), numMixBuses(8), numAuxBuses(4), numEffects(8) {}
};

/**
 * Console / Mixing System
 *
 * Manages bus graph, effects, routing, and metering.
 * All effects initialized to bypass (silent by default).
 */
class ConsoleSystem {
public:
    explicit ConsoleSystem(const ConsoleConfig& config,
                          double sampleRate = 48000.0,
                          int bufferSize = 512);
    ~ConsoleSystem();

    // -------------------------------------------------------------------------
    // BUS MANAGEMENT
    // -------------------------------------------------------------------------

    /**
     * Add a bus to the console
     */
    bool addBus(const BusConfig& config);

    /**
     * Remove a bus
     */
    bool removeBus(int busIndex);

    /**
     * Get bus configuration
     */
    BusConfig getBusConfig(int busIndex) const;

    /**
     * Set bus gain
     */
    void setBusGain(int busIndex, double gain);

    /**
     * Set bus pan
     */
    void setBusPan(int busIndex, double pan);

    /**
     * Mute/unmute bus
     */
    void setBusMuted(int busIndex, bool muted);

    /**
     * Get bus levels
     */
    LevelMeter getBusLevels(int busIndex) const;

    // -------------------------------------------------------------------------
    // EFFECT MANAGEMENT
    // -------------------------------------------------------------------------

    /**
     * Add effect to bus
     */
    bool addEffect(int busIndex, const EffectConfig& effect);

    /**
     * Remove effect from bus
     */
    bool removeEffect(int busIndex, int effectIndex);

    /**
     * Get effect configuration
     */
    EffectConfig getEffectConfig(int busIndex, int effectIndex) const;

    /**
     * Set effect state (bypass/active)
     */
    void setEffectState(int busIndex, int effectIndex, EffectState state);

    /**
     * Set effect parameter
     */
    void setEffectParameter(int busIndex, int effectIndex,
                           const std::string& param, double value);

    /**
     * Get effect parameter
     */
    double getEffectParameter(int busIndex, int effectIndex,
                             const std::string& param) const;

    // -------------------------------------------------------------------------
    // ROUTING MANAGEMENT
    // -------------------------------------------------------------------------

    /**
     * Add routing connection
     */
    bool addRouting(const RoutingConnection& routing);

    /**
     * Remove routing connection
     */
    bool removeRouting(int sourceBus, int destBus);

    /**
     * Set routing amount
     */
    void setRoutingAmount(int sourceBus, int destBus, double amount);

    /**
     * Get all routings for a source bus
     */
    std::vector<RoutingConnection> getRoutings(int sourceBus) const;

    // -------------------------------------------------------------------------
    // MASTER OUTPUT
    // -------------------------------------------------------------------------

    /**
     * Get master output levels
     */
    LevelMeter getMasterLevels() const;

    /**
     * Set master output gain
     */
    void setMasterGain(double gain);

    // -------------------------------------------------------------------------
    // AUDIO PROCESSING
    // -------------------------------------------------------------------------

    /**
     * Process audio through console
     * Called from audio thread - must be real-time safe
     */
    void processAudio(AudioBuffer& buffer);

    /**
     * Update metering
     */
    void updateMeters();

    // -------------------------------------------------------------------------
    // CONFIGURATION
    // -------------------------------------------------------------------------

    /**
     * Prepare for playback
     */
    void prepare(double sampleRate, int bufferSize);

    /**
     * Reset all state
     */
    void reset();

private:
    ConsoleConfig config_;
    double sampleRate_;
    int bufferSize_;

    // Bus storage
    std::vector<BusConfig> buses_;

    // Effects storage (busIndex -> vector of effects)
    std::map<int, std::vector<EffectConfig>> effects_;

    // Routing matrix (sourceBus -> vector of connections)
    std::map<int, std::vector<RoutingConnection>> routing_;

    // Level meters (busIndex -> meter)
    std::map<int, LevelMeter> busMeters_;
    LevelMeter masterMeter_;

    // Metering config
    MeteringConfig meteringConfig_;

    // Internal helpers
    void processBus(int busIndex, AudioBuffer& buffer);
    void processEffects(int busIndex, AudioBuffer& buffer);
    void processRouting(int busIndex, AudioBuffer& buffer);
    void updateLevelMeter(LevelMeter& meter, const AudioBuffer& buffer);

    WHITE_ROOM_DECLARE_NON_COPYABLE(ConsoleSystem)
};

} // namespace audio
} // namespace white_room
