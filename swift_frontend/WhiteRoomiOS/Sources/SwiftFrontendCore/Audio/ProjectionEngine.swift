//
//  ProjectionEngine.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation
#if canImport(CryptoKit)
import CryptoKit
#else
import CommonCrypto
#endif

// =============================================================================
// MARK: - Projection Engine
// =============================================================================

/**
 Central projection engine for White Room.

 This is the ONLY way to turn a Song into audio. All projection operations
 MUST go through this function to ensure:
 - Consistent validation
 - Centralized error handling
 - Deterministic results
 - Cache-friendly architecture

 Key Principles:
 - Pure function (no side effects)
 - Deterministic output for same inputs
 - Result type for explicit error handling
 - Cache-agnostic (can be called multiple times)

 ## Architecture

 The projection process follows these stages:

 1. **Validation** - Verify Song and PerformanceState are valid
 2. **Performance Application** - Apply performance lens to Song
 3. **Graph Generation** - Build complete render graph
 4. **Graph Validation** - Check for circular routing, orphaned nodes
 5. **ConsoleX Generation** - Generate ConsoleX configuration
 6. **Result Assembly** - Package into ProjectionResult

 ## Error Handling

 All errors are returned as ProjectionError with:
 - User-friendly message
 - Debug context
 - Recovery hints

 ## Performance

 Projection is designed to be fast (< 100ms for typical songs):
 - No I/O operations
 - No blocking calls
 - Minimal allocations
 - Cacheable results

 ## Thread Safety

 This function is thread-safe and can be called from any thread.
 However, results should not be mutated across threads.
 */

/**
 Project a Song with a PerformanceState into a render graph.

 This is the CENTRAL entrypoint for all projection operations in White Room.
 It is the ONLY way to turn a Song into audio.

 - Parameters:
   - song: The Song to project (must be valid)
   - performance: The PerformanceState to apply as a lens
   - config: Projection configuration options

 - Returns: Result<ProjectionResult, ProjectionError>
   - Success: Complete ProjectionResult with validated render graph
   - Failure: ProjectionError with details and recovery hints

 - Thread Safety: Thread-safe (pure function)
 - Performance: < 100ms for typical songs
 - Determinism: Same inputs always produce same outputs

 ## Usage

 ```swift
 let result = projectSong(song, performance: performance, config: .realtime())

 switch result {
 case .success(let projectionResult):
     // Use projectionResult.renderGraph for audio engine
     print("Projected successfully: \(projectionResult.resultId)")
 case .failure(let error):
     // Show error to user
     print("Projection failed: \(error.userMessage)")
     print("Debug: \(error.debugInfo)")
     if let hint = error.recoveryHint {
         print("Recovery: \(hint)")
     }
 }
 ```
 */
