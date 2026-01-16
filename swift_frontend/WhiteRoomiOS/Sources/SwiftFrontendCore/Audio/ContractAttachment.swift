//
//  ContractAttachment.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Contract Attachment
// =============================================================================

/**
 Manages attachment between SongOrderContract and Schillinger generators.

 This system allows users to:
 - **Attach**: Let SongContract parameters drive generator selection automatically
 - **Detach**: Manually override specific generator parameters

 Per-parameter attachment control:
 - intentAttached: SongContract.intent drives generator type selection
 - motionAttached: SongContract.motion drives rhythm generators (accelerating → interference resultants)
 - harmonyAttached: SongContract.harmonicBehavior drives pitch generators (expanding → expanding pitch fields)
 - certaintyAttached: SongContract.certainty drives transformation intensity

 Visual indicators:
 - Lock icon (🔒) when attached
 - Unlock icon (🔓) when detached
 */
public struct ContractAttachment: Equatable, Codable, Sendable {

    // MARK: - Attachment State

    /**
     Whether intent is attached to contract

     When attached: intent drives generator type selection
     When detached: user can manually specify generator type
     */
    public var intentAttached: Bool

    /**
     Whether motion is attached to contract

     When attached: motion drives rhythm generators
     - accelerating → interference resultants
     - oscillating → periodic patterns
     - colliding → syncopated resultants
     - dissolving → diminishing patterns
     - static → fixed rhythm

     When detached: user can manually set rhythm parameters
     */
    public var motionAttached: Bool

    /**
     Whether harmony is attached to contract

     When attached: harmonicBehavior drives pitch generators
     - expanding → expanding pitch fields
     - revealed → gradual harmonic unfolding
     - cyclic → repeating harmonic patterns
     - collapsing → simplifying harmony
     - static → fixed harmony

     When detached: user can manually set pitch parameters
     */
    public var harmonyAttached: Bool

    /**
     Whether certainty is attached to contract

     When attached: certainty drives transformation intensity
     - 0.0 (certain) → minimal transformations
     - 0.5 (tense) → moderate transformations
     - 1.0 (volatile) → aggressive transformations

     When detached: user can manually set transformation intensity
     */
    public var certaintyAttached: Bool

    // MARK: - Initialization

    /**
     Create a new attachment state

     Default: all parameters attached (full automatic mode)
     */
    public init(
        intentAttached: Bool = true,
        motionAttached: Bool = true,
        harmonyAttached: Bool = true,
        certaintyAttached: Bool = true
    ) {
        self.intentAttached = intentAttached
        self.motionAttached = motionAttached
        self.harmonyAttached = harmonyAttached
        self.certaintyAttached = certaintyAttached
    }

    /**
     All parameters attached (fully automatic mode)
     */
    public static func fullyAttached() -> ContractAttachment {
        ContractAttachment(
            intentAttached: true,
            motionAttached: true,
            harmonyAttached: true,
            certaintyAttached: true
        )
    }

    /**
     All parameters detached (fully manual mode)
     */
    public static func fullyDetached() -> ContractAttachment {
        ContractAttachment(
            intentAttached: false,
            motionAttached: false,
            harmonyAttached: false,
            certaintyAttached: false
        )
    }

    // MARK: - Per-Parameter Detach

    /**
     Detach a specific parameter

     Example:
     ```
     let attachment = ContractAttachment()
     let newAttachment = attachment.detach(parameter: .motion)
     // Now motion is detached, others still attached
     ```
     */
    public func detach(parameter: GeneratorParameter) -> ContractAttachment {
        switch parameter {
        case .intent:
            return ContractAttachment(
                intentAttached: false,
                motionAttached: motionAttached,
                harmonyAttached: harmonyAttached,
                certaintyAttached: certaintyAttached
            )
        case .motion:
            return ContractAttachment(
                intentAttached: intentAttached,
                motionAttached: false,
                harmonyAttached: harmonyAttached,
                certaintyAttached: certaintyAttached
            )
        case .harmony:
            return ContractAttachment(
                intentAttached: intentAttached,
                motionAttached: motionAttached,
                harmonyAttached: false,
                certaintyAttached: certaintyAttached
            )
        case .certainty:
            return ContractAttachment(
                intentAttached: intentAttached,
                motionAttached: motionAttached,
                harmonyAttached: harmonyAttached,
                certaintyAttached: false
            )
        }
    }

