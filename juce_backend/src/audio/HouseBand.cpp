/*
  ==============================================================================

    HouseBand.cpp
    Created: January 15, 2026
    Author:  Bret Bouchard

    Implementation of JUCE House Band - pure audio engine performer.

  ==============================================================================
*/

#include "audio/HouseBand.h"
#include "undo/UndoState.h"
#include <cmath>

// ============================================================================
// Constructor/Destructor
// ============================================================================

HouseBand::HouseBand()
    : config()
    , currentSampleRate(0.0)
{
    // Initialize projection engine
    projectionEngine = std::make_unique<ProjectionEngine>();

    // Initialize atomic state pointers
    auto nullSong = std::shared_ptr<SongState>(nullptr);
    auto nullPerf = std::shared_ptr<PerformanceState>(nullptr);
    auto nullGraph = std::shared_ptr<RenderedSongGraph>(nullptr);
    auto nullError = juce::String();

    currentSong.store(new std::shared_ptr<SongState>(nullSong));
    currentPerformance.store(new std::shared_ptr<PerformanceState>(nullPerf));
    activeGraph.store(new std::shared_ptr<RenderedSongGraph>(nullGraph));
    lastError.store(new juce::String(nullError));

    // Reset state
    reset();
}

HouseBand::HouseBand(const HouseBandConfig& cfg)
    : HouseBand()
{
    initialize(cfg);
}

HouseBand::~HouseBand()
{
    // Clean up atomic pointers
    auto* songPtr = currentSong.load();
    auto* perfPtr = currentPerformance.load();
    auto* graphPtr = activeGraph.load();
    auto* errorPtr = lastError.load();

    delete songPtr;
    delete perfPtr;
    delete graphPtr;
    delete errorPtr;
}

// ============================================================================
// Initialization
// ============================================================================

bool HouseBand::initialize(const HouseBandConfig& cfg)
{
    config = cfg;
    currentSampleRate = config.sampleRate;

    // Prepare projection engine
    // (ProjectionEngine has no internal state to initialize)

    // Allocate internal buffers
    tempBuffer.setSize(config.numOutputChannels, config.maxSamplesPerBlock);
    tempBuffer.clear();

    // Reset state
    reset();

    return true;
}

void HouseBand::reset()
{
    // Stop playback
    transport.isPlaying.store(false);
    transport.isLooping.store(false);
    transport.currentPosition.store(0.0);
    transport.loopStart.store(0.0);
    transport.loopEnd.store(0.0);
    transport.playbackSpeed.store(1.0);

    // Reset crossfade
    crossfade.isCrossfading = false;
    crossfade.blendFactor.store(0.0);
    crossfade.crossfadeStartTime = 0;
    crossfade.crossfadeDuration = 0.0;

    // Clear song state
    auto nullSong = std::shared_ptr<SongState>(nullptr);
    auto nullPerf = std::shared_ptr<PerformanceState>(nullptr);
    auto nullGraph = std::shared_ptr<RenderedSongGraph>(nullptr);

    auto* songPtr = currentSong.load();
    auto* perfPtr = currentPerformance.load();
    auto* graphPtr = activeGraph.load();

    delete songPtr;
    delete perfPtr;
    delete graphPtr;

    currentSong.store(new std::shared_ptr<SongState>(nullSong));
    currentPerformance.store(new std::shared_ptr<PerformanceState>(nullPerf));
    activeGraph.store(new std::shared_ptr<RenderedSongGraph>(nullGraph));

    // Clear graph buffers
    graphA = nullptr;
    graphB = nullptr;

    // Clear error
    clearError();
}

// ============================================================================
// Song Loading
// ============================================================================

bool HouseBand::loadSong(const SongState& song, const juce::String& performanceId)
{
    // Validate song
    if (!song.isValid()) {
        setError("Invalid song state");
        return false;
    }

    // Create shared copy of song
    auto songCopy = std::make_shared<SongState>(song);

    // Find performance in song
    // TODO: This assumes SongState has a performances map
    // For now, we'll create a default performance
    auto performance = std::make_shared<PerformanceState>();

    // Project song with performance
    auto graph = projectWithPerformance(performanceId);
    if (graph == nullptr) {
        setError("Failed to project song with performance: " + performanceId);
        return false;
    }

    // Update state atomically
    auto* oldSongPtr = currentSong.load();
    auto* oldPerfPtr = currentPerformance.load();
    auto* oldGraphPtr = activeGraph.load();

    delete oldSongPtr;
    delete oldPerfPtr;
    delete oldGraphPtr;

    currentSong.store(new std::shared_ptr<SongState>(songCopy));
    currentPerformance.store(new std::shared_ptr<PerformanceState>(performance));
    activeGraph.store(new std::shared_ptr<RenderedSongGraph>(graph));

    // Store as graphA (current performance)
    graphA = graph;
    graphB = nullptr;

    // Reset transport to beginning
    transport.currentPosition.store(0.0);

    clearError();
    return true;
}

