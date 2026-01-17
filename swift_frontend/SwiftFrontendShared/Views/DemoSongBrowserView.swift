//
//  DemoSongBrowserView.swift
//  White Room
//
//  Demo song browser for selecting and playing demo songs
//

import SwiftUI

/// Demo song browser with category filtering and song selection
struct DemoSongBrowserView: View {
    @StateObject private var songManager = DemoSongManager()
    @State private var selectedCategory: SongCategory? = nil
    @State private var selectedDifficulty: DifficultyLevel? = nil
    @State private var searchText = ""
    @State private var showingSongDetail = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Loading State
                if songManager.isLoading {
                    loadingView
                }
                // Error State
                else if let error = songManager.loadingError {
                    errorView(error)
                }
                // Main Content
                else if songManager.library != nil {
                    mainContentView
                }
                // Empty State
                else {
                    emptyStateView
                }
            }
            .navigationTitle("Demo Songs")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        Task {
                            await loadSongs()
                        }
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .task {
                await loadSongs()
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Loading Demo Songs...")
                .font(.headline)
                .foregroundStyle(.secondary)

            Text("Please wait while we load the library")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Error View

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 60))
                .foregroundStyle(.orange)

            Text("Failed to Load Demo Songs")
                .font(.headline)

            Text(error.localizedDescription)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Retry") {
                Task {
                    await loadSongs()
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State View

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "music.note.list")
                .font(.system(size: 60))
                .foregroundStyle(.tertiary)

            Text("No Demo Songs Available")
                .font(.headline)

            Text("Demo songs will appear here once loaded")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Main Content View

    private var mainContentView: some View {
        VStack(spacing: 0) {
            // Category Filter
            categoryFilterView

            Divider()

            // Song List
            songListView
        }
    }

    // MARK: - Category Filter

    private var categoryFilterView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // All Categories
                filterButton("All", isSelected: selectedCategory == nil) {
                    selectedCategory = nil
                }

                // Individual Categories
                ForEach([SongCategory.starter, .showcase, .intermediate, .advanced, .converted], id: \.self) { category in
                    filterButton(category.displayName, isSelected: selectedCategory == category) {
                        selectedCategory = category
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .background(Color(.systemGray6))
    }

    private func filterButton(_ title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.accentColor : Color(.systemGray5))
                .foregroundStyle(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }

    // MARK: - Song List

    private var songListView: some View {
        Group {
            if let songs = filteredSongs, !songs.isEmpty {
                List(songs) { song in
                    SongRowView(song: song, songManager: songManager)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            songManager.selectSong(song)
                            showingSongDetail = true
                        }
                }
                .listStyle(.plain)
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)

                    Text("No Songs Found")
                        .font(.headline)

                    Text("Try adjusting your filters or search terms")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    // MARK: - Computed Properties

    private var filteredSongs: [DemoSong]? {
        guard let library = songManager.library else { return nil }

        var songs = library.songs

        // Filter by category
        if let category = selectedCategory {
            songs = library.songs(in: category)
        }

        // Filter by search text
        if !searchText.isEmpty {
            songs = library.songs(searching: searchText)
        }

        return songs
    }

    // MARK: - Helper Methods

    private func loadSongs() async {
        do {
            try await songManager.loadLibrary()
        } catch {
            NSLog("Failed to load demo songs: \(error)")
        }
    }
}

// MARK: - Song Row View

struct SongRowView: View {
    let song: DemoSong
    let songManager: DemoSongManager

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Song Name and Category
            HStack {
                Text(song.name)
                    .font(.headline)

                Spacer()

                Text(song.category.displayName)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(categoryColor.opacity(0.2))
                    .foregroundStyle(categoryColor)
                    .cornerRadius(8)
            }

            // Description
            Text(song.description)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            // Focus Tags and Difficulty
            HStack(spacing: 8) {
                ForEach(song.focus.prefix(3), id: \.self) { focus in
                    Text(focus)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(.systemGray5))
                        .cornerRadius(4)
                }

                Spacer()

                HStack(spacing: 4) {
                    Image(systemName: difficultyIcon)
                    Text(song.difficulty.displayName)
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private var categoryColor: Color {
        switch song.category {
        case .starter:
            return .green
        case .showcase:
            return .blue
        case .intermediate:
            return .orange
        case .advanced:
            return .red
        case .converted:
            return .purple
        }
    }

    private var difficultyIcon: String {
        switch song.difficulty {
        case .beginner:
            return "star.fill"
        case .intermediate:
            return "star.leadinghalf.filled"
        case .advanced:
            return "star.circle.fill"
        }
    }
}

// MARK: - Preview

#Preview {
    DemoSongBrowserView()
}
