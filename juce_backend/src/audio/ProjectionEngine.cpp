/*
  ==============================================================================

    ProjectionEngine.cpp
    Created: January 15, 2026
    Author:  Bret Bouchard

    Implementation of ProjectionEngine - core projection engine for White Room.

  ==============================================================================
*/

#include "audio/ProjectionEngine.h"
#include "undo/UndoState.h"
#include <map>
#include <algorithm>
#include <random>

// ============================================================================
// Constructor/Destructor
// ============================================================================

ProjectionEngine::ProjectionEngine()
{
}

ProjectionEngine::~ProjectionEngine()
{
}

// ============================================================================
// Main Projection Functions
// ============================================================================

ProjectionResultType ProjectionEngine::projectSong(
    const SongState& songState,
    const PerformanceState& performance,
    const ProjectionConfig& config)
{
    // ==========================================================================
    // Stage 1: Validation
    // ==========================================================================

    auto songError = validateSong(songState);
    if (songError != nullptr) {
        return ProjectionResultType::failure(songError);
    }

    auto perfError = validatePerformance(performance, songState);
    if (perfError != nullptr) {
        return ProjectionResultType::failure(perfError);
    }

    // ==========================================================================
    // Stage 2: Performance Application
    // ==========================================================================

    SongState appliedSong = applyPerformanceToSong(songState, performance);

    // ==========================================================================
    // Stage 3: Graph Generation
    // ==========================================================================

    auto renderGraph = generateRenderGraph(appliedSong, performance, config);
    if (renderGraph == nullptr) {
        return ProjectionResultType::failure(
            std::make_shared<ProjectionError>(
                ProjectionErrorType::graphGenerationFailed,
                "Failed to generate render graph",
                "generateRenderGraph returned nullptr"
            )
        );
    }

    // ==========================================================================
    // Stage 4: Graph Validation (Optional)
    // ==========================================================================

    if (config.validateGraph) {
        auto graphValidationError = validateRenderGraph(*renderGraph);
        if (graphValidationError != nullptr) {
            return ProjectionResultType::failure(graphValidationError);
        }
    }

    // ==========================================================================
    // Stage 5: Result Assembly
    // ==========================================================================

    auto result = std::make_shared<ProjectionResult>();
    result->resultId = generateResultId(songState.id, performance.id, config);
    result->renderGraph = renderGraph;
    result->projectedDuration = config.durationOverride > 0
        ? config.durationOverride
        : static_cast<double>(renderGraph->timeline.duration) / 44100.0; // Rough estimate
    result->projectionTimestamp = juce::Time::currentTimeMillis();

    // Add warnings for missing instruments
    // TODO: Implement instrumentation report and warning generation

    return ProjectionResultType::success(result);
}

