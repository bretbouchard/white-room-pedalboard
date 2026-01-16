/*
  ==============================================================================

    HouseBand.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    JUCE House Band - Pure audio engine performer with no UI.

    This is the "house band" - the audio rendering engine that performs songs.
    It has NO UI - all controls live in the Swift frontend.

    Responsibilities:
    - Load SongState from disk
    - Select and manage PerformanceState
    - Project songs using ProjectionEngine
    - Render RenderedSongGraph in real-time
    - Switch between performances with crossfading
    - Transport controls (play/pause/seek/loop)

  ==============================================================================
*/

#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>
#include <memory>
#include <vector>
#include <atomic>
#include <optional>

#include "audio/ProjectionEngine.h"

// ============================================================================
// Forward Declarations
// ============================================================================

struct SongState;
struct PerformanceState;
struct RenderedSongGraph;

// ============================================================================
// House Band Configuration
// ============================================================================

/**
 * Configuration for HouseBand initialization
 */
struct HouseBandConfig
{
    double sampleRate;
    int maxSamplesPerBlock;
    int numOutputChannels;
    int numInputChannels;

    HouseBandConfig()
        : sampleRate(44100.0)
        , maxSamplesPerBlock(512)
        , numOutputChannels(2)
        , numInputChannels(0)
    {
    }
};

// ============================================================================
// Transport State
// ============================================================================

/**
 * Transport state (playback position, speed, looping)
 */
struct TransportState
{
    std::atomic<bool> isPlaying;
    std::atomic<bool> isLooping;
    std::atomic<double> currentPosition;  // seconds
    std::atomic<double> loopStart;        // seconds
    std::atomic<double> loopEnd;          // seconds
    std::atomic<double> playbackSpeed;    // 1.0 = normal

    TransportState()
        : isPlaying(false)
        , isLooping(false)
        , currentPosition(0.0)
        , loopStart(0.0)
        , loopEnd(0.0)
        , playbackSpeed(1.0)
    {
    }
};

// ============================================================================
// Performance Crossfade State
// ============================================================================

/**
 * Active crossfade between performances
 */
struct CrossfadeState
{
    bool isCrossfading;
    juce::String fromPerformanceId;
    juce::String toPerformanceId;
    std::atomic<double> blendFactor;  // 0.0 = from, 1.0 = to
    juce::int64 crossfadeStartTime;
    double crossfadeDuration;  // seconds

    CrossfadeState()
        : isCrossfading(false)
        , blendFactor(0.0)
        , crossfadeStartTime(0)
        , crossfadeDuration(0.0)
    {
    }
};

// ============================================================================
// House Band - Audio Engine Performer
// ============================================================================

/**
 * JUCE House Band - Pure audio engine performer

 * This is the rendering engine that plays songs. It has NO UI - all controls
 * live in the Swift frontend. JUCE is purely the performer: it receives
 * orders (SongContract -> SongState), gets direction (PerformanceState),
 * and makes sound (Instruments + ConsoleX).

 *
 * Core Workflow:
 * 1. Load SongState from disk (JSON)
 * 2. Select PerformanceState (from SongState performances list)
 * 3. Project: Call ProjectionEngine::projectSong()
 * 4. Render: Play RenderedSongGraph in real-time
 * 5. Switch: Crossfade between performances (projectSongBlend)
 * 6. Transport: Play/pause/seek/loop
 *
 * Thread Safety:
 * - Audio thread (processAudio): Lock-free atomic reads
 * - UI thread (load, switch, transport): Lock-free atomic writes
 * - NEVER blocks in audio thread
 *
 * Integration:
 * - Swift frontend calls JUCE via FFI/bridge
 * - Passes SongState + PerformanceState
 * - JUCE returns audio buffers
 * - NO user controls in JUCE layer
 */
class HouseBand
{
public:
    //==========================================================================
    // Construction/Destruction
    //==========================================================================

    /**
     * Create HouseBand with default configuration
     */
    HouseBand();

    /**
     * Create HouseBand with specific configuration
     */
    HouseBand(const HouseBandConfig& config);

    ~HouseBand();

    //==========================================================================
    // Initialization
    //==========================================================================

    /**
     * Initialize audio engine
     *
     * Call this before processing audio. Sets up internal buffers
     * and prepares the projection engine.
     *
     * @param config Audio configuration
     * @returns true if initialized successfully
     */
    bool initialize(const HouseBandConfig& config);

