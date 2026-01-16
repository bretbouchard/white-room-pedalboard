//
//  DefaultPerformances.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Default Performance Palette
// =============================================================================

/**
 Default performance states for common arrangement styles.

 These are the "parallel universes" - the same Song realized in different ways.
 Each performance is a complete, valid interpretation that can be instantly
 switched without re-projection.

 Philosophy: Every performance should be "music out of the box" - no additional
 configuration needed to get a pleasing result.
 */
public struct DefaultPerformances {

    // =============================================================================
    // MARK: - Role Constants
    // =============================================================================

    /**
     Standard role names used across all performances
     */
    private enum Role {
        static let foundation = "foundation"
        static let voice = "voice"
        static let pulse = "pulse"
        static let texture = "texture"
        static let soprano = "soprano"
        static let alto = "alto"
        static let tenor = "tenor"
        static let bass = "bass"
        static let piano = "piano"
        static let guitar = "guitar"
        static let bassGuitar = "bass_guitar"
        static let drums = "drums"
        static let violin1 = "violin1"
        static let violin2 = "violin2"
        static let viola = "viola"
        static let cello = "cello"
    }

    /**
     Standard instrument IDs
     */
    private enum Instrument {
        static let piano = "LocalGal"
        static let synth = "NexSynth"
        static let sampler = "SamSampler"
        static let drums = "DrumMachine"
    }

    // =============================================================================
    // MARK: - Helper Methods
    // =============================================================================

    /**
     Generate a UUID for a performance
     */
    private static func generateUUID() -> String {
        UUID().uuidString
    }

    /**
     Create instrument assignment
     */
    private static func instrument(_ id: String, preset: String? = nil) -> PerformanceInstrumentAssignment {
        PerformanceInstrumentAssignment(instrumentId: id, presetId: preset)
    }

    /**
     Create mix target
     */
    private static func mix(gain: Double, pan: Double = 0.0, stereo: Bool = true) -> MixTarget {
        MixTarget(gain: gain, pan: pan, stereo: stereo)
    }

    // =============================================================================
    // MARK: - Solo Piano
    // =============================================================================