    /**
     Attach a specific parameter
     */
    public func attach(parameter: GeneratorParameter) -> ContractAttachment {
        switch parameter {
        case .intent:
            return ContractAttachment(
                intentAttached: true,
                motionAttached: motionAttached,
                harmonyAttached: harmonyAttached,
                certaintyAttached: certaintyAttached
            )
        case .motion:
            return ContractAttachment(
                intentAttached: intentAttached,
                motionAttached: true,
                harmonyAttached: harmonyAttached,
                certaintyAttached: certaintyAttached
            )
        case .harmony:
            return ContractAttachment(
                intentAttached: intentAttached,
                motionAttached: motionAttached,
                harmonyAttached: true,
                certaintyAttached: certaintyAttached
            )
        case .certainty:
            return ContractAttachment(
                intentAttached: intentAttached,
                motionAttached: motionAttached,
                harmonyAttached: harmonyAttached,
                certaintyAttached: true
            )
        }
    }

    /**
     Toggle a parameter's attachment state
     */
    public func toggle(parameter: GeneratorParameter) -> ContractAttachment {
        switch parameter {
        case .intent:
            return ContractAttachment(
                intentAttached: !intentAttached,
                motionAttached: motionAttached,
                harmonyAttached: harmonyAttached,
                certaintyAttached: certaintyAttached
            )
        case .motion:
            return ContractAttachment(
                intentAttached: intentAttached,
                motionAttached: !motionAttached,
                harmonyAttached: harmonyAttached,
                certaintyAttached: certaintyAttached
            )
        case .harmony:
            return ContractAttachment(
                intentAttached: intentAttached,
                motionAttached: motionAttached,
                harmonyAttached: !harmonyAttached,
                certaintyAttached: certaintyAttached
            )
        case .certainty:
            return ContractAttachment(
                intentAttached: intentAttached,
                motionAttached: motionAttached,
                harmonyAttached: harmonyAttached,
                certaintyAttached: !certaintyAttached
            )
        }
    }

    // MARK: - Apply to Generators

    /**
     Apply contract parameters to Schillinger generators

     This method:
     1. Checks attachment state for each parameter
     2. Applies contract parameters only to attached generators
     3. Preserves manual settings for detached parameters
     4. Returns updated generator configuration

     Example:
     ```
     let attachment = ContractAttachment(motionAttached: true, harmonyAttached: false)
     let generators = attachment.apply(
         to: existingGenerators,
         contract: songContract
     )
     // generators.rhythm will be updated from contract.motion
     // generators.pitch will preserve manual settings
     ```
     */
    public func apply(
        to generators: SchillingerGenerators,
        contract: SongOrderContract
    ) -> SchillingerGenerators {
        var updated = generators

        // Apply intent if attached
        if intentAttached {
            updated = applyIntent(to: updated, contract: contract)
        }

        // Apply motion if attached
        if motionAttached {
            updated = applyMotion(to: updated, contract: contract)
        }

        // Apply harmony if attached
        if harmonyAttached {
            updated = applyHarmony(to: updated, contract: contract)
        }

        // Apply certainty if attached
        if certaintyAttached {
            updated = applyCertainty(to: updated, contract: contract)
        }

        return updated
    }

    // MARK: - Private Apply Methods

