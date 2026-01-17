//
//  MusicalModels.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//
//  Canonical models for musical concepts shared across all modules
//  This file contains the authoritative definitions for TimeSignature,
//  TransportState, and other core musical types.

import Foundation

// =============================================================================
// MARK: - Time Signature
// =============================================================================

/**
 Time signature representation

 This is the canonical TimeSignature model used across all modules.
 All other TimeSignature definitions should be removed in favor of this one.

 ## Usage
 ```swift
 let ts = TimeSignature(numerator: 4, denominator: 4)
 let threeFour = TimeSignature.threeFour
 ```
 */
public struct TimeSignature: Codable, Equatable, Hashable, Sendable {
    public let numerator: Int
    public let denominator: Int

    public init(numerator: Int, denominator: Int) {
        self.numerator = numerator
        self.denominator = denominator
    }

    // MARK: - Common Time Signatures

    /// 4/4 time
    public static let fourFour = TimeSignature(numerator: 4, denominator: 4)

    /// 3/4 time
    public static let threeFour = TimeSignature(numerator: 3, denominator: 4)

    /// 6/8 time
    public static let sixEight = TimeSignature(numerator: 6, denominator: 8)

    /// 2/4 time
    public static let twoFour = TimeSignature(numerator: 2, denominator: 4)

    /// Cut time (2/2)
    public static let cutTime = TimeSignature(numerator: 2, denominator: 2)

    // MARK: - Computed Properties

    /// Display string representation (e.g., "4/4")
    public var displayName: String {
        "\(numerator)/\(denominator)"
    }

    /// Tuple conversion for FFI compatibility
    public var tuple: (Int, Int) {
        (numerator, denominator)
    }

    /// Validate that this is a musically valid time signature
    public var isValid: Bool {
        // Denominator must be a power of 2 (1, 2, 4, 8, 16, 32, 64)
        let validDenominators = [1, 2, 4, 8, 16, 32, 64]
        return numerator > 0 && validDenominators.contains(denominator)
    }
}

// =============================================================================
// MARK: - Time Signature Change
// =============================================================================

/**
 Time signature change event

 Represents a time signature change at a specific position in a song.
 Used in tempo/time signature maps and performance state.
 */
public struct TimeSignatureChange: Codable, Equatable, Hashable, Sendable {
    /// Beat position where this change occurs
    public let beatPosition: Double

    /// The new time signature
    public let timeSignature: TimeSignature

    public init(
        beatPosition: Double,
        timeSignature: TimeSignature
    ) {
        self.beatPosition = beatPosition
        self.timeSignature = timeSignature
    }

    /// Alternative initializer with numerator/denominator
    public init(
        beatPosition: Double,
        numerator: Int,
        denominator: Int
    ) {
        self.beatPosition = beatPosition
        self.timeSignature = TimeSignature(numerator: numerator, denominator: denominator)
    }
}

// =============================================================================
// MARK: - Transport State
// =============================================================================

/**
 Transport state enumeration

 This is the canonical TransportState used across all audio modules.
 Defines the playback state of the audio engine.
 */
public enum TransportState: Equatable, Codable, Sendable {
    case stopped
    case playing
    case paused
    case recording

    /// Display name for this transport state
    public var displayName: String {
        switch self {
        case .stopped: return "Stopped"
        case .playing: return "Playing"
        case .paused: return "Paused"
        case .recording: return "Recording"
        }
    }

    /// Whether audio is currently being produced
    public var isPlaying: Bool {
        switch self {
        case .playing, .recording: return true
        case .stopped, .paused: return false
        }
    }

    /// Whether the state allows seeking
    public var canSeek: Bool {
        switch self {
        case .stopped, .paused: return true
        case .playing, .recording: return false
        }
    }
}

// =============================================================================
// MARK: - Tempo Change
// =============================================================================

/**
 Tempo change event

 Represents a tempo change at a specific position in a song.
 Supports immediate and gradual transitions.
 */
public struct TempoChange: Codable, Equatable, Hashable, Sendable {
    /// Beat position where this change occurs
    public let beatPosition: Double

    /// New tempo in beats per minute
    public let tempo: Double

    /// How the tempo change should be applied
    public let transition: TempoTransition

    public init(
        beatPosition: Double,
        tempo: Double,
        transition: TempoTransition = .immediate
    ) {
        self.beatPosition = beatPosition
        self.tempo = tempo
        self.transition = transition
    }
}

/**
 Tempo transition type
 */
public enum TempoTransition: String, Codable, Sendable {
    case immediate
    case ramp
    case gradual
}

// =============================================================================
// MARK: - Validation Result
// =============================================================================

/**
 Generic validation result for model validation

 Used when validating models, configurations, or deployments.
 */
public struct GenericValidationResult: Sendable {
    public let isValid: Bool
    public let errors: [String]
    public let warnings: [String]

    public init(
        isValid: Bool,
        errors: [String] = [],
        warnings: [String] = []
    ) {
        self.isValid = isValid
        self.errors = errors
        self.warnings = warnings
    }

    /// Convenience initializer for success
    public static var valid: GenericValidationResult {
        GenericValidationResult(isValid: true, errors: [], warnings: [])
    }

    /// Convenience initializer for single error
    public static func error(_ message: String) -> GenericValidationResult {
        GenericValidationResult(isValid: false, errors: [message], warnings: [])
    }

    /// Convenience initializer for multiple errors
    public static func errors(_ messages: [String]) -> GenericValidationResult {
        GenericValidationResult(isValid: false, errors: messages, warnings: [])
    }
}