ProjectionResultType ProjectionEngine::projectSongBlend(
    const SongState& songState,
    const PerformanceState& perfA,
    const PerformanceState& perfB,
    float t,
    const ProjectionConfig& config)
{
    // Validate blend factor
    if (t < 0.0f || t > 1.0f) {
        return ProjectionResultType::failure(
            std::make_shared<ProjectionError>(
                ProjectionErrorType::invalidPerformance,
                "Blend factor t must be between 0 and 1",
                juce::String("t = ") + juce::String(t)
            )
        );
    }

    // Generate graphs for both performances
    auto resultA = projectSong(songState, perfA, config);
    auto resultB = projectSong(songState, perfB, config);

    if (!resultA.isOk()) {
        return resultA; // Return error from A
    }
    if (!resultB.isOk()) {
        return resultB; // Return error from B
    }

    auto graphA = resultA.getResult()->renderGraph;
    auto graphB = resultB.getResult()->renderGraph;

    // Create blended graph
    auto blendedGraph = std::make_shared<RenderedSongGraph>();
    blendedGraph->version = "1.0";
    blendedGraph->id = generateResultId(
        songState.id + "_" + perfA.id + "_" + perfB.id,
        juce::String(t),
        config
    );
    blendedGraph->songStateId = songState.id;
    blendedGraph->performanceStateId = "blend:" + perfA.id + ":" + perfB.id;

    // Blend voice assignments (linear interpolation based on t)
    blendedGraph->voices = graphA->voices; // Start with A's voices

    // Blend bus configurations
    blendedGraph->buses.resize(graphA->buses.size());
    for (size_t i = 0; i < graphA->buses.size() && i < graphB->buses.size(); ++i) {
        const auto& busA = graphA->buses[i];
        const auto& busB = graphB->buses[i];

        blendedGraph->buses[i].id = busA.id;
        blendedGraph->buses[i].name = busA.name;
        blendedGraph->buses[i].type = busA.type;
        blendedGraph->buses[i].gain = busA.gain * (1.0f - t) + busB.gain * t;
        blendedGraph->buses[i].pan = busA.pan * (1.0f - t) + busB.pan * t;
        blendedGraph->buses[i].muted = t < 0.5f ? busA.muted : busB.muted;
        blendedGraph->buses[i].solo = false;
        blendedGraph->buses[i].effectIds = busA.effectIds;
    }

    // Blend notes (crossfade based on t)
    blendedGraph->assignedNotes.clear();

    // Add notes from perfA with weight (1-t)
    for (const auto& note : graphA->assignedNotes) {
        AssignedNote blendedNote = note;
        blendedNote.velocity *= (1.0f - t);
        blendedGraph->assignedNotes.push_back(blendedNote);
    }

    // Add notes from perfB with weight t
    for (const auto& note : graphB->assignedNotes) {
        AssignedNote blendedNote = note;
        blendedNote.velocity *= t;
        blendedGraph->assignedNotes.push_back(blendedNote);
    }

    // Use timeline from perfA
    blendedGraph->timeline = graphA->timeline;

    // Blend runtime metadata
    blendedGraph->isPlayable = graphA->isPlayable && graphB->isPlayable;
    blendedGraph->estimatedCpuUsage = graphA->estimatedCpuUsage * (1.0f - t)
                                     + graphB->estimatedCpuUsage * t;
    blendedGraph->estimatedMemoryUsage = static_cast<size_t>(
        graphA->estimatedMemoryUsage * (1.0f - t) +
        graphB->estimatedMemoryUsage * t
    );
    blendedGraph->renderedAt = juce::Time::currentTimeMillis();

    // Copy nodes and connections from A
    blendedGraph->nodes = graphA->nodes;
    blendedGraph->connections = graphA->connections;

    // Assemble result
    auto result = std::make_shared<ProjectionResult>();
    result->resultId = blendedGraph->id;
    result->renderGraph = blendedGraph;
    result->projectedDuration = resultA.getResult()->projectedDuration * (1.0f - t)
                              + resultB.getResult()->projectedDuration * t;
    result->projectionTimestamp = juce::Time::currentTimeMillis();

    return ProjectionResultType::success(result);
}

// ============================================================================
// Validation
// ============================================================================

std::shared_ptr<ProjectionError> ProjectionEngine::validateSong(const SongState& song)
{
    // Check required fields
    if (song.id.isEmpty()) {
        return std::make_shared<ProjectionError>(
            ProjectionErrorType::invalidSong,
            "Song ID is empty",
            "song.id is empty string"
        );
    }

    if (song.tempo <= 0.0) {
        return std::make_shared<ProjectionError>(
            ProjectionErrorType::invalidSong,
            "Tempo must be positive",
            "song.tempo = " + juce::String(song.tempo)
        );
    }

    // TODO: Add more validation as SongState structure is fleshed out

    return nullptr;
}

