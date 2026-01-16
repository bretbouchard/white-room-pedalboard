//
//  SongModels.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Song Model
// =============================================================================

/**
 Complete Song model representing a musical composition.

 Song is the core data model for White Room, containing all information
 needed to project and render audio: structure, roles, sections, and metadata.

 This model is designed to be:
 - Serializable (can be saved/loaded from disk)
 - Performant (efficient for realtime operations)
 - Type-safe (compile-time guarantees)
 - Immutable (thread-safe by default)
 */
public struct Song: Equatable, Codable, Sendable {

    // MARK: - Identity

    /**
     Unique identifier for this Song
     */
    public var id: String

    /**
     Human-readable name
     */
    public var name: String

    /**
     Song version (for migration and compatibility)
     */
    public var version: String

    // MARK: - Metadata

    /**
     Song metadata (tempo, time signature, duration, etc.)
     */
    public var metadata: SongMetadata

    // MARK: - Musical Structure

    /**
     All sections in the song (verse, chorus, bridge, etc.)
     */
    public var sections: [Section]

    /**
     All musical roles (bass, melody, harmony, rhythm, etc.)
     */
    public var roles: [Role]

    /**
     All projections (role -> instrument mappings)
     */
    public var projections: [Projection]

    // MARK: - Audio Configuration

    /**
     Audio mix configuration (tracks, buses, sends, master)
     */
    public var mixGraph: MixGraph

    /**
     Realization policy (lookahead, determinism mode, etc.)
     */
    public var realizationPolicy: RealizationPolicy

    // MARK: - Determinism

    /**
     Random seed for deterministic generation
     */
    public var determinismSeed: String

    // MARK: - Timestamps

    /**
     When this Song was created
     */
    public var createdAt: Date

    /**
     When this Song was last modified
     */
    public var updatedAt: Date

    // MARK: - Initialization

