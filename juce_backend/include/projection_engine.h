/*
  ProjectionEngine.h - JUCE audio projection engine

  The ProjectionEngine is responsible for:
  1. Consuming SongState from the SDK (via FFI)
  2. Applying performance lens to realized notes
  3. Building audio render graph
  4. Real-time audio rendering

  Architecture:
    TypeScript SDK (RealizationEngine)
        ↓ Generates
    SongModel_v1 (realized notes)
        ↓ FFI Bridge
    JUCE ProjectionEngine (this class)
        ↓ Consumes
    RenderedSongGraph (audio render graph)
*/

#pragma once

#include <juce_dsp/juce_dsp.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include "../include/models/SongState_v1.h"
#include <memory>
#include <vector>
#include <map>
#include <mutex>
#include <atomic>

namespace white_room {
namespace audio {

// =============================================================================
// Forward Declarations
// =============================================================================

class ProjectionEngine;
struct RenderedNote;
struct VoiceProcessor;
struct AudioGraphBuilder;

// =============================================================================
// Rendered Note
// =============================================================================

/**
 Rendered note - Ready for audio output
 */
struct RenderedNote {
    double startTime;                    // In samples
    double duration;                     // In samples
    int pitch;                           // MIDI note number
    int velocity;                        // MIDI velocity
    std::string voiceId;                 // Voice identifier
    std::string instrumentId;            // Instrument identifier
    std::string presetId;                // Preset identifier
    double gain;                         // Gain in dB
    double pan;                          // Pan position (-1 to 1)

    // Rendering state
    bool isActive = false;
    int currentSample = 0;
};

// =============================================================================
// Voice Processor
// =============================================================================

/**
 Voice processor - Handles audio synthesis for a single voice
 */
class VoiceProcessor {
public:
    VoiceProcessor(const std::string& voiceId, double sampleRate);

    /**
     Process audio for this voice
     */
    void process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples);

    /**
     Add a note to render
     */
    void addNote(const RenderedNote& note);

    /**
     Clear all notes
     */
    void clearNotes();

    /**
     Set gain and pan
     */
    void setMix(double gainDecibels, double pan);

    /**
     Get voice ID
     */
    const std::string& getVoiceId() const { return voiceId; }

private:
    std::string voiceId;
    double sampleRate;

    // Note queue
    std::vector<RenderedNote> notes;
    size_t currentNoteIndex = 0;

    // DSP components
    juce::dsp::ProcessorChain<
        juce::dsp::Gain<float>,
        juce::dsp::Panner<float>
    > processorChain;

    juce::dsp::Gain<float> gainStage;
    juce::dsp::Panner<float> pannerStage;

    // Synthesizer (placeholder - would connect to actual instruments)
    // TODO: Connect to instrument instances (LocalGal, NexSynth, etc.)
};

// =============================================================================
// Audio Graph Builder
// =============================================================================

/**
 Audio graph builder - Constructs render graph from SongState
 */
class AudioGraphBuilder {
public:
    /**
     Build audio graph from SongState
     */
    static std::map<std::string, std::vector<RenderedNote>> buildRenderGraph(
        const models::SongStateV1& songState,
        const models::PerformanceState_v1& performance
    );

    /**
     Apply performance lens to notes
     */
    static std::vector<models::NoteEvent> applyPerformanceLens(
        const std::vector<models::NoteEvent>& notes,
        const models::PerformanceState_v1& performance
    );

    /**
     Map notes to voices
     */
    static std::map<std::string, std::vector<RenderedNote>> mapNotesToVoices(
        const std::vector<models::NoteEvent>& notes,
        const std::vector<models::VoiceAssignment>& voiceAssignments,
        const models::PerformanceState_v1& performance
    );

    /**
     Calculate mix settings for voice
     */
    static std::pair<double, double> getVoiceMix(
        const std::string& voiceId,
        const models::PerformanceState_v1& performance
    );
};

// =============================================================================
// Projection Engine
// =============================================================================

/**
 Projection engine - Main audio rendering engine

 Consumes SongState from SDK and renders audio in real-time.

 Thread safety:
 - SongState loading is thread-safe (mutex protected)
 - Audio processing is lock-free (atomic operations)
 - Performance switching is synchronized to bar boundaries
 */
class ProjectionEngine {
public:
    /**
     Constructor
     */
    ProjectionEngine();

    /**
     Destructor
     */
    ~ProjectionEngine();

    /**
     Prepare for playback
     Must be called before audio processing starts
     */
    void prepare(double sampleRate, int samplesPerBlock, int numChannels);

    /**
     Process audio block
     Called from audio thread - must be real-time safe!
     */
    void process(juce::AudioBuffer<float>& buffer);