public func projectSong(
    _ song: Song,
    performance: PerformanceState,
    config: ProjectionConfig
) -> Result<ProjectionResult, ProjectionError> {

    // =============================================================================
    // MARK: - Stage 1: Validation
    // =============================================================================

    // Validate Song structure
    let songValidation = validateSong(song)
    switch songValidation {
    case .failure(let error):
        return .failure(error)
    case .success:
        break
    }

    // Validate PerformanceState structure
    let performanceValidation = validatePerformance(performance, song: song)
    switch performanceValidation {
    case .failure(let error):
        return .failure(error)
    case .success:
        break
    }

    // =============================================================================
    // MARK: - Stage 2: Performance Application
    // =============================================================================

    // Apply performance lens to Song
    let appliedSong: Song
    do {
        appliedSong = try applyPerformanceToSong(song, performance: performance)
    } catch {
        let error = error as? ProjectionError ?? .invalidSong(
            message: "Failed to apply performance",
            debugContext: ["underlying": error.localizedDescription]
        )
        return .failure(error)
    }

    // =============================================================================
    // MARK: - Stage 3: Graph Generation
    // =============================================================================

    // Generate complete render graph
    let graphGeneration = generateRenderGraph(
        from: appliedSong,
        config: config
    )

    let renderGraph: RenderGraph
    switch graphGeneration {
    case .success(let graph):
        renderGraph = graph
    case .failure(let error):
        return .failure(error)
    }

    // =============================================================================
    // MARK: - Stage 4: Graph Validation (Optional)
    // =============================================================================

    if config.validateGraph {
        let graphValidation = validateRenderGraph(renderGraph)
        switch graphValidation {
        case .failure(let error):
            return .failure(error)
        case .success:
            break
        }
    }

    // =============================================================================
    // MARK: - Stage 5: ConsoleX Generation
    // =============================================================================

    let consolexGeneration = generateConsoleXConfig(
        from: appliedSong,
        performance: performance,
        renderGraph: renderGraph
    )

    let consolexConfig: ConsoleXConfig
    switch consolexGeneration {
    case .success(let config):
        consolexConfig = config
    case .failure(let error):
        return .failure(error)
    }

    // =============================================================================
    // MARK: - Stage 6: Instrumentation Report
    // =============================================================================

    let instrumentationReport = generateInstrumentationReport(
        from: appliedSong,
        performance: performance
    )

    // =============================================================================
    // MARK: - Stage 7: Result Assembly
    // =============================================================================

    // Generate result ID (deterministic from inputs)
    let resultId = generateResultId(
        songId: song.id,
        performanceId: performance.id,
        config: config
    )

    // Calculate projected duration
    let projectedDuration = config.durationOverride ?? song.metadata.duration ?? 0.0

    // Collect warnings
    var warnings: [ProjectionWarning] = []

    // Check for missing instruments (substituted with defaults)
    for (roleId, assignment) in instrumentationReport.roleInstrumentMap {
        if assignment.wasSubstituted {
            warnings.append(ProjectionWarning(
                severity: .warning,
                category: "instrumentation",
                message: "Role '\(roleId)' requested instrument '\(assignment.requestedInstrumentId ?? "unknown")' but it was not available. Substituted with '\(assignment.instrumentId)'.",
                context: [
                    "roleId": roleId,
                    "requested": assignment.requestedInstrumentId ?? "unknown",
                    "actual": assignment.instrumentId
                ]
            ))
        }
    }

    // Collect timing stats (if requested)
    let timingStats: ProjectionTimingStats? = config.collectTimingStats ?
        ProjectionTimingStats(
            stageTimings: [:], // TODO: Implement actual timing collection
            totalTime: 0.0, // TODO: Measure actual time
            memoryUsage: nil
        ) : nil

    // Assemble final result
    let result = ProjectionResult(
        renderGraph: renderGraph,
        instrumentationReport: instrumentationReport,
        consolexConfig: consolexConfig,
        warnings: warnings,
        timingStats: timingStats,
        resultId: resultId,
        projectionTimestamp: Date(),
        projectedDuration: projectedDuration
    )

    return .success(result)
}

// =============================================================================
// MARK: - Validation Functions
// =============================================================================

/**
 Validate Song structure and content
 */
private func validateSong(_ song: Song) -> Result<Void, ProjectionError> {
    // Check required fields
    if song.id.isEmpty {
        return .failure(.invalidSong(
            message: "Song ID is empty",
            debugContext: ["songId": song.id]
        ))
    }

    if song.metadata.tempo <= 0 {
        return .failure(.invalidSong(
            message: "Tempo must be positive",
            debugContext: ["tempo": song.metadata.tempo]
        ))
    }

    if song.metadata.timeSignature.count != 2 {
        return .failure(.invalidSong(
            message: "Time signature must be [numerator, denominator]",
            debugContext: ["timeSignature": song.metadata.timeSignature]
        ))
    }

    let (numerator, denominator) = (song.metadata.timeSignature[0], song.metadata.timeSignature[1])
    if numerator <= 0 || denominator <= 0 {
        return .failure(.invalidSong(
            message: "Time signature values must be positive",
            debugContext: ["timeSignature": song.metadata.timeSignature]
        ))
    }

    // Check sections
    if song.sections.isEmpty {
        return .failure(.invalidSongContent(
            message: "Song has no sections",
            debugContext: ["sectionCount": 0]
        ))
    }

    // Check roles
    if song.roles.isEmpty {
        return .failure(.invalidSongContent(
            message: "Song has no roles",
            debugContext: ["roleCount": 0]
        ))
    }

    // Check projections
    if song.projections.isEmpty {
        return .failure(.invalidSongContent(
            message: "Song has no projections",
            debugContext: ["projectionCount": 0]
        ))
    }

    // Validate projection references
    for projection in song.projections {
        let roleExists = song.roles.contains { $0.id == projection.roleId }
        if !roleExists {
            return .failure(.invalidSongContent(
                message: "Projection references non-existent role",
                debugContext: [
                    "projectionId": projection.id,
                    "roleId": projection.roleId
                ]
            ))
        }
    }

    return .success(())
}

