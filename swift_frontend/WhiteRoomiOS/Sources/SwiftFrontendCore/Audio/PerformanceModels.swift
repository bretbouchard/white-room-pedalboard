//
//  PerformanceModels.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Codable Any Support
// =============================================================================

/**
 Codable wrapper for arbitrary JSON values.

 Since `Any` doesn't conform to `Codable`, we use this enum to encode/decode
 arbitrary JSON values while maintaining type safety.
 */
public enum CodableAny: Codable, Equatable, Sendable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null
    case array([CodableAny])
    case dictionary([String: CodableAny])

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self = .null
        } else if let intValue = try? container.decode(Int.self) {
            self = .int(intValue)
        } else if let doubleValue = try? container.decode(Double.self) {
            self = .double(doubleValue)
        } else if let stringValue = try? container.decode(String.self) {
            self = .string(stringValue)
        } else if let boolValue = try? container.decode(Bool.self) {
            self = .bool(boolValue)
        } else if let arrayValue = try? container.decode([CodableAny].self) {
            self = .array(arrayValue)
        } else if let dictValue = try? container.decode([String: CodableAny].self) {
            self = .dictionary(dictValue)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "CodableAny value cannot be decoded"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .null:
            try container.encodeNil()
        case .int(let value):
            try container.encode(value)
        case .double(let value):
            try container.encode(value)
        case .string(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        case .array(let value):
            try container.encode(value)
        case .dictionary(let value):
            try container.encode(value)
        }
    }

    /**
     Convert to Swift Any type for runtime use.
     */
    public var anyValue: Any {
        switch self {
        case .string(let value):
            return value
        case .int(let value):
            return value
        case .double(let value):
            return value
        case .bool(let value):
            return value
        case .null:
            return NSNull()
        case .array(let value):
            return value.map { $0.anyValue }
        case .dictionary(let value):
            return value.mapValues { $0.anyValue }
        }
    }

    /**
     Create from Swift Any type.
     */
    public static func from(_ value: Any) -> CodableAny {
        switch value {
        case let value as String:
            return .string(value)
        case let value as Int:
            return .int(value)
        case let value as Double:
            return .double(value)
        case let value as Bool:
            return .bool(value)
        case is NSNull:
            return .null
        case let value as [Any]:
            return .array(value.map { from($0) })
        case let value as [String: Any]:
            return .dictionary(value.mapValues { from($0) })
        default:
            // Fallback to string representation
            return .string(String(describing: value))
        }
    }
}

// =============================================================================
// MARK: - Performance State
// =============================================================================

/**
 Performance state applied as a "lens" over a Song.

 PerformanceState modifies how a Song is projected without changing the
 Song itself. This allows multiple interpretations of the same Song
 (Piano, SATB, Techno, etc.) with instant switching.

 Key Principles:
 - Immutable lens pattern
 - Cache-friendly (can be swapped without reprojection)
 - Zero-copy where possible
 - Complete override capability
 */
public struct PerformanceState: Equatable, Codable, Sendable, Identifiable {

    // MARK: - Identity

    /**
     Unique identifier for this performance
     */
    public var id: String

    /**
     Human-readable name
     */
    public var name: String

    /**
     Performance version (for migration)
     */
    public var version: String

    // MARK: - Performance Mode

    /**
     Performance mode type

     - piano: Piano-focused performance
     - satb: SATB (Soprano, Alto, Tenor, Bass) choral performance
     - techno: Techno/electronic performance
     - custom: User-defined custom performance
     */
    public enum PerformanceMode: String, Equatable, Codable, Sendable {
        case piano
        case satb
        case techno
        case custom
    }

    /**
     Performance mode
     */
    public var mode: PerformanceMode

    // MARK: - Role Overrides

    /**
     Role parameter overrides

     Maps role ID to overridden parameters. Any parameter not specified
     here falls back to the Song's default.
     */
    public var roleOverrides: [String: RoleOverride]

    /**
     Density multiplier for all roles (0.0 = silence, 1.0 = normal, 2.0 = double density)
     */
    public var globalDensityMultiplier: Double

    // MARK: - Instrumentation Overrides

    /**
     Instrument reassignments

     Maps role ID to new instrument ID. If a role is not mapped here,
     it uses the Song's default projection.
     */
    public var instrumentReassignments: [String: String]

    /**
     Ensemble specification for this performance

     If nil, uses the Song's default ensemble.
     If specified, completely replaces the ensemble.
     */
    public var ensembleOverride: EnsembleOverride?

    // MARK: - Groove and Timing

    /**
     Groove template for rhythmic feel

     Modifies microtiming of all notes for swing, push, drag, etc.
     */
    public var groove: GrooveTemplate

    /**
     Tempo modifier (multiplier, e.g., 1.0 = normal, 1.5 = faster)
     */
    public var tempoMultiplier: Double

    // MARK: - ConsoleX Configuration

    /**
     ConsoleX mix target overrides

     Maps track/bus IDs to overridden mix settings.
     */
    public var consolexOverrides: [String: ConsoleXOverride]

    /**
     Effects chain overrides

     Completely replaces or modifies effect chains.
     */
    public var effectsOverrides: [String: EffectsOverride]