std::shared_ptr<ProjectionError> ProjectionEngine::validatePerformance(
    const PerformanceState& performance,
    const SongState& song)
{
    // Check required fields
    if (performance.activePerformanceId == nullptr) {
        return std::make_shared<ProjectionError>(
            ProjectionErrorType::invalidPerformance,
            "Performance ID is null",
            "activePerformanceId is nullptr"
        );
    }

    juce::String perfId = *performance.activePerformanceId;
    if (perfId.isEmpty()) {
        return std::make_shared<ProjectionError>(
            ProjectionErrorType::invalidPerformance,
            "Performance ID is empty",
            "activePerformanceId is empty string"
        );
    }

    // Validate density range
    double density = performance.currentDensity.load();
    if (density < 0.0 || density > 1.0) {
        return std::make_shared<ProjectionError>(
            ProjectionErrorType::invalidPerformance,
            "Density must be between 0 and 1",
            "currentDensity = " + juce::String(density)
        );
    }

    // TODO: Add more validation as PerformanceState structure is fleshed out

    return nullptr;
}

// ============================================================================
// Performance Application
// ============================================================================

SongState ProjectionEngine::applyPerformanceToSong(
    const SongState& song,
    const PerformanceState& performance)
{
    // Create a copy with performance applied
    SongState appliedSong = song;

    // ==========================================================================
    // Apply tempo transformations
    // ==========================================================================

    // TODO: Extract tempo multiplier from PerformanceState when available
    // For now, keep original tempo
    appliedSong.tempo = song.tempo;

    // ==========================================================================
    // Apply density scaling
    // ==========================================================================

    double density = performance.currentDensity.load();

    // Density affects note density (not song parameters directly)
    // This is applied in assignNotes() through probability filtering
    appliedSong.density = density;

    // ==========================================================================
    // Apply groove profile
    // ==========================================================================

    // TODO: Extract groove profile from PerformanceState
    // Groove affects timing offsets and velocity offsets in assignNotes()
    appliedSong.grooveProfileId = performance.grooveProfileId;

    // ==========================================================================
    // Apply ConsoleX profile
    // ==========================================================================

    // ConsoleX affects mixing and effects
    appliedSong.consoleXProfileId = performance.consoleXProfileId;

    // ==========================================================================
    // Apply instrument reassignments
    // ==========================================================================

    // TODO: Extract instrument reassignments from PerformanceState
    // For now, keep original instrument IDs
    // When PerformanceState has instrumentation map:
    //   - Map song roles to performance instruments
    //   - Update instrumentIds array
    //   - Update mix gains and pans

    // ==========================================================================
    // Apply mix transformations (gain and pan)
    // ==========================================================================

    // TODO: Extract mix targets from PerformanceState when available
    // For now, keep default mix settings
    // When PerformanceState has mixTargets:
    //   - Update mixGains array
    //   - Update mixPans array
    //   - Apply stereo/mono settings

    // ==========================================================================
    // Apply register mappings (transposition)
    // ==========================================================================

    // TODO: Extract register mappings from PerformanceState
    // Register affects transposition in assignNotes()

    return appliedSong;
}

// ============================================================================
// Graph Generation
// ============================================================================

std::shared_ptr<RenderedSongGraph> ProjectionEngine::generateRenderGraph(
    const SongState& song,
    const PerformanceState& performance,
    const ProjectionConfig& config)
{
    auto graph = std::make_shared<RenderedSongGraph>();

    // Basic metadata
    graph->version = "1.0";
    graph->id = generateResultId(song.id, *performance.activePerformanceId, config);
    graph->songStateId = song.id;
    graph->performanceStateId = *performance.activePerformanceId;
    graph->renderedAt = juce::Time::currentTimeMillis();

    // Build audio graph
    graph->voices = buildVoices(song, performance);
    graph->buses = buildBuses(performance);
    graph->assignedNotes = assignNotes(song, performance);
    graph->timeline = buildTimeline(song);

    // Build nodes
    graph->nodes.clear();
    for (const auto& voice : graph->voices) {
        graph->nodes.push_back(AudioGraphNode(voice.id, "voice", voice.roleId));
    }
    for (const auto& bus : graph->buses) {
        graph->nodes.push_back(AudioGraphNode(bus.id, bus.type.toStdString(), bus.name));
    }

    // Build connections
    graph->connections.clear();
    for (const auto& voice : graph->voices) {
        // Connect voice to its bus
        graph->connections.push_back(AudioGraphConnection(voice.id, voice.busId, "audio"));
    }
    for (const auto& bus : graph->buses) {
        if (bus.type != "master") {
            // Connect all buses to master
            graph->connections.push_back(AudioGraphConnection(bus.id, "master", "audio"));
        }
    }

    // Estimate resources
    graph->estimatedCpuUsage = estimateCpuUsage(graph->voices, graph->assignedNotes, performance);
    graph->estimatedMemoryUsage = estimateMemoryUsage(graph->voices, graph->assignedNotes);
    graph->isPlayable = checkPlayability(graph->voices, graph->assignedNotes, performance);

    return graph;
}

