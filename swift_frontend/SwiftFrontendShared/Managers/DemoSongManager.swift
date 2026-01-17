//
//  DemoSongManager.swift
//  White Room
//
//  Manages loading, filtering, and playback of demo songs
//

import Foundation
import Combine

/// Manager for demo song library
@MainActor
class DemoSongManager: ObservableObject {
    // MARK: - Published Properties

    @Published var library: DemoSongLibrary?
    @Published var isLoading = false
    @Published var loadingError: Error?
    @Published var currentSong: DemoSong?
    @Published var isPlaying = false

    // MARK: - Private Properties

    private let bundle: Bundle
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init(bundle: Bundle = .main) {
        self.bundle = bundle
    }

    // MARK: - Public Methods

    /// Load all demo songs from app bundle
    func loadLibrary() async throws {
        isLoading = true
        loadingError = nil
        defer { isLoading = false }

        var allSongs: [DemoSong] = []

        // Load each category
        let categories: [SongCategory] = [.converted, .starter, .showcase, .intermediate, .advanced]

        for category in categories {
            do {
                let songs = try await loadSongs(inCategory: category)
                allSongs.append(contentsOf: songs)
            } catch {
                print("⚠️ Failed to load category \(category.rawValue): \(error)")
                // Continue loading other categories even if one fails
            }
        }

        // Sort songs by sequence number
        allSongs.sort { $0.sequence < $1.sequence }

        // Build library
        library = DemoSongLibrary(
            songs: allSongs,
            by_category: Dictionary(grouping: allSongs) { $0.category.rawValue },
            by_difficulty: Dictionary(grouping: allSongs) { $0.difficulty.rawValue }
        )

        print("✅ Loaded \(allSongs.count) demo songs")
    }

    /// Load songs from a specific category
    func loadSongs(inCategory category: SongCategory) async throws -> [DemoSong] {
        guard let songURLs = bundle.urls(forResourcesWithExtension: "json", subdirectory: "DemoSongs/\(category.rawValue)") else {
            print("⚠️ No songs found in category: \(category.rawValue)")
            return []
        }

        var songs: [DemoSong] = []

        for url in songURLs {
            do {
                let data = try Data(contentsOf: url)
                let song = try JSONDecoder().decode(DemoSong.self, from: data)
                songs.append(song)
            } catch {
                print("⚠️ Failed to decode song at \(url.lastPathComponent): \(error)")
                // Continue loading other songs even if one fails
            }
        }

        print("✅ Loaded \(songs.count) songs from category: \(category.rawValue)")
        return songs
    }

    /// Get songs by category
    func songs(in category: SongCategory) -> [DemoSong] {
        guard let library = library else { return [] }
        return library.songs(in: category)
    }

    /// Get songs by difficulty
    func songs(withDifficulty difficulty: DifficultyLevel) -> [DemoSong] {
        guard let library = library else { return [] }
        return library.songs(withDifficulty: difficulty)
    }

    /// Search songs by query
    func songs(searching query: String) -> [DemoSong] {
        guard let library = library else { return [] }
        return library.songs(searching: query)
    }

    /// Get next song in category
    func nextSong(after currentSong: DemoSong) -> DemoSong? {
        guard let library = library else { return nil }
        return library.nextSong(after: currentSong)
    }

    /// Get previous song in category
    func previousSong(before currentSong: DemoSong) -> DemoSong? {
        guard let library = library else { return nil }
        return library.previousSong(before: currentSong)
    }

    /// Select a song (does not auto-play)
    func selectSong(_ song: DemoSong) {
        currentSong = song
        isPlaying = false  // Ensure song doesn't auto-play

        print("🎵 Selected song: \(song.name) (category: \(song.category.displayName), difficulty: \(song.difficulty.displayName))")
    }

    /// Start playback of current song
    func play() {
        guard currentSong != nil else {
            print("⚠️ No song selected")
            return
        }

        isPlaying = true
        print("▶️ Playing: \(currentSong?.name ?? "")")
    }

    /// Pause playback of current song
    func pause() {
        isPlaying = false
        print("⏸️ Paused: \(currentSong?.name ?? "")")
    }