    // MARK: - Metadata

    /**
     User-defined tags
     */
    public var tags: [String]

    /**
     When this performance was created
     */
    public var createdAt: Date

    /**
     When this performance was last modified
     */
    public var updatedAt: Date

    // MARK: - Initialization

    public init(
        id: String,
        name: String,
        version: String,
        mode: PerformanceMode,
        roleOverrides: [String: RoleOverride],
        globalDensityMultiplier: Double,
        instrumentReassignments: [String: String],
        ensembleOverride: EnsembleOverride? = nil,
        groove: GrooveTemplate,
        tempoMultiplier: Double,
        consolexOverrides: [String: ConsoleXOverride],
        effectsOverrides: [String: EffectsOverride],
        tags: [String],
        createdAt: Date,
        updatedAt: Date
    ) {
        self.id = id
        self.name = name
        self.version = version
        self.mode = mode
        self.roleOverrides = roleOverrides
        self.globalDensityMultiplier = globalDensityMultiplier
        self.instrumentReassignments = instrumentReassignments
        self.ensembleOverride = ensembleOverride
        self.groove = groove
        self.tempoMultiplier = tempoMultiplier
        self.consolexOverrides = consolexOverrides
        self.effectsOverrides = effectsOverrides
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /**
     Create a default performance (no overrides)
     */
    public static func defaultPerformance(id: String = "default", name: String = "Default") -> PerformanceState {
        PerformanceState(
            id: id,
            name: name,
            version: "1.0",
            mode: .custom,
            roleOverrides: [:],
            globalDensityMultiplier: 1.0,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .straight,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: [],
            createdAt: Date(),
            updatedAt: Date()
        )
    }
}

// =============================================================================
// MARK: - Role Override
// =============================================================================

/**
 Override parameters for a specific role.

 Any parameter specified here replaces the Song's default for that role.
 */
public struct RoleOverride: Equatable, Codable, Sendable {

    /**
     Role ID to override
     */
    public var roleId: String

    /**
     Density multiplier (overrides Song default)
     */
    public var densityMultiplier: Double?

    /**
     Range override (MIDI note numbers)
     */
    public var rangeOverride: ClosedRange<Int>?

    /**
     Velocity range override
     */
    public var velocityRangeOverride: ClosedRange<Int>?

    /**
     Articulation override
     */
    public var articulationOverride: String?

    /**
     Generator parameters override
     */
    public var generatorParametersOverride: [String: CodableAny]?

    public init(
        roleId: String,
        densityMultiplier: Double? = nil,
        rangeOverride: ClosedRange<Int>? = nil,
        velocityRangeOverride: ClosedRange<Int>? = nil,
        articulationOverride: String? = nil,
        generatorParametersOverride: [String: CodableAny]? = nil
    ) {
        self.roleId = roleId
        self.densityMultiplier = densityMultiplier
        self.rangeOverride = rangeOverride
        self.velocityRangeOverride = velocityRangeOverride
        self.articulationOverride = articulationOverride
        self.generatorParametersOverride = generatorParametersOverride
    }
}

// =============================================================================
// MARK: - Ensemble Override
// =============================================================================

/**
 Override the entire ensemble for a performance.

 If specified, completely replaces the Song's ensemble with a new
 set of instruments.
 */
public struct EnsembleOverride: Equatable, Codable, Sendable {

    /**
     Ensemble ID (must reference a valid ensemble)
     */
    public var ensembleId: String

    /**
     Ensemble name
     */
    public var name: String

    /**
     All instruments in this ensemble
     */
    public var instruments: [InstrumentDefinition]

    public init(
        ensembleId: String,
        name: String,
        instruments: [InstrumentDefinition]
    ) {
        self.ensembleId = ensembleId
        self.name = name
        self.instruments = instruments
    }
}

// =============================================================================
// MARK: - Instrument Definition
// =============================================================================

/**
 Definition of an instrument in an ensemble.
 */
public struct InstrumentDefinition: Equatable, Codable, Sendable, Identifiable {

    /**
     Unique identifier
     */
    public var id: String

    /**
     Human-readable name
     */
    public var name: String

    /**
     Instrument type
     */
    public var type: InstrumentType

    /**
     MIDI program number (if applicable)
     */
    public var midiProgram: Int?

    /**
     Audio plugin ID (if using plugins)
     */
    public var pluginId: String?

    /**
     Instrument capabilities
     */
    public var capabilities: InstrumentCapabilities

    public init(
        id: String,
        name: String,
        type: InstrumentType,
        midiProgram: Int? = nil,
        pluginId: String? = nil,
        capabilities: InstrumentCapabilities
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.midiProgram = midiProgram
        self.pluginId = pluginId
        self.capabilities = capabilities
    }
}

// =============================================================================
// MARK: - Instrument Type
// =============================================================================

/**
 Common instrument types for categorization and role compatibility.
 */
public enum InstrumentType: String, Equatable, Codable, Sendable {
    case piano
    case organ
    case synth
    case guitar
    case bass
    case strings
    case brass
    case winds
    case percussion
    case drums
    case vocal
    case other
}

// =============================================================================
// MARK: - Instrument Capabilities
// =============================================================================

/**
 Capabilities and constraints of an instrument.

 Used to validate role assignments and detect incompatibilities.
 */
public struct InstrumentCapabilities: Equatable, Codable, Sendable {

