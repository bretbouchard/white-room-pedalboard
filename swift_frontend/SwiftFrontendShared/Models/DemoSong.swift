//
//  DemoSong.swift
//  White Room
//
//  Demo song system for showcasing Schillinger-based generative music
//

import Foundation

// MARK: - Demo Song Models

/// Metadata about a demo song
struct DemoSongMetadata: Codable, Identifiable {
    let id: String
    let name: String
    let category: SongCategory
    let difficulty: DifficultyLevel
    let focus: [String]
    let duration_seconds: Int
    let agents: [AgentType]
    let description: String
    let performance_notes: String?
    let composer: String
    let date_added: String
    let sequence: Int

    var localizedName: String { name }
}

/// Full demo song with session model
struct DemoSong: Codable, Identifiable {
    let id: String
    let name: String
    let category: SongCategory
    let difficulty: DifficultyLevel
    let focus: [String]
    let duration_seconds: Int
    let agents: [AgentType]
    let description: String
    let performance_notes: String?
    let composer: String
    let date_added: String
    let sequence: Int
    let session_model: SessionModel
    let preset_evolution: PresetEvolution?

    var localizedName: String { name }

    /// File path (computed, not stored in JSON)
    var file_path: String {
        "\(category.rawValue)/\(sequence < 10 ? "00\(sequence)" : sequence < 100 ? "0\(sequence)" : "\(sequence)")_\(name.lowercased().replacingOccurrences(of: " ", with: "_")).json"
    }
}

/// Song categories
enum SongCategory: String, Codable {
    case converted = "converted"
    case starter = "starter"
    case showcase = "showcase"
    case intermediate = "intermediate"
    case advanced = "advanced"

    var displayName: String {
        switch self {
        case .converted: return "Converted"
        case .starter: return "Starter"
        case .showcase: return "Showcase"
        case .intermediate: return "Intermediate"
        case .advanced: return "Advanced"
        }
    }

    var description: String {
        switch self {
        case .converted: return "Song analyses converted to performable presets"
        case .starter: return "Beginner-friendly introductions"
        case .showcase: return "Feature demonstrations"
        case .intermediate: return "Mid-level complexity"
        case .advanced: return "Expert-level compositions"
        }
    }
}

/// Difficulty levels
enum DifficultyLevel: String, Codable {
    case beginner = "beginner"
    case intermediate = "intermediate"
    case advanced = "advanced"

    var displayName: String {
        rawValue.capitalized
    }
}

/// Agent types
enum AgentType: String, Codable {
    case rhythm = "Rhythm"
    case pitch = "Pitch"
    case structure = "Structure"
    case energy = "Energy"
    case harmony = "Harmony"
    case evolution = "Evolution"

    var iconName: String {
        switch self {
        case .rhythm: return "waveform"
        case .pitch: return "music.note"
        case .structure: return "rectangle.stack"
        case .energy: return "bolt"
        case .harmony: return "music.quarternote.3"
        case .evolution: return "arrow.triangle.2.circlepath"
        }
    }
}

/// Demo song library
struct DemoSongLibrary: Codable {
    let songs: [DemoSong]
    let by_category: [String: [DemoSong]]
    let by_difficulty: [String: [DemoSong]]

    /// Get songs by category
    func songs(in category: SongCategory) -> [DemoSong] {
        by_category[category.rawValue] ?? []
    }

    /// Get songs by difficulty
    func songs(withDifficulty difficulty: DifficultyLevel) -> [DemoSong] {
        by_difficulty[difficulty.rawValue] ?? []
    }

    /// Search songs by focus/concept
    func songs(searching query: String) -> [DemoSong] {
        songs.filter { song in
            song.name.localizedCaseInsensitiveContains(query) ||
            song.focus.contains { $0.localizedCaseInsensitiveContains(query) } ||
            song.description.localizedCaseInsensitiveContains(query)
        }
    }

    /// Get next song in category
    func nextSong(after currentSong: DemoSong) -> DemoSong? {
        let categorySongs = songs(in: currentSong.category)
        guard let currentIndex = categorySongs.firstIndex(where: { $0.id == currentSong.id }),
              currentIndex + 1 < categorySongs.count else {
            return nil
        }
        return categorySongs[currentIndex + 1]
    }

    /// Get previous song in category
    func previousSong(before currentSong: DemoSong) -> DemoSong? {
        let categorySongs = songs(in: currentSong.category)
        guard let currentIndex = categorySongs.firstIndex(where: { $0.id == currentSong.id }),
              currentIndex > 0 else {
            return nil
        }
        return categorySongs[currentIndex - 1]
    }
}

// MARK: - Session Model (Partial)

/// Session model for demo songs (simplified for demo loading)
struct SessionModel: Codable {
    let tempo: Double?
    let rhythm: RhythmConfiguration?
    let pitch: PitchConfiguration?
    let harmony: HarmonyConfiguration?
    let structure: StructureConfiguration?
    let energy: EnergyConfiguration?

    struct RhythmConfiguration: Codable {
        let primary_pulse_streams: [PulseStream]
        let resultant_pattern: [Int]?
        let secondary_pulse_streams: [PulseStream]?
    }

    struct PulseStream: Codable {
        let period: Int
        let phase_offset: Int
        let weight: Double
    }

    struct PitchConfiguration: Codable {
        let root_note: Int?
        let scale_type: String?
        let predictability_metric: Double?
        let octave_range: [Int]?
    }

    struct HarmonyConfiguration: Codable {
        let chord_progression: [Int]?
        let voicing_type: String?
        let harmonic_rhythm: String?
    }

    struct StructureConfiguration: Codable {
        let form_type: String?
        let sections: [Section]?
        let transitions: [Transition]?

        struct Section: Codable {
            let name: String
            let duration_bars: Int
        }

        struct Transition: Codable {
            let from_section: String
            let to_section: String
            let type: String
        }
    }

    struct EnergyConfiguration: Codable {
        let initial_energy: Double?
        let energy_curve: String?
        let peak_points: [Int]?
    }
}

// MARK: - Preset Evolution

/// Preset evolution configuration
struct PresetEvolution: Codable {
    let enabled: Bool
    let mutation_rate: Double?
    let generations: Int?
    let lineage_id: String?
}

// MARK: - Demo Song Loading Error

enum DemoSongError: Error, LocalizedError {
    case fileNotFound(String)
    case invalidFormat(String)
    case loadingFailed(String)

    var errorDescription: String? {
        switch self {
        case .fileNotFound(let path):
            return "Demo song file not found: \(path)"
        case .invalidFormat(let reason):
            return "Invalid demo song format: \(reason)"
        case .loadingFailed(let reason):
            return "Failed to load demo song: \(reason)"
        }
    }
}
