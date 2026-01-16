/*
  ==============================================================================

    ProjectionEngine.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    Core projection engine for White Room audio rendering.

    This is the ONLY way to turn a SongState into audio. All projection
    operations MUST go through this engine to ensure:
    - Consistent validation
    - Centralized error handling
    - Deterministic results
    - Cache-friendly architecture

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <vector>
#include <optional>

// ============================================================================
// Forward Declarations
// ============================================================================

struct SongState;
struct PerformanceState;
struct RenderedSongGraph;
struct ProjectionResult;
struct ProjectionError;

// ============================================================================
// Projection Configuration
// ============================================================================

/**
 * Configuration options for projection
 */
struct ProjectionConfig
{
    bool validateGraph;        // Validate render graph for circular routing
    bool includeAutomation;    // Include automation in render graph
    bool collectTimingStats;   // Collect timing statistics
    double durationOverride;   // Override duration (0 = use song duration)

    ProjectionConfig()
        : validateGraph(true)
        , includeAutomation(true)
        , collectTimingStats(false)
        , durationOverride(0.0)
    {
    }

    /**
     * Create config for realtime projection (fast, no validation)
     */
    static ProjectionConfig realtime()
    {
        ProjectionConfig config;
        config.validateGraph = false;
        config.collectTimingStats = false;
        return config;
    }

    /**
     * Create config for export (full validation, timing stats)
     */
    static ProjectionConfig exportConfig()
    {
        ProjectionConfig config;
        config.validateGraph = true;
        config.collectTimingStats = true;
        return config;
    }
};

// ============================================================================
// Projection Result
// ============================================================================

/**
 * Result of successful projection
 */
struct ProjectionResult
{
    juce::String resultId;              // Deterministic ID from inputs
    std::shared_ptr<RenderedSongGraph> renderGraph;  // Complete render graph
    juce::StringArray warnings;         // Non-fatal warnings
    double projectedDuration;           // Projected duration in seconds
    juce::int64 projectionTimestamp;    // Unix timestamp (ms)

    /**
     * Check if result is valid
     */
    bool isValid() const { return renderGraph != nullptr; }
};

// ============================================================================
// Projection Error
// ============================================================================

/**
 * Error types for projection failures
 */
enum class ProjectionErrorType
{
    invalidSong,              // Song structure is invalid
    invalidPerformance,       // Performance structure is invalid
    performanceReferencesInvalid,  // Performance references invalid entities
    circularRouting,          // Render graph has circular routing
    orphanedNodes,            // Render graph has orphaned nodes
    graphGenerationFailed,    // Failed to generate render graph
    consolexGenerationFailed, // Failed to generate ConsoleX config
    unknown                   // Unknown error
};

/**
 * Projection error with user-friendly message and debug context
 */
struct ProjectionError
{
    ProjectionErrorType type;
    juce::String userMessage;     // User-friendly error message
    juce::String debugInfo;       // Detailed debug information
    juce::StringArray context;    // Contextual information

    ProjectionError(ProjectionErrorType t,
                    const juce::String& message,
                    const juce::String& debug = juce::String())
        : type(t)
        , userMessage(message)
        , debugInfo(debug)
    {
    }

    /**
     * Create error from string map (for debug context)
     */
    static ProjectionError withContext(ProjectionErrorType t,
                                       const juce::String& message,
                                       const std::vector<std::pair<juce::String, juce::String>>& ctx)
    {
        ProjectionError error(t, message);
        for (const auto& [key, value] : ctx) {
            error.context.add(key + ": " + value);
        }
        return error;
    }
};

// ============================================================================
// Projection Result Type
// ============================================================================

/**
 * Result type for projection operations
 * Can contain either ProjectionResult (success) or ProjectionError (failure)
 */
struct ProjectionResultType
{
    bool isSuccess;
    std::shared_ptr<ProjectionResult> result;
    std::shared_ptr<ProjectionError> error;

    /**
     * Create success result
     */
    static ProjectionResultType success(std::shared_ptr<ProjectionResult> r)
    {
        return ProjectionResultType{ true, r, nullptr };
    }

    /**
     * Create failure result
     */
    static ProjectionResultType failure(std::shared_ptr<ProjectionError> e)
    {
        return ProjectionResultType{ false, nullptr, e };
    }

    /**
     * Check if result is success
     */
    bool isOk() const { return isSuccess; }