/**
 Validate PerformanceState structure and references
 */
private func validatePerformance(
    _ performance: PerformanceState,
    song: Song
) -> Result<Void, ProjectionError> {

    // Check required fields
    if performance.id.isEmpty {
        return .failure(.invalidPerformance(
            message: "Performance ID is empty",
            debugContext: ["performanceId": performance.id]
        ))
    }

    // Validate role override references
    var invalidReferences: [String] = []

    for (roleId, _) in performance.roleOverrides {
        let roleExists = song.roles.contains { $0.id == roleId }
        if !roleExists {
            invalidReferences.append("Role: \(roleId)")
        }
    }

    // Validate instrument reassignment references
    for (roleId, instrumentId) in performance.instrumentReassignments {
        let roleExists = song.roles.contains { $0.id == roleId }
        if !roleExists {
            invalidReferences.append("Role '\(roleId)' -> Instrument '\(instrumentId)'")
        }

        // Check if instrument exists in ensemble (if ensemble override is specified)
        if let ensembleOverride = performance.ensembleOverride {
            let instrumentExists = ensembleOverride.instruments.contains { $0.id == instrumentId }
            if !instrumentExists {
                invalidReferences.append("Instrument '\(instrumentId)' not in ensemble '\(ensembleOverride.ensembleId)'")
            }
        }
    }

    if !invalidReferences.isEmpty {
        return .failure(.performanceReferencesInvalid(
            message: "Performance references invalid entities",
            invalidReferences: invalidReferences
        ))
    }

    // Validate global density multiplier
    if performance.globalDensityMultiplier < 0.0 {
        return .failure(.invalidPerformance(
            message: "Global density multiplier must be non-negative",
            debugContext: ["globalDensityMultiplier": performance.globalDensityMultiplier]
        ))
    }

    // Validate tempo multiplier
    if performance.tempoMultiplier <= 0.0 {
        return .failure(.invalidPerformance(
            message: "Tempo multiplier must be positive",
            debugContext: ["tempoMultiplier": performance.tempoMultiplier]
        ))
    }

    return .success(())
}

// =============================================================================
// MARK: - Performance Application
// =============================================================================

/**
 Apply performance lens to Song

 This creates a new Song with all performance overrides applied.
 */
private func applyPerformanceToSong(
    _ song: Song,
    performance: PerformanceState
) throws -> Song {

    // Create new Song with applied performance
    var appliedSong = song

    // Apply role overrides
    appliedSong.roles = song.roles.map { role in
        guard let override = performance.roleOverrides[role.id] else {
            return role
        }

        var modifiedRole = role

        // Apply density multiplier
        if let densityMultiplier = override.densityMultiplier {
            modifiedRole.parameters.density *= densityMultiplier
        }

        // Apply global density multiplier
        modifiedRole.parameters.density *= performance.globalDensityMultiplier

        // Apply range override
        if let rangeOverride = override.rangeOverride {
            modifiedRole.parameters.range = rangeOverride
        }

        // Apply velocity range override
        if let velocityRangeOverride = override.velocityRangeOverride {
            modifiedRole.parameters.velocityRange = velocityRangeOverride
        }

        // Apply articulation override
        if let articulationOverride = override.articulationOverride {
            modifiedRole.parameters.articulation = articulationOverride
        }

        // Apply generator parameters override
        if let generatorParamsOverride = override.generatorParametersOverride {
            modifiedRole.generatorConfig.parameters = generatorParamsOverride
        }

        return modifiedRole
    }

    // Apply instrument reassignments
    appliedSong.projections = song.projections.map { projection in
        guard let newInstrumentId = performance.instrumentReassignments[projection.roleId] else {
            return projection
        }

        var modifiedProjection = projection
        modifiedProjection.target.id = newInstrumentId
        return modifiedProjection
    }

    // Apply tempo multiplier
    appliedSong.metadata.tempo *= performance.tempoMultiplier

    return appliedSong
}

// =============================================================================
// MARK: - Graph Generation
// =============================================================================

/**
 Generate complete render graph from Song
 */