std::vector<VoiceAssignment> ProjectionEngine::buildVoices(
    const SongState& song,
    const PerformanceState& performance)
{
    std::vector<VoiceAssignment> voices;

    // ==========================================================================
    // Extract instrumentation map from performance state
    // ==========================================================================

    std::map<juce::String, juce::String> instrumentationMap;

    // Default instrument mappings if not provided
    if (song.instrumentIds.isEmpty()) {
        // No instruments in song state - use defaults based on arrangement
        instrumentationMap["primary"] = "LocalGal";
        instrumentationMap["secondary"] = "NexSynth";
        instrumentationMap["bass"] = "KaneMarcoAether";
        instrumentationMap["drums"] = "DrumMachine";
    } else {
        // Map from song instrument IDs to voices
        for (int i = 0; i < song.instrumentIds.size(); ++i) {
            juce::String roleId = "role_" + juce::String(i);
            instrumentationMap[roleId] = song.instrumentIds[i];
        }
    }

    // ==========================================================================
    // Build voice assignments from instrumentation map
    // ==========================================================================

    int voiceIndex = 0;
    for (const auto& [roleId, instrumentId] : instrumentationMap) {
        VoiceAssignment voice;

        // Generate unique voice ID
        voice.id = "voice_" + juce::String(voiceIndex++);
        voice.roleId = roleId;

        // Get instrument type from performance state or use default
        // TODO: Extract from PerformanceState instrumentation map when available
        voice.instrumentType = instrumentId;
        voice.presetId = "default";  // TODO: Get from PerformanceState

        // Assign to bus (group by instrument type)
        if (instrumentId == "DrumMachine") {
            voice.busId = "bus_drums";
            voice.polyphony = 32;  // Drums need higher polyphony
        } else if (instrumentId == "KaneMarcoAether" || instrumentId == "KaneMarcoAetherString") {
            voice.busId = "bus_bass";
            voice.polyphony = 8;   // Bass needs lower polyphony
        } else {
            voice.busId = "bus_primary";
            voice.polyphony = 16;  // Default polyphony
        }

        voices.push_back(voice);
    }

    // ==========================================================================
    // Apply performance density scaling to polyphony
    // ==========================================================================

    double density = performance.currentDensity.load();
    for (auto& voice : voices) {
        // Adjust polyphony based on density (0.5x to 1.5x)
        int adjustedPolyphony = static_cast<int>(
            voice.polyphony * (0.5 + density)
        );
        voice.polyphony = juce::jlimit(4, 64, adjustedPolyphony);
    }

    return voices;
}

