//
//  SongOrderContract.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Song Order Contract
// =============================================================================

/**
 SongOrderContract - High-level user-facing contract for ordering songs

 This is a simplified, user-facing model that represents the "Order Song" UI.
 It maps to the more complex SongContractV1 (Schillinger systems) but presents
 a much simpler interface for users.

 The Order Song UI allows users to express musical intent without needing
 to understand Schillinger theory directly.
 */
public struct SongOrderContract: Equatable, Codable, Sendable, Identifiable {

    // MARK: - Identity

    /**
     Unique identifier for this contract
     */
    public var id: String

    /**
     Human-readable name for this song order
     */
    public var name: String

    /**
     Optional description
     */
    public var description: String?

    // MARK: - Musical Intent

    /**
     What is this song for?
     */
    public var intent: Intent

    /**
     How does the music move?
     */
    public var motion: Motion

    /**
     How does harmony behave?
     */
    public var harmonicBehavior: HarmonicBehavior

    /**
     How predictable is the music?
     */
    public var certainty: Double // 0.0 (certain) to 1.0 (volatile)

    // MARK: - Identity Locks

    /**
     Which musical elements are locked?
     */
    public var identityLocks: IdentityLocks

    // MARK: - Evolution

    /**
     How does the song evolve over time?
     */
    public var evolutionMode: EvolutionMode

    // MARK: - Timestamps

    /**
     When this contract was created
     */
    public var createdAt: Date

    /**
     When this contract was last modified
     */
    public var updatedAt: Date

    // MARK: - Initialization

    public init(
        id: String = UUID().uuidString,
        name: String,
        description: String? = nil,
        intent: Intent,
        motion: Motion,
        harmonicBehavior: HarmonicBehavior,
        certainty: Double,
        identityLocks: IdentityLocks = IdentityLocks(),
        evolutionMode: EvolutionMode,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.intent = intent
        self.motion = motion
        self.harmonicBehavior = harmonicBehavior
        self.certainty = certainty
        self.identityLocks = identityLocks
        self.evolutionMode = evolutionMode
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // MARK: - Validation

    /**
     Validate the contract
     */
    public func validate() -> SongOrderValidationResult {
        var errors: [String] = []

        // Name validation
        if name.trimmingCharacters(in: .whitespaces).isEmpty {
            errors.append("Name cannot be empty")
        }

        // Certainty validation
        if certainty < 0.0 || certainty > 1.0 {
            errors.append("Certainty must be between 0.0 and 1.0")
        }

        return SongOrderValidationResult(
            isValid: errors.isEmpty,
            errors: errors
        )
    }
}

// =============================================================================
// MARK: - Intent
// =============================================================================

/**
 What is the song's purpose?
 */
public enum Intent: String, Equatable, Codable, Sendable, CaseIterable {
    case identity
    case song
    case cue
    case ritual
    case loop

    /**
     Display name for UI
     */
    public var displayName: String {
        switch self {
        case .identity: return "Identity"
        case .song: return "Song"
        case .cue: return "Cue"
        case .ritual: return "Ritual"
        case .loop: return "Loop"
        }
    }

    /**
     Detailed description
     */
    public var description: String {
        switch self {
        case .identity: return "Establishes a musical identity or character"
        case .song: return "Complete standalone composition"
        case .cue: return "Short dramatic cue for media"
        case .ritual: return "Ceremonial or ritual music"
        case .loop: return "Seamless looping background"
        }
    }
}

// =============================================================================
// MARK: - Motion
// =============================================================================

/**
 How does the music move through time?
 */
public enum Motion: String, Equatable, Codable, Sendable, CaseIterable {
    case `static`
    case accelerating
    case oscillating
    case colliding
    case dissolving

    /**
     Display name for UI
     */
    public var displayName: String {
        switch self {
        case .static: return "Static"
        case .accelerating: return "Accelerating"
        case .oscillating: return "Oscillating"
        case .colliding: return "Colliding"
        case .dissolving: return "Dissolving"
        }
    }

    /**
     Detailed description
     */
    public var description: String {
        switch self {
        case .static: return "Stable, unchanging motion"
        case .accelerating: return "Gradually increases in intensity"
        case .oscillating: return "Swings back and forth"
        case .colliding: return "Contrasting elements clash"
        case .dissolving: return "Gradually breaks down"
        }
    }
}

// =============================================================================
// MARK: - Harmonic Behavior
// =============================================================================

/**
 How does harmony behave?
 */
public enum HarmonicBehavior: String, Equatable, Codable, Sendable, CaseIterable {
    case `static`
    case revealed
    case cyclic
    case expanding
    case collapsing

    /**
     Display name for UI
     */
    public var displayName: String {
        switch self {
        case .static: return "Static"
        case .revealed: return "Revealed"
        case .cyclic: return "Cyclic"
        case .expanding: return "Expanding"
        case .collapsing: return "Collapsing"
        }
    }