    /**
     Apply intent to generators
     */
    private func applyIntent(
        to generators: SchillingerGenerators,
        contract: SongOrderContract
    ) -> SchillingerGenerators {
        var updated = generators

        // Intent drives overall generator type selection
        switch contract.intent {
        case .identity:
            // Identity: focus on establishing character
            updated.rhythm.generatorType = .periodic
            updated.pitch.generatorType = .diatonic
            updated.form.structureType = .strophic

        case .song:
            // Song: balanced, complete composition
            updated.rhythm.generatorType = .resultant
            updated.pitch.generatorType = .chromatic
            updated.form.structureType = .arch

        case .cue:
            // Cue: dramatic, focused
            updated.rhythm.generatorType = .interference
            updated.pitch.generatorType = .expanding
            updated.form.structureType = .climactic

        case .ritual:
            // Ritual: ceremonial, repeating
            updated.rhythm.generatorType = .cyclic
            updated.pitch.generatorType = .modal
            updated.form.structureType = .ritornello

        case .loop:
            // Loop: seamless, static
            updated.rhythm.generatorType = .`static`
            updated.pitch.generatorType = .`static`
            updated.form.structureType = .loop
        }

        return updated
    }

    /**
     Apply motion to rhythm generators
     */
    private func applyMotion(
        to generators: SchillingerGenerators,
        contract: SongOrderContract
    ) -> SchillingerGenerators {
        var updated = generators
        let rhythm = generators.rhythm

        switch contract.motion {
        case .static:
            // Static: fixed rhythm, minimal variation
            updated.rhythm = RhythmGenerator(
                generatorType: .`static`,
                pulseStreams: rhythm.pulseStreams,
                resultantGenerators: rhythm.resultantGenerators,
                syncopation: 0.0,
                acceleration: 0.0
            )

        case .accelerating:
            // Accelerating: interference resultants with buildup
            updated.rhythm = RhythmGenerator(
                generatorType: .interference,
                pulseStreams: rhythm.pulseStreams,
                resultantGenerators: ResultantTuple(3, 2), // Classic accelerating resultant
                syncopation: 0.3,
                acceleration: 0.7
            )

        case .oscillating:
            // Oscillating: periodic patterns with swing
            updated.rhythm = RhythmGenerator(
                generatorType: .periodic,
                pulseStreams: [2, 3],
                resultantGenerators: nil,
                syncopation: 0.5,
                acceleration: 0.0
            )

        case .colliding:
            // Colliding: syncopated resultants
            updated.rhythm = RhythmGenerator(
                generatorType: .interference,
                pulseStreams: [5, 7],
                resultantGenerators: ResultantTuple(5, 7), // Complex syncopation
                syncopation: 0.8,
                acceleration: 0.3
            )

        case .dissolving:
            // Dissolving: diminishing patterns
            updated.rhythm = RhythmGenerator(
                generatorType: .resultant,
                pulseStreams: rhythm.pulseStreams,
                resultantGenerators: ResultantTuple(4, 3),
                syncopation: 0.2,
                acceleration: -0.5 // Decelerating
            )
        }

        return updated
    }

    /**
     Apply harmony to pitch generators
     */
    private func applyHarmony(
        to generators: SchillingerGenerators,
        contract: SongOrderContract
    ) -> SchillingerGenerators {
        var updated = generators
        let pitch = generators.pitch

        switch contract.harmonicBehavior {
        case .static:
            // Static: fixed harmony
            updated.pitch = PitchGenerator(
                generatorType: .`static`,
                pitchFields: [],
                expansionRate: 0.0,
                chromaticism: 0.0
            )

        case .revealed:
            // Revealed: gradual harmonic unfolding
            updated.pitch = PitchGenerator(
                generatorType: .diatonic,
                pitchFields: [1, 2, 3], // Expand gradually
                expansionRate: 0.3,
                chromaticism: 0.2
            )

        case .cyclic:
            // Cyclic: repeating harmonic patterns
            updated.pitch = PitchGenerator(
                generatorType: .modal,
                pitchFields: [1, 2, 3, 4],
                expansionRate: 0.0, // No expansion
                chromaticism: 0.1
            )

        case .expanding:
            // Expanding: harmonic vocabulary grows
            updated.pitch = PitchGenerator(
                generatorType: .expanding,
                pitchFields: [1, 2, 3, 4, 5, 6, 7, 8], // Full expansion
                expansionRate: 0.8,
                chromaticism: 0.6
            )

        case .collapsing:
            // Collapsing: harmony simplifies
            updated.pitch = PitchGenerator(
                generatorType: .diatonic,
                pitchFields: [8, 7, 6, 5, 4, 3, 2, 1], // Contracting
                expansionRate: -0.5,
                chromaticism: -0.3
            )
        }

        return updated
    }