    /**
     * Reset all state
     *
     * Stops playback, clears song, resets transport to beginning.
     */
    void reset();

    //==========================================================================
    // Song Loading
    //==========================================================================

    /**
     * Load a song from SongState
     *
     * Loads the song state and projects it with the specified performance.
     * Call this from UI thread (thread-safe with atomic state update).
     *
     * @param song SongState to load
     * @param performanceId Initial performance ID (from song.performances)
     * @returns true if loaded successfully
     */
    bool loadSong(const SongState& song, const juce::String& performanceId);

    /**
     * Load a performance from PerformanceState
     *
     * Projects the current song with a different performance.
     * Can be called while playing (triggers crossfade if enabled).
     *
     * @param performance PerformanceState to load
     * @returns true if loaded successfully
     */
    bool loadPerformance(const PerformanceState& performance);

    //==========================================================================
    // Performance Switching
    //==========================================================================

    /**
     * Switch to a different performance with crossfade
     *
     * Schedules a crossfade to the target performance. The crossfade
     * happens smoothly over the specified duration using equal-power curve.
     *
     * @param performanceId Target performance ID
     * @param crossfadeSeconds Crossfade duration (0.0 = instant)
     * @returns true if switch scheduled successfully
     */
    bool switchToPerformance(const juce::String& performanceId,
                            double crossfadeSeconds = 2.0);

    /**
     * Set blend factor manually
     *
     * Manual control over crossfade blend. 0.0 = current performance,
     * 1.0 = target performance.
     *
     * @param t Blend factor (0.0 to 1.0)
     */
    void setBlendFactor(double t);

    /**
     * Get current blend factor
     *
     * Thread-safe atomic read.
     */
    double getBlendFactor() const;

    //==========================================================================
    // Transport Controls
    //==========================================================================

    /**
     * Start playback
     *
     * Thread-safe atomic write.
     */
    void play();

    /**
     * Pause playback
     *
     * Thread-safe atomic write. Preserves current position.
     */
    void pause();

    /**
     * Stop playback and reset to beginning
     *
     * Thread-safe atomic writes.
     */
    void stop();

    /**
     * Seek to position
     *
     * Thread-safe atomic write.
     *
     * @param seconds Position in seconds
     */
    void seekTo(double seconds);

    /**
     * Set loop region
     *
     * Thread-safe atomic writes.
     *
     * @param enabled Enable/disable looping
     * @param startSeconds Loop start position (if enabled)
     * @param endSeconds Loop end position (if enabled)
     */
    void setLoop(bool enabled, double startSeconds, double endSeconds);

    /**
     * Set playback speed
     *
     * Thread-safe atomic write.
     *
     * @param speed Speed multiplier (1.0 = normal, 0.5 = half speed, etc.)
     */
    void setPlaybackSpeed(double speed);

    //==========================================================================
    // Audio Processing
    //==========================================================================

    /**
     * Prepare to play
     *
     * Call this when sample rate or block size changes.
     * Sets internal buffer sizes and smoothing coefficients.
     *
     * @param sampleRate New sample rate
     * @param maxSamplesPerBlock Maximum block size
     */
    void prepareToPlay(double sampleRate, int maxSamplesPerBlock);

    /**
     * Process audio block
     *
     * Called from audio thread. MUST be real-time safe (no blocking, no malloc).
     * Renders the song graph to the audio buffer.
     *
     * @param buffer Output audio buffer
     * @param midiBuffer MIDI output buffer (for instrument triggering)
     */
    void processAudio(juce::AudioBuffer<float>& buffer,
                     juce::MidiBuffer& midiBuffer);

    /**
     * Release resources
     *
     * Called when audio engine is shutting down. Clears buffers.
     */
    void releaseResources();

    //==========================================================================
    // State Accessors
    //==========================================================================

    /**
     * Get current render graph
     *
     * Returns the graph being used for rendering (may be blended).
     * Thread-safe shared pointer copy.
     */
    std::shared_ptr<RenderedSongGraph> getCurrentGraph();

    /**
     * Get current performance state
     *
     * Returns the active performance configuration.
     * Thread-safe shared pointer copy.
     */
    std::shared_ptr<PerformanceState> getCurrentPerformance();