    /**
     Detailed description
     */
    public var description: String {
        switch self {
        case .static: return "Harmony stays stable"
        case .revealed: return "Harmony unfolds gradually"
        case .cyclic: return "Repeating harmonic patterns"
        case .expanding: return "Harmonic vocabulary grows"
        case .collapsing: return "Harmony simplifies over time"
        }
    }
}

// =============================================================================
// MARK: - Identity Locks
// =============================================================================

/**
 Which musical elements should stay consistent?
 */
public struct IdentityLocks: Equatable, Codable, Sendable {

    /**
     Lock rhythm patterns
     */
    public var rhythm: Bool

    /**
     Lock pitch patterns
     */
    public var pitch: Bool

    /**
     Lock form structure
     */
    public var form: Bool

    public init(
        rhythm: Bool = false,
        pitch: Bool = false,
        form: Bool = false
    ) {
        self.rhythm = rhythm
        self.pitch = pitch
        self.form = form
    }
}

// =============================================================================
// MARK: - Evolution Mode
// =============================================================================

/**
 How does the song evolve over multiple plays?
 */
public enum EvolutionMode: String, Equatable, Codable, Sendable, CaseIterable {
    case fixed
    case adaptive
    case living
    case museum

    /**
     Display name for UI
     */
    public var displayName: String {
        switch self {
        case .fixed: return "Fixed"
        case .adaptive: return "Adaptive"
        case .living: return "Living"
        case .museum: return "Museum"
        }
    }

    /**
     Detailed description
     */
    public var description: String {
        switch self {
        case .fixed: return "Same playback every time"
        case .adaptive: return "Subtle variations within bounds"
        case .living: return "Aggressive evolution and growth"
        case .museum: return "Minimal variation, highly predictable"
        }
    }

    /**
     Whether this mode allows evolution
     */
    public var allowsEvolution: Bool {
        switch self {
        case .fixed: return false
        case .adaptive: return true
        case .living: return true
        case .museum: return false
        }
    }
}

// =============================================================================
// MARK: - ValidationResult
// =============================================================================

/**
 Result of contract validation
 */
public struct SongOrderValidationResult: Equatable, Sendable {
    public var isValid: Bool
    public var errors: [String]
}

// =============================================================================
// MARK: - Preset Templates
// =============================================================================

/**
 Common preset templates for SongOrderContract
 */
public enum SongOrderTemplate: String, CaseIterable {
    case hboCue
    case ambientLoop
    case ritualCollage
    case performancePiece

    /**
     Create a SongOrderContract from this template
     */
    public func createContract(name: String) -> SongOrderContract {
        switch self {
        case .hboCue:
            return SongOrderContract(
                name: name,
                description: "HBO-style dramatic cue",
                intent: .cue,
                motion: .accelerating,
                harmonicBehavior: .revealed,
                certainty: 0.6, // tense
                identityLocks: IdentityLocks(rhythm: true, pitch: false, form: true),
                evolutionMode: .adaptive
            )

        case .ambientLoop:
            return SongOrderContract(
                name: name,
                description: "Ambient looping texture",
                intent: .loop,
                motion: .oscillating,
                harmonicBehavior: .static,
                certainty: 0.0, // certain
                identityLocks: IdentityLocks(rhythm: true, pitch: true, form: true),
                evolutionMode: .museum
            )

        case .ritualCollage:
            return SongOrderContract(
                name: name,
                description: "Ritualistic collage",
                intent: .ritual,
                motion: .colliding,
                harmonicBehavior: .expanding,
                certainty: 1.0, // volatile
                identityLocks: IdentityLocks(rhythm: false, pitch: false, form: false),
                evolutionMode: .living
            )

        case .performancePiece:
            return SongOrderContract(
                name: name,
                description: "Formal performance piece",
                intent: .song,
                motion: .static,
                harmonicBehavior: .cyclic,
                certainty: 0.0, // certain
                identityLocks: IdentityLocks(rhythm: true, pitch: true, form: true),
                evolutionMode: .fixed
            )
        }
    }

    /**
     Template display name
     */
    public var displayName: String {
        switch self {
        case .hboCue: return "HBO Cue"
        case .ambientLoop: return "Ambient Loop"
        case .ritualCollage: return "Ritual Collage"
        case .performancePiece: return "Performance Piece"
        }
    }

    /**
     Template description
     */
    public var description: String {
        switch self {
        case .hboCue: return "Tense, accelerating dramatic cue"
        case .ambientLoop: return "Certain, oscillating ambient"
        case .ritualCollage: return "Volatile, colliding ritual"
        case .performancePiece: return "Fixed, certain composition"
        }
    }
}
