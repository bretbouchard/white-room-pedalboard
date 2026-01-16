//
//  TablatureModels.swift
//  WhiteRoomiOS
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Tab Note Model
// =============================================================================

/// Represents a single note in tablature notation
public struct TabNote: Identifiable, Equatable, Codable {
    public let id = UUID()
    public var stringIndex: Int
    public var fret: Int
    public var technique: NoteTechnique?
    public var velocity: Int
    public var startTime: Double
    public var duration: Double

    public init(
        stringIndex: Int,
        fret: Int,
        technique: NoteTechnique? = nil,
        velocity: Int = 100,
        startTime: Double = 0.0,
        duration: Double = 1.0
    ) {
        self.stringIndex = stringIndex
        self.fret = fret
        self.technique = technique
        self.velocity = velocity
        self.startTime = startTime
        self.duration = duration
    }

    public static func == (lhs: TabNote, rhs: TabNote) -> Bool {
        lhs.id == rhs.id
    }
}

// =============================================================================
// MARK: - Note Technique
// =============================================================================

/// Techniques that can be applied to notes in tablature
public enum NoteTechnique: String, CaseIterable, Equatable, Codable {
    case hammerOn
    case pullOff
    case slide
    case bend
    case vibrato
    case letRing

    public var displayName: String {
        switch self {
        case .hammerOn: return "Hammer-On"
        case .pullOff: return "Pull-Off"
        case .slide: return "Slide"
        case .bend: return "Bend"
        case .vibrato: return "Vibrato"
        case .letRing: return "Let Ring"
        }
    }

    public var symbolName: String {
        switch self {
        case .hammerOn: return "arrow.up.circle"
        case .pullOff: return "arrow.down.circle"
        case .slide: return "arrow.right.circle"
        case .bend: return "arrow.up.right.circle"
        case .vibrato: return "waveform.path"
        case .letRing: return "ellipsis"
        }
    }
}

// =============================================================================
// MARK: - Instrument Preset
// =============================================================================

/// Pre-configured instrument settings including string count and tuning
public struct InstrumentPreset: Equatable, Codable, Identifiable {
    public let id = UUID()
    public let name: String
    public let stringCount: Int
    public let tuning: Tuning

    public init(name: String, stringCount: Int, tuning: Tuning) {
        self.name = name
        self.stringCount = stringCount
        self.tuning = tuning
    }

    // MARK: - Standard Presets

    /// Standard guitar tuning (E A D G B E)
    public static let guitarStandard = InstrumentPreset(
        name: "Guitar (Standard)",
        stringCount: 6,
        tuning: Tuning(name: "Standard", strings: [64, 59, 55, 50, 45, 40], capo: 0)
    )

    /// Standard bass tuning (E A D G)
    public static let bassStandard = InstrumentPreset(
        name: "Bass (Standard)",
        stringCount: 4,
        tuning: Tuning(name: "Bass Standard", strings: [43, 38, 33, 28], capo: 0)
    )

    /// Drop D tuning (D A D G B E)
    public static let dropD = InstrumentPreset(
        name: "Guitar (Drop D)",
        stringCount: 6,
        tuning: Tuning(name: "Drop D", strings: [64, 59, 55, 50, 45, 38], capo: 0)
    )

    /// Open D tuning (D A D F# A D)
    public static let openD = InstrumentPreset(
        name: "Guitar (Open D)",
        stringCount: 6,
        tuning: Tuning(name: "Open D", strings: [62, 57, 50, 45, 38, 38], capo: 0)
    )

    /// Open G tuning (D G D G B D)
    public static let openG = InstrumentPreset(
        name: "Guitar (Open G)",
        stringCount: 6,
        tuning: Tuning(name: "Open G", strings: [62, 59, 55, 50, 43, 38], capo: 0)
    )

    /// Standard ukulele tuning (G C E A)
    public static let ukulele = InstrumentPreset(
        name: "Ukulele",
        stringCount: 4,
        tuning: Tuning(name: "Ukulele", strings: [67, 60, 52, 43], capo: 0)
    )

    /// Standard 5-string banjo tuning (G4 D3 G3 B3 D4)
    public static let banjo = InstrumentPreset(
        name: "Banjo (5-String)",
        stringCount: 5,
        tuning: Tuning(name: "Banjo Standard", strings: [59, 55, 50, 45, 38], capo: 0)
    )

    /// Standard mandolin tuning (G D A E)
    public static let mandolin = InstrumentPreset(
        name: "Mandolin",
        stringCount: 4,
        tuning: Tuning(name: "Mandolin", strings: [64, 59, 52, 45], capo: 0)
    )