    /**
     * Get result (throws if error)
     */
    std::shared_ptr<ProjectionResult> getResult() const
    {
        if (!isSuccess) {
            jassertfalse; // Don't call getResult() on error!
            return nullptr;
        }
        return result;
    }

    /**
     * Get error (returns nullptr if success)
     */
    std::shared_ptr<ProjectionError> getError() const
    {
        return error;
    }
};

// ============================================================================
// Rendered Song Graph
// ============================================================================

/**
 * Audio graph node
 */
struct AudioGraphNode
{
    juce::String id;
    juce::String type;  // "voice", "bus", "master", "effect"
    juce::String name;

    AudioGraphNode() = default;
    AudioGraphNode(const juce::String& i, const juce::String& t, const juce::String& n)
        : id(i), type(t), name(n)
    {
    }
};

/**
 * Audio graph connection
 */
struct AudioGraphConnection
{
    juce::String fromNodeId;
    juce::String toNodeId;
    juce::String connectionType;  // "audio", "send", "control"

    AudioGraphConnection() = default;
    AudioGraphConnection(const juce::String& from, const juce::String& to, const juce::String& type)
        : fromNodeId(from), toNodeId(to), connectionType(type)
    {
    }
};

/**
 * Voice assignment in render graph
 */
struct VoiceAssignment
{
    juce::String id;
    juce::String roleId;           // From SongState
    juce::String instrumentType;   // From PerformanceState
    juce::String presetId;         // From PerformanceState
    juce::String busId;            // From PerformanceState
    int polyphony;                 // Max simultaneous notes
};

/**
 * Bus configuration in render graph
 */
struct BusConfig
{
    juce::String id;
    juce::String name;
    juce::String type;  // "voice", "mix", "master"
    float gain;         // 0-1
    float pan;          // -1 to 1
    bool muted;
    bool solo;
    juce::StringArray effectIds;
};

/**
 * Assigned note with performance adjustments
 */
struct AssignedNote
{
    juce::String id;
    juce::String sourceNoteId;     // Original note ID from SongState
    juce::String voiceId;          // Assigned voice
    juce::String roleId;           // Functional role
    juce::int64 startTime;         // samples
    juce::int64 duration;          // samples
    int pitch;                     // MIDI note (0-127)
    float velocity;                // 0-1

    // Performance adjustments
    juce::int64 timingOffset;      // samples (from groove)
    float velocityOffset;          // 0-1 (from groove)
    int transposition;             // semitones
    int finalPitch;                // pitch + transposition
};

/**
 * Timeline section
 */
struct TimelineSection
{
    juce::String id;
    juce::String name;
    juce::int64 startTime;         // samples
    juce::int64 duration;          // samples
    double tempo;                  // BPM
    int timeSignatureNum;          // Time signature numerator
    int timeSignatureDenom;        // Time signature denominator
};

/**
 * Timeline structure
 */
struct Timeline
{
    double tempo;                  // BPM
    int timeSignatureNum;          // Time signature numerator
    int timeSignatureDenom;        // Time signature denominator
    juce::int64 duration;          // samples
    std::vector<TimelineSection> sections;
};

/**
 * Complete render graph ready for audio playback
 */
struct RenderedSongGraph
{
    juce::String version;          // "1.0"
    juce::String id;

    // Sources (references, not full copies for memory efficiency)
    juce::String songStateId;
    juce::String performanceStateId;

    // Audio graph
    std::vector<AudioGraphNode> nodes;
    std::vector<AudioGraphConnection> connections;
    std::vector<VoiceAssignment> voices;
    std::vector<BusConfig> buses;

    // Assigned notes
    std::vector<AssignedNote> assignedNotes;

    // Timeline
    Timeline timeline;

    // Runtime metadata
    bool isPlayable;
    double estimatedCpuUsage;      // 0-1
    size_t estimatedMemoryUsage;   // bytes
    juce::int64 renderedAt;        // Unix timestamp (ms)

    /**
     * Validate render graph
     */
    bool isValid() const
    {
        return version == "1.0"
            && id.isNotEmpty()
            && songStateId.isNotEmpty()
            && performanceStateId.isNotEmpty()
            && isPlayable;
    }
};

// ============================================================================
// Projection Engine
// ============================================================================