    /**
     Apply certainty to transformation intensity
     */
    private func applyCertainty(
        to generators: SchillingerGenerators,
        contract: SongOrderContract
    ) -> SchillingerGenerators {
        var updated = generators

        // Certainty drives transformation intensity
        // 0.0 = certain (minimal transformations)
        // 0.5 = tense (moderate transformations)
        // 1.0 = volatile (aggressive transformations)

        updated.transformIntensity = contract.certainty

        return updated
    }

    // MARK: - Visual Indicators

    /**
     Get icon for attachment state

     Returns lock icon (🔒) for attached, unlock icon (🔓) for detached
     */
    public func icon(for parameter: GeneratorParameter) -> String {
        switch parameter {
        case .intent:
            return intentAttached ? "🔒" : "🔓"
        case .motion:
            return motionAttached ? "🔒" : "🔓"
        case .harmony:
            return harmonyAttached ? "🔒" : "🔓"
        case .certainty:
            return certaintyAttached ? "🔒" : "🔓"
        }
    }

    /**
     Check if all parameters are attached
     */
    public var isFullyAttached: Bool {
        intentAttached && motionAttached && harmonyAttached && certaintyAttached
    }

    /**
     Check if all parameters are detached
     */
    public var isFullyDetached: Bool {
        !intentAttached && !motionAttached && !harmonyAttached && !certaintyAttached
    }
}

// =============================================================================
// MARK: - Generator Parameter
// =============================================================================

/**
 Generator parameters that can be attached/detached
 */
public enum GeneratorParameter: String, Equatable, Codable, Sendable, CaseIterable {
    case intent
    case motion
    case harmony
    case certainty

    /**
     Display name for UI
     */
    public var displayName: String {
        switch self {
        case .intent: return "Intent"
        case .motion: return "Motion"
        case .harmony: return "Harmony"
        case .certainty: return "Certainty"
        }
    }

    /**
     Detailed description
     */
    public var description: String {
        switch self {
        case .intent:
            return "Controls overall generator type selection based on song purpose"
        case .motion:
            return "Controls rhythm generators (accelerating → interference resultants)"
        case .harmony:
            return "Controls pitch generators (expanding → expanding pitch fields)"
        case .certainty:
            return "Controls transformation intensity (certain → volatile)"
        }
    }
}

// =============================================================================
// MARK: - Schillinger Generators
// =============================================================================

/**
 Complete Schillinger generator configuration

 This struct represents all generator parameters that can be driven
 by SongOrderContract or set manually.
 */
public struct SchillingerGenerators: Equatable, Codable, Sendable {

    // MARK: - Rhythm Generators

    /**
     Rhythm generator configuration
     */
    public var rhythm: RhythmGenerator

    // MARK: - Pitch Generators

    /**
     Pitch generator configuration
     */
    public var pitch: PitchGenerator

    // MARK: - Form Structure

    /**
     Form structure configuration
     */
    public var form: FormGenerator

    // MARK: - Transformation

    /**
     Overall transformation intensity
     - 0.0: minimal transformations (certain)
     - 0.5: moderate transformations (tense)
     - 1.0: aggressive transformations (volatile)
     */
    public var transformIntensity: Double

    // MARK: - Initialization

    public init(
        rhythm: RhythmGenerator = RhythmGenerator(),
        pitch: PitchGenerator = PitchGenerator(),
        form: FormGenerator = FormGenerator(),
        transformIntensity: Double = 0.0
    ) {
        self.rhythm = rhythm
        self.pitch = pitch
        self.form = form
        self.transformIntensity = transformIntensity
    }

    /**
     Default generators (all static)
     */
    public static func `default`() -> SchillingerGenerators {
        SchillingerGenerators(
            rhythm: RhythmGenerator(),
            pitch: PitchGenerator(),
            form: FormGenerator(),
            transformIntensity: 0.0
        )
    }
}