bool HouseBand::loadPerformance(const PerformanceState& performance)
{
    // Check if song is loaded
    auto songPtr = currentSong.load();
    if (*songPtr == nullptr) {
        setError("No song loaded");
        return false;
    }

    // Project with new performance
    juce::String perfId = *performance.activePerformanceId;
    auto graph = projectWithPerformance(perfId);
    if (graph == nullptr) {
        setError("Failed to project song with performance: " + perfId);
        return false;
    }

    // Create shared copy of performance
    auto perfCopy = std::make_shared<PerformanceState>(performance);

    // Update state atomically
    auto* oldPerfPtr = currentPerformance.load();
    auto* oldGraphPtr = activeGraph.load();

    delete oldPerfPtr;
    delete oldGraphPtr;

    currentPerformance.store(new std::shared_ptr<PerformanceState>(perfCopy));
    activeGraph.store(new std::shared_ptr<RenderedSongGraph>(graph));

    // Update graphA (instant switch, no crossfade)
    graphA = graph;
    graphB = nullptr;

    // Reset crossfade
    crossfade.isCrossfading = false;
    crossfade.blendFactor.store(0.0);

    clearError();
    return true;
}

// ============================================================================
// Performance Switching
// ============================================================================

bool HouseBand::switchToPerformance(const juce::String& performanceId,
                                   double crossfadeSeconds)
{
    // Check if song is loaded
    auto songPtr = currentSong.load();
    if (*songPtr == nullptr) {
        setError("No song loaded");
        return false;
    }

    // Project target performance
    auto targetGraph = projectWithPerformance(performanceId);
    if (targetGraph == nullptr) {
        setError("Failed to project target performance: " + performanceId);
        return false;
    }

    // Store current graph as source
    graphA = *activeGraph.load();
    graphB = targetGraph;

    // Setup crossfade state
    crossfade.isCrossfading = true;
    crossfade.fromPerformanceId = *(*songPtr)->activePerformanceId;
    crossfade.toPerformanceId = performanceId;
    crossfade.blendFactor.store(0.0);
    crossfade.crossfadeStartTime = 0;
    crossfade.crossfadeDuration = crossfadeSeconds;

    clearError();
    return true;
}

void HouseBand::setBlendFactor(double t)
{
    // Clamp to [0, 1]
    t = juce::jlimit(0.0, 1.0, t);
    crossfade.blendFactor.store(t);

    // If at extremes, crossfade is complete
    if (t <= 0.0 || t >= 1.0) {
        crossfade.isCrossfading = false;
    }
}

double HouseBand::getBlendFactor() const
{
    return crossfade.blendFactor.load();
}

// ============================================================================
// Transport Controls
// ============================================================================

void HouseBand::play()
{
    transport.isPlaying.store(true);
}

void HouseBand::pause()
{
    transport.isPlaying.store(false);
}

void HouseBand::stop()
{
    transport.isPlaying.store(false);
    transport.currentPosition.store(0.0);
}

void HouseBand::seekTo(double seconds)
{
    transport.currentPosition.store(seconds);
}

void HouseBand::setLoop(bool enabled, double startSeconds, double endSeconds)
{
    transport.isLooping.store(enabled);
    transport.loopStart.store(startSeconds);
    transport.loopEnd.store(endSeconds);
}

void HouseBand::setPlaybackSpeed(double speed)
{
    // Clamp to reasonable range [0.1, 4.0]
    speed = juce::jlimit(0.1, 4.0, speed);
    transport.playbackSpeed.store(speed);
}

// ============================================================================
// Audio Processing
// ============================================================================

void HouseBand::prepareToPlay(double sampleRate, int maxSamplesPerBlock)
{
    currentSampleRate = sampleRate;
    config.sampleRate = sampleRate;
    config.maxSamplesPerBlock = maxSamplesPerBlock;

    // Resize internal buffers
    tempBuffer.setSize(config.numOutputChannels, maxSamplesPerBlock);
    tempBuffer.clear();
}

