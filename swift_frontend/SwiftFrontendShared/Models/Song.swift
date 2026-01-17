//
//  Song.swift
//  SwiftFrontendShared
//
//  Core Song model for White Room music application
//

import Foundation

// MARK: - Song Model

/// Core Song model representing a complete musical composition (shared version)
public struct SharedSong: Codable, Identifiable {
    public let id: String
    public let metadata: SharedSongMetadata
    public let trackConfigs: [SharedTrackConfig]
    public let sections: [SharedSection]
    public let roles: [SharedRole]

    public init(
        id: String,
        metadata: SharedSongMetadata,
        trackConfigs: [SharedTrackConfig],
        sections: [SharedSection],
        roles: [SharedRole]
    ) {
        self.id = id
        self.metadata = metadata
        self.trackConfigs = trackConfigs
        self.sections = sections
        self.roles = roles
    }

    /// Convenience accessors
    public var name: String { metadata.name }
    public var tempo: Double { metadata.tempo }
    public var timeSignature: SharedTimeSignature { metadata.timeSignature }
}

// MARK: - Song Metadata

/// Metadata about a song
public struct SharedSongMetadata: Codable {
    public let name: String
    public let tempo: Double
    public let timeSignature: TimeSignature
    public let composer: String?
    public let genre: String?
    public let mood: String?
    public let difficulty: String?
    public let rating: Double?

    public init(
        name: String,
        tempo: Double,
        timeSignature: TimeSignature,
        composer: String? = nil,
        genre: String? = nil,
        mood: String? = nil,
        difficulty: String? = nil,
        rating: Double? = nil
    ) {
        self.name = name
        self.tempo = tempo
        self.timeSignature = timeSignature
        self.composer = composer
        self.genre = genre
        self.mood = mood
        self.difficulty = difficulty
        self.rating = rating
    }
}

// MARK: - Time Signature

/// Musical time signature (e.g., 4/4, 3/4, 6/8)
public struct SharedTimeSignature: Codable {
    public let numerator: Int
    public let denominator: Int

    public init(numerator: Int, denominator: Int) {
        self.numerator = numerator
        self.denominator = denominator
    }

    /// Display format (e.g., "4/4")
    public var displayString: String {
        "\(numerator)/\(denominator)"
    }
}

// MARK: - Section

/// A section of the song (e.g., Verse, Chorus, Bridge)
public struct SharedSection: Codable, Identifiable {
    public let id: String
    public let name: String
    public let startBar: Int
    public let endBar: Int

    public init(id: String, name: String, startBar: Int, endBar: Int) {
        self.id = id
        self.name = name
        self.startBar = startBar
        self.endBar = endBar
    }

    /// Number of bars in this section
    public var barCount: Int {
        endBar - startBar + 1
    }
}

// MARK: - Role

/// A role or instrument in the song
public struct SharedRole: Codable, Identifiable {
    public let id: String
    public let name: String
    public let type: String

    public init(id: String, name: String, type: String) {
        self.id = id
        self.name = name
        self.type = type
    }
}

// MARK: - Track Configuration

/// Configuration for a track in the mix
public struct SharedTrackConfig: Codable, Identifiable {
    public let id: String
    public let name: String
    public let volume: Double?
    public let pan: Double?

    public init(id: String, name: String, volume: Double? = nil, pan: Double? = nil) {
        self.id = id
        self.name = name
        self.volume = volume
        self.pan = pan
    }
}

// MARK: - Song Validation

/// Validation results for Song properties
public enum SongValidationError: Error, LocalizedError {
    case invalidName(String)
    case invalidTempo(Double)
    case invalidTimeSignature(SharedTimeSignature)
    case duplicateSection(String)
    case invalidBarRange(Int, Int)

    public var errorDescription: String? {
        switch self {
        case .invalidName(let name):
            return "Song name cannot be empty: '\(name)'"
        case .invalidTempo(let tempo):
            return "Tempo must be between 40 and 300 BPM: \(tempo)"
        case .invalidTimeSignature(let ts):
            return "Invalid time signature: \(ts.displayString)"
        case .duplicateSection(let name):
            return "Duplicate section name: \(name)"
        case .invalidBarRange(let start, let end):
            return "Invalid bar range: start (\(start)) must be less than end (\(end))"
        }
    }
}

// MARK: - Song Utilities

extension SharedSong {
    /// Validate song properties
    public func validate() throws {
        // Validate name
        if metadata.name.isEmpty {
            throw SongValidationError.invalidName(metadata.name)
        }

        // Validate tempo
        if metadata.tempo < 40 || metadata.tempo > 300 {
            throw SongValidationError.invalidTempo(metadata.tempo)
        }

        // Validate time signature
        if metadata.timeSignature.numerator < 1 || metadata.timeSignature.denominator < 1 {
            throw SongValidationError.invalidTimeSignature(metadata.timeSignature)
        }

        // Validate sections
        let sectionNames = Set(sections.map { $0.name })
        if sectionNames.count != sections.count {
            throw SongValidationError.duplicateSection("Duplicate section names found")
        }

        for section in sections {
            if section.startBar >= section.endBar {
                throw SongValidationError.invalidBarRange(section.startBar, section.endBar)
            }
        }
    }

    /// Get total bar count
    public var totalBars: Int {
        sections.map { $0.barCount }.reduce(0, +)
    }

    /// Get duration in seconds (approximate)
    public var duration: TimeInterval {
        let beatsPerBar = Double(metadata.timeSignature.numerator)
        let beatsPerSecond = metadata.tempo / 60.0
        let totalBeats = Double(totalBars) * beatsPerBar
        return totalBeats / beatsPerSecond
    }
}
