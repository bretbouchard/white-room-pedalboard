//
//  ProjectionModels.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Projection Error Types
// =============================================================================

/**
 Comprehensive error types for projection failures.

 Each error case provides:
 - User-friendly message for UI display
 - Debug context for developers
 - Recovery hints when applicable
 */
public enum ProjectionError: Error, Equatable {

    // MARK: - Song Errors

    /**
     SongState is corrupted or invalid.

     Context:
     - Missing required fields (id, metadata, sections)
     - Invalid data types (e.g., negative tempo)
     - Corrupted serialization
     */
    case invalidSong(message: String, debugContext: [String: Any])

    /**
     SongState structure is valid but content is problematic.

     Context:
     - Empty sections array
     - No roles defined
     - Invalid time ranges
     */
    case invalidSongContent(message: String, debugContext: [String: Any])

    // MARK: - Performance Errors

    /**
     PerformanceState is corrupted or invalid.

     Context:
     - Missing required fields
     - Invalid role mappings
     - Corrupted serialization
     */
    case invalidPerformance(message: String, debugContext: [String: Any])

    /**
     PerformanceState references non-existent entities.

     Context:
     - Role ID not in Song.roles
     - Section ID not in Song.sections
     - Instrument ID not in Ensemble
     */
    case performanceReferencesInvalid(message: String, invalidReferences: [String])

    // MARK: - Instrument Errors

    /**
     Role maps to non-existent Instrument.

     Context:
     - Projection.target.instrumentId doesn't exist
     - Ensemble doesn't contain the instrument
     - Instrument registry lookup failed
     */
    case missingInstrument(roleId: String, instrumentId: String, availableInstruments: [String])

    /**
     Instrument cannot play the assigned Role.

     Context:
     - Percussion instrument assigned to melody role
     - Monophonic synth assigned to harmony role
     - Range constraints violated
     */
    case incompatibleRole(roleId: String, roleType: String, instrumentId: String, reason: String)

    // MARK: - Graph Validation Errors

    /**
     Render graph has circular routing.

     Context:
     - Track A sends to Bus B, Bus B sends to Track A
     - Creates infinite loop in audio graph
     - Must be caught before rendering
     */
    case circularRouting(cycle: [String])

    /**
     Render graph has orphaned nodes.

     Context:
     - Track not connected to master
     - Bus with no inputs or outputs
     - Role with no projection target
     */
    case orphanedNodes(orphanIds: [String], nodeTypes: [String])

    /**
     Graph validation failed for other reasons.

     Context:
     - Invalid parameter ranges
     - Duplicate IDs in graph
     - Missing required connections
     */
    case graphValidationFailed(message: String, issues: [String])

    // MARK: - Generation Errors

    /**
     Schillinger generator threw an error.

     Context:
     - Generator algorithm failed
     - Invalid generator parameters
     - Generator timeout
     */
    case generationFailed(generatorId: String, roleId: String, reason: String, underlyingError: Error?)

    /**
     Generator produced invalid output.

     Context:
     - Generated notes outside instrument range
     - Too many/few notes generated
     - Invalid rhythm patterns
     */
    case generationOutputInvalid(generatorId: String, issues: [String])

    // MARK: - System Errors

    /**
     Projection took too long.

     Context:
     - Complex song exceeded timeout
     - Performance mode constraints
     - Watchdog timer triggered
     */
    case projectionTimeout(duration: TimeInterval, maxDuration: TimeInterval, stage: String)

    /**
     Out of memory during projection.

     Context:
     - Large graph exceeded memory limits
     - Too many cached variations
     - Memory leak detected
     */
    case outOfMemory(estimatedUsage: UInt64, availableMemory: UInt64)

    // MARK: - Equatable Conformance