void HouseBand::processAudio(juce::AudioBuffer<float>& buffer,
                             juce::MidiBuffer& midiBuffer)
{
    // Clear output buffer
    buffer.clear();
    midiBuffer.clear();

    // Check if song is loaded
    auto graphPtr = activeGraph.load();
    if (*graphPtr == nullptr) {
        return;  // No song loaded, output silence
    }

    // Check if playing
    if (!transport.isPlaying.load()) {
        return;  // Paused, output silence
    }

    // Update position
    updatePosition(buffer.getNumSamples());

    // Render audio
    if (crossfade.isCrossfading) {
        // Crossfade between two performances
        if (graphA != nullptr && graphB != nullptr) {
            updateCrossfade(buffer.getNumSamples());
            renderCrossfade(*graphA, *graphB,
                           crossfade.blendFactor.load(),
                           buffer, midiBuffer);
        }
    } else {
        // Single performance
        renderGraph(**graphPtr, buffer, midiBuffer);
    }
}

void HouseBand::releaseResources()
{
    tempBuffer.clear();
    tempMidiBuffer.clear();
}

// ============================================================================
// State Accessors
// ============================================================================

std::shared_ptr<RenderedSongGraph> HouseBand::getCurrentGraph()
{
    return *activeGraph.load();
}

std::shared_ptr<PerformanceState> HouseBand::getCurrentPerformance()
{
    return *currentPerformance.load();
}

std::shared_ptr<SongState> HouseBand::getCurrentSong()
{
    return *currentSong.load();
}

TransportState HouseBand::getTransportState() const
{
    return transport;
}

bool HouseBand::hasSongLoaded() const
{
    auto songPtr = currentSong.load();
    return *songPtr != nullptr;
}

bool HouseBand::isPlaying() const
{
    return transport.isPlaying.load();
}

bool HouseBand::isCrossfading() const
{
    return crossfade.isCrossfading;
}

// ============================================================================
// Error Handling
// ============================================================================

juce::String HouseBand::getError() const
{
    return *lastError.load();
}

juce::String HouseBand::getLastError() const
{
    return getError();
}

void HouseBand::clearError()
{
    auto* errorPtr = lastError.load();
    delete errorPtr;
    lastError.store(new juce::String());
}

// ============================================================================
// Internal Implementation
// ============================================================================

void HouseBand::updatePosition(int samplesToProcess)
{
    // Calculate time delta
    double speed = transport.playbackSpeed.load();
    double secondsDelta = (samplesToProcess / currentSampleRate) * speed;

    // Get current position
    double position = transport.currentPosition.load();

    // Check for loop
    bool looping = transport.isLooping.load();
    if (looping) {
        double loopStart = transport.loopStart.load();
        double loopEnd = transport.loopEnd.load();

        position += secondsDelta;

        // Wrap if past loop end
        if (position >= loopEnd) {
            position = loopStart + (position - loopEnd);
        }
    } else {
        // No loop, just advance
        position += secondsDelta;

        // Check if past end
        auto graphPtr = activeGraph.load();
        if (*graphPtr != nullptr) {
            double duration = (*graphPtr)->timeline.duration / currentSampleRate;
            if (position >= duration) {
                // Stop at end
                position = duration;
                transport.isPlaying.store(false);
            }
        }
    }

    // Update position
    transport.currentPosition.store(position);
}

void HouseBand::renderGraph(const RenderedSongGraph& graph,
                           juce::AudioBuffer<float>& buffer,
                           juce::MidiBuffer& midiBuffer)
{
    // Get current position in samples
    double positionSeconds = transport.currentPosition.load();
    juce::int64 positionSamples = static_cast<juce::int64>(positionSeconds * currentSampleRate);

    // Find notes that should play in this buffer
    // TODO: Implement actual note rendering from graph.assignedNotes
    // This is a placeholder that demonstrates the structure

    for (const auto& note : graph.assignedNotes) {
        // Check if note is within this buffer
        juce::int64 noteStart = note.startTime;
        juce::int64 noteEnd = note.startTime + note.duration;

        if (noteStart >= positionSamples &&
            noteStart < positionSamples + buffer.getNumSamples()) {
            // Note should start in this buffer
            int sampleOffset = static_cast<int>(noteStart - positionSamples);

            // Add MIDI note
            midiBuffer.addEvent(juce::MidiMessage::noteOn(
                1,  // MIDI channel
                note.finalPitch,
                static_cast<float>(note.velocity * 127)
            ), sampleOffset);

            // Schedule note-off
            if (noteEnd < positionSamples + buffer.getNumSamples()) {
                int noteOffOffset = static_cast<int>(noteEnd - positionSamples);
                midiBuffer.addEvent(juce::MidiMessage::noteOff(
                    1,
                    note.finalPitch
                ), noteOffOffset);
            }
        }
    }

    // Apply mix/bus gains
    // TODO: Implement bus processing from graph.buses
    // For now, just output silence (MIDI will trigger instruments)
}