    /**
     Solo Piano - Intimate, sparse arrangement

     Density: 0.35 (sparse, breathing room)
     Roles: foundation, voice → piano
     Mix: Close, intimate, centered
     */
    public static func soloPiano() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "Solo Piano",
            arrangementStyle: .SOLO_PIANO,
            density: 0.35,
            grooveProfileId: "straight",
            instrumentationMap: [
                Role.foundation: instrument(Instrument.piano, preset: "concert_grand"),
                Role.voice: instrument(Instrument.piano, preset: "concert_grand")
            ],
            consoleXProfileId: "intimate",
            mixTargets: [
                Role.foundation: mix(gain: -3.0, pan: -0.15),
                Role.voice: mix(gain: 0.0, pan: 0.15)
            ],
            metadata: [
                "description": "Intimate solo piano arrangement",
                "genre": "classical",
                "mood": "introspective"
            ]
        )
    }

    // =============================================================================
    // MARK: - SATB Choir
    // =============================================================================

    /**
     SATB Choir - Traditional four-part harmony

     Density: 0.55 (moderate, choral texture)
     Roles: soprano, alto, tenor, bass → choir samples
     Mix: Balanced, reverberant, traditional spatial placement
     */
    public static func satb() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "SATB Choir",
            arrangementStyle: .SATB,
            density: 0.55,
            grooveProfileId: "straight",
            instrumentationMap: [
                Role.soprano: instrument(Instrument.sampler, preset: "choir_soprano"),
                Role.alto: instrument(Instrument.sampler, preset: "choir_alto"),
                Role.tenor: instrument(Instrument.sampler, preset: "choir_tenor"),
                Role.bass: instrument(Instrument.sampler, preset: "choir_bass")
            ],
            consoleXProfileId: "choral",
            mixTargets: [
                Role.soprano: mix(gain: -2.0, pan: -0.3),
                Role.alto: mix(gain: -2.0, pan: -0.1),
                Role.tenor: mix(gain: -2.0, pan: 0.1),
                Role.bass: mix(gain: -1.5, pan: 0.3)
            ],
            metadata: [
                "description": "Traditional four-part SATB choir",
                "genre": "choral",
                "mood": "reverent"
            ]
        )
    }

    // =============================================================================
    // MARK: - Ambient Techno
    // =============================================================================

    /**
     Ambient Techno - Electronic, atmospheric

     Density: 0.8 (dense, layered)
     Roles: pulse, foundation, texture, voice → various synths
     Mix: Wide stereo, atmospheric, pulsing
     */
    public static func ambientTechno() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "Ambient Techno",
            arrangementStyle: .AMBIENT_TECHNO,
            density: 0.8,
            grooveProfileId: "swing",
            instrumentationMap: [
                Role.pulse: instrument(Instrument.drums, preset: "ambient_kicks"),
                Role.foundation: instrument(Instrument.synth, preset: "warm_pad"),
                Role.texture: instrument(Instrument.synth, preset: "atmospheric"),
                Role.voice: instrument(Instrument.synth, preset: "lead_synth")
            ],
            consoleXProfileId: "electronic",
            mixTargets: [
                Role.pulse: mix(gain: -6.0, pan: 0.0),
                Role.foundation: mix(gain: -12.0, pan: 0.0),
                Role.texture: mix(gain: -15.0, pan: 0.0),
                Role.voice: mix(gain: -3.0, pan: 0.0)
            ],
            metadata: [
                "description": "Atmospheric electronic with layered synths",
                "genre": "electronic",
                "mood": "ethereal"
            ]
        )
    }

    // =============================================================================
    // MARK: - Jazz Combo
    // =============================================================================

    /**
     Jazz Combo - Small ensemble jazz

     Density: 0.6 (moderate, swinging)
     Roles: piano, bass, drums, foundation → jazz instruments
     Mix: Tight, dry, swing feel
     */
    public static func jazzCombo() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "Jazz Combo",
            arrangementStyle: .JAZZ_COMBO,
            density: 0.6,
            grooveProfileId: "swing",
            instrumentationMap: [
                Role.piano: instrument(Instrument.piano, preset: "jazz_piano"),
                Role.bassGuitar: instrument(Instrument.synth, preset: "acoustic_bass"),
                Role.drums: instrument(Instrument.drums, preset: "jazz_drums"),
                Role.foundation: instrument(Instrument.piano, preset: "jazz_piano")
            ],
            consoleXProfileId: "jazz",
            mixTargets: [
                Role.piano: mix(gain: -6.0, pan: -0.2),
                Role.bassGuitar: mix(gain: -3.0, pan: 0.3),
                Role.drums: mix(gain: -9.0, pan: 0.0),
                Role.foundation: mix(gain: -6.0, pan: -0.2)
            ],
            metadata: [
                "description": "Small jazz ensemble with swing feel",
                "genre": "jazz",
                "mood": "sophisticated"
            ]
        )
    }

    // =============================================================================
    // MARK: - Jazz Trio
    // =============================================================================

    /**
     Jazz Trio - Piano trio format

     Density: 0.5 (sparse, conversational)
     Roles: piano, bass, drums → jazz instruments
     Mix: Intimate, balanced, conversational
     */
    public static func jazzTrio() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "Jazz Trio",
            arrangementStyle: .JAZZ_TRIO,
            density: 0.5,
            grooveProfileId: "swing",
            instrumentationMap: [
                Role.piano: instrument(Instrument.piano, preset: "jazz_piano"),
                Role.bassGuitar: instrument(Instrument.synth, preset: "acoustic_bass"),
                Role.drums: instrument(Instrument.drums, preset: "brush_drums"),
                Role.voice: instrument(Instrument.piano, preset: "jazz_piano")
            ],
            consoleXProfileId: "jazz_trio",
            mixTargets: [
                Role.piano: mix(gain: -6.0, pan: -0.15),
                Role.bassGuitar: mix(gain: -4.0, pan: 0.25),
                Role.drums: mix(gain: -12.0, pan: 0.0),
                Role.voice: mix(gain: -3.0, pan: 0.15)
            ],
            metadata: [
                "description": "Intimate piano trio format",
                "genre": "jazz",
                "mood": "conversational"
            ]
        )
    }

    // =============================================================================
    // MARK: - Rock Band
    // =============================================================================

    /**
     Rock Band - Standard rock setup

     Density: 0.7 (driving, energetic)
     Roles: guitar, bass, drums, foundation → rock instruments
     Mix: Punchy, aggressive, wide
     */
    public static func rockBand() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "Rock Band",
            arrangementStyle: .ROCK_BAND,
            density: 0.7,
            grooveProfileId: "straight",
            instrumentationMap: [
                Role.guitar: instrument(Instrument.synth, preset: "distorted_guitar"),
                Role.bassGuitar: instrument(Instrument.synth, preset: "electric_bass"),
                Role.drums: instrument(Instrument.drums, preset: "rock_drums"),
                Role.foundation: instrument(Instrument.synth, preset: "power_chords"),
                Role.voice: instrument(Instrument.synth, preset: "lead_guitar")
            ],
            consoleXProfileId: "rock",
            mixTargets: [
                Role.guitar: mix(gain: -3.0, pan: -0.3),
                Role.bassGuitar: mix(gain: -6.0, pan: 0.3),
                Role.drums: mix(gain: -6.0, pan: 0.0),
                Role.foundation: mix(gain: -3.0, pan: 0.0),
                Role.voice: mix(gain: 0.0, pan: 0.0)
            ],
            metadata: [
                "description": "Standard rock band setup",
                "genre": "rock",
                "mood": "energetic"
            ]
        )
    }

    // =============================================================================
    // MARK: - Electronic
    // =============================================================================

    /**
     Electronic - Full electronic production

     Density: 0.85 (dense, layered)
     Roles: pulse, foundation, texture, voice → electronic elements
     Mix: Modern, punchy, wide stereo
     */
    public static func electronic() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "Electronic",
            arrangementStyle: .ELECTRONIC,
            density: 0.85,
            grooveProfileId: "straight",
            instrumentationMap: [
                Role.pulse: instrument(Instrument.drums, preset: "electronic_drums"),
                Role.foundation: instrument(Instrument.synth, preset: "bass_synth"),
                Role.texture: instrument(Instrument.synth, preset: "arpeggiator"),
                Role.voice: instrument(Instrument.synth, preset: "lead_synth"),
                Role.drums: instrument(Instrument.drums, preset: "hi_hats")
            ],
            consoleXProfileId: "electronic_full",
            mixTargets: [
                Role.pulse: mix(gain: -3.0, pan: 0.0),
                Role.foundation: mix(gain: -6.0, pan: 0.0),
                Role.texture: mix(gain: -12.0, pan: 0.0),
                Role.voice: mix(gain: 0.0, pan: 0.0),
                Role.drums: mix(gain: -9.0, pan: 0.0)
            ],
            metadata: [
                "description": "Full electronic production",
                "genre": "electronic",
                "mood": "modern"
            ]
        )
    }

    // =============================================================================
    // MARK: - A Cappella
    // =============================================================================

    /**
     A Cappella - Vocal-only arrangement

     Density: 0.6 (moderate, vocal texture)
     Roles: soprano, alto, tenor, bass, voice → vocal samples
     Mix: Vocal-focused, reverberant, balanced
     */
    public static func aCappella() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "A Cappella",
            arrangementStyle: .ACAPPELLA,
            density: 0.6,
            grooveProfileId: "straight",
            instrumentationMap: [
                Role.soprano: instrument(Instrument.sampler, preset: "vocal_soprano"),
                Role.alto: instrument(Instrument.sampler, preset: "vocal_alto"),
                Role.tenor: instrument(Instrument.sampler, preset: "vocal_tenor"),
                Role.bass: instrument(Instrument.sampler, preset: "vocal_bass"),
                Role.voice: instrument(Instrument.sampler, preset: "vocal_lead")
            ],
            consoleXProfileId: "vocal",
            mixTargets: [
                Role.soprano: mix(gain: -3.0, pan: -0.3),
                Role.alto: mix(gain: -3.0, pan: -0.1),
                Role.tenor: mix(gain: -3.0, pan: 0.1),
                Role.bass: mix(gain: -2.0, pan: 0.3),
                Role.voice: mix(gain: 0.0, pan: 0.0)
            ],
            metadata: [
                "description": "Vocal-only arrangement",
                "genre": "a cappella",
                "mood": "pure"
            ]
        )
    }

    // =============================================================================
    // MARK: - String Quartet
    // =============================================================================

    /**
     String Quartet - Classical chamber ensemble

     Density: 0.45 (sparse, intimate)
     Roles: violin1, violin2, viola, cello → string samples
     Mix: Intimate, balanced, traditional quartet placement
     */
    public static func stringQuartet() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "String Quartet",
            arrangementStyle: .STRING_QUARTET,
            density: 0.45,
            grooveProfileId: "straight",
            instrumentationMap: [
                Role.violin1: instrument(Instrument.sampler, preset: "violin_solo"),
                Role.violin2: instrument(Instrument.sampler, preset: "violin_solo"),
                Role.viola: instrument(Instrument.sampler, preset: "viola"),
                Role.cello: instrument(Instrument.sampler, preset: "cello"),
                Role.foundation: instrument(Instrument.sampler, preset: "cello"),
                Role.voice: instrument(Instrument.sampler, preset: "violin_solo")
            ],
            consoleXProfileId: "chamber",
            mixTargets: [
                Role.violin1: mix(gain: -3.0, pan: -0.4),
                Role.violin2: mix(gain: -3.0, pan: -0.2),
                Role.viola: mix(gain: -4.0, pan: 0.2),
                Role.cello: mix(gain: -2.0, pan: 0.4),
                Role.foundation: mix(gain: -2.0, pan: 0.4),
                Role.voice: mix(gain: 0.0, pan: -0.3)
            ],
            metadata: [
                "description": "Classical string quartet",
                "genre": "classical",
                "mood": "intimate"
            ]
        )
    }

    // =============================================================================
    // MARK: - Chamber Ensemble
    // =============================================================================

    /**
     Chamber Ensemble - Small classical ensemble

     Density: 0.5 (moderate, chamber texture)
     Roles: strings, winds, foundation → chamber instruments
     Mix: Balanced, clear, intimate
     */
    public static func chamberEnsemble() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "Chamber Ensemble",
            arrangementStyle: .CHAMBER_ENSEMBLE,
            density: 0.5,
            grooveProfileId: "straight",
            instrumentationMap: [
                Role.violin1: instrument(Instrument.sampler, preset: "violin_section"),
                Role.cello: instrument(Instrument.sampler, preset: "cello_section"),
                Role.foundation: instrument(Instrument.piano, preset: "chamber_piano"),
                Role.voice: instrument(Instrument.sampler, preset: "flute")
            ],
            consoleXProfileId: "chamber_small",
            mixTargets: [
                Role.violin1: mix(gain: -6.0, pan: -0.2),
                Role.cello: mix(gain: -6.0, pan: 0.2),
                Role.foundation: mix(gain: -9.0, pan: 0.0),
                Role.voice: mix(gain: -3.0, pan: 0.0)
            ],
            metadata: [
                "description": "Small chamber ensemble",
                "genre": "classical",
                "mood": "elegant"
            ]
        )
    }

    // =============================================================================
    // MARK: - Full Orchestra
    // =============================================================================

    /**
     Full Orchestra - Complete symphonic orchestra

     Density: 0.65 (moderate, full orchestral texture)
     Roles: all orchestral sections → full orchestra
     Mix: Grand, spacious, cinematic
     */
    public static func fullOrchestra() -> PerformanceState_v1 {
        PerformanceState_v1(
            id: generateUUID(),
            name: "Full Orchestra",
            arrangementStyle: .FULL_ORCHESTRA,
            density: 0.65,
            grooveProfileId: "straight",
            instrumentationMap: [
                Role.violin1: instrument(Instrument.sampler, preset: "orchestral_strings"),
                Role.cello: instrument(Instrument.sampler, preset: "orchestral_strings"),
                Role.foundation: instrument(Instrument.sampler, preset: "orchestral_brass"),
                Role.voice: instrument(Instrument.sampler, preset: "orchestral_woodwinds"),
                Role.texture: instrument(Instrument.sampler, preset: "orchestral_percussion")
            ],
            consoleXProfileId: "orchestral",
            mixTargets: [
                Role.violin1: mix(gain: -6.0, pan: -0.3),
                Role.cello: mix(gain: -6.0, pan: 0.3),
                Role.foundation: mix(gain: -9.0, pan: 0.0),
                Role.voice: mix(gain: -6.0, pan: 0.0),
                Role.texture: mix(gain: -12.0, pan: 0.0)
            ],
            metadata: [
                "description": "Complete symphonic orchestra",
                "genre": "orchestral",
                "mood": "grand"
            ]
        )
    }

    // =============================================================================
    // MARK: - All Performances
    // =============================================================================

    /**
     Get all default performances as an array

     Returns all predefined performance states in a consistent order.
     Useful for populating performance palettes or menus.
     */
    public static func allPerformances() -> [PerformanceState_v1] {
        [
            soloPiano(),
            satb(),
            ambientTechno(),
            jazzCombo(),
            jazzTrio(),
            rockBand(),
            electronic(),
            aCappella(),
            stringQuartet(),
            chamberEnsemble(),
            fullOrchestra()
        ]
    }

    /**
     Get default performance for a specific arrangement style

     - Parameter style: The arrangement style
     - Returns: The default performance for that style, or nil if not found
     */
    public static func performance(for style: ArrangementStyle) -> PerformanceState_v1? {
        switch style {
        case .SOLO_PIANO: return soloPiano()
        case .SATB: return satb()
        case .AMBIENT_TECHNO: return ambientTechno()
        case .JAZZ_COMBO: return jazzCombo()
        case .JAZZ_TRIO: return jazzTrio()
        case .ROCK_BAND: return rockBand()
        case .ELECTRONIC: return electronic()
        case .ACAPPELLA: return aCappella()
        case .STRING_QUARTET: return stringQuartet()
        case .CHAMBER_ENSEMBLE: return chamberEnsemble()
        case .FULL_ORCHESTRA: return fullOrchestra()
        case .CUSTOM: return nil
        }
    }
}
