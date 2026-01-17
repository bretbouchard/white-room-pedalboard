//
//  SongLibraryView.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Song Library View
// =============================================================================

/**
 Song library browser for selecting and managing songs
 */
public struct SongLibraryView: View {
    @Environment(\.theme) var theme
    @StateObject private var state = MultiSongState()

    @State private var searchText = ""
    @State private var selectedGenre = "All"
    @State private var showingSortOptions = false

    private let genres = ["All", "Electronic", "Classical", "Jazz", "Rock", "Ambient", "Hip-Hop"]

    // Filtered songs based on search and genre
    private var filteredSongs: [SongLibraryItem] {
        SongLibraryItem.demoItems.filter { song in
            let matchesSearch = searchText.isEmpty || song.name.localizedCaseInsensitiveContains(searchText)
            let matchesGenre = selectedGenre == "All" || song.genre == selectedGenre
            return matchesSearch && matchesGenre
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Search bar
            searchHeader

            // Genre filter
            genreFilter

            // Song list
            if filteredSongs.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredSongs) { song in
                            SongLibraryRow(song: song, state: state)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Song Library")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingSortOptions = true
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                }
            }
        }
        .sheet(isPresented: $showingSortOptions) {
            SortOptionsSheet()
        }
    }

    // MARK: - Search Header

    private var searchHeader: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(theme.palette.text.secondary)

            TextField("Search songs...", text: $searchText)
                .textFieldStyle(.plain)

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(theme.palette.text.secondary)
                }
            }
        }
        .padding(12)
        .background(theme.palette.background.tertiary)
        .cornerRadius(10)
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - Genre Filter

    private var genreFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(genres, id: \.self) { genre in
                    Button {
                        selectedGenre = genre
                    } label: {
                        Text(genre)
                            .font(.subheadline)
                            .fontWeight(selectedGenre == genre ? .semibold : .regular)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedGenre == genre ? theme.palette.accent.primary : theme.palette.background.tertiary)
                            .foregroundColor(selectedGenre == genre ? .white : theme.palette.text.primary)
                            .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "music.note")
                .font(.system(size: 60))
                .foregroundColor(theme.palette.text.tertiary)

            Text("No songs found")
                .font(.headline)
                .foregroundColor(theme.palette.text.secondary)

            Text("Try adjusting your search or filters")
                .font(.subheadline)
                .foregroundColor(theme.palette.text.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// =============================================================================
// MARK: - Song Library Row
// =============================================================================

struct SongLibraryRow: View {
    @Environment(\.theme) var theme
    let song: SongLibraryItem
    @ObservedObject var state: MultiSongState

    var body: some View {
        HStack(spacing: 12) {
            // Album art
            RoundedRectangle(cornerRadius: 8)
                .fill(song.artColor)
                .frame(width: 60, height: 60)
                .overlay {
                    Image(systemName: "music.note")
                        .foregroundColor(.white.opacity(0.8))
                }

            // Song info
            VStack(alignment: .leading, spacing: 4) {
                Text(song.name)
                    .font(.headline)
                    .foregroundColor(theme.palette.text.primary)

                Text(song.artist)
                    .font(.subheadline)
                    .foregroundColor(theme.palette.text.secondary)

                HStack(spacing: 8) {
                    Label("\(song.bpm, specifier: "%.0f") BPM", systemImage: "metronome")
                        .font(.caption)
                        .foregroundColor(theme.palette.text.tertiary)

                    Label(song.key, systemImage: "textformat")
                        .font(.caption)
                        .foregroundColor(theme.palette.text.tertiary)

                    Text(song.genre)
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(theme.palette.background.tertiary)
                        .cornerRadius(4)
                        .foregroundColor(theme.palette.text.secondary)
                }
            }

            Spacer()

            // Add button
            Button {
                addSongToPlayer()
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundColor(theme.palette.accent.primary)
            }
        }
        .padding()
        .background(theme.palette.background.secondary)
        .cornerRadius(12)
        .contentShape(Rectangle())
    }

    private func addSongToPlayer() {
        let newSong = SongPlayerState.demoSong(
            name: song.name,
            artist: song.artist,
            bpm: song.bpm,
            duration: song.duration
        )
        state.addSong(newSong)
    }
}

// =============================================================================
// MARK: - Song Library Item
// =============================================================================

struct SongLibraryItem: Identifiable {
    let id = UUID()
    let name: String
    let artist: String
    let bpm: Double
    let key: String
    let genre: String
    let duration: TimeInterval
    let artColor: Color

    static let demoItems: [SongLibraryItem] = [
        .init(name: "Midnight Dreams", artist: "Luna Wave", bpm: 120, key: "Am", genre: "Electronic", duration: 240, artColor: .purple),
        .init(name: "Sunset Boulevard", artist: "Jazz Trio", bpm: 95, key: "Fmaj", genre: "Jazz", duration: 300, artColor: .orange),
        .init(name: "Electric Forest", artist: "Synth Masters", bpm: 128, key: "Cm", genre: "Electronic", duration: 200, artColor: .blue),
        .init(name: "Piano Sonata No. 3", artist: "Claire DeLune", bpm: 110, key: "Dm", genre: "Classical", duration: 360, artColor: .pink),
        .init(name: "Urban Nights", artist: "City Lights", bpm: 140, key: "Gm", genre: "Hip-Hop", duration: 180, artColor: .green),
        .init(name: "Ocean Waves", artist: "Ambient Collective", bpm: 72, key: "Cmaj", genre: "Ambient", duration: 420, artColor: .cyan),
        .init(name: "Rock Anthem", artist: "The Breakers", bpm: 135, key: "Em", genre: "Rock", duration: 220, artColor: .red),
        .init(name: "Cosmic Journey", artist: "Stellar Sounds", bpm: 110, key: "Dm", genre: "Electronic", duration: 240, artColor: .indigo),
    ]
}

// =============================================================================
// MARK: - Sort Options Sheet
// =============================================================================

struct SortOptionsSheet: View {
    @Environment(\.theme) var theme
    @Environment(\.dismiss) var dismiss

    @State private var selectedSort = "Name"

    private let sortOptions = ["Name", "Artist", "BPM", "Duration", "Recent"]

    var body: some View {
        NavigationView {
            List {
                ForEach(sortOptions, id: \.self) { option in
                    Button {
                        selectedSort = option
                        dismiss()
                    } label: {
                        HStack {
                            Text(option)
                                .foregroundColor(theme.palette.text.primary)
                            Spacer()
                            if selectedSort == option {
                                Image(systemName: "checkmark")
                                    .foregroundColor(theme.palette.accent.primary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Sort By")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}