    /// All available instrument presets
    public static let allCases: [InstrumentPreset] = [
        guitarStandard, bassStandard, dropD, openD, openG,
        ukulele, banjo, mandolin
    ]
}

// =============================================================================
// MARK: - Tuning Model
// =============================================================================

/// Represents the tuning configuration for an instrument
public struct Tuning: Equatable, Codable {
    public let name: String
    public let strings: [Int]  // MIDI pitch of each string (high to low)
    public let capo: Int

    public init(name: String, strings: [Int], capo: Int = 0) {
        self.name = name
        self.strings = strings
        self.capo = capo
    }

    /// Returns the MIDI note for a string at a given fret
    public func note(for string: Int, fret: Int) -> Int {
        guard string >= 0 && string < strings.count else { return 0 }
        return strings[string] + fret + capo
    }

    /// Returns the note name for a string at a given fret
    public func noteName(for string: Int, fret: Int) -> String {
        let midi = note(for: string, fret: fret)
        return midiToNoteName(midi)
    }
}

// =============================================================================
// MARK: - Tablature Configuration
// =============================================================================

/// Configuration options for tablature display and behavior
public struct TablatureConfiguration: Equatable, Codable {
    public var stringCount: Int
    public var fretCount: Int
    public var zoomLevel: Double
    public var showFretNumbers: Bool
    public var showStringLabels: Bool
    public var showTechniqueIndicators: Bool

    public init(
        stringCount: Int = 6,
        fretCount: Int = 12,
        zoomLevel: Double = 1.0,
        showFretNumbers: Bool = true,
        showStringLabels: Bool = true,
        showTechniqueIndicators: Bool = true
    ) {
        self.stringCount = stringCount
        self.fretCount = fretCount
        self.zoomLevel = zoomLevel
        self.showFretNumbers = showFretNumbers
        self.showStringLabels = showStringLabels
        self.showTechniqueIndicators = showTechniqueIndicators
    }

    /// Validates configuration constraints
    public var isValid: Bool {
        stringCount >= 4 && stringCount <= 12 &&
        fretCount >= 12 && fretCount <= 24 &&
        zoomLevel >= 0.5 && zoomLevel <= 3.0
    }
}

// =============================================================================
// MARK: - Helper Functions
// =============================================================================

/// Converts MIDI note number to note name (e.g., 60 -> "C4")
public func midiToNoteName(_ midi: Int) -> String {
    let noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    let noteName = noteNames[midi % 12]
    let octave = midi / 12 - 1
    return "\(noteName)\(octave)"
}

/// Converts note name to MIDI note number (e.g., "C4" -> 60)
public func noteNameToMidi(_ noteName: String) -> Int? {
    let noteNames = ["C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
                     "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11]
    let octaveOffset = 60  // C4 is middle C

    guard noteName.count >= 2 else { return nil }

    let notePart = String(noteName.dropLast())
    let octavePart = noteName.last.flatMap { Int(String($0)) }

    guard let noteIndex = noteNames[notePart.uppercased()],
          let octave = octavePart else {
        return nil
    }

    return octaveOffset + (octave - 4) * 12 + noteIndex
}

// =============================================================================
// MARK: - Tablature Measure
// =============================================================================

/// Represents a measure (bar) in tablature notation
public struct TablatureMeasure: Identifiable, Equatable, Codable {
    public let id = UUID()
    public var notes: [TabNote]
    public var timeSignature: TimeSignature
    public var tempo: Int?

    public init(
        notes: [TabNote] = [],
        timeSignature: TimeSignature = .fourFour,
        tempo: Int? = nil
    ) {
        self.notes = notes
        self.timeSignature = timeSignature
        self.tempo = tempo
    }
}

// =============================================================================
// MARK: - Time Signature
// =============================================================================

/// Time signature for tablature notation
public enum TimeSignature: Equatable, Codable {
    case twoTwo
    case threeFour
    case fourFour
    case sixEight
    case custom(Int, Int)  // beats per measure, beat unit

    public var displayName: String {
        switch self {
        case .twoTwo: return "2/2"
        case .threeFour: return "3/4"
        case .fourFour: return "4/4"
        case .sixEight: return "6/8"
        case .custom(let top, let bottom):
            return "\(top)/\(bottom)"
        }
    }

    public var beatsPerMeasure: Int {
        switch self {
        case .twoTwo: return 2
        case .threeFour: return 3
        case .fourFour: return 4
        case .sixEight: return 6
        case .custom(let top, _): return top
        }
    }

    public var beatUnit: Int {
        switch self {
        case .twoTwo: return 2
        case .threeFour: return 4
        case .fourFour: return 4
        case .sixEight: return 8
        case .custom(_, let bottom): return bottom
        }
    }
}
