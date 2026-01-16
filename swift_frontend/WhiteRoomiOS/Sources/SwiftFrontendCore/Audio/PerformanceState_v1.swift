//
//  PerformanceState_v1.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Performance State v1 (Schema Compliant)
// =============================================================================

/**
 PerformanceState_v1 - Represents a parallel performance universe

 One song can have many performances (Piano, SATB, Techno, etc.)

 Schema: PerformanceState_v1.schema.json
 SongState (what the song is) + PerformanceState (how it's realized) → Playable graph
 */
public struct PerformanceState_v1: Codable, Sendable, Identifiable {

    // MARK: - Required Fields

    /// Schema version
    public let version: String

    /// Unique identifier for this performance
    public let id: String

    /// Human-readable name for this performance
    public let name: String

    /// Musical arrangement style for this performance
    public let arrangementStyle: ArrangementStyle

    // MARK: - Optional Fields

    /// Note density multiplier (0 = sparse, 1 = full density)
    public let density: Double

    /// Reference to groove template (straight, swing, etc.)
    public let grooveProfileId: String

    /// Maps roles or track IDs to instrument assignments
    public let instrumentationMap: [String: PerformanceInstrumentAssignment]

    /// Reference to ConsoleX profile for mixing settings
    public let consoleXProfileId: String

    /// Per-role or per-track gain/pan targets
    public let mixTargets: [String: MixTarget]

    /// ISO 8601 creation timestamp
    public let createdAt: Date?

    /// ISO 8601 modification timestamp
    public let modifiedAt: Date?

    /// Custom metadata for this performance
    public let metadata: [String: String]?

    // MARK: - Initialization

    public init(
        version: String = "1",
        id: String,
        name: String,
        arrangementStyle: ArrangementStyle,
        density: Double = 1.0,
        grooveProfileId: String = "default",
        instrumentationMap: [String: PerformanceInstrumentAssignment],
        consoleXProfileId: String = "default",
        mixTargets: [String: MixTarget],
        createdAt: Date? = nil,
        modifiedAt: Date? = nil,
        metadata: [String: String]? = nil
    ) {
        self.version = version
        self.id = id
        self.name = name
        self.arrangementStyle = arrangementStyle
        self.density = density
        self.grooveProfileId = grooveProfileId
        self.instrumentationMap = instrumentationMap
        self.consoleXProfileId = consoleXProfileId
        self.mixTargets = mixTargets
        self.createdAt = createdAt ?? Date()
        self.modifiedAt = modifiedAt ?? Date()
        self.metadata = metadata
    }

    // MARK: - Coding Keys

    enum CodingKeys: String, CodingKey {
        case version
        case id
        case name
        case arrangementStyle
        case density
        case grooveProfileId
        case instrumentationMap
        case consoleXProfileId
        case mixTargets
        case createdAt
        case modifiedAt
        case metadata
    }

    // MARK: - Validation

    /**
     Validate that this performance state conforms to schema requirements
     */
    public func validate() -> PerformanceValidationResult {
        var errors: [String] = []

        // Version must be "1"
        if version != "1" {
            errors.append("Invalid version: \(version). Expected: 1")
        }

        // Density must be between 0 and 1
        if density < 0 || density > 1 {
            errors.append("Density must be between 0 and 1, got: \(density)")
        }

        // Instrumentation map must not be empty
        if instrumentationMap.isEmpty {
            errors.append("Instrumentation map cannot be empty")
        }

        // Validate mix targets
        for (key, target) in mixTargets {
            if target.pan < -1 || target.pan > 1 {
                errors.append("Mix target '\(key)' has invalid pan: \(target.pan). Must be -1 to 1")
            }
        }

        return PerformanceValidationResult(
            isValid: errors.isEmpty,
            errors: errors
        )
    }
}

// =============================================================================
// MARK: - Arrangement Style
// =============================================================================

/**
 Arrangement style enumeration for musical performances
 Defines common musical ensemble configurations
 */