    public static func == (lhs: ProjectionError, rhs: ProjectionError) -> Bool {
        switch (lhs, rhs) {
        case (.invalidSong(let a, let b), .invalidSong(let c, let d)):
            return a == c && NSString(string: b.debugDescription).isEqual(to: d.debugDescription)
        case (.invalidSongContent(let a, let b), .invalidSongContent(let c, let d)):
            return a == c && NSString(string: b.debugDescription).isEqual(to: d.debugDescription)
        case (.invalidPerformance(let a, let b), .invalidPerformance(let c, let d)):
            return a == c && NSString(string: b.debugDescription).isEqual(to: d.debugDescription)
        case (.performanceReferencesInvalid(let a, let b), .performanceReferencesInvalid(let c, let d)):
            return a == c && b == d
        case (.missingInstrument(let a, let b, let c), .missingInstrument(let d, let e, let f)):
            return a == d && b == e && c == f
        case (.incompatibleRole(let a, let b, let c, let d), .incompatibleRole(let e, let f, let g, let h)):
            return a == e && b == f && c == g && d == h
        case (.circularRouting(let a), .circularRouting(let b)):
            return a == b
        case (.orphanedNodes(let a, let b), .orphanedNodes(let c, let d)):
            return a == c && b == d
        case (.graphValidationFailed(let a, let b), .graphValidationFailed(let c, let d)):
            return a == c && b == d
        case (.generationFailed(let a, let b, let c, _), .generationFailed(let d, let e, let f, _)):
            return a == d && b == e && c == f
        case (.generationOutputInvalid(let a, let b), .generationOutputInvalid(let c, let d)):
            return a == c && b == d
        case (.projectionTimeout(let a, let b, let c), .projectionTimeout(let d, let e, let f)):
            return a == d && b == e && c == f
        case (.outOfMemory(let a, let b), .outOfMemory(let c, let d)):
            return a == c && b == d
        default:
            return false
        }
    }
}

// =============================================================================
// MARK: - ProjectionError Extensions
// =============================================================================

extension ProjectionError {

    /**
     User-friendly error message for UI display
     */
    public var userMessage: String {
        switch self {
        case .invalidSong(let message, _):
            return "Song is invalid: \(message)"
        case .invalidSongContent(let message, _):
            return "Song content is problematic: \(message)"
        case .invalidPerformance(let message, _):
            return "Performance is invalid: \(message)"
        case .performanceReferencesInvalid(let message, _):
            return "Performance references are invalid: \(message)"
        case .missingInstrument(let roleId, let instrumentId, _):
            return "Instrument '\(instrumentId)' for role '\(roleId)' is not available"
        case .incompatibleRole(let roleId, let roleType, let instrumentId, let reason):
            return "Instrument '\(instrumentId)' cannot play \(roleType) role '\(roleId)': \(reason)"
        case .circularRouting(let cycle):
            return "Circular routing detected in audio graph: \(cycle.joined(separator: " → "))"
        case .orphanedNodes(let orphanIds, let nodeTypes):
            return "Orphaned nodes detected: \(orphanIds.joined(separator: ", ")) (\(nodeTypes.joined(separator: ", ")))"
        case .graphValidationFailed(let message, _):
            return "Graph validation failed: \(message)"
        case .generationFailed(let generatorId, let roleId, let reason, _):
            return "Generator '\(generatorId)' failed for role '\(roleId)': \(reason)"
        case .generationOutputInvalid(let generatorId, let issues):
            return "Generator '\(generatorId)' produced invalid output: \(issues.joined(separator: ", "))"
        case .projectionTimeout(_, _, let stage):
            return "Projection timed out during \(stage)"
        case .outOfMemory(_, _):
            return "System ran out of memory during projection"
        }
    }