    /// Stop playback and clear current song
    func stop() {
        isPlaying = false
        currentSong = nil
        print("⏹️ Stopped")
    }

    /// Get library statistics
    func libraryStatistics() -> LibraryStats? {
        guard let library = library else { return nil }

        let categoryCounts = library.by_category.mapValues { $0.count }
        let difficultyCounts = library.by_difficulty.mapValues { $0.count }

        return LibraryStats(
            totalSongs: library.songs.count,
            categoryCounts: categoryCounts,
            difficultyCounts: difficultyCounts
        )
    }
}

// MARK: - Library Statistics

struct LibraryStats {
    let totalSongs: Int
    let categoryCounts: [String: Int]
    let difficultyCounts: [String: Int]

    var formattedSummary: String {
        var summary = "Total Songs: \(totalSongs)\n\n"

        summary += "By Category:\n"
        for (category, count) in categoryCounts.sorted(by: { $0.key < $1.key }) {
            summary += "  \(category.capitalized): \(count)\n"
        }

        summary += "\nBy Difficulty:\n"
        for (difficulty, count) in difficultyCounts.sorted(by: { $0.key < $1.key }) {
            summary += "  \(difficulty.capitalized): \(count)\n"
        }

        return summary
    }
}

// MARK: - Preview Helper

#if DEBUG
extension DemoSongManager {
    /// Create a demo song manager with mock data for previews
    static var mock: DemoSongManager {
        let manager = DemoSongManager()

        // Create mock songs
        let mockSongs = [
            DemoSong(
                id: "starter_001",
                name: "First Steps",
                category: .starter,
                difficulty: .beginner,
                focus: ["Basic resultant rhythm", "Simple melodic contour"],
                duration_seconds: 180,
                agents: [.rhythm, .pitch],
                description: "A gentle introduction to resultant rhythms",
                performance_notes: "Play slowly and listen to the pulse interactions",
                composer: "Claude AI",
                date_added: "2025-01-16",
                sequence: 1,
                session_model: SessionModel(
                    tempo: 110.0,
                    rhythm: SessionModel.RhythmConfiguration(
                        primary_pulse_streams: [
                            SessionModel.PulseStream(period: 3, phase_offset: 0, weight: 1.0),
                            SessionModel.PulseStream(period: 5, phase_offset: 0, weight: 0.8)
                        ],
                        resultant_pattern: [3, 2],
                        secondary_pulse_streams: nil
                    ),
                    pitch: SessionModel.PitchConfiguration(
                        root_note: 0,
                        scale_type: "chromatic",
                        predictability_metric: 0.5,
                        octave_range: [3, 5]
                    ),
                    harmony: nil,
                    structure: nil,
                    energy: nil
                ),
                preset_evolution: nil
            ),
            DemoSong(
                id: "showcase_001",
                name: "Binary Balance",
                category: .showcase,
                difficulty: .intermediate,
                focus: ["Binary form", "Sectional contrast", "Energy arch"],
                duration_seconds: 240,
                agents: [.rhythm, .pitch, .structure, .energy],
                description: "Demonstrates binary form with clear A/B sections",
                performance_notes: "Notice the energy shift at the section transition",
                composer: "Claude AI",
                date_added: "2025-01-16",
                sequence: 1,
                session_model: SessionModel(
                    tempo: 120.0,
                    rhythm: nil,
                    pitch: nil,
                    harmony: nil,
                    structure: SessionModel.StructureConfiguration(
                        form_type: "binary",
                        sections: [
                            SessionModel.StructureConfiguration.Section(name: "A", duration_bars: 16),
                            SessionModel.StructureConfiguration.Section(name: "B", duration_bars: 16)
                        ],
                        transitions: nil
                    ),
                    energy: SessionModel.EnergyConfiguration(
                        initial_energy: 0.3,
                        energy_curve: "arch",
                        peak_points: [24]
                    )
                ),
                preset_evolution: nil
            )
        ]

        manager.library = DemoSongLibrary(
            songs: mockSongs,
            by_category: Dictionary(grouping: mockSongs) { $0.category.rawValue },
            by_difficulty: Dictionary(grouping: mockSongs) { $0.difficulty.rawValue }
        )

        return manager
    }
}
#endif