std::vector<BusConfig> ProjectionEngine::buildBuses(const PerformanceState& performance)
{
    std::vector<BusConfig> buses;

    // ==========================================================================
    // Create instrument-specific buses
    // ==========================================================================

    // These bus IDs match what buildVoices() assigns
    std::vector<BusConfig> instrumentBuses = {
        {"bus_primary", "Primary", "voice", 1.0f, 0.0f, false, false, {}},
        {"bus_secondary", "Secondary", "voice", 1.0f, 0.0f, false, false, {}},
        {"bus_bass", "Bass", "voice", 1.0f, 0.0f, false, false, {}},
        {"bus_drums", "Drums", "voice", 1.0f, 0.0f, false, false, {}}
    };

    // Add instrument buses
    for (const auto& bus : instrumentBuses) {
        buses.push_back(bus);
    }

    // ==========================================================================
    // Create master bus
    // ==========================================================================

    BusConfig masterBus;
    masterBus.id = "master";
    masterBus.name = "Master";
    masterBus.type = "master";
    masterBus.gain = 1.0f;
    masterBus.pan = 0.0f;
    masterBus.muted = false;
    masterBus.solo = false;
    buses.push_back(masterBus);

    // ==========================================================================
    // Apply mix targets from performance state
    // ==========================================================================

    // TODO: Extract mix targets from PerformanceState when available
    // For now, use default mix settings
    // When PerformanceState has mixTargets:
    //   - Update bus gains from mixTargets (convert dB to linear)
    //   - Update bus pans from mixTargets
    //   - Apply stereo/mono settings

    return buses;
}

// ============================================================================
// Rhythm Generation Helper
// ============================================================================

/**
 * Generate rhythm attacks from rhythm system
 *
 * This is a simplified C++ implementation that mirrors the FFI rhythm generation.
 * In production, this would call the TypeScript SDK via FFI for full Schillinger support.
 *
 * For now, this provides a basic interference pattern implementation.
 */
struct RhythmAttack {
    double time;      // Time in beats
    double accent;    // Accent level (0-1+, 1 = basic attack)
};

std::vector<RhythmAttack> generateRhythmAttacks(
    const RhythmSystem& rhythmSystem,
    double duration)
{
    std::vector<RhythmAttack> attacks;

    // Extract generators
    if (rhythmSystem.generators.isEmpty()) {
        // Default: quarter notes
        for (double t = 0; t < duration; t += 1.0) {
            attacks.push_back({t, 1.0});
        }
        return attacks;
    }

    // Generate attacks using interference pattern
    const double resolution = 0.0625;  // 1/16 note resolution

    for (double t = 0; t < duration; t += resolution) {
        double totalAccent = 0.0;

        // Check each generator for attack at this time
        for (const auto& gen : rhythmSystem.generators) {
            // Calculate phase-adjusted time
            double adjustedTime = t + gen.phase;

            // Check if this is an attack point (periodic pulse)
            double phasePosition = fmod(adjustedTime, gen.period);

            // Attack occurs at phase = 0 (within small epsilon)
            double epsilon = resolution / 2.0;
            if (phasePosition < epsilon || phasePosition > gen.period - epsilon) {
                totalAccent += gen.weight;
            }
        }

        // If total accent > 0, we have an attack
        if (totalAccent > 0.0) {
            attacks.push_back({t, totalAccent});
        }
    }

    return attacks;
}