    /**
     Detailed debug information
     */
    public var debugInfo: String {
        switch self {
        case .invalidSong(let message, let context):
            return """
            Invalid Song
            Message: \(message)
            Context: \(context)
            """
        case .invalidSongContent(let message, let context):
            return """
            Invalid Song Content
            Message: \(message)
            Context: \(context)
            """
        case .invalidPerformance(let message, let context):
            return """
            Invalid Performance
            Message: \(message)
            Context: \(context)
            """
        case .performanceReferencesInvalid(let message, let refs):
            return """
            Invalid Performance References
            Message: \(message)
            Invalid References: \(refs.joined(separator: ", "))
            """
        case .missingInstrument(let roleId, let instrumentId, let available):
            return """
            Missing Instrument
            Role ID: \(roleId)
            Instrument ID: \(instrumentId)
            Available Instruments: \(available.joined(separator: ", "))
            """
        case .incompatibleRole(let roleId, let roleType, let instrumentId, let reason):
            return """
            Incompatible Role
            Role ID: \(roleId)
            Role Type: \(roleType)
            Instrument ID: \(instrumentId)
            Reason: \(reason)
            """
        case .circularRouting(let cycle):
            return """
            Circular Routing Detected
            Cycle: \(cycle.joined(separator: " → "))
            """
        case .orphanedNodes(let orphanIds, let nodeTypes):
            return """
            Orphaned Nodes
            Node IDs: \(orphanIds.joined(separator: ", "))
            Node Types: \(nodeTypes.joined(separator: ", "))
            """
        case .graphValidationFailed(let message, let issues):
            return """
            Graph Validation Failed
            Message: \(message)
            Issues: \(issues.joined(separator: "\n  - "))
            """
        case .generationFailed(let generatorId, let roleId, let reason, let error):
            var debug = """
            Generation Failed
            Generator ID: \(generatorId)
            Role ID: \(roleId)
            Reason: \(reason)
            """
            if let error = error {
                debug += "\nUnderlying Error: \(error.localizedDescription)"
            }
            return debug
        case .generationOutputInvalid(let generatorId, let issues):
            return """
            Generation Output Invalid
            Generator ID: \(generatorId)
            Issues: \(issues.joined(separator: "\n  - "))
            """
        case .projectionTimeout(let duration, let maxDuration, let stage):
            return """
            Projection Timeout
            Stage: \(stage)
            Duration: \(duration)s
            Max Duration: \(maxDuration)s
            """
        case .outOfMemory(let estimated, let available):
            return """
            Out of Memory
            Estimated Usage: \(estimated / 1024 / 1024)MB
            Available Memory: \(available / 1024 / 1024)MB
            """
        }
    }

    /**
     Recovery hint for users/developers
     */
    public var recoveryHint: String? {
        switch self {
        case .invalidSong, .invalidSongContent:
            return "Check Song structure and content. Ensure all required fields are present and valid."
        case .invalidPerformance, .performanceReferencesInvalid:
            return "Verify Performance references valid roles and instruments from the Song."
        case .missingInstrument(_, let instrumentId, _):
            return "Add instrument '\(instrumentId)' to the Ensemble or choose a different instrument."
        case .incompatibleRole(_, _, let instrumentId, _):
            return "Choose a different instrument compatible with this role type."
        case .circularRouting:
            return "Break the routing cycle by removing or redirecting one of the sends."
        case .orphanedNodes:
            return "Connect all tracks and buses to the master output or remove unused nodes."
        case .graphValidationFailed:
            return "Review graph structure and fix validation issues."
        case .generationFailed(_, _, _, _):
            return "Check generator configuration and parameters. Try a different generator if available."
        case .generationOutputInvalid:
            return "Adjust generator parameters to produce valid output within constraints."
        case .projectionTimeout:
            return "Simplify the Song or increase timeout settings."
        case .outOfMemory:
            return "Reduce Song complexity or increase available memory."
        }
    }
}

// =============================================================================
// MARK: - Projection Configuration
// =============================================================================

/**
 Configuration options for the projection process.

 Controls how the Song is transformed into a render graph, including
 validation, automation, and performance modes.
 */