// =============================================================================
// MARK: - Rhythm Generator
// =============================================================================

/**
 Tuple wrapper for resultant generators (to support Codable)
 */
public struct ResultantTuple: Equatable, Codable, Sendable {
    public let first: Int
    public let second: Int

    public init(_ first: Int, _ second: Int) {
        self.first = first
        self.second = second
    }

    public init(tuple: (Int, Int)) {
        self.first = tuple.0
        self.second = tuple.1
    }

    public func toTuple() -> (Int, Int) {
        (first, second)
    }
}

/**
 Rhythm generator configuration
 */
public struct RhythmGenerator: Equatable, Codable, Sendable {

    /**
     Generator type
     */
    public enum GeneratorType: String, Equatable, Codable, Sendable {
        case `static`
        case periodic
        case resultant
        case interference
        case cyclic
    }

    /**
     Type of rhythm generator
     */
    public var generatorType: GeneratorType

    /**
     Pulse streams (for periodic and cyclic generators)
     */
    public var pulseStreams: [Int]

    /**
     Resultant generators (for resultant and interference)
     */
    public var resultantGenerators: ResultantTuple?

    /**
     Syncopation level (0.0 to 1.0)
     */
    public var syncopation: Double

    /**
     Acceleration rate (-1.0 to 1.0)
     - Negative: decelerating
     - 0.0: static tempo
     - Positive: accelerating
     */
    public var acceleration: Double

    public init(
        generatorType: GeneratorType = .static,
        pulseStreams: [Int] = [],
        resultantGenerators: ResultantTuple? = nil,
        syncopation: Double = 0.0,
        acceleration: Double = 0.0
    ) {
        self.generatorType = generatorType
        self.pulseStreams = pulseStreams
        self.resultantGenerators = resultantGenerators
        self.syncopation = syncopation
        self.acceleration = acceleration
    }
}

// =============================================================================
// MARK: - Pitch Generator
// =============================================================================

/**
 Pitch generator configuration
 */
public struct PitchGenerator: Equatable, Codable, Sendable {

    /**
     Generator type
     */
    public enum GeneratorType: String, Equatable, Codable, Sendable {
        case `static`
        case diatonic
        case chromatic
        case modal
        case expanding
    }

    /**
     Type of pitch generator
     */
    public var generatorType: GeneratorType

    /**
     Pitch fields (for expanding generators)
     */
    public var pitchFields: [Int]

    /**
     Expansion rate (-1.0 to 1.0)
     - Negative: collapsing
     - 0.0: static
     - Positive: expanding
     */
    public var expansionRate: Double

    /**
     Chromaticism level (0.0 to 1.0)
     - 0.0: diatonic
     - 1.0: fully chromatic
     */
    public var chromaticism: Double

    public init(
        generatorType: GeneratorType = .static,
        pitchFields: [Int] = [],
        expansionRate: Double = 0.0,
        chromaticism: Double = 0.0
    ) {
        self.generatorType = generatorType
        self.pitchFields = pitchFields
        self.expansionRate = expansionRate
        self.chromaticism = chromaticism
    }
}

// =============================================================================
// MARK: - Form Generator
// =============================================================================

/**
 Form structure generator configuration
 */
public struct FormGenerator: Equatable, Codable, Sendable {

    /**
     Form structure type
     */
    public enum StructureType: String, Equatable, Codable, Sendable {
        case strophic
        case arch
        case climactic
        case ritornello
        case loop
    }

    /**
     Type of form structure
     */
    public var structureType: StructureType

    /**
     Number of sections
     */
    public var sectionCount: Int

    /**
     Repetition factor (0.0 to 1.0)
     */
    public var repetition: Double

    public init(
        structureType: StructureType = .strophic,
        sectionCount: Int = 3,
        repetition: Double = 0.5
    ) {
        self.structureType = structureType
        self.sectionCount = sectionCount
        self.repetition = repetition
    }
}