    /**
     * Get current song state
     *
     * Returns the loaded song configuration.
     * Thread-safe shared pointer copy.
     */
    std::shared_ptr<SongState> getCurrentSong();

    /**
     * Get transport state
     *
     * Returns current transport position and state.
     * Thread-safe atomic reads.
     */
    TransportState getTransportState() const;

    /**
     * Check if a song is loaded
     *
     * Thread-safe atomic read.
     */
    bool hasSongLoaded() const;

    /**
     * Check if currently playing
     *
     * Thread-safe atomic read.
     */
    bool isPlaying() const;

    /**
     * Check if crossfade is active
     *
     * Thread-safe atomic read.
     */
    bool isCrossfading() const;

    //==========================================================================
    // Error Handling
    //==========================================================================

    /**
     * Get last error message
     *
     * Returns the last error that occurred (empty string if no error).
     * Thread-safe.
     */
    juce::String getLastError() const;

    /**
     * Clear last error
     *
     * Thread-safe atomic write.
     */
    void clearError();

private:
    //==========================================================================
    // Internal Implementation
    //==========================================================================

    /**
     * Update current position based on playback state
     *
     * Called from processAudio. Advances position if playing,
     * handles looping, wraps at song end.
     *
     * @param samplesToProcess Number of samples in current block
     */
    void updatePosition(int samplesToProcess);

    /**
     * Render graph to audio buffer
     *
     * Internal rendering method. Processes notes from the graph
     * and renders them to the audio buffer.
     *
     * @param graph Graph to render
     * @param buffer Output buffer
     * @param midiBuffer MIDI output buffer
     */
    void renderGraph(const RenderedSongGraph& graph,
                    juce::AudioBuffer<float>& buffer,
                    juce::MidiBuffer& midiBuffer);

    /**
     * Apply crossfade between two graphs
     *
     * Renders both graphs and crossfades them based on blend factor.
     * Uses equal-power curve for smooth transitions.
     *
     * @param graphA Graph A (when blend = 0)
     * @param graphB Graph B (when blend = 1)
     * @param blend Blend factor (0.0 to 1.0)
     * @param buffer Output buffer
     * @param midiBuffer MIDI output buffer
     */
    void renderCrossfade(const RenderedSongGraph& graphA,
                        const RenderedSongGraph& graphB,
                        double blend,
                        juce::AudioBuffer<float>& buffer,
                        juce::MidiBuffer& midiBuffer);

    /**
     * Update crossfade state
     *
     * Called from processAudio. Advances crossfade progress,
     * checks if crossfade is complete.
     *
     * @param samplesToProcess Number of samples in current block
     */
    void updateCrossfade(int samplesToProcess);

    /**
     * Project song with current performance
     *
     * Internal helper. Projects the loaded song with the specified
     * performance using ProjectionEngine.
     *
     * @param performanceId Performance ID to project with
     * @returns Rendered graph, or nullptr if projection failed
     */
    std::shared_ptr<RenderedSongGraph> projectWithPerformance(
        const juce::String& performanceId);

    /**
     * Set error message
     *
     * Thread-safe atomic write.
     *
     * @param error Error message
     */
    void setError(const juce::String& error);

    //==========================================================================
    // Member Variables
    //==========================================================================

    // Audio configuration
    HouseBandConfig config;
    double currentSampleRate;

    // Song state (atomic shared pointer for lock-free access)
    std::atomic<std::shared_ptr<SongState>*> currentSong;

    // Performance state (atomic shared pointer for lock-free access)
    std::atomic<std::shared_ptr<PerformanceState>*> currentPerformance;

    // Rendered graphs (dual buffers for crossfading)
    std::shared_ptr<RenderedSongGraph> graphA;  // Current/performance A
    std::shared_ptr<RenderedSongGraph> graphB;  // Target/performance B

    // Active render graph (may be blended)
    std::atomic<std::shared_ptr<RenderedSongGraph>*> activeGraph;

    // Projection engine
    std::unique_ptr<ProjectionEngine> projectionEngine;

    // Transport state
    TransportState transport;

    // Crossfade state
    CrossfadeState crossfade;

    // Error state
    std::atomic<juce::String*> lastError;

    // Internal buffers (for processing)
    juce::AudioBuffer<float> tempBuffer;
    juce::MidiBuffer tempMidiBuffer;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(HouseBand)
};