public struct ProjectionConfig: Equatable, Codable, Sendable {

    // MARK: - Render Mode

    /**
     Rendering mode for the projection.

     - realtime: Realtime playback with low latency
     - bounce: Offline bounce to disk
     - export: Full export with post-processing
     */
    public enum RenderMode: String, Equatable, Codable, Sendable {
        case realtime
        case bounce
        case export
    }

    /**
     How the projection will be rendered
     */
    public var renderMode: RenderMode

    // MARK: - Duration

    /**
     Duration override for the projection.

     - nil: Use Song's natural duration from metadata
     - some(seconds): Override duration for testing/export
     */
    public var durationOverride: TimeInterval?

    // MARK: - Validation Options

    /**
     Whether to validate the graph after generation.

     - true: Run full validation (circular routing, orphaned nodes, etc.)
     - false: Skip validation for faster performance (use with caution)

     Recommendation: Always validate in production. Only skip for
     emergency performance recovery.
     */
    public var validateGraph: Bool

    /**
     Whether to include automation in the projection.

     - true: Include all automation curves and parameter changes
     - false: Static projection (automation disabled)

     Use false for faster projection when automation isn't needed.
     */
    public var includeAutomation: Bool

    // MARK: - Performance Constraints

    /**
     Maximum time allowed for projection (in seconds).

     - nil: No timeout (use with caution)
     - some(seconds): Abort projection if exceeded

     Recommended:
     - Realtime: 5-10 seconds
     - Bounce/Export: 30-60 seconds
     */
    public var timeoutSeconds: TimeInterval?

    /**
     Maximum memory usage allowed (in bytes).

     - nil: No limit (system-dependent)
     - some(bytes): Abort if exceeded

     Recommended: Set to 50-75% of available system memory.
     */
    public var maxMemoryBytes: UInt64?

    // MARK: - Debug Options

    /**
     Whether to collect timing statistics.

     - true: Record detailed timing for each projection stage
     - false: Minimal overhead, no timing info
     */
    public var collectTimingStats: Bool

    /**
     Whether to include warnings in the result.

     - true: Collect non-fatal issues (missing instruments, etc.)
     - false: Only return errors (faster)
     */
    public var includeWarnings: Bool

    // MARK: - Initialization

    /**
     Default configuration for realtime playback
     */
    public static func realtime() -> ProjectionConfig {
        ProjectionConfig(
            renderMode: .realtime,
            durationOverride: nil,
            validateGraph: true,
            includeAutomation: true,
            timeoutSeconds: 10.0,
            maxMemoryBytes: nil,
            collectTimingStats: false,
            includeWarnings: true
        )
    }

    /**
     Default configuration for offline bounce
     */
    public static func bounce() -> ProjectionConfig {
        ProjectionConfig(
            renderMode: .bounce,
            durationOverride: nil,
            validateGraph: true,
            includeAutomation: true,
            timeoutSeconds: 60.0,
            maxMemoryBytes: nil,
            collectTimingStats: true,
            includeWarnings: true
        )
    }

    /**
     Default configuration for full export
     */
    public static func export() -> ProjectionConfig {
        ProjectionConfig(
            renderMode: .export,
            durationOverride: nil,
            validateGraph: true,
            includeAutomation: true,
            timeoutSeconds: 60.0,
            maxMemoryBytes: nil,
            collectTimingStats: true,
            includeWarnings: true
        )
    }

    /**
     Default configuration for testing (fastest)
     */
    public static func testing() -> ProjectionConfig {
        ProjectionConfig(
            renderMode: .realtime,
            durationOverride: 10.0, // Short duration for tests
            validateGraph: false, // Skip validation for speed
            includeAutomation: false, // No automation for tests
            timeoutSeconds: 5.0,
            maxMemoryBytes: 100_000_000, // 100MB limit
            collectTimingStats: false,
            includeWarnings: false
        )
    }

    // MARK: - Codable Support