public enum ArrangementStyle: String, Codable, Sendable, CaseIterable {
    case SOLO_PIANO = "SOLO_PIANO"
    case SATB = "SATB"
    case CHAMBER_ENSEMBLE = "CHAMBER_ENSEMBLE"
    case FULL_ORCHESTRA = "FULL_ORCHESTRA"
    case JAZZ_COMBO = "JAZZ_COMBO"
    case JAZZ_TRIO = "JAZZ_TRIO"
    case ROCK_BAND = "ROCK_BAND"
    case AMBIENT_TECHNO = "AMBIENT_TECHNO"
    case ELECTRONIC = "ELECTRONIC"
    case ACAPPELLA = "ACAPPELLA"
    case STRING_QUARTET = "STRING_QUARTET"
    case CUSTOM = "CUSTOM"

    /// Display name for this arrangement style
    public var displayName: String {
        switch self {
        case .SOLO_PIANO: return "Solo Piano"
        case .SATB: return "SATB Choir"
        case .CHAMBER_ENSEMBLE: return "Chamber Ensemble"
        case .FULL_ORCHESTRA: return "Full Orchestra"
        case .JAZZ_COMBO: return "Jazz Combo"
        case .JAZZ_TRIO: return "Jazz Trio"
        case .ROCK_BAND: return "Rock Band"
        case .AMBIENT_TECHNO: return "Ambient Techno"
        case .ELECTRONIC: return "Electronic"
        case .ACAPPELLA: return "A Cappella"
        case .STRING_QUARTET: return "String Quartet"
        case .CUSTOM: return "Custom"
        }
    }

    /// Default density for this arrangement style
    public var defaultDensity: Double {
        switch self {
        case .SOLO_PIANO: return 0.35
        case .SATB: return 0.55
        case .AMBIENT_TECHNO: return 0.8
        case .ELECTRONIC: return 0.85
        case .JAZZ_COMBO: return 0.6
        case .JAZZ_TRIO: return 0.5
        case .ROCK_BAND: return 0.7
        case .ACAPPELLA: return 0.6
        case .STRING_QUARTET: return 0.45
        case .CHAMBER_ENSEMBLE: return 0.5
        case .FULL_ORCHESTRA: return 0.65
        case .CUSTOM: return 1.0
        }
    }
}

// =============================================================================
// MARK: - Instrument Assignment
// =============================================================================

/**
 Instrument assignment for a specific role or track
 Maps abstract roles to concrete instruments with optional presets
 */
public struct PerformanceInstrumentAssignment: Codable, Sendable {

    /// Instrument identifier (e.g., 'LocalGal', 'KaneMarco', etc.)
    public let instrumentId: String

    /// Optional preset identifier for the instrument
    public let presetId: String?

    /// Custom instrument parameters
    public let parameters: [String: Double]?

    public init(
        instrumentId: String,
        presetId: String? = nil,
        parameters: [String: Double]? = nil
    ) {
        self.instrumentId = instrumentId
        self.presetId = presetId
        self.parameters = parameters
    }
}

// =============================================================================
// MARK: - Mix Target
// =============================================================================

/**
 Mix target for a specific role or track
 Defines gain, pan, and stereo configuration
 */
public struct MixTarget: Codable, Sendable {

    /// Gain in decibels (-inf to 0 dB)
    public let gain: Double

    /// Pan position (-1 = left, 0 = center, 1 = right)
    public let pan: Double

    /// Whether this target is stereo
    public let stereo: Bool

    public init(
        gain: Double,
        pan: Double,
        stereo: Bool = true
    ) {
        self.gain = gain
        self.pan = pan
        self.stereo = stereo
    }

    /// Default mix target (center, unity gain, stereo)
    public static let `default` = MixTarget(gain: 0.0, pan: 0.0, stereo: true)
}

// =============================================================================
// MARK: - Validation Result
// =============================================================================

/**
 Result of schema validation
 */
public struct PerformanceValidationResult: Sendable {
    public let isValid: Bool
    public let errors: [String]

    public init(isValid: Bool, errors: [String]) {
        self.isValid = isValid
        self.errors = errors
    }
}