std::vector<AssignedNote> ProjectionEngine::assignNotes(
    const SongState& song,
    const PerformanceState& performance)
{
    std::vector<AssignedNote> notes;

    // ==========================================================================
    // Extract rhythm system from song state
    // ==========================================================================

    RhythmSystem rhythmSystem;
    std::vector<RhythmAttack> rhythmAttacks;

    if (song.rhythmSystems.isEmpty()) {
        // Default rhythm: quarter notes
        RhythmGenerator defaultGen(1.0, 0.0, 1.0);  // Period 1, phase 0, weight 1
        rhythmSystem.generators.add(defaultGen);
        rhythmSystem.resultantMethod = "interference";

        // Generate 8 bars of quarter notes
        double duration = song.timeSignatureNumerator * 8;  // 8 bars
        rhythmAttacks = generateRhythmAttacks(rhythmSystem, duration);
    } else {
        // Use first rhythm system from song state
        rhythmSystem = song.rhythmSystems[0];

        // Generate rhythm attacks for 8 bars
        double duration = song.timeSignatureNumerator * 8;  // 8 bars
        rhythmAttacks = generateRhythmAttacks(rhythmSystem, duration);
    }

    // ==========================================================================
    // Extract melody pattern from song or generate default
    // ==========================================================================

    // Default melody: C major scale ascending
    std::vector<int> melodyPattern = {60, 62, 64, 65, 67, 69, 71, 72};  // C4-C5

    // TODO: Integrate with SDK melody generation via FFI
    // TODO: Integrate with Schillinger Book II: Melody
    // TODO: Call FFI melody generation: generateMelody(melodySystem, rhythmAttacks, duration)
    // TODO: Generate pitch sequences from scales
    // TODO: Apply melodic transformations (contour, register constraints)

    // ==========================================================================
    // Extract harmony pattern from song or generate default
    // ==========================================================================

    // Default harmony: C major chord tones
    std::vector<int> harmonyPattern = {60, 64, 67};  // C-E-G

    // TODO: Integrate with SDK harmony generation via FFI
    // TODO: Integrate with Schillinger Book III: Harmony
    // TODO: Call FFI harmony generation: generateHarmony(harmonySystem, rhythmAttacks, duration)
    // TODO: Generate chord progressions
    // TODO: Apply harmonic transformations (voice-leading, cadences)

    // ==========================================================================
    // Generate note events from rhythm attacks
    // ==========================================================================

    int voiceIndex = 0;
    const double sampleRate = 44100.0;
    const double beatDuration = sampleRate * 60.0 / song.tempo;

    // Get density from performance state
    double density = performance.currentDensity.load();

    // Generate notes for each role
    int numRoles = song.instrumentIds.isEmpty() ? 4 : song.instrumentIds.size();

    for (int role = 0; role < numRoles; ++role) {
        int noteCounter = 0;

        // Generate notes from rhythm attacks
        for (const auto& attack : rhythmAttacks) {
            // Apply density filtering based on accent strength
            // Stronger accents are more likely to survive density filtering
            double accentProbability = 0.3 + (attack.accent * 0.4);  // 0.3 to 0.7 base
            double probability = accentProbability * (0.3 + density * 0.7);  // Apply density

            if ((rand() / double(RAND_MAX)) < probability) {
                AssignedNote note;

                // Generate unique note ID
                note.id = "note_" + juce::String(voiceIndex) + "_" + juce::String(noteCounter++);
                note.sourceNoteId = note.id;  // Self-reference for generated notes
                note.voiceId = "voice_" + juce::String(voiceIndex);
                note.roleId = "role_" + juce::String(role);

                // Timing from rhythm attack
                double attackTimeBeats = attack.time;
                note.startTime = static_cast<juce::int64>(attackTimeBeats * beatDuration);

                // Duration based on rhythm density (shorter for denser rhythms)
                double baseDuration = 1.0;  // Quarter note
                double durationScaling = 1.0 / (1.0 + attack.accent * 0.5);  // Stronger accent = shorter note
                note.duration = static_cast<juce::int64>(baseDuration * beatDuration * durationScaling);

                note.timingOffset = 0;  // TODO: Apply groove timing offset

                // Pitch (role-based assignment)
                if (role == 0) {
                    // Primary: Melody
                    int melodyIndex = static_cast<int>(attackTimeBeats) % melodyPattern.size();
                    note.pitch = melodyPattern[melodyIndex];
                } else if (role == 1) {
                    // Secondary: Harmony
                    int harmonyIndex = static_cast<int>(attackTimeBeats) % harmonyPattern.size();
                    note.pitch = harmonyPattern[harmonyIndex];
                } else if (role == 2) {
                    // Bass: Root notes
                    note.pitch = 36;  // C2
                } else {
                    // Drums: Percussive sounds
                    note.pitch = 60;  // Middle C for drum mapping
                }

                // Velocity based on accent strength
                note.velocity = static_cast<float>(juce::jlimit(0.4, 1.0, attack.accent * 0.5));
                note.velocityOffset = 0.0f;  // TODO: Apply groove velocity offset
                note.transposition = 0;  // TODO: Apply register mapping
                note.finalPitch = note.pitch + note.transposition;

                notes.push_back(note);
            }
        }

        voiceIndex++;
    }

    return notes;
}