    enum CodingKeys: String, CodingKey {
        case renderMode
        case durationOverride
        case validateGraph
        case includeAutomation
        case timeoutSeconds
        case maxMemoryBytes
        case collectTimingStats
        case includeWarnings
    }
}

// =============================================================================
// MARK: - Projection Result
// =============================================================================

/**
 Result of a successful projection operation.

 Contains the validated render graph, instrumentation report, ConsoleX
 configuration, warnings, and optional timing statistics.
 */
public struct ProjectionResult: Equatable, Codable, Sendable {

    // MARK: - Core Result

    /**
     The validated render graph ready for audio engine.

     This graph is guaranteed to be:
     - Free of circular routing
     - Fully connected (no orphaned nodes)
     - Validated for all parameter ranges
     - Ready for realtime or offline rendering
     */
    public var renderGraph: RenderGraph

    /**
     Instrumentation report showing what instruments were used.

     Maps each role to its assigned instrument with details about
     the instrument's capabilities and usage.
     */
    public var instrumentationReport: InstrumentationReport

    /**
     Complete ConsoleX configuration for this projection.

     Includes mix settings, effects configurations, routing, and
     all ConsoleX parameters needed to reproduce this projection.
     */
    public var consolexConfig: ConsoleXConfig

    // MARK: - Warnings

    /**
     Non-fatal issues discovered during projection.

     These warnings don't prevent projection but should be reviewed:
     - Missing instruments (substituted with defaults)
     - Potential performance issues
     - Deprecated features used
     - Unusual parameter combinations
     */
    public var warnings: [ProjectionWarning]

    // MARK: - Timing Statistics

    /**
     Detailed timing statistics for the projection process.

     Only present if ProjectionConfig.collectTimingStats was true.
     Useful for:
     - Performance optimization
     - Debugging slow projections
     - Monitoring system health
     */
    public var timingStats: ProjectionTimingStats?

    // MARK: - Metadata

    /**
     Unique identifier for this projection result.

     Generated deterministically from Song + Performance + Config.
     Can be used for caching and result comparison.
     */
    public var resultId: String

    /**
     Timestamp when projection was completed.
     */
    public var projectionTimestamp: Date

    /**
     Duration of the projected song in seconds.

     May differ from Song.duration if:
     - Duration override was used
     - Loop points were applied
     - Performance modified the duration
     */
    public var projectedDuration: TimeInterval

    // MARK: - Initialization

    public init(
        renderGraph: RenderGraph,
        instrumentationReport: InstrumentationReport,
        consolexConfig: ConsoleXConfig,
        warnings: [ProjectionWarning],
        timingStats: ProjectionTimingStats?,
        resultId: String,
        projectionTimestamp: Date,
        projectedDuration: TimeInterval
    ) {
        self.renderGraph = renderGraph
        self.instrumentationReport = instrumentationReport
        self.consolexConfig = consolexConfig
        self.warnings = warnings
        self.timingStats = timingStats
        self.resultId = resultId
        self.projectionTimestamp = projectionTimestamp
        self.projectedDuration = projectedDuration
    }
}

// =============================================================================
// MARK: - Projection Warning
// =============================================================================

/**
 Non-fatal warning issued during projection.
 */
public struct ProjectionWarning: Equatable, Codable, Sendable {

    /**
     Warning severity level
     */
    public enum Severity: String, Equatable, Codable, Sendable {
        case info
        case warning
        case deprecation
    }

    /**
     Severity of this warning
     */
    public var severity: Severity

    /**
     Warning category
     */
    public var category: String

    /**
     Human-readable warning message
     */
    public var message: String

    /**
     Optional context for debugging
     */
    public var context: [String: String]?

    public init(severity: Severity, category: String, message: String, context: [String: String]? = nil) {
        self.severity = severity
        self.category = category
        self.message = message
        self.context = context
    }
}