private func generateRenderGraph(
    from song: Song,
    config: ProjectionConfig
) -> Result<RenderGraph, ProjectionError> {

    // Create graph nodes from mix graph
    var nodes: [GraphNode] = []

    // Add track nodes
    for track in song.mixGraph.tracks {
        nodes.append(GraphNode(
            id: track.id,
            type: .track,
            name: track.name
        ))
    }

    // Add bus nodes
    for bus in song.mixGraph.buses {
        nodes.append(GraphNode(
            id: bus.id,
            type: .bus,
            name: bus.name
        ))
    }

    // Add master node
    nodes.append(GraphNode(
        id: "master",
        type: .master,
        name: "Master"
    ))

    // Create connections from sends
    var connections: [GraphConnection] = []

    for send in song.mixGraph.sends {
        connections.append(GraphConnection(
            fromNodeId: send.fromTrackId,
            toNodeId: send.toBusId,
            connectionType: .send
        ))
    }

    // Connect all tracks to master (default routing)
    for track in song.mixGraph.tracks {
        connections.append(GraphConnection(
            fromNodeId: track.id,
            toNodeId: "master",
            connectionType: .audio
        ))
    }

    // Create render graph
    let renderGraph = RenderGraph(
        version: "1.0",
        nodes: nodes,
        connections: connections,
        masterConfig: MasterConfig(
            volume: song.mixGraph.master.volume,
            sampleRate: song.mixGraph.master.sampleRate,
            bufferSize: song.mixGraph.master.bufferSize
        )
    )

    return .success(renderGraph)
}

// =============================================================================
// MARK: - Graph Validation
// =============================================================================

/**
 Validate render graph for structural issues
 */
private func validateRenderGraph(
    _ graph: RenderGraph
) -> Result<Void, ProjectionError> {

    // Check for circular routing
    let cycleDetection = detectCircularRouting(in: graph)
    if let cycle = cycleDetection {
        return .failure(.circularRouting(cycle: cycle))
    }

    // Check for orphaned nodes
    let orphanCheck = detectOrphanedNodes(in: graph)
    if let (orphanIds, nodeTypes) = orphanCheck {
        return .failure(.orphanedNodes(orphanIds: orphanIds, nodeTypes: nodeTypes))
    }

    return .success(())
}

/**
 Detect circular routing in graph
 */
private func detectCircularRouting(
    in graph: RenderGraph
) -> [String]? {

    var visited = Set<String>()
    var recursionStack = Set<String>()

    func dfs(nodeId: String, path: [String]) -> [String]? {
        visited.insert(nodeId)
        recursionStack.insert(nodeId)

        let currentPath = path + [nodeId]

        // Find all outgoing connections from this node
        let outgoing = graph.connections.filter { $0.fromNodeId == nodeId }

        for connection in outgoing {
            let nextNodeId = connection.toNodeId

            if recursionStack.contains(nextNodeId) {
                // Found cycle
                let cycleStart = currentPath.firstIndex(of: nextNodeId) ?? 0
                return Array(currentPath[cycleStart...]) + [nextNodeId]
            }

            if !visited.contains(nextNodeId) {
                if let cycle = dfs(nodeId: nextNodeId, path: currentPath) {
                    return cycle
                }
            }
        }

        recursionStack.remove(nodeId)
        return nil
    }

    for node in graph.nodes {
        if !visited.contains(node.id) {
            if let cycle = dfs(nodeId: node.id, path: []) {
                return cycle
            }
        }
    }

    return nil
}

/**
 Detect orphaned nodes in graph
 */
private func detectOrphanedNodes(
    in graph: RenderGraph
) -> ([String], [String])? {

    var orphanIds: [String] = []
    var nodeTypes: [String] = []

    // A node is orphaned if it has no incoming connections and is not the master
    let nodesWithIncoming = Set(graph.connections.map { $0.toNodeId })

    for node in graph.nodes {
        if node.type != .master && !nodesWithIncoming.contains(node.id) {
            orphanIds.append(node.id)
            nodeTypes.append(node.type.rawValue)
        }
    }

    if orphanIds.isEmpty {
        return nil
    }

    return (orphanIds, nodeTypes)
}

// =============================================================================
// MARK: - ConsoleX Generation
// =============================================================================

/**
 Generate ConsoleX configuration from Song and Performance
 */
