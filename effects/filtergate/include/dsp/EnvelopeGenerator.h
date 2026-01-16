#pragma once
#include <juce_core/juce_core.h>

namespace FilterGate {

/**
 * Envelope Mode
 */
enum class EnvMode {
    ADR,    // Attack, Decay, Release (no sustain)
    ADSR    // Attack, Decay, Sustain, Release
};

/**
 * Envelope Generator Parameters
 */
struct EnvelopeParams {
    EnvMode mode = EnvMode::ADSR;
    float attackMs = 10.0f;             // 0-5000, Attack time
    float decayMs = 100.0f;             // 0-5000, Decay time
    float sustain = 0.5f;               // 0-1, Sustain level (ignored in ADR)
    float releaseMs = 200.0f;           // 0-5000, Release time
    bool loop = false;                  // Loop envelope (ADR only)
    bool velocitySensitive = false;     // Scale envelope by velocity
};

/**
 * ADSR/ADR Envelope Generator
 *
 * Generates classic ADSR (Attack, Decay, Sustain, Release) or ADR (Attack, Decay, Release) envelopes.
 *
 * ADSR Stages:
 * 1. Attack: 0 -> 1 over attackMs
 * 2. Decay: 1 -> sustain over decayMs
 * 3. Sustain: Hold at sustain level until release()
 * 4. Release: sustain -> 0 over releaseMs
 *
 * ADR Stages:
 * 1. Attack: 0 -> 1 over attackMs
 * 2. Decay: 1 -> 0 over decayMs
 * 3. Loop: Retrigger if loop enabled, else go to IDLE
 *
 * Realtime-safe: No allocations in process()
 * Sample-accurate: Processes single samples or blocks
 */
class EnvelopeGenerator {
public:
    EnvelopeGenerator();
    ~EnvelopeGenerator();

    /**
     * Prepare for processing
     * @param sampleRate Sample rate in Hz
     * @param samplesPerBlock Expected block size
     */
    void prepare(double sampleRate, int samplesPerBlock);

    /**
     * Reset all state to initial values
     */
    void reset();

    /**
     * Set envelope parameters
     */
    void setParams(const EnvelopeParams& newParams);

    /**
     * Trigger envelope start
     * @param velocity Velocity amount (0-1), used if velocitySensitive is true
     */
    void trigger(float velocity = 1.0f);

    /**
     * Trigger envelope release (go to release stage)
     */
    void release();

    /**
     * Process single sample
     * @return Current envelope level (0-1)
     */
    float process();

    /**
     * Process single sample (alias for process())
     * @return Current envelope level (0-1)
     */
    float processSample() { return process(); }

    /**
     * Process block of samples
     * @param output Output buffer for envelope values
     * @param numSamples Number of samples to process
     */
    void process(float* output, int numSamples);

    /**
     * Get current envelope level
     * @return Current level (0-1)
     */
    float getCurrentLevel() const { return currentLevel; }

    /**
     * Check if envelope is idle (not active)
     * @return true if envelope is at 0 and not active
     */
    bool isIdle() const;

    /**
     * Get current stage name (for debugging/visualization)
     */
    juce::String getStageName() const;

private:
    EnvelopeParams params;
    double sampleRate = 48000.0;

    enum class EnvStage {
        IDLE,       // Not active
        ATTACK,     // Rising from 0 to 1
        DECAY,      // Falling from 1 to sustain
        SUSTAIN,    // Holding at sustain level
        RELEASE     // Falling from current to 0
    };

    EnvStage currentStage = EnvStage::IDLE;
    float currentLevel = 0.0f;
    float targetLevel = 0.0f;
    float increment = 0.0f;

    // Velocity scaling
    float velocityAmount = 1.0f;

    /**
     * Calculate increment for given time
     * @param timeMs Time in milliseconds
     * @return Increment per sample (positive or negative)
     */
    float calculateIncrement(float timeMs, float startLevel, float endLevel);

    /**
     * Advance envelope state by one sample
     */
    void advance();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(EnvelopeGenerator)
};

} // namespace FilterGate
