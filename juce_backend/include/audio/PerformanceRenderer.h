/**
 * PerformanceRenderer - Bar-boundary performance switching in JUCE audio engine
 *
 * This is the JUCE C++ implementation of performance switching at bar boundaries.
 * Integrates with the TypeScript SDK's PerformanceSwitcher and TransitionEngine.
 *
 * Core Responsibilities:
 * - Track current playback position and detect bar boundaries
 * - Apply performance changes at sample-accurate bar boundaries
 * - Lock-free updates for audio thread safety
 * - Smooth transitions without audio glitches
 *
 * Thread Safety:
 * - All state updates use lock-free atomic operations
 * - Audio thread (processBlock) never blocks
 * - UI thread schedules switches, audio thread executes them
 *
 * Integration:
 * - Receives performance switch commands from Swift UI via FFI
 * - Calculates bar boundaries using BarBoundaryDetector logic
 * - Applies performance configuration atomically
 */

#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>
#include <atomic>
#include <memory>
#include <optional>

// ============================================================================
// Types
// ============================================================================

/**
 * Performance configuration (mirrors TypeScript PerformanceRealizationV1)
 */
struct PerformanceConfig
{
    juce::String id;
    juce::String name;
    double density; // 0-1
    juce::String grooveProfileId;
    juce::String consoleXProfileId;
    juce::Array<juce::String> instrumentIds; // Role -> Instrument mapping
    juce::Array<double> mixGains; // dB per role
    juce::Array<double> mixPans; // -1 to 1 per role
};

/**
 * Scheduled performance switch
 */
struct ScheduledSwitch
{
    juce::String performanceId;
    int targetBar; // Bar number when switch should occur
    juce::int64 scheduledAt; // Timestamp
    bool isValid;
    ScheduledSwitch() : isValid(false) {}
};

/**
 * Performance state (atomic for lock-free access)
 */
struct PerformanceState
{
    std::atomic<juce::String*> activePerformanceId;
    std::atomic<double> currentDensity;
    std::atomic<juce::String*> currentGrooveProfileId;
    std::atomic<juce::String*> currentConsoleXProfileId;
    std::atomic<int> currentBar;

    PerformanceState();
    ~PerformanceState();

    // Disable copy, enable move
    PerformanceState(const PerformanceState&) = delete;
    PerformanceState& operator=(const PerformanceState&) = delete;
};

// ============================================================================
// PerformanceRenderer
// ============================================================================

class PerformanceRenderer
{
public:
    PerformanceRenderer();
    ~PerformanceRenderer();

    /**
     * Initialize renderer with sample rate
     */
    void initialize(double sampleRate);

    /**
     * Reset renderer state
     */
    void reset();

    /**
     * Process audio block and execute scheduled switches
     *
     * Called from audio thread. Must be fast and non-blocking.
     * Detects bar boundaries and applies scheduled switches.
     *
     * @param buffer Audio buffer to process
     * @param currentSamplePosition Current playback position in samples
     * @param tempo Current tempo in BPM
     * @param timeSignatureNumerator Time signature numerator (e.g., 4 for 4/4)
     * @param timeSignatureDenominator Time signature denominator (e.g., 4 for 4/4)
     */
    void processBlock(juce::AudioBuffer<float>& buffer,
                     juce::int64 currentSamplePosition,
                     double tempo,
                     int timeSignatureNumerator,
                     int timeSignatureDenominator);

    /**
     * Schedule a performance switch at next bar boundary
     *
     * Called from UI thread. Thread-safe.
     *
     * @param performanceId Target performance ID
     * @param currentSamplePosition Current playback position
     * @param tempo Current tempo
     * @param timeSignatureNumerator Time signature numerator
     * @param timeSignatureDenominator Time signature denominator
     * @returns true if scheduled successfully
     */
    bool scheduleSwitchAtNextBar(const juce::String& performanceId,
                                 juce::int64 currentSamplePosition,
                                 double tempo,
                                 int timeSignatureNumerator,
                                 int timeSignatureDenominator);

    /**
     * Cancel any pending switch
     *
     * Called from UI thread. Thread-safe.
     */
    void cancelPendingSwitch();

    /**
     * Get current active performance ID
     *
     * Thread-safe (lock-free atomic read).
     */
    juce::String getActivePerformanceId() const;

    /**
     * Get pending switch (if any)
     *
     * Thread-safe (lock-free atomic read).
     */
    ScheduledSwitch getPendingSwitch() const;

    /**
     * Check if a switch is pending
     *
     * Thread-safe (lock-free atomic read).
     */
    bool hasPendingSwitch() const;

    /**
     * Apply performance configuration (internal use)
     *
     * Called from audio thread when reaching bar boundary.
     * Applies all performance changes atomically.
     *
     * @param config Performance configuration to apply
     */
    void applyPerformanceConfig(const PerformanceConfig& config);

    /**
     * Calculate bar boundary position
     *
     * Utility function for calculating when next bar boundary occurs.
     *
     * @param currentSamplePosition Current playback position
     * @param tempo Current tempo
     * @param timeSignatureNumerator Time signature numerator
     * @param timeSignatureDenominator Time signature denominator
     * @returns Sample position of next bar boundary
     */
    juce::int64 calculateNextBarBoundary(juce::int64 currentSamplePosition,
                                        double tempo,
                                        int timeSignatureNumerator,
                                        int timeSignatureDenominator) const;

    /**
     * Calculate current bar number
     *
     * @param currentSamplePosition Current playback position
     * @param tempo Current tempo
     * @param timeSignatureNumerator Time signature numerator
     * @param timeSignatureDenominator Time signature denominator
     * @returns Current bar number (0-indexed)
     */
    int calculateCurrentBar(juce::int64 currentSamplePosition,
                           double tempo,
                           int timeSignatureNumerator,
                           int timeSignatureDenominator) const;

    /**
     * Check if at bar boundary
     *
     * @param currentSamplePosition Current playback position
     * @param tempo Current tempo
     * @param timeSignatureNumerator Time signature numerator
     * @param timeSignatureDenominator Time signature denominator
     * @returns true if exactly at bar boundary
     */
    bool isAtBarBoundary(juce::int64 currentSamplePosition,
                       double tempo,
                       int timeSignatureNumerator,
                       int timeSignatureDenominator) const;

private:
    /**
     * Execute scheduled switch
     *
     * Called from audio thread when reaching target bar.
     * Updates performance state atomically.
     *
     * @param targetBar Bar number to execute switch at
     * @returns true if switch executed successfully
     */
    bool executeScheduledSwitch(int targetBar);

    /**
     * Calculate samples per beat
     */
    double samplesPerBeat(double tempo) const;

    /**
     * Calculate samples per bar
     */
    double samplesPerBar(double tempo, int timeSignatureNumerator) const;

    // Audio engine state
    double sampleRate;
    std::unique_ptr<PerformanceState> currentState;

    // Scheduled switch (atomic for lock-free access)
    std::atomic<ScheduledSwitch*> pendingSwitch;

    // Performance configurations (indexed by ID)
    juce::HashMap<juce::String, PerformanceConfig> performanceConfigs;

    // Temporary storage for atomic string operations
    juce::StringPool stringPool;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PerformanceRenderer)
};