Timeline ProjectionEngine::buildTimeline(const SongState& song)
{
    Timeline timeline;

    // Default tempo and time signature from song
    timeline.tempo = song.tempo;
    timeline.timeSignatureNum = song.timeSignatureNumerator;
    timeline.timeSignatureDenom = song.timeSignatureDenominator;

    // ==========================================================================
    // Build sections from song form (Schillinger Book IV)
    // ==========================================================================

    const double sampleRate = 44100.0;
    const double beatDuration = sampleRate * 60.0 / song.tempo;
    const double barDuration = beatDuration * song.timeSignatureNumerator;

    // Default song form: 32-bar AABA form
    // TODO: Integrate with SDK form generation via FFI
    // TODO: Integrate with Schillinger Book IV: Form
    // TODO: Call FFI form generation: generateForm(formSystem, totalDuration)
    // TODO: Generate form structures from ratio trees
    // TODO: Apply form transformations (symmetry, periodicity)
    // TODO: Balance phrase lengths

    struct FormSection {
        const char* name;
        int bars;
        double tempoMultiplier;  // For tempo changes within form
    };

    std::vector<FormSection> formSections = {
        {"A1", 8, 1.0},   // First A section
        {"A2", 8, 1.0},   // Second A section
        {"B",  8, 1.0},   // Bridge (B section)
        {"A3", 8, 1.0}    // Final A section
    };

    // Build timeline sections
    juce::int64 currentTime = 0;
    int sectionIndex = 0;

    for (const auto& formSection : formSections) {
        TimelineSection section;

        // Generate unique section ID
        section.id = "section_" + juce::String(sectionIndex++);
        section.name = formSection.name;
        section.startTime = currentTime;

        // Calculate duration
        double sectionTempo = song.tempo * formSection.tempoMultiplier;
        double sectionBeatDuration = sampleRate * 60.0 / sectionTempo;
        section.duration = static_cast<juce::int64>(
            sectionBeatDuration * song.timeSignatureNumerator * formSection.bars
        );

        // Section tempo (can differ from global tempo)
        section.tempo = sectionTempo;
        section.timeSignatureNum = song.timeSignatureNumerator;
        section.timeSignatureDenom = song.timeSignatureDenominator;

        timeline.sections.push_back(section);

        // Advance time
        currentTime += section.duration;
    }

    // Total duration is sum of all sections
    timeline.duration = currentTime;

    return timeline;
}

// ============================================================================
// Graph Validation
// ============================================================================

std::shared_ptr<ProjectionError> ProjectionEngine::validateRenderGraph(
    const RenderedSongGraph& graph)
{
    // Check for circular routing
    auto cycle = detectCircularRouting(graph);
    if (cycle.has_value()) {
        juce::String debugInfo = "Cycle: ";
        for (const auto& nodeId : *cycle) {
            debugInfo += nodeId + " -> ";
        }
        return std::make_shared<ProjectionError>(
            ProjectionErrorType::circularRouting,
            "Render graph contains circular routing",
            debugInfo
        );
    }

    // Check for orphaned nodes
    auto orphaned = detectOrphanedNodes(graph);
    if (orphaned.has_value()) {
        const auto& [orphanIds, nodeTypes] = *orphaned;
        juce::String debugInfo = "Orphaned nodes: ";
        for (size_t i = 0; i < orphanIds.size(); ++i) {
            debugInfo += orphanIds[i] + " (" + nodeTypes[i] + "), ";
        }
        return std::make_shared<ProjectionError>(
            ProjectionErrorType::orphanedNodes,
            "Render graph contains orphaned nodes",
            debugInfo
        );
    }

    return nullptr;
}