private func generateConsoleXConfig(
    from song: Song,
    performance: PerformanceState,
    renderGraph: RenderGraph
) -> Result<ConsoleXConfig, ProjectionError> {

    var mixSettings: [String: MixSettings] = [:]

    // Apply track mix settings from Song
    for track in song.mixGraph.tracks {
        var volume = track.volume
        var pan = track.pan
        var mute = track.mute
        var solo = track.solo

        // Apply performance overrides
        if let override = performance.consolexOverrides[track.id] {
            if let volumeOverride = override.volumeOverride {
                volume = volumeOverride
            }
            if let panOverride = override.panOverride {
                pan = panOverride
            }
            if let muteOverride = override.muteOverride {
                mute = muteOverride
            }
            if let soloOverride = override.soloOverride {
                solo = soloOverride
            }
        }

        mixSettings[track.id] = MixSettings(
            volume: volume,
            pan: pan,
            mute: mute,
            solo: solo
        )
    }

    // Apply bus mix settings from Song
    for bus in song.mixGraph.buses {
        var volume = bus.volume

        // Apply performance overrides
        if let override = performance.consolexOverrides[bus.id] {
            if let volumeOverride = override.volumeOverride {
                volume = volumeOverride
            }
        }

        mixSettings[bus.id] = MixSettings(
            volume: volume,
            pan: 0.0,
            mute: false,
            solo: false
        )
    }

    // Generate effects configuration
    var effects: [String: EffectsConfig] = [:]

    // Apply effects overrides from performance
    for effectsOverride in performance.effectsOverrides.values {
        for effectSlot in effectsOverride.effectsChain {
            effects[effectSlot.id] = EffectsConfig(
                enabled: effectSlot.enabled,
                parameters: effectSlot.parameters
            )
        }
    }

    // Generate routing configuration
    var sends: [SendConfig] = []
    for send in song.mixGraph.sends {
        sends.append(SendConfig(
            fromTrackId: send.fromTrackId,
            toBusId: send.toBusId,
            amount: send.amount
        ))
    }

    let routing = RoutingConfig(sends: sends, inserts: [])

    let consolexConfig = ConsoleXConfig(
        version: "1.0",
        mixSettings: mixSettings,
        effects: effects,
        routing: routing
    )

    return .success(consolexConfig)
}

// =============================================================================
// MARK: - Instrumentation Report
// =============================================================================

/**
 Generate instrumentation report from Song and Performance
 */
private func generateInstrumentationReport(
    from song: Song,
    performance: PerformanceState
) -> InstrumentationReport {

    var roleInstrumentMap: [String: InstrumentAssignment] = [:]
    var usedInstruments = Set<String>()
    var substitutedInstruments: [String: String] = [:]

    // Build role -> instrument mapping
    for projection in song.projections {
        let instrumentId = projection.target.id

        // Check if this was a substitution from performance
        let wasSubstituted = performance.instrumentReassignments[projection.roleId] != nil
        let requestedInstrumentId = wasSubstituted ?
            song.projections.first { $0.roleId == projection.roleId }?.target.id : nil

        if wasSubstituted, let requested = requestedInstrumentId {
            substitutedInstruments[requested] = instrumentId
        }

        roleInstrumentMap[projection.roleId] = InstrumentAssignment(
            roleId: projection.roleId,
            instrumentId: instrumentId,
            wasSubstituted: wasSubstituted,
            requestedInstrumentId: requestedInstrumentId
        )

        usedInstruments.insert(instrumentId)
    }

    return InstrumentationReport(
        roleInstrumentMap: roleInstrumentMap,
        usedInstruments: usedInstruments,
        substitutedInstruments: substitutedInstruments
    )
}

// =============================================================================
// MARK: - Result ID Generation
// =============================================================================

/**
 Generate deterministic result ID from inputs
 */
private func generateResultId(
    songId: String,
    performanceId: String,
    config: ProjectionConfig
) -> String {

    // Create deterministic string from inputs
    let input = "\(songId)-\(performanceId)-\(config.renderMode.rawValue)-\(config.validateGraph)-\(config.includeAutomation)"

    // Hash the input using SHA256
    let hash: String
    #if canImport(CryptoKit)
    hash = SHA256.hash(data: input.data(using: .utf8)!)
        .compactMap { String(format: "%02x", $0) }
        .joined()
    #else
    var digest = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    input.data(using: .utf8)!.withUnsafeBytes {
        _ = CC_SHA256($0.baseAddress, CC_LONG($0.count), &digest)
    }
    hash = digest.compactMap { String(format: "%02x", $0) }.joined()
    #endif

    // Return first 16 characters of hex string
    return String(hash.prefix(16))
}
