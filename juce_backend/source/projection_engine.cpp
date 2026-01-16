/*
  ProjectionEngine.cpp - JUCE audio projection engine implementation

  Implementation of the ProjectionEngine class that consumes SongState
  from the SDK and renders audio in real-time.
*/

#include "../include/projection_engine.h"
#include <juce_core/juce_core.h>
#include <algorithm>
#include <optional>

namespace white_room {
namespace audio {

// =============================================================================
// Voice Processor Implementation
// =============================================================================

VoiceProcessor::VoiceProcessor(const std::string& voiceId, double sampleRate)
    : voiceId(voiceId)
    , sampleRate(sampleRate)
{
    // Prepare processor chain
    processorChain.get<0>().setGainDecibels(0.0);  // Gain stage
    processorChain.prepare({sampleRate, 512, 2});

    // Initialize panner to center
    auto& panner = processorChain.get<1>();
    panner.setPan(0.0);
}

void VoiceProcessor::process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples) {
    // Clear buffer
    buffer.clear(startSample, numSamples);

    // TODO: Implement actual synthesis
    // For now, this is a placeholder that would synthesize notes
    // In production, this would connect to instrument instances

    // Process gain and pan
    juce::dsp::AudioBlock<float> block(buffer.getWritePointer(startSample), numSamples);
    juce::dsp::ProcessContextReplacing<float> context(block);
    processorChain.process(context);
}

void VoiceProcessor::addNote(const RenderedNote& note) {
    notes.push_back(note);
    // Sort notes by start time for efficient rendering
    std::sort(notes.begin(), notes.end(),
        [](const RenderedNote& a, const RenderedNote& b) {
            return a.startTime < b.startTime;
        });
}

void VoiceProcessor::clearNotes() {
    notes.clear();
    currentNoteIndex = 0;
}

void VoiceProcessor::setMix(double gainDecibels, double pan) {
    processorChain.get<0>().setGainDecibels(static_cast<float>(gainDecibels));
    processorChain.get<1>().setPan(static_cast<float>(pan));
}

// =============================================================================
// Audio Graph Builder Implementation
// =============================================================================

std::map<std::string, std::vector<RenderedNote>> AudioGraphBuilder::buildRenderGraph(
    const models::SongStateV1& songState,
    const models::PerformanceState_v1& performance
) {
    // Step 1: Apply performance lens to filter notes
    auto filteredNotes = applyPerformanceLens(songState.notes, performance);

    // Step 2: Map notes to voices
    auto voiceNotes = mapNotesToVoices(filteredNotes, songState.voiceAssignments, performance);

    return voiceNotes;
}

std::vector<models::NoteEvent> AudioGraphBuilder::applyPerformanceLens(
    const std::vector<models::NoteEvent>& notes,
    const models::PerformanceState_v1& performance
) {
    std::vector<models::NoteEvent> filteredNotes = notes;

    // Apply density filtering
    if (performance.density.has_value()) {
        double density = performance.density.value();
        if (density < 1.0 && !filteredNotes.empty()) {
            // Filter out notes based on density
            size_t targetNoteCount = static_cast<size_t>(
                static_cast<double>(filteredNotes.size()) * density
            );
            if (targetNoteCount < filteredNotes.size()) {
                // Keep every Nth note to achieve target density
                size_t step = filteredNotes.size() / std::max(size_t(1), targetNoteCount);
                std::vector<models::NoteEvent> temp;
                temp.reserve(targetNoteCount);
                for (size_t i = 0; i < filteredNotes.size() && temp.size() < targetNoteCount; i += step) {
                    temp.push_back(filteredNotes[i]);
                }
                filteredNotes = std::move(temp);
            }
        }
    }

    // Apply groove/template timing modifications
    if (performance.grooveProfileId.has_value()) {
        const std::string& grooveId = performance.grooveProfileId.value();
        if (grooveId != "default") {
            // TODO: Apply groove template to note timing
            // This would shift start times based on groove pattern
        }
    }

    return filteredNotes;
}

std::map<std::string, std::vector<RenderedNote>> AudioGraphBuilder::mapNotesToVoices(
    const std::vector<models::NoteEvent>& notes,
    const std::vector<models::VoiceAssignment>& voiceAssignments,
    const models::PerformanceState_v1& performance
) {
    std::map<std::string, std::vector<RenderedNote>> voiceNotes;

    // Create voice assignment map for quick lookup
    std::map<std::string, models::VoiceAssignment> assignmentMap;
    for (const auto& assignment : voiceAssignments) {
        assignmentMap[assignment.voiceId] = assignment;
    }

    // Group notes by voice
    for (const auto& note : notes) {
        RenderedNote renderedNote;
        renderedNote.startTime = note.startTime;
        renderedNote.duration = note.duration;
        renderedNote.pitch = note.pitch;
        renderedNote.velocity = note.velocity;
        renderedNote.voiceId = note.voiceId;

        // Get instrument assignment
        auto it = assignmentMap.find(note.voiceId);
        if (it != assignmentMap.end()) {
            renderedNote.instrumentId = it->second.instrumentId;
            renderedNote.presetId = it->second.presetId;

            // Apply performance mix settings
            auto [gain, pan] = getVoiceMix(note.voiceId, performance);
            renderedNote.gain = gain;
            renderedNote.pan = pan;
        } else {
            // Default settings if no assignment found
            renderedNote.instrumentId = "LocalGal";  // Default instrument
            renderedNote.presetId = "default";
            renderedNote.gain = -6.0;
            renderedNote.pan = 0.0;
        }

        // Add to voice notes
        voiceNotes[note.voiceId].push_back(renderedNote);
    }

    return voiceNotes;
}

std::pair<double, double> AudioGraphBuilder::getVoiceMix(
    const std::string& voiceId,
    const models::PerformanceState_v1& performance
) {
    // Check if performance has mix targets
    if (performance.mixTargets.has_value()) {
        const auto& mixTargets = performance.mixTargets.value();
        auto it = mixTargets.find(voiceId);
        if (it != mixTargets.end()) {
            return {it->second.gain, it->second.pan};
        }
    }

    // Default mix settings
    return {-6.0, 0.0};  // -6dB, center pan
}

// =============================================================================
// Projection Engine Implementation
// =============================================================================

ProjectionEngine::ProjectionEngine() {
    // Initialize default state
    masterChain.prepare({44100.0, 512, 2});
    masterChain.get<0>().setGainDecibels(-6.0f);  // -6dB default master gain
}

ProjectionEngine::~ProjectionEngine() {
    release();
}

void ProjectionEngine::prepare(double newSampleRate, int newSamplesPerBlock, int newNumChannels) {
    sampleRate = newSampleRate;
    samplesPerBlock = newSamplesPerBlock;
    numChannels = newNumChannels;

    // Prepare master chain
    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
    spec.numChannels = static_cast<juce::uint32>(numChannels);
    masterChain.prepare(spec);

    // Calculate timing
    if (currentSongState.isValid()) {
        double tempo = currentSongState.tempo;
        int beatsPerBar = currentSongState.timeSignature.first;
        int beatUnit = currentSongState.timeSignature.second;

        // Samples per beat = (sampleRate * 60) / tempo
        samplesPerBeat = (sampleRate * 60.0) / tempo;

        // Samples per bar = samplesPerBeat * beatsPerBar
        samplesPerBar = samplesPerBeat * beatsPerBar;
    }

    // Update voice processors
    std::lock_guard<std::mutex> lock(renderGraphMutex);
    for (auto& [voiceId, processor] : voiceProcessors) {
        // Recreate voice processor with new sample rate
        processor = std::make_unique<VoiceProcessor>(voiceId, sampleRate);
    }
}

void ProjectionEngine::process(juce::AudioBuffer<float>& buffer) {
    juce::ScopedNoDenormals noDenormals;

    const int numSamples = buffer.getNumSamples();

    // Clear output buffer
    buffer.clear();

    // Check if we're playing
    if (!playing.load() || paused.load()) {
        return;
    }

    // Check for pending performance switch at bar boundary
    if (pendingPerformanceSwitch.load() && isAtBarBoundary(numSamples)) {
        applyPendingPerformanceSwitch();
    }

    // Process voices
    processVoices(buffer, numSamples);

    // Apply master gain
    juce::dsp::AudioBlock<float> block(buffer);
    juce::dsp::ProcessContextReplacing<float> context(block);
    masterChain.process(context);

    // Update playback position
    double currentPos = playbackPosition.load();
    currentPos += static_cast<double>(numSamples) * tempoMultiplier.load();
    playbackPosition.store(currentPos);

    // Update bar/beat tracking
    if (samplesPerBeat > 0.0) {
        currentBeat = static_cast<int>(currentPos / samplesPerBeat);
        if (samplesPerBar > 0.0) {
            currentBar = currentBeat / static_cast<int>(samplesPerBar / samplesPerBeat);
        }
    }
}

void ProjectionEngine::reset() {
    std::lock_guard<std::mutex> lock(songStateMutex);
    playbackPosition.store(0.0);
    currentBeat = 0;
    currentBar = 0;

    // Reset voice processors
    for (auto& [voiceId, processor] : voiceProcessors) {
        if (processor) {
            processor->clearNotes();
        }
    }
}

void ProjectionEngine::release() {
    clearSong();
}

// =============================================================================
// Song Management
// =============================================================================

bool ProjectionEngine::loadSongFromJson(const std::string& songJson) {
    try {
        // Parse JSON and create SongState
        auto songState = models::SongStateV1::fromJson(songJson);
        return loadSongState(songState);
    } catch (const std::exception& e) {
        juce::Logger::writeToLog("Failed to load song from JSON: " + std::string(e.what()));
        return false;
    }
}

bool ProjectionEngine::loadSongState(const models::SongStateV1& songState) {
    if (!songState.isValid()) {
        juce::Logger::writeToLog("Invalid SongState - cannot load");
        return false;
    }

    std::lock_guard<std::mutex> lock(songStateMutex);
    currentSongState = songState;

    // Update timing calculations
    double tempo = songState.tempo;
    int beatsPerBar = songState.timeSignature.first;
    samplesPerBeat = (sampleRate * 60.0) / tempo;
    samplesPerBar = samplesPerBeat * beatsPerBar;

    // Get active performance
    auto activePerf = songState.getActivePerformance();
    if (activePerf.has_value()) {
        // Build render graph
        auto newRenderGraph = AudioGraphBuilder::buildRenderGraph(songState, activePerf.value());

        std::lock_guard<std::mutex> graphLock(renderGraphMutex);
        renderGraph = std::move(newRenderGraph);

        // Create voice processors
        for (const auto& [voiceId, notes] : renderGraph) {
            voiceProcessors[voiceId] = std::make_unique<VoiceProcessor>(voiceId, sampleRate);
            // Add notes to voice processor
            for (const auto& note : notes) {
                voiceProcessors[voiceId]->addNote(note);
            }
        }
    }

    juce::Logger::writeToLog("Loaded song: " + songState.id);
    return true;
}

std::string ProjectionEngine::getCurrentSongId() const {
    std::lock_guard<std::mutex> lock(songStateMutex);
    return currentSongState.id;
}

void ProjectionEngine::clearSong() {
    std::lock_guard<std::mutex> lock(songStateMutex);
    std::lock_guard<std::mutex> graphLock(renderGraphMutex);

    currentSongState = models::SongStateV1();
    renderGraph.clear();
    voiceProcessors.clear();
    playbackPosition.store(0.0);
}

// =============================================================================
// Performance Management
// =============================================================================

bool ProjectionEngine::switchPerformance(const std::string& performanceId) {
    std::lock_guard<std::mutex> lock(songStateMutex);

    // Check if performance exists
    bool performanceExists = false;
    for (const auto& perf : currentSongState.performances) {
        if (perf.id == performanceId) {
            performanceExists = true;
            break;
        }
    }

    if (!performanceExists) {
        juce::Logger::writeToLog("Performance not found: " + performanceId);
        return false;
    }

    // Schedule performance switch for next bar boundary
    pendingPerformanceId = performanceId;
    pendingPerformanceSwitch.store(true);

    juce::Logger::writeToLog("Scheduled performance switch: " + performanceId);
    return true;
}

std::string ProjectionEngine::getActivePerformanceId() const {
    std::lock_guard<std::mutex> lock(songStateMutex);
    return currentSongState.activePerformanceId;
}

std::vector<std::string> ProjectionEngine::getAvailablePerformanceIds() const {
    std::lock_guard<std::mutex> lock(songStateMutex);
    std::vector<std::string> ids;
    for (const auto& perf : currentSongState.performances) {
        ids.push_back(perf.id);
    }
    return ids;
}

// =============================================================================
// Transport Control
// =============================================================================

void ProjectionEngine::play(double startPositionSamples) {
    playbackPosition.store(startPositionSamples);
    playing.store(true);
    paused.store(false);
}

void ProjectionEngine::stop() {
    playing.store(false);
    paused.store(false);
    playbackPosition.store(0.0);
}

void ProjectionEngine::pause() {
    paused.store(true);
}

void ProjectionEngine::resume() {
    paused.store(false);
}

void ProjectionEngine::setPosition(double positionSamples) {
    playbackPosition.store(positionSamples);
}

double ProjectionEngine::getPosition() const {
    return playbackPosition.load();
}

// =============================================================================
// Real-time Parameters
// =============================================================================

void ProjectionEngine::setMasterGain(double gainDecibels) {
    masterGain.store(gainDecibels);
    masterChain.get<0>().setGainDecibels(static_cast<float>(gainDecibels));
}

double ProjectionEngine::getMasterGain() const {
    return masterGain.load();
}

void ProjectionEngine::setTempoMultiplier(double multiplier) {
    tempoMultiplier.store(multiplier);
}

double ProjectionEngine::getTempoMultiplier() const {
    return tempoMultiplier.load();
}

// =============================================================================
// State Query
// =============================================================================

std::optional<models::SongStateV1> ProjectionEngine::getCurrentSongState() const {
    std::lock_guard<std::mutex> lock(songStateMutex);
    if (currentSongState.isValid()) {
        return currentSongState;
    }
    return std::nullopt;
}

std::optional<models::PerformanceState_v1> ProjectionEngine::getActivePerformance() const {
    std::lock_guard<std::mutex> lock(songStateMutex);
    return currentSongState.getActivePerformance();
}

ProjectionEngine::RenderStats ProjectionEngine::getRenderStats() const {
    RenderStats stats;
    std::lock_guard<std::mutex> lock(songStateMutex);

    stats.totalNotes = currentSongState.notes.size();
    stats.currentPosition = playbackPosition.load();
    stats.tempo = currentSongState.tempo;
    stats.beatsPerBar = currentSongState.timeSignature.first;

    // Count active notes at current position
    double currentPos = playbackPosition.load();
    for (const auto& note : currentSongState.notes) {
        if (note.startTime <= currentPos && note.startTime + note.duration > currentPos) {
            stats.activeNotes++;
        }
    }

    return stats;
}

// =============================================================================
// Internal Processing
// =============================================================================

void ProjectionEngine::processVoices(juce::AudioBuffer<float>& buffer, int numSamples) {
    std::lock_guard<std::mutex> lock(renderGraphMutex);

    // Temporary buffer for voice mixing
    juce::AudioBuffer<float> voiceBuffer(numChannels, numSamples);
    voiceBuffer.clear();

    // Process each voice
    for (auto& [voiceId, processor] : voiceProcessors) {
        if (processor) {
            // Clear voice buffer
            voiceBuffer.clear();

            // Process voice
            processor->process(voiceBuffer, 0, numSamples);

            // Mix to output
            for (int channel = 0; channel < numChannels; ++channel) {
                buffer.addFrom(channel, 0, voiceBuffer, channel, 0, numSamples);
            }
        }
    }
}

void ProjectionEngine::updateRenderGraph() {
    std::lock_guard<std::mutex> songLock(songStateMutex);

    auto activePerf = currentSongState.getActivePerformance();
    if (!activePerf.has_value()) {
        return;
    }

    // Rebuild render graph with new performance
    auto newRenderGraph = AudioGraphBuilder::buildRenderGraph(
        currentSongState,
        activePerf.value()
    );

    std::lock_guard<std::mutex> graphLock(renderGraphMutex);
    renderGraph = std::move(newRenderGraph);

    // Update voice processors
    for (const auto& [voiceId, notes] : renderGraph) {
        if (voiceProcessors.find(voiceId) == voiceProcessors.end()) {
            voiceProcessors[voiceId] = std::make_unique<VoiceProcessor>(voiceId, sampleRate);
        }
        voiceProcessors[voiceId]->clearNotes();
        for (const auto& note : notes) {
            voiceProcessors[voiceId]->addNote(note);
        }
    }
}

bool ProjectionEngine::isAtBarBoundary(int numSamples) {
    double currentPos = playbackPosition.load();
    double nextPos = currentPos + static_cast<double>(numSamples) * tempoMultiplier.load();

    if (samplesPerBar > 0.0) {
        int currentBarNum = static_cast<int>(currentPos / samplesPerBar);
        int nextBarNum = static_cast<int>(nextPos / samplesPerBar);
        return currentBarNum != nextBarNum;
    }

    return false;
}

void ProjectionEngine::applyPendingPerformanceSwitch() {
    std::lock_guard<std::mutex> lock(songStateMutex);

    // Update active performance ID
    currentSongState.activePerformanceId = pendingPerformanceId;

    // Rebuild render graph
    updateRenderGraph();

    // Clear pending switch
    pendingPerformanceSwitch.store(false);

    juce::Logger::writeToLog("Applied performance switch: " + pendingPerformanceId);
}

} // namespace audio
} // namespace white_room