/**
 * Core projection engine for White Room

 * This is the central entrypoint for all projection operations.
 * It combines SongState (what the song is) with PerformanceState (how it sounds)
 * to create a RenderedSongGraph (audio-ready graph).
 */
class ProjectionEngine
{
public:
    ProjectionEngine();
    ~ProjectionEngine();

    /**
     * Project a SongState with a PerformanceState into a render graph
     *
     * This is the MAIN entrypoint for projection.
     *
     * @param songState - The song state to project
     * @param performance - The performance state to apply as a lens
     * @param config - Projection configuration
     * @returns ProjectionResultType with either success or error
     */
    ProjectionResultType projectSong(
        const SongState& songState,
        const PerformanceState& performance,
        const ProjectionConfig& config = ProjectionConfig()
    );

    /**
     * Blend between two performance states
     *
     * Creates a crossfaded render graph that interpolates between
     * two performance realizations of the same song.
     *
     * @param songState - The song state to project
     * @param perfA - First performance state (t = 0)
     * @param perfB - Second performance state (t = 1)
     * @param t - Blend factor (0.0 = perfA, 1.0 = perfB)
     * @param config - Projection configuration
     * @returns ProjectionResultType with blended render graph
     */
    ProjectionResultType projectSongBlend(
        const SongState& songState,
        const PerformanceState& perfA,
        const PerformanceState& perfB,
        float t,
        const ProjectionConfig& config = ProjectionConfig()
    );

private:
    //==========================================================================
    // Validation
    //==========================================================================

    /**
     * Validate SongState structure
     */
    std::shared_ptr<ProjectionError> validateSong(const SongState& song);

    /**
     * Validate PerformanceState structure
     */
    std::shared_ptr<ProjectionError> validatePerformance(
        const PerformanceState& performance,
        const SongState& song
    );

    //==========================================================================
    // Performance Application
    //==========================================================================

    /**
     * Apply performance lens to song state
     */
    SongState applyPerformanceToSong(
        const SongState& song,
        const PerformanceState& performance
    );

    //==========================================================================
    // Graph Generation
    //==========================================================================

    /**
     * Generate render graph from song state
     */
    std::shared_ptr<RenderedSongGraph> generateRenderGraph(
        const SongState& song,
        const PerformanceState& performance,
        const ProjectionConfig& config
    );

    /**
     * Build voice assignments from instrumentation
     */
    std::vector<VoiceAssignment> buildVoices(
        const SongState& song,
        const PerformanceState& performance
    );

    /**
     * Build bus configurations
     */
    std::vector<BusConfig> buildBuses(const PerformanceState& performance);

    /**
     * Assign notes to voices
     */
    std::vector<AssignedNote> assignNotes(
        const SongState& song,
        const PerformanceState& performance
    );

    /**
     * Build timeline from song form
     */
    Timeline buildTimeline(const SongState& song);

    //==========================================================================
    // Graph Validation
    //==========================================================================

    /**
     * Validate render graph for structural issues
     */
    std::shared_ptr<ProjectionError> validateRenderGraph(
        const RenderedSongGraph& graph
    );

    /**
     * Detect circular routing in graph
     */
    std::optional<juce::StringArray> detectCircularRouting(
        const RenderedSongGraph& graph
    );

    /**
     * Detect orphaned nodes in graph
     */
    std::optional<std::pair<juce::StringArray, juce::StringArray>> detectOrphanedNodes(
        const RenderedSongGraph& graph
    );

    //==========================================================================
    // Utility Functions
    //==========================================================================

    /**
     * Generate deterministic result ID from inputs
     */
    juce::String generateResultId(
        const juce::String& songId,
        const juce::String& performanceId,
        const ProjectionConfig& config
    );

    /**
     * Estimate CPU usage
     */
    double estimateCpuUsage(
        const std::vector<VoiceAssignment>& voices,
        const std::vector<AssignedNote>& notes,
        const PerformanceState& performance
    );

    /**
     * Estimate memory usage
     */
    size_t estimateMemoryUsage(
        const std::vector<VoiceAssignment>& voices,
        const std::vector<AssignedNote>& notes
    );

    /**
     * Check playability
     */
    bool checkPlayability(
        const std::vector<VoiceAssignment>& voices,
        const std::vector<AssignedNote>& notes,
        const PerformanceState& performance
    );

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ProjectionEngine)
};
