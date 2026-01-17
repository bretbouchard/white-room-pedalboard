//
//  MovingSidewalkView.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI
import Combine

// =============================================================================
// MARK: - Moving Sidewalk View
// =============================================================================

/**
 iOS-optimized multi-song player interface for the Moving Sidewalk feature.

 Features:
 - Horizontal scrolling list of song player cards
 - Master transport controls at bottom
 - Visual timeline at top
 - Responsive layout for iPhone and iPad
 - Smooth animations and haptic feedback
 - Accessibility support (VoiceOver)
 */
public struct MovingSidewalkView: View {

    // MARK: - Properties

    @StateObject private var state = MultiSongState()
    @Environment(\.theme) var theme
    @Environment(\.horizontalSizeClass) var horizontalSizeClass: UserInterfaceSizeClass?
    @Environment(\.verticalSizeClass) var verticalSizeClass: UserInterfaceSizeClass?

    /// Scroll position for song cards
    @State private var scrollOffset: CGFloat = 0

    /// Whether to show add song sheet
    @State private var showingAddSong = false

    /// Whether to show save preset sheet
    @State private var showingSavePreset = false

    // MARK: - Layout

    /// Whether device is iPad (larger screen)
    private var isIPad: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }

    /// Number of columns for grid layout (iPad only)
    private var gridColumns: [GridItem] {
        if isIPad {
            return [GridItem(.flexible()), GridItem(.flexible())]
        } else {
            return [GridItem(.flexible())]
        }
    }

    // MARK: - Body

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                // Background
                theme.palette.background.primary
                    .ignoresSafeArea()

                // Main content
                ScrollView {
                    VStack(spacing: 0) {
                        // Top spacer
                        Spacer()
                            .frame(height: 16)

                        // Visual timeline
                        VisualTimeline(state: state)
                            .padding(.horizontal, 16)

                        // Song cards header
                        songCardsHeader
                            .padding(.horizontal, 16)
                            .padding(.top, 16)

                        // Song cards
                        if isIPad {
                            // iPad: Grid layout
                            LazyVGrid(columns: gridColumns, spacing: 16) {
                                ForEach(state.songs) { song in
                                    SongPlayerCard(song: song)
                                        .transition(.scale.combined(with: .opacity))
                                }
                            }
                            .padding(.horizontal, 16)
                        } else {
                            // iPhone: Horizontal scrolling cards
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(state.songs) { song in
                                        SongPlayerCard(song: song)
                                            .frame(width: geometry.size.width - 32)
                                            .transition(.scale.combined(with: .opacity))
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                            }
                        }

                        // Bottom spacer for controls
                        Spacer()
                            .frame(height: 240)
                    }
                }
                .refreshable {
                    // Pull to refresh action
                    await refreshSongs()
                }

                // Master transport controls (fixed at bottom)
                VStack {
                    Spacer()

                    MasterTransportControls(state: state)
                        .padding(.horizontal, 16)
                        .padding(.bottom, safeAreaInsets.bottom)
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Moving Sidewalk")
                        .font(.headline)
                        .foregroundColor(theme.palette.text.primary)

                    Text("\(state.songs.count) songs")
                        .font(.caption)
                        .foregroundColor(theme.palette.text.tertiary)
                }
            }

            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button {
                        showingAddSong = true
                    } label: {
                        Label("Add Song", systemImage: "plus")
                    }

                    Button {
                        showingSavePreset = true
                    } label: {
                        Label("Save Preset", systemImage: "square.and.arrow.down")
                    }

                    Divider()

                    Button {
                        state.stopAll()
                    } label: {
                        Label("Stop All", systemImage: "stop.circle")
                    }

                    Button {
                        // Clear all songs
                        state.songs.removeAll()
                    } label: {
                        Label("Clear All", systemImage: "trash")
                            .foregroundColor(theme.palette.feedback.error)
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.title3)
                        .foregroundColor(theme.palette.accent.primary)
                }
            }
        }
        .sheet(isPresented: $showingAddSong) {
            AddSongSheet(state: state)
        }
        .sheet(isPresented: $showingSavePreset) {
            SavePresetSheet(state: state)
        }
        .onAppear {
            // Load demo songs if empty
            if state.songs.isEmpty {
                state.songs = SongPlayerState.demoSongs()
            }
        }
    }

    // MARK: - Song Cards Header

    private var songCardsHeader: some View {
        HStack {
            Text("Songs")
                .font(.headline)
                .foregroundColor(theme.palette.text.primary)

            Spacer()

            // Sync mode indicator
            HStack(spacing: 4) {
                Image(systemName: state.syncMode.icon)
                    .font(.caption)
                    .foregroundColor(theme.palette.accent.primary)

                Text(state.syncMode.rawValue)
                    .font(.caption)
                    .foregroundColor(theme.palette.text.secondary)
            }
        }
    }

    // MARK: - Safe Area Insets

    private var safeAreaInsets: UIEdgeInsets {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            return UIEdgeInsets()
        }
        return window.safeAreaInsets
    }

    // MARK: - Refresh Songs

    private func refreshSongs() async {
        // Simulate refresh delay
        try? await Task.sleep(nanoseconds: 1_000_000_000)
    }
}