    /**
     Reset all audio processing
     */
    void reset();

    /**
     Release resources
     */
    void release();

    // =========================================================================
    // Song Management
    // =========================================================================

    /**
     Load a SongState from JSON (FFI entry point)
     This is called from Swift/TypeScript via FFI bridge

     Thread-safe: Can be called from any thread
     */
    bool loadSongFromJson(const std::string& songJson);

    /**
     Load a SongState directly
     Thread-safe: Can be called from any thread
     */
    bool loadSongState(const models::SongStateV1& songState);

    /**
     Get current SongState ID
     */
    std::string getCurrentSongId() const;

    /**
     Clear current song
     */
    void clearSong();

    // =========================================================================
    // Performance Management
    // =========================================================================

    /**
     Switch to a different performance
     Returns true if performance was found and switched

     Thread-safe: Can be called from any thread
     Performance switch takes effect at next bar boundary
     */
    bool switchPerformance(const std::string& performanceId);

    /**
     Get active performance ID
     */
    std::string getActivePerformanceId() const;

    /**
     Get list of available performance IDs
     */
    std::vector<std::string> getAvailablePerformanceIds() const;

    // =========================================================================
    // Transport Control
    // =========================================================================

    /**
     Start playback from position
     */
    void play(double startPositionSamples = 0.0);

    /**
     Stop playback
     */
    void stop();

    /**
     Pause playback
     */
    void pause();

    /**
     Resume playback
     */
    void resume();

    /**
     Set playback position
     */
    void setPosition(double positionSamples);

    /**
     Get current playback position
     */
    double getPosition() const;

    /**
     Get playback state
     */
    bool isPlaying() const { return playing.load(); }

    // =========================================================================
    // Real-time Parameters
    // =========================================================================

    /**
     Set master gain
     */
    void setMasterGain(double gainDecibels);

    /**
     Get master gain
     */
    double getMasterGain() const;

    /**
     Set tempo multiplier
     1.0 = normal tempo, 0.5 = half speed, 2.0 = double speed
     */
    void setTempoMultiplier(double multiplier);

    /**
     Get tempo multiplier
     */
    double getTempoMultiplier() const;

    // =========================================================================
    // State Query
    // =========================================================================

    /**
     Get current SongState (copy)
     Thread-safe: Returns a copy of current state
     */
    std::optional<models::SongStateV1> getCurrentSongState() const;

    /**
     Get active performance (copy)
     Thread-safe: Returns a copy of active performance
     */
    std::optional<models::PerformanceState_v1> getActivePerformance() const;

    /**
     Get render statistics
     */
    struct RenderStats {
        size_t totalNotes;
        size_t activeNotes;
        double currentPosition;
        double tempo;
        int beatsPerBar;
    };

    RenderStats getRenderStats() const;

private:
    // =========================================================================
    // Internal Processing
    // =========================================================================

    /**
     Process voice rendering
     */
    void processVoices(juce::AudioBuffer<float>& buffer, int numSamples);

    /**
     Update render graph for new performance
     */
    void updateRenderGraph();

    /**
     Check if we're at a bar boundary
     */
    bool isAtBarBoundary(int numSamples);

    /**
     Apply pending performance switch
     */
    void applyPendingPerformanceSwitch();

    // =========================================================================
    // Member Variables
    // =========================================================================

    // Audio processing
    double sampleRate = 44100.0;
    int samplesPerBlock = 512;
    int numChannels = 2;

    // Song state (protected by mutex)
    mutable std::mutex songStateMutex;
    models::SongStateV1 currentSongState;

    // Render graph (protected by mutex)
    mutable std::mutex renderGraphMutex;
    std::map<std::string, std::vector<RenderedNote>> renderGraph;

    // Voice processors
    std::map<std::string, std::unique_ptr<VoiceProcessor>> voiceProcessors;

    // Master output
    juce::dsp::ProcessorChain<
        juce::dsp::Gain<float>
    > masterChain;

    // Transport state (atomic for lock-free access)
    std::atomic<bool> playing{false};
    std::atomic<bool> paused{false};
    std::atomic<double> playbackPosition{0.0};
    std::atomic<double> tempoMultiplier{1.0};
    std::atomic<double> masterGain{-6.0};  // -6dB default

    // Performance switching
    std::string pendingPerformanceId;
    std::atomic<bool> pendingPerformanceSwitch{false};

    // Bar tracking
    double samplesPerBeat = 0.0;
    double samplesPerBar = 0.0;
    int currentBeat = 0;
    int currentBar = 0;
};

} // namespace audio
} // namespace white_room