// =============================================================================
// MARK: - Instrumentation Report
// =============================================================================

/**
 Report showing what instruments were used in the projection.
 */
public struct InstrumentationReport: Equatable, Codable, Sendable {

    /**
     Mapping of role ID to assigned instrument
     */
    public var roleInstrumentMap: [String: InstrumentAssignment]

    /**
     All instruments used in this projection
     */
    public var usedInstruments: Set<String>

    /**
     Instruments that were requested but not available (were substituted)
     */
    public var substitutedInstruments: [String: String] // requested -> actual

    public init(
        roleInstrumentMap: [String: InstrumentAssignment],
        usedInstruments: Set<String>,
        substitutedInstruments: [String: String]
    ) {
        self.roleInstrumentMap = roleInstrumentMap
        self.usedInstruments = usedInstruments
        self.substitutedInstruments = substitutedInstruments
    }
}

/**
 Assignment of an instrument to a role
 */
public struct InstrumentAssignment: Equatable, Codable, Sendable {
    /**
     Role ID
     */
    public var roleId: String

    /**
     Instrument ID that was assigned
     */
    public var instrumentId: String

    /**
     Whether this was a substitution (requested instrument wasn't available)
     */
    public var wasSubstituted: Bool

    /**
     Original requested instrument ID (if substituted)
     */
    public var requestedInstrumentId: String?

    public init(
        roleId: String,
        instrumentId: String,
        wasSubstituted: Bool,
        requestedInstrumentId: String? = nil
    ) {
        self.roleId = roleId
        self.instrumentId = instrumentId
        self.wasSubstituted = wasSubstituted
        self.requestedInstrumentId = requestedInstrumentId
    }
}

// =============================================================================
// MARK: - ConsoleX Configuration
// =============================================================================

/**
 Complete ConsoleX configuration for a projection.

 This is a placeholder - the actual ConsoleX config structure will
 be defined in the ConsoleX integration module.
 */
public struct ConsoleXConfig: Equatable, Codable, Sendable {

    /**
     ConsoleX version
     */
    public var version: String

    /**
     Mix settings for all tracks and buses
     */
    public var mixSettings: [String: MixSettings]

    /**
     Effects configurations
     */
    public var effects: [String: EffectsConfig]

    /**
     Routing configuration
     */
    public var routing: RoutingConfig

    public init(
        version: String,
        mixSettings: [String: MixSettings],
        effects: [String: EffectsConfig],
        routing: RoutingConfig
    ) {
        self.version = version
        self.mixSettings = mixSettings
        self.effects = effects
        self.routing = routing
    }
}

/**
 Mix settings for a track or bus
 */
public struct MixSettings: Equatable, Codable, Sendable {
    public var volume: Double
    public var pan: Double
    public var mute: Bool
    public var solo: Bool

    public init(volume: Double, pan: Double, mute: Bool = false, solo: Bool = false) {
        self.volume = volume
        self.pan = pan
        self.mute = mute
        self.solo = solo
    }
}

/**
 Effects configuration
 */
public struct EffectsConfig: Equatable, Codable, Sendable {
    public var enabled: Bool
    public var parameters: [String: Double]

    public init(enabled: Bool, parameters: [String: Double]) {
        self.enabled = enabled
        self.parameters = parameters
    }
}

/**
 Routing configuration
 */
public struct RoutingConfig: Equatable, Codable, Sendable {
    public var sends: [SendConfig]
    public var inserts: [InsertConfig]

    public init(sends: [SendConfig], inserts: [InsertConfig]) {
        self.sends = sends
        self.inserts = inserts
    }
}

/**
 Send configuration
 */
public struct SendConfig: Equatable, Codable, Sendable {
    public var fromTrackId: String
    public var toBusId: String
    public var amount: Double

    public init(fromTrackId: String, toBusId: String, amount: Double) {
        self.fromTrackId = fromTrackId
        self.toBusId = toBusId
        self.amount = amount
    }
}