    /**
     Polyphony (maximum simultaneous notes)
     */
    public var polyphony: Int

    /**
     Supported role types
     */
    public var supportedRoles: [Role.RoleType]

    /**
     Pitch range (MIDI note numbers)
     */
    public var pitchRange: ClosedRange<Int>

    /**
     Whether instrument supports velocity sensitivity
     */
    public var velocitySensitive: Bool

    /**
     Whether instrument supports aftertouch
     */
    public var aftertouchSupported: Bool

    /**
     Additional capabilities
     */
    public var additionalCapabilities: [String: Bool]?

    public init(
        polyphony: Int,
        supportedRoles: [Role.RoleType],
        pitchRange: ClosedRange<Int>,
        velocitySensitive: Bool = true,
        aftertouchSupported: Bool = false,
        additionalCapabilities: [String: Bool]? = nil
    ) {
        self.polyphony = polyphony
        self.supportedRoles = supportedRoles
        self.pitchRange = pitchRange
        self.velocitySensitive = velocitySensitive
        self.aftertouchSupported = aftertouchSupported
        self.additionalCapabilities = additionalCapabilities
    }
}

// =============================================================================
// MARK: - Groove Template
// =============================================================================

/**
 Groove template for rhythmic feel.

 Defines microtiming offsets to create swing, push, drag, or other
 rhythmic feels.
 */
public struct GrooveTemplate: Equatable, Codable, Sendable {

    /**
     Predefined groove templates
     */
    public static let straight = GrooveTemplate(name: "Straight", offsets: [:])
    public static let swing = GrooveTemplate(
        name: "Swing",
        offsets: [0.5: 0.1] // Delay off-beat eighth notes by 10%
    )
    public static let push = GrooveTemplate(
        name: "Push",
        offsets: [0.5: -0.05] // Anticipate off-beat eighth notes by 5%
    )
    public static let drag = GrooveTemplate(
        name: "Drag",
        offsets: [0.0: 0.05, 0.5: 0.05] // Delay everything by 5%
    )

    /**
     Groove name
     */
    public var name: String

    /**
     Timing offsets

     Maps position in beat (0.0 to 1.0) to offset in seconds.
     For example, [0.5: 0.1] delays off-beat eighth notes by 10%.
     */
    public var offsets: [Double: Double]

    public init(name: String, offsets: [Double: Double]) {
        self.name = name
        self.offsets = offsets
    }
}

// =============================================================================
// MARK: - ConsoleX Override
// =============================================================================

/**
 Override ConsoleX mix settings for a track or bus.
 */
public struct ConsoleXOverride: Equatable, Codable, Sendable {

    /**
     Track or bus ID to override
     */
    public var targetId: String

    /**
     Volume override (nil = use Song default)
     */
    public var volumeOverride: Double?

    /**
     Pan override (nil = use Song default)
     */
    public var panOverride: Double?

    /**
     Mute override (nil = use Song default)
     */
    public var muteOverride: Bool?

    /**
     Solo override (nil = use Song default)
     */
    public var soloOverride: Bool?

    public init(
        targetId: String,
        volumeOverride: Double? = nil,
        panOverride: Double? = nil,
        muteOverride: Bool? = nil,
        soloOverride: Bool? = nil
    ) {
        self.targetId = targetId
        self.volumeOverride = volumeOverride
        self.panOverride = panOverride
        self.muteOverride = muteOverride
        self.soloOverride = soloOverride
    }
}

// =============================================================================
// MARK: - Effects Override
// =============================================================================

/**
 Override effects chain for a track or bus.
 */
public struct EffectsOverride: Equatable, Codable, Sendable {

    /**
     Track or bus ID
     */
    public var targetId: String

    /**
     Effects chain (completely replaces Song default)
     */
    public var effectsChain: [EffectSlot]

    public init(targetId: String, effectsChain: [EffectSlot]) {
        self.targetId = targetId
        self.effectsChain = effectsChain
    }
}

// =============================================================================
// MARK: - Effect Slot
// =============================================================================

/**
 A single effect in an effects chain.
 */
public struct EffectSlot: Equatable, Codable, Sendable, Identifiable {

    /**
     Unique identifier
     */
    public var id: String

    /**
     Effect type (reverb, delay, distortion, etc.)
     */
    public var type: String

    /**
     Whether effect is enabled
     */
    public var enabled: Bool

    /**
     Effect parameters
     */
    public var parameters: [String: Double]

    /**
     Position in chain (0 = first)
     */
    public var position: Int

    public init(
        id: String,
        type: String,
        enabled: Bool,
        parameters: [String: Double],
        position: Int
    ) {
        self.id = id
        self.type = type
        self.enabled = enabled
        self.parameters = parameters
        self.position = position
    }
}
// Performance type alias for backward compatibility
public typealias Performance = PerformanceState