    public init(
        id: String,
        name: String,
        version: String,
        metadata: SongMetadata,
        sections: [Section],
        roles: [Role],
        projections: [Projection],
        mixGraph: MixGraph,
        realizationPolicy: RealizationPolicy,
        determinismSeed: String,
        createdAt: Date,
        updatedAt: Date
    ) {
        self.id = id
        self.name = name
        self.version = version
        self.metadata = metadata
        self.sections = sections
        self.roles = roles
        self.projections = projections
        self.mixGraph = mixGraph
        self.realizationPolicy = realizationPolicy
        self.determinismSeed = determinismSeed
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// =============================================================================
// MARK: - Song Metadata
// =============================================================================

/**
 Metadata describing the Song's properties.
 */
public struct SongMetadata: Equatable, Codable, Sendable {

    /**
     Tempo in beats per minute
     */
    public var tempo: Double

    /**
     Time signature [numerator, denominator]
     */
    public var timeSignature: [Int]

    /**
     Duration in seconds (optional, can be derived from sections)
     */
    public var duration: Double?

    /**
     Musical key (optional, for analysis and display)
     */
    public var key: String?

    /**
     User-defined tags (for organization)
     */
    public var tags: [String]

    public init(
        tempo: Double,
        timeSignature: [Int],
        duration: Double? = nil,
        key: String? = nil,
        tags: [String] = []
    ) {
        self.tempo = tempo
        self.timeSignature = timeSignature
        self.duration = duration
        self.key = key
        self.tags = tags
    }
}

// =============================================================================
// MARK: - Section
// =============================================================================

/**
 A section of the song (verse, chorus, bridge, etc.)

 Sections define time ranges and which roles are active during that time.
 */
public struct Section: Equatable, Codable, Sendable, Identifiable {

    /**
     Unique identifier
     */
    public var id: String

    /**
     Human-readable name
     */
    public var name: String

    /**
     Start time (musical or absolute)
     */
    public var start: MusicalTime

    /**
     End time (musical or absolute)
     */
    public var end: MusicalTime

    /**
     Role IDs active in this section
     */
    public var roles: [String]

    /**
     Optional realization hints for generators
     */
    public var realizationHints: [String: CodableAny]?

    public init(
        id: String,
        name: String,
        start: MusicalTime,
        end: MusicalTime,
        roles: [String],
        realizationHints: [String: CodableAny]? = nil
    ) {
        self.id = id
        self.name = name
        self.start = start
        self.end = end
        self.roles = roles
        self.realizationHints = realizationHints
    }
}

// =============================================================================
// MARK: - Musical Time
// =============================================================================

/**
 Musical time representation supporting bars/beats (musical) and seconds (absolute).
 */
public struct MusicalTime: Equatable, Codable, Sendable {

    /**
     Bars since start (if time signature known)
     */
    public var bars: Double?

    /**
     Beats since start (if tempo known)
     */
    public var beats: Double?

    /**
     Seconds since start (absolute time)
     */
    public var seconds: Double?

    public init(bars: Double? = nil, beats: Double? = nil, seconds: Double? = nil) {
        self.bars = bars
        self.beats = beats
        self.seconds = seconds
    }
}

// =============================================================================
// MARK: - Role
// =============================================================================

/**
 A musical role (bass, melody, harmony, rhythm, etc.)

 Roles define what kind of music should be generated and how it should
 be transformed into audio.
 */
public struct Role: Equatable, Codable, Sendable, Identifiable {

    /**
     Role type (bass, melody, harmony, rhythm, texture, ornament)
     */
    public enum RoleType: String, Equatable, Codable, Sendable {
        case bass
        case harmony
        case melody
        case rhythm
        case texture
        case ornament
    }

    /**
     Unique identifier
     */
    public var id: String

    /**
     Human-readable name
     */
    public var name: String

    /**
     Type of role
     */
    public var type: RoleType

    /**
     Generator configuration (how to generate notes)
     */
    public var generatorConfig: GeneratorConfig

    /**
     Role-specific parameters (density, range, articulation, etc.)
     */
    public var parameters: RoleParameters

    public init(
        id: String,
        name: String,
        type: RoleType,
        generatorConfig: GeneratorConfig,
        parameters: RoleParameters
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.generatorConfig = generatorConfig
        self.parameters = parameters
    }
}

// =============================================================================
// MARK: - Generator Configuration
// =============================================================================

/**
 Configuration for a note generator (Schillinger algorithm).
 */
public struct GeneratorConfig: Equatable, Codable, Sendable {

    /**
     Generator type identifier
     */
    public var type: String

    /**
     Generator-specific parameters
     */
    public var parameters: [String: CodableAny]

    public init(type: String, parameters: [String: CodableAny]) {
        self.type = type
        self.parameters = parameters
    }
}

// =============================================================================
// MARK: - Role Parameters
// =============================================================================

/**
 Parameters controlling how a role is realized.
 */
public struct RoleParameters: Equatable, Codable, Sendable {

    /**
     Note density (0.0 = sparse, 1.0 = dense)
     */
    public var density: Double

    /**
     Pitch range (MIDI note numbers)
     */
    public var range: ClosedRange<Int>

    /**
     Velocity range
     */
    public var velocityRange: ClosedRange<Int>

    /**
     Articulation (staccato, legato, etc.)
     */
    public var articulation: String?

    /**
     Additional custom parameters
     */
    public var custom: [String: CodableAny]?

    public init(
        density: Double,
        range: ClosedRange<Int>,
        velocityRange: ClosedRange<Int>,
        articulation: String? = nil,
        custom: [String: CodableAny]? = nil
    ) {
        self.density = density
        self.range = range
        self.velocityRange = velocityRange
        self.articulation = articulation
        self.custom = custom
    }
}

// =============================================================================
// MARK: - Projection (Role -> Instrument Mapping)
// =============================================================================

/**
 Maps a role to an audio target (instrument, track, or bus).

 This is the core of the projection system: determining how each
 musical role becomes actual sound.
 */
public struct Projection: Equatable, Codable, Sendable, Identifiable {

    /**
     Unique identifier
     */
    public var id: String

    /**
     Role ID to project
     */
    public var roleId: String

    /**
     Where to project this role (instrument, track, or bus)
     */
    public var target: ProjectionTarget

    /**
     Optional transform configuration (transposition, effects, etc.)
     */
    public var transform: TransformConfig?

    public init(
        id: String,
        roleId: String,
        target: ProjectionTarget,
        transform: TransformConfig? = nil
    ) {
        self.id = id
        self.roleId = roleId
        self.target = target
        self.transform = transform
    }
}

// =============================================================================
// MARK: - Projection Target
// =============================================================================

/**
 Where a role is projected in the audio graph.
 */
public struct ProjectionTarget: Equatable, Codable, Sendable {

    /**
     Target type
     */
    public enum TargetType: String, Equatable, Codable, Sendable {
        case track
        case bus
        case instrument
    }

    /**
     Type of target
     */
    public var type: TargetType

    /**
     Target ID (must exist in mixGraph or ensemble)
     */
    public var id: String

    public init(type: TargetType, id: String) {
        self.type = type
        self.id = id
    }
}

// =============================================================================
// MARK: - Transform Configuration
// =============================================================================

/**
 Optional transformations applied to a role before rendering.

 Examples: transposition, inversion, retrograde, filtering, etc.
 */
public struct TransformConfig: Equatable, Codable, Sendable {

    /**
     Transform type
     */
    public var type: String

    /**
     Transform-specific parameters
     */
    public var parameters: [String: CodableAny]

    public init(type: String, parameters: [String: CodableAny]) {
        self.type = type
        self.parameters = parameters
    }
}

// =============================================================================
// MARK: - Mix Graph
// =============================================================================

/**
 Audio mix configuration: tracks, buses, sends, and master.
 */
public struct MixGraph: Equatable, Codable, Sendable {

    /**
     All track configurations
     */
    public var tracks: [TrackConfig]

    /**
     All bus configurations
     */
    public var buses: [BusConfig]

    /**
     All send configurations (track -> bus)
     */
    public var sends: [MixSendConfig]

    /**
     Master output configuration
     */
    public var master: MixMasterConfig

    public init(
        tracks: [TrackConfig],
        buses: [BusConfig],
        sends: [MixSendConfig],
        master: MixMasterConfig
    ) {
        self.tracks = tracks
        self.buses = buses
        self.sends = sends
        self.master = master
    }
}

// =============================================================================
// MARK: - Track Configuration
// =============================================================================

/**
 Configuration for an audio track.
 */
public struct TrackConfig: Equatable, Codable, Sendable, Identifiable {

    /**
     Unique identifier
     */
    public var id: String

    /**
     Human-readable name
     */
    public var name: String

    /**
     Volume (0.0 to 1.0)
     */
    public var volume: Double

    /**
     Pan (-1.0 to 1.0)
     */
    public var pan: Double

    /**
     Mute state
     */
    public var mute: Bool

    /**
     Solo state
     */
    public var solo: Bool

    /**
     Additional track-specific parameters
     */
    public var additionalParameters: [String: CodableAny]?

    public init(
        id: String,
        name: String,
        volume: Double,
        pan: Double,
        mute: Bool = false,
        solo: Bool = false,
        additionalParameters: [String: CodableAny]? = nil
    ) {
        self.id = id
        self.name = name
        self.volume = volume
        self.pan = pan
        self.mute = mute
        self.solo = solo
        self.additionalParameters = additionalParameters
    }
}

// =============================================================================
// MARK: - Bus Configuration
// =============================================================================

/**
 Configuration for an audio bus (effect bus, group bus, etc.)
 */
public struct BusConfig: Equatable, Codable, Sendable, Identifiable {

    /**
     Unique identifier
     */
    public var id: String

    /**
     Human-readable name
     */
    public var name: String

    /**
     Volume (0.0 to 1.0)
     */
    public var volume: Double

    /**
     Additional bus-specific parameters
     */
    public var additionalParameters: [String: CodableAny]?

    public init(
        id: String,
        name: String,
        volume: Double,
        additionalParameters: [String: CodableAny]? = nil
    ) {
        self.id = id
        self.name = name
        self.volume = volume
        self.additionalParameters = additionalParameters
    }
}

// =============================================================================
// MARK: - Send Configuration
// =============================================================================

/**
 Send from a track to a bus (aux send)
 */
public struct MixSendConfig: Equatable, Codable, Sendable, Identifiable {

    /**
     Unique identifier
     */
    public var id: String

    /**
     Source track ID
     */
    public var fromTrackId: String

    /**
     Destination bus ID
     */
    public var toBusId: String

    /**
     Send amount (0.0 to 1.0)
     */
    public var amount: Double

    public init(
        id: String,
        fromTrackId: String,
        toBusId: String,
        amount: Double
    ) {
        self.id = id
        self.fromTrackId = fromTrackId
        self.toBusId = toBusId
        self.amount = amount
    }
}

// =============================================================================
// MARK: - Master Configuration
// =============================================================================

/**
 Master output configuration
 */
public struct MixMasterConfig: Equatable, Codable, Sendable {

    /**
     Master volume (0.0 to 1.0)
     */
    public var volume: Double

    /**
     Sample rate for rendering
     */
    public var sampleRate: Int

    /**
     Buffer size for audio engine
     */
    public var bufferSize: Int

    /**
     Additional master parameters
     */
    public var additionalParameters: [String: CodableAny]?

    public init(
        volume: Double,
        sampleRate: Int = 44100,
        bufferSize: Int = 512,
        additionalParameters: [String: CodableAny]? = nil
    ) {
        self.volume = volume
        self.sampleRate = sampleRate
        self.bufferSize = bufferSize
        self.additionalParameters = additionalParameters
    }
}

// =============================================================================
// MARK: - Realization Policy
// =============================================================================

/**
 Policy for how the song is realized into audio.

 Controls lookahead, determinism, and other realization parameters.
 */
public struct RealizationPolicy: Equatable, Codable, Sendable {

    /**
     Lookahead window size
     */
    public var windowSize: MusicalTime

    /**
     Lookahead duration
     */
    public var lookaheadDuration: MusicalTime

    /**
     Determinism mode
     */
    public enum DeterminismMode: String, Equatable, Codable, Sendable {
        case strict
        case seeded
        case loose
    }

    /**
     How deterministic realization should be
     */
    public var determinismMode: DeterminismMode

    public init(
        windowSize: MusicalTime,
        lookaheadDuration: MusicalTime,
        determinismMode: DeterminismMode
    ) {
        self.windowSize = windowSize
        self.lookaheadDuration = lookaheadDuration
        self.determinismMode = determinismMode
    }
}