// =============================================================================
// MARK: - Add Song Sheet
// =============================================================================

/**
 Sheet for adding a new song to the player
 */
struct AddSongSheet: View {

    @ObservedObject var state: MultiSongState
    @Environment(\.theme) var theme
    @Environment(\.dismiss) var dismiss

    @State private var songName: String = ""
    @State private var artist: String = ""
    @State private var bpm: String = "120"
    @State private var duration: String = "180"

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Song Info")) {
                    TextField("Song Name", text: $songName)
                    TextField("Artist", text: $artist)
                }

                Section(header: Text("Properties")) {
                    HStack {
                        Text("BPM")
                        Spacer()
                        TextField("Tempo", text: $bpm)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }

                    HStack {
                        Text("Duration (seconds)")
                        Spacer()
                        TextField("Duration", text: $duration)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                }

                Section {
                    Button("Add Song") {
                        addSong()
                    }
                    .disabled(songName.isEmpty)
                }
            }
            .navigationTitle("Add Song")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func addSong() {
        let newSong = SongPlayerState(
            name: songName,
            artist: artist,
            originalBPM: Double(bpm) ?? 120.0,
            duration: Double(duration) ?? 180.0
        )

        state.addSong(newSong)
        dismiss()
    }
}

// =============================================================================
// MARK: - Save Preset Sheet
// =============================================================================

/**
 Sheet for saving current configuration as a preset
 */
struct SavePresetSheet: View {

    @ObservedObject var state: MultiSongState
    @Environment(\.theme) var theme
    @Environment(\.dismiss) var dismiss

    @State private var presetName: String = ""

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Preset Info")) {
                    TextField("Preset Name", text: $presetName)
                }

                Section(header: Text("Summary")) {
                    HStack {
                        Text("Songs")
                        Spacer()
                        Text("\(state.songs.count)")
                            .foregroundColor(theme.palette.text.secondary)
                    }

                    HStack {
                        Text("Sync Mode")
                        Spacer()
                        Text(state.syncMode.rawValue)
                            .foregroundColor(theme.palette.text.secondary)
                    }

                    HStack {
                        Text("Master Tempo")
                        Spacer()
                        Text(String(format: "%.1fx", state.masterTempo))
                            .foregroundColor(theme.palette.text.secondary)
                    }
                }

                Section {
                    Button("Save Preset") {
                        savePreset()
                    }
                    .disabled(presetName.isEmpty)
                }
            }
            .navigationTitle("Save Preset")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func savePreset() {
        let songConfigs = state.songs.map { song in
            SongPresetConfig(
                songId: song.id,
                tempoMultiplier: song.tempoMultiplier,
                volume: song.volume,
                isMuted: song.isMuted,
                isSolo: song.isSolo
            )
        }

        let preset = MultiSongPreset(
            name: presetName,
            songs: songConfigs,
            masterSettings: MasterSettings(
                masterTempo: state.masterTempo,
                masterVolume: state.masterVolume,
                isLooping: state.masterTransport.isLooping
            ),
            syncMode: state.syncMode
        )

        // Save preset logic here
        dismiss()
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#Preview("iPhone 15 Pro - Portrait") {
    NavigationView {
        MovingSidewalkView()
    }
    .previewDevice(PreviewDevice(rawValue: "iPhone 15 Pro"))
    .previewDisplayName("iPhone 15 Pro")
}

#Preview("iPad Pro - Landscape") {
    NavigationView {
        MovingSidewalkView()
    }
    .previewDevice(PreviewDevice(rawValue: "iPad Pro (12.9-inch) (6th generation)"))
    .previewDisplayName("iPad Pro")
    .previewInterfaceOrientation(.landscapeLeft)
}

#Preview("Multiple Songs") {
    NavigationView {
        MovingSidewalkView()
    }
    .onAppear {
        // Pre-populate with demo data
    }
}
