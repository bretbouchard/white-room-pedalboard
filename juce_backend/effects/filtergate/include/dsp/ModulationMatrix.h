/*******************************************************************************
 * FilterGate - Modulation Matrix
 *
 * Modulation routing system for connecting LFOs, envelopes, and other
 * modulation sources to DSP parameters.
 *
 * @author FilterGate Autonomous Agent 5
 * @date  2025-12-30
 ******************************************************************************/

#pragma once

#include <vector>
#include <memory>
#include <functional>

namespace FilterGate {

// Forward declarations
class EnvelopeGenerator;
class EnvelopeFollower;
class GateDetector;

/**
 * Modulation sources available in the system
 */
enum class ModSource {
    NONE = 0,
    ENV1,           // Envelope 1
    ENV2,           // Envelope 2
    LFO1,           // LFO 1 (not yet implemented)
    LFO2,           // LFO 2 (not yet implemented)
    ENVELOPE_FOLLOWER,
    GATE,           // Gate output (0 or 1)
    VELOCITY,       // MIDI velocity (future)
    RANDOM,         // Random / S&H (future)
    MOD_SOURCE_COUNT
};

/**
 * Modulation destinations
 */
enum class ModDestination {
    NONE = 0,

    // Filter destinations
    FILTER_CUTOFF,
    FILTER_RESONANCE,
    FILTER_DRIVE,

    // Phaser A destinations
    PHASER_A_CENTER,
    PHASER_A_DEPTH,
    PHASER_A_FEEDBACK,
    PHASER_A_MIX,

    // Phaser B destinations
    PHASER_B_CENTER,
    PHASER_B_DEPTH,
    PHASER_B_FEEDBACK,
    PHASER_B_MIX,

    // Global destinations
    VCA_LEVEL,      // Output level
    MIX_DRY_WET,    // Dry/wet mix

    MOD_DESTINATION_COUNT
};

/**
 * Single modulation route
 */
struct ModRoute {
    ModSource source = ModSource::NONE;
    ModDestination destination = ModDestination::NONE;
    float amount = 0.0f;         // Bipolar: -1.0 to 1.0
    float slewMs = 0.0f;         // Smoothing time (0 = instant)

    // Runtime state (not part of preset)
    float smoothedValue = 0.0f;
    float slewCoeff = 0.0f;
};

/**
 * Modulation matrix configuration
 */
struct ModMatrixParams {
    int maxRoutes = 16;          // Maximum number of routes
    bool enabled = true;
};

/**
 * Modulation Matrix
 *
 * Routes modulation sources to destinations with depth control and smoothing.
 * All modulation is hard-clamped post-sum to prevent runaway values.
 */
class ModulationMatrix {
public:
    ModulationMatrix();
    ~ModulationMatrix();

    // Configuration
    void setParams(const ModMatrixParams& params);
    ModMatrixParams getParams() const { return params; }

    // Route management
    int addRoute(const ModRoute& route);
    bool removeRoute(int routeIndex);
    void clearRoutes();
    const ModRoute& getRoute(int index) const;
    void updateRoute(int index, const ModRoute& route);
    int getNumRoutes() const { return static_cast<int>(routes.size()); }

    // Source registration
    void registerEnv1(EnvelopeGenerator* env) { env1 = env; }
    void registerEnv2(EnvelopeGenerator* env) { env2 = env; }
    void registerEnvelopeFollower(EnvelopeFollower* ef) { envelopeFollower = ef; }
    void registerGate(GateDetector* gate) { gateDetector = gate; }

    // Sample rate
    void prepare(double sampleRate);
    void reset();

    // Processing
    void processSample();

    // Get modulation value for destination
    float getModulation(ModDestination dest) const;

    // Get source value (for debugging)
    float getSourceValue(ModSource source) const;

private:
    ModMatrixParams params;
    std::vector<ModRoute> routes;

    // Source references
    EnvelopeGenerator* env1 = nullptr;
    EnvelopeGenerator* env2 = nullptr;
    EnvelopeFollower* envelopeFollower = nullptr;
    GateDetector* gateDetector = nullptr;

    // Current source values
    float sourceValues[static_cast<int>(ModSource::MOD_SOURCE_COUNT)];
    float modDestinations[static_cast<int>(ModDestination::MOD_DESTINATION_COUNT)];

    double sampleRate = 48000.0;

    // Helper methods
    float readSource(ModSource source);
    void applySmoothing(int routeIndex);
};

} // namespace FilterGate