void HouseBand::renderCrossfade(const RenderedSongGraph& graphA,
                               const RenderedSongGraph& graphB,
                               double blend,
                               juce::AudioBuffer<float>& buffer,
                               juce::MidiBuffer& midiBuffer)
{
    // Equal-power crossfade curve
    // This prevents volume dip when crossfading
    double gainA = std::cos(blend * juce::MathConstants<double>::pi / 2.0);
    double gainB = std::cos((1.0 - blend) * juce::MathConstants<double>::pi / 2.0);

    // Render both graphs to temporary buffers
    tempBuffer.clear();
    tempMidiBuffer.clear();

    renderGraph(graphA, tempBuffer, tempMidiBuffer);

    // Apply gain A to temp buffer
    tempBuffer.applyGain(static_cast<float>(gainA));

    // Copy temp buffer to output
    for (int channel = 0; channel < buffer.getNumChannels(); ++channel) {
        buffer.copyFrom(channel, 0, tempBuffer, channel, 0, buffer.getNumSamples());
    }

    // Render graph B to temp buffer
    tempBuffer.clear();
    tempMidiBuffer.clear();

    renderGraph(graphB, tempBuffer, tempMidiBuffer);

    // Apply gain B and add to output
    for (int channel = 0; channel < buffer.getNumChannels(); ++channel) {
        buffer.addFromWithRamp(channel, 0,
                             tempBuffer.getReadPointer(channel),
                             buffer.getNumSamples(),
                             static_cast<float>(gainB),
                             static_cast<float>(gainB));
    }

    // Merge MIDI from both graphs
    // TODO: Implement MIDI crossfading (velocity scaling based on blend)
    midiBuffer.addEvents(tempMidiBuffer, 0, buffer.getNumSamples(), 0);
}

void HouseBand::updateCrossfade(int samplesToProcess)
{
    if (!crossfade.isCrossfading) {
        return;
    }

    // Calculate time delta
    double secondsDelta = samplesToProcess / currentSampleRate;

    // Calculate new blend factor
    double currentBlend = crossfade.blendFactor.load();
    double blendIncrement = secondsDelta / crossfade.crossfadeDuration;
    double newBlend = currentBlend + blendIncrement;

    // Clamp to [0, 1]
    if (newBlend >= 1.0) {
        newBlend = 1.0;
        crossfade.isCrossfading = false;

        // Update current performance to target
        auto songPtr = currentSong.load();
        if (*songPtr != nullptr && graphB != nullptr) {
            // Update active graph to graphB
            auto* oldGraphPtr = activeGraph.load();
            delete oldGraphPtr;
            activeGraph.store(new std::shared_ptr<RenderedSongGraph>(graphB));

            // Move graphB to graphA
            graphA = graphB;
            graphB = nullptr;
        }
    }

    crossfade.blendFactor.store(newBlend);
}

std::shared_ptr<RenderedSongGraph> HouseBand::projectWithPerformance(
    const juce::String& performanceId)
{
    // Get current song
    auto songPtr = currentSong.load();
    if (*songPtr == nullptr) {
        return nullptr;
    }

    // Get current performance
    auto perfPtr = currentPerformance.load();
    if (*perfPtr == nullptr) {
        return nullptr;
    }

    // Project song with performance
    ProjectionConfig config;
    config.validateGraph = false;  // Skip validation for realtime
    config.includeAutomation = true;
    config.collectTimingStats = false;

    auto result = projectionEngine->projectSong(**songPtr, **perfPtr, config);

    if (!result.isOk()) {
        auto error = result.getError();
        setError("Projection failed: " + error->userMessage);
        return nullptr;
    }

    return result.getResult()->renderGraph;
}

void HouseBand::setError(const juce::String& error)
{
    auto* errorPtr = lastError.load();
    delete errorPtr;
    lastError.store(new juce::String(error));
}