/**
 Insert configuration
 */
public struct InsertConfig: Equatable, Codable, Sendable {
    public var trackId: String
    public var effectId: String
    public var position: Int

    public init(trackId: String, effectId: String, position: Int) {
        self.trackId = trackId
        self.effectId = effectId
        self.position = position
    }
}

// =============================================================================
// MARK: - Projection Timing Statistics
// =============================================================================

/**
 Detailed timing statistics for the projection process.
 */
public struct ProjectionTimingStats: Equatable, Codable, Sendable {

    /**
     Individual stage timings (in seconds)
     */
    public var stageTimings: [String: TimeInterval]

    /**
     Total projection time
     */
    public var totalTime: TimeInterval

    /**
     Memory usage statistics
     */
    public var memoryUsage: MemoryUsageStats?

    public init(
        stageTimings: [String: TimeInterval],
        totalTime: TimeInterval,
        memoryUsage: MemoryUsageStats? = nil
    ) {
        self.stageTimings = stageTimings
        self.totalTime = totalTime
        self.memoryUsage = memoryUsage
    }
}

/**
 Memory usage statistics
 */
public struct MemoryUsageStats: Equatable, Codable, Sendable {
    public var peakBytes: UInt64
    public var currentBytes: UInt64
    public var estimatedGraphBytes: UInt64

    public init(peakBytes: UInt64, currentBytes: UInt64, estimatedGraphBytes: UInt64) {
        self.peakBytes = peakBytes
        self.currentBytes = currentBytes
        self.estimatedGraphBytes = estimatedGraphBytes
    }
}

// =============================================================================
// MARK: - Render Graph (Placeholder)
// =============================================================================

/**
 Render graph for audio engine.

 This is a placeholder - the actual RenderGraph structure will be
 defined in the audio engine integration module. It represents the
 complete audio routing graph including all tracks, buses, effects,
 and connections needed to render the projection.
 */
public struct RenderGraph: Equatable, Codable, Sendable {

    /**
     Graph version for serialization
     */
    public var version: String

    /**
     All nodes in the graph (tracks, buses, instruments)
     */
    public var nodes: [GraphNode]

    /**
     All connections between nodes
     */
    public var connections: [GraphConnection]

    /**
     Master output configuration
     */
    public var masterConfig: MasterConfig

    public init(
        version: String,
        nodes: [GraphNode],
        connections: [GraphConnection],
        masterConfig: MasterConfig
    ) {
        self.version = version
        self.nodes = nodes
        self.connections = connections
        self.masterConfig = masterConfig
    }
}

/**
 A node in the render graph
 */
public struct GraphNode: Equatable, Codable, Sendable {
    public var id: String
    public var type: NodeType
    public var name: String

    public init(id: String, type: NodeType, name: String) {
        self.id = id
        self.type = type
        self.name = name
    }

    public enum NodeType: String, Equatable, Codable, Sendable {
        case track
        case bus
        case instrument
        case master
        case aux
    }
}

/**
 A connection between nodes
 */
public struct GraphConnection: Equatable, Codable, Sendable {
    public var fromNodeId: String
    public var toNodeId: String
    public var connectionType: ConnectionType

    public init(fromNodeId: String, toNodeId: String, connectionType: ConnectionType) {
        self.fromNodeId = fromNodeId
        self.toNodeId = toNodeId
        self.connectionType = connectionType
    }

    public enum ConnectionType: String, Equatable, Codable, Sendable {
        case audio
        case send
        case insert
    }
}

/**
 Master output configuration
 */
public struct MasterConfig: Equatable, Codable, Sendable {
    public var volume: Double
    public var sampleRate: Int
    public var bufferSize: Int

    public init(volume: Double, sampleRate: Int, bufferSize: Int) {
        self.volume = volume
        self.sampleRate = sampleRate
        self.bufferSize = bufferSize
    }
}