std::optional<juce::StringArray> ProjectionEngine::detectCircularRouting(
    const RenderedSongGraph& graph)
{
    std::set<juce::String> visited;
    std::set<juce::String> recursionStack;
    juce::StringArray path;

    std::function<bool(const juce::String&)> dfs = [&](const juce::String& nodeId) -> bool {
        visited.insert(nodeId);
        recursionStack.insert(nodeId);
        path.add(nodeId);

        // Find all outgoing connections from this node
        for (const auto& conn : graph.connections) {
            if (conn.fromNodeId == nodeId) {
                if (recursionStack.count(conn.toNodeId) > 0) {
                    // Found cycle
                    return true;
                }
                if (visited.count(conn.toNodeId) == 0) {
                    if (dfs(conn.toNodeId)) {
                        return true;
                    }
                }
            }
        }

        recursionStack.erase(nodeId);
        path.removeLast();
        return false;
    };

    for (const auto& node : graph.nodes) {
        if (visited.count(node.id) == 0) {
            if (dfs(node.id)) {
                return path;
            }
        }
    }

    return std::nullopt;
}

std::optional<std::pair<juce::StringArray, juce::StringArray>> ProjectionEngine::detectOrphanedNodes(
    const RenderedSongGraph& graph)
{
    juce::StringArray orphanIds;
    juce::StringArray nodeTypes;

    // A node is orphaned if it has no incoming connections and is not the master
    std::set<juce::String> nodesWithIncoming;
    for (const auto& conn : graph.connections) {
        nodesWithIncoming.insert(conn.toNodeId);
    }

    for (const auto& node : graph.nodes) {
        if (node.type != "master" && nodesWithIncoming.count(node.id) == 0) {
            orphanIds.add(node.id);
            nodeTypes.add(node.type);
        }
    }

    if (orphanIds.isEmpty()) {
        return std::nullopt;
    }

    return std::make_pair(orphanIds, nodeTypes);
}

// ============================================================================
// Utility Functions
// ============================================================================

juce::String ProjectionEngine::generateResultId(
    const juce::String& songId,
    const juce::String& performanceId,
    const ProjectionConfig& config)
{
    // Create deterministic string from inputs
    juce::String input = songId + "-" + performanceId + "-" +
                        juce::String(config.validateGraph) + "-" +
                        juce::String(config.includeAutomation);

    // Simple hash (for production, use proper crypto hash)
    uint32_t hash = 0;
    for (int i = 0; i < input.length(); ++i) {
        hash = (hash << 5) - hash + static_cast<uint32_t>(input[i]);
    }

    return "proj_" + juce::String::toHexString(hash).paddedLeft('0', 8);
}

double ProjectionEngine::estimateCpuUsage(
    const std::vector<VoiceAssignment>& voices,
    const std::vector<AssignedNote>& notes,
    const PerformanceState& performance)
{
    // Simple heuristic: base CPU + voices * factor + notes * factor
    const double baseCpu = 0.01;  // 1% base
    const double voiceCpu = voices.size() * 0.02;  // 2% per voice
    const double noteCpu = notes.size() * 0.0001;  // Small factor per note

    double estimated = baseCpu + voiceCpu + noteCpu;

    // Apply density scaling
    double density = performance.currentDensity.load();
    estimated *= (0.5 + density * 0.5);

    return juce::jmin(estimated, 0.9); // Cap at 90%
}

size_t ProjectionEngine::estimateMemoryUsage(
    const std::vector<VoiceAssignment>& voices,
    const std::vector<AssignedNote>& notes)
{
    // Simple heuristic: voices + notes * size
    const size_t voiceMemory = voices.size() * 1024;  // 1KB per voice
    const size_t noteMemory = notes.size() * 64;     // 64 bytes per note

    return voiceMemory + noteMemory;
}

bool ProjectionEngine::checkPlayability(
    const std::vector<VoiceAssignment>& voices,
    const std::vector<AssignedNote>& notes,
    const PerformanceState& performance)
{
    // Check if we have too many voices
    // TODO: Get max voices from PerformanceState
    const int maxVoices = 100;
    if (static_cast<int>(voices.size()) > maxVoices) {
        return false;
    }

    // Check if estimated CPU is reasonable
    double estimatedCpu = estimateCpuUsage(voices, notes, performance);
    if (estimatedCpu > 0.9) {
        return false;
    }

    return true;
}
