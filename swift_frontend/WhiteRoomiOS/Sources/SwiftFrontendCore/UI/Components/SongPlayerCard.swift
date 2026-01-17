//
//  SongPlayerCard.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI
import UIKit

// =============================================================================
// MARK: - Song Player Card
// =============================================================================

/**
 Individual song player card for the Moving Sidewalk multi-song player.

 Features:
 - Play/pause control
 - Tempo slider (0.5x - 2.0x)
 - Volume slider
 - Mute/solo buttons
 - Song info display
 - Progress indicator
 - Waveform visualization
 - Compact and expanded views
 */
struct SongPlayerCard: View {

    // MARK: - Properties

    @ObservedObject var song: SongPlayerState
    @Environment(\.theme) var theme

    /// Whether card is in expanded mode
    @State private var isExpanded: Bool = false

    /// Haptic feedback generator
    private let hapticGenerator = UIImpactFeedbackGenerator(style: .medium)

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            // Header with song info
            header

            Divider()
                .background(theme.palette.borders.subtle)

            // Controls
            controls

            // Waveform (expanded only)
            if isExpanded {
                waveformView
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(theme.palette.background.secondary)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(song.isSolo ? theme.palette.accent.primary : theme.palette.borders.subtle, lineWidth: song.isSolo ? 2 : 1)
        )
        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 12) {
            // Thumbnail or placeholder
            thumbnail

            // Song info
            VStack(alignment: .leading, spacing: 4) {
                Text(song.name)
                    .font(.headline)
                    .foregroundColor(theme.palette.text.primary)
                    .lineLimit(1)

                Text(song.artist.isEmpty ? song.formattedTime : song.artist)
                    .font(.caption)
                    .foregroundColor(theme.palette.text.secondary)
                    .lineLimit(1)
            }

            Spacer()

            // Play/Pause button
            playPauseButton

            // Expand/Collapse button
            expandButton
        }
        .padding(16)
    }

    // MARK: - Thumbnail

    private var thumbnail: some View {
        ZStack {
            if let thumbnailURL = song.thumbnailURL {
                AsyncImage(url: thumbnailURL) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    placeholderThumbnail
                }
            } else {
                placeholderThumbnail
            }
        }
        .frame(width: 48, height: 48)
        .cornerRadius(8)
    }

    private var placeholderThumbnail: some View {
        ZStack {
            theme.palette.background.tertiary

            Image(systemName: "music.note")
                .font(.title3)
                .foregroundColor(theme.palette.text.tertiary)
        }
    }

    // MARK: - Play/Pause Button

    private var playPauseButton: some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                song.isPlaying.toggle()
                hapticGenerator.impactOccurred()
            }
        } label: {
            Image(systemName: song.isPlaying ? "pause.fill" : "play.fill")
                .font(.title2)
                .foregroundColor(theme.palette.accent.primary)
                .frame(width: 44, height: 44)
                .background(song.isPlaying ? theme.palette.accent.primary.opacity(0.1) : Color.clear)
                .cornerRadius(22)
        }
        .accessibilityLabel(song.isPlaying ? "Pause" : "Play")
        .accessibilityHint("Toggle playback for \(song.name)")
    }

    // MARK: - Expand Button

    private var expandButton: some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                isExpanded.toggle()
                hapticGenerator.impactOccurred(intensity: 0.5)
            }
        } label: {
            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                .font(.caption)
                .foregroundColor(theme.palette.text.tertiary)
                .frame(width: 28, height: 28)
        }
        .accessibilityLabel(isExpanded ? "Collapse" : "Expand")
        .accessibilityHint("Show more controls for \(song.name)")
    }

    // MARK: - Controls

    private var controls: some View {
        VStack(spacing: 12) {
            // Progress bar
            progressBar

            // Tempo and Volume
            HStack(spacing: 16) {
                // Tempo control
                tempoControl

                Spacer()

                // Volume control
                volumeControl
            }
            .padding(.horizontal, 16)

            // Mute/Solo buttons
            muteSoloButtons
                .padding(.horizontal, 16)

            // Song metadata
            if isExpanded {
                songMetadata
                    .padding(.horizontal, 16)
            }
        }
        .padding(16)
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Background track
                RoundedRectangle(cornerRadius: 4)
                    .fill(theme.palette.borders.subtle)
                    .frame(height: 8)

                // Progress fill
                RoundedRectangle(cornerRadius: 4)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                theme.palette.accent.primary,
                                theme.palette.accent.secondary
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geometry.size.width * song.progress, height: 8)

                // Drag handle
                Circle()
                    .fill(theme.palette.background.primary)
                    .frame(width: 16, height: 16)
                    .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                    .offset(x: (geometry.size.width * song.progress) - 8)
            }
        }
        .frame(height: 8)
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    withAnimation(.linear) {
                        song.progress = min(max(value.location.x / value.location.x, 0), 1)
                    }
                }
        )
        .accessibilityLabel("Playback position")
        .accessibilityValue("\(Int(song.progress * 100)) percent")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment:
                song.progress = min(song.progress + 0.1, 1.0)
            case .decrement:
                song.progress = max(song.progress - 0.1, 0.0)
            @unknown default:
                break
            }
        }
    }

    // MARK: - Tempo Control

    private var tempoControl: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "metronome")
                    .font(.caption)
                    .foregroundColor(theme.palette.text.tertiary)

                Text("Tempo")
                    .font(.caption)
                    .foregroundColor(theme.palette.text.secondary)

                Spacer()

                Text(String(format: "%.1fx", song.tempoMultiplier))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(theme.palette.accent.primary)
            }

            Slider(value: $song.tempoMultiplier, in: 0.5...2.0, step: 0.1)
                .accentColor(theme.palette.accent.primary)
                .frame(height: 20)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Tempo")
        .accessibilityValue(String(format: "%.1f times", song.tempoMultiplier))
    }

    // MARK: - Volume Control

    private var volumeControl: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "speaker.wave.2")
                    .font(.caption)
                    .foregroundColor(song.isMuted ? theme.palette.text.tertiary : theme.palette.text.tertiary)

                Text("Volume")
                    .font(.caption)
                    .foregroundColor(theme.palette.text.secondary)

                Spacer()

                Text(String(format: "%.0f%%", song.volume * 100))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(song.isMuted ? theme.palette.text.tertiary : theme.palette.accent.primary)
            }

            Slider(value: $song.volume, in: 0...1, step: 0.05)
                .accentColor(theme.palette.accent.primary)
                .disabled(song.isMuted)
                .frame(height: 20)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Volume")
        .accessibilityValue(String(format: "%.0f percent", song.volume * 100))
    }

    // MARK: - Mute/Solo Buttons

    private var muteSoloButtons: some View {
        HStack(spacing: 12) {
            // Mute button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    song.isMuted.toggle()
                    hapticGenerator.impactOccurred(intensity: 0.5)
                }
            } label: {
                Label("Mute", systemImage: song.isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                    .font(.caption)
                    .foregroundColor(song.isMuted ? theme.palette.feedback.error : theme.palette.text.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(song.isMuted ? theme.palette.feedback.error.opacity(0.1) : theme.palette.background.tertiary)
                    .cornerRadius(8)
            }
            .accessibilityLabel(song.isMuted ? "Unmute" : "Mute")
            .accessibilityHint("Toggle mute for \(song.name)")

            Spacer()

            // Solo button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    song.isSolo.toggle()
                    hapticGenerator.impactOccurred(intensity: 0.5)
                }
            } label: {
                Label("Solo", systemImage: "person.fill")
                    .font(.caption)
                    .foregroundColor(song.isSolo ? theme.palette.accent.primary : theme.palette.text.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(song.isSolo ? theme.palette.accent.primary.opacity(0.1) : theme.palette.background.tertiary)
                    .cornerRadius(8)
            }
            .accessibilityLabel(song.isSolo ? "Unsolo" : "Solo")
            .accessibilityHint("Toggle solo for \(song.name)")
        }
    }

    // MARK: - Song Metadata

    private var songMetadata: some View {
        HStack(spacing: 16) {
            metadataItem(icon: "music.note", label: "BPM", value: String(format: "%.0f", song.currentBPM))
            metadataItem(icon: "timer", label: "Time", value: song.timeSignature)
            metadataItem(icon: "textformat", label: "Key", value: song.key)

            Spacer()
        }
    }

    private func metadataItem(icon: String, label: String, value: String) -> some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundColor(theme.palette.text.tertiary)

            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(theme.palette.text.primary)

            Text(label)
                .font(.caption2)
                .foregroundColor(theme.palette.text.tertiary)
        }
    }

    // MARK: - Waveform View

    private var waveformView: some View {
        VStack(spacing: 8) {
            // Waveform visualization
            GeometryReader { geometry in
                HStack(spacing: 1) {
                    ForEach(0..<song.waveform.count, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    theme.palette.accent.primary.opacity(0.6),
                                    theme.palette.accent.secondary.opacity(0.4)
                                ]),
                                startPoint: .bottom,
                                endPoint: .top
                            )
                        )
                        .frame(width: max(1, geometry.size.width / CGFloat(song.waveform.count) - 1))
                        .frame(height: geometry.size.height * CGFloat(song.waveform[index]))
                    }
                }
                .frame(height: 60, alignment: .bottom)
            }
            .frame(height: 60)

            // Time display
            HStack {
                Text(song.formattedTime)
                    .font(.caption)
                    .foregroundColor(theme.palette.text.secondary)

                Spacer()

                Text(song.formattedDuration)
                    .font(.caption)
                    .foregroundColor(theme.palette.text.tertiary)
            }
        }
        .padding(16)
        .background(theme.palette.background.tertiary)
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#Preview("iPhone 15 Pro") {
    MovingSidewalkView()
        .previewDevice(PreviewDevice(rawValue: "iPhone 15 Pro"))
        .previewDisplayName("iPhone 15 Pro")
}

#Preview("iPad Pro") {
    MovingSidewalkView()
        .previewDevice(PreviewDevice(rawValue: "iPad Pro (12.9-inch) (6th generation)"))
        .previewDisplayName("iPad Pro")
}

#Preview("Multiple Songs") {
    let state = MultiSongState.createEmptySession()

    MovingSidewalkView()
        .environmentObject(state)
}
