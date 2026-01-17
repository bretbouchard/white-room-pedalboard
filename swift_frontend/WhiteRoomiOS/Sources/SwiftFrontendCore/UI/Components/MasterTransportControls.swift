//
//  MasterTransportControls.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI
import UIKit

// =============================================================================
// MARK: - Master Transport Controls
// =============================================================================

/**
 Master transport controls for the Moving Sidewalk multi-song player.

 Provides:
 - Master play/pause/stop buttons
 - Master tempo slider
 - Master volume control
 - Sync mode selector
 - Add song button
 - Save preset button
 - Loop controls
 */
struct MasterTransportControls: View {

    // MARK: - Properties

    @ObservedObject var state: MultiSongState
    @Environment(\.theme) var theme

    /// Haptic feedback generator
    private let hapticGenerator = UIImpactFeedbackGenerator(style: .medium)

    /// Notification generator
    private let notificationGenerator = UINotificationFeedbackGenerator()

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            // Top section: Transport and sync
            topSection

            Divider()
                .background(theme.palette.borders.subtle)

            // Bottom section: Master controls
            bottomSection
        }
        .background(theme.palette.background.secondary)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: -4)
    }

    // MARK: - Top Section

    private var topSection: some View {
        HStack(spacing: 16) {
            // Transport buttons
            transportButtons

            Spacer()

            // Sync mode selector
            syncModeSelector
        }
        .padding(16)
    }

    // MARK: - Transport Buttons

    private var transportButtons: some View {
        HStack(spacing: 12) {
            // Stop button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    state.stopAll()
                    hapticGenerator.impactOccurred(intensity: 0.8)
                }
            } label: {
                Image(systemName: "stop.fill")
                    .font(.title3)
                    .foregroundColor(theme.palette.text.secondary)
                    .frame(width: 48, height: 48)
                    .background(theme.palette.background.tertiary)
                    .cornerRadius(24)
            }
            .accessibilityLabel("Stop")
            .accessibilityHint("Stop all playback and reset to beginning")

            // Play/Pause button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    state.toggleMasterPlay()
                    hapticGenerator.impactOccurred()
                }
            } label: {
                Image(systemName: state.isMasterPlaying ? "pause.fill" : "play.fill")
                    .font(.title)
                    .foregroundColor(state.isMasterPlaying ? theme.palette.accent.primary : theme.palette.background.primary)
                    .frame(width: 64, height: 64)
                    .background(state.isMasterPlaying ? theme.palette.accent.primary.opacity(0.1) : theme.palette.accent.primary)
                    .cornerRadius(32)
            }
            .accessibilityLabel(state.isMasterPlaying ? "Pause" : "Play")
            .accessibilityHint("Toggle master playback for all songs")

            // Loop button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    state.masterTransport.isLooping.toggle()
                    hapticGenerator.impactOccurred(intensity: 0.5)
                }
            } label: {
                Image(systemName: state.masterTransport.isLooping ? "repeat.1" : "repeat")
                    .font(.title3)
                    .foregroundColor(state.masterTransport.isLooping ? theme.palette.accent.primary : theme.palette.text.secondary)
                    .frame(width: 48, height: 48)
                    .background(state.masterTransport.isLooping ? theme.palette.accent.primary.opacity(0.1) : theme.palette.background.tertiary)
                    .cornerRadius(24)
            }
            .accessibilityLabel(state.masterTransport.isLooping ? "Looping On" : "Looping Off")
            .accessibilityHint("Toggle loop mode")
        }
    }

    // MARK: - Sync Mode Selector

    private var syncModeSelector: some View {
        Menu {
            ForEach(MultiSongState.SyncMode.allCases, id: \.self) { mode in
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        state.syncMode = mode
                        hapticGenerator.impactOccurred(intensity: 0.5)
                    }
                } label: {
                    HStack {
                        Text(mode.rawValue)
                        if state.syncMode == mode {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: state.syncMode.icon)
                    .font(.caption)
                    .foregroundColor(theme.palette.accent.primary)

                Text(state.syncMode.rawValue)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(theme.palette.text.primary)

                Image(systemName: "chevron.down")
                    .font(.caption)
                    .foregroundColor(theme.palette.text.tertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(theme.palette.background.tertiary)
            .cornerRadius(12)
        }
        .accessibilityLabel("Sync mode")
        .accessibilityValue(state.syncMode.rawValue)
        .accessibilityHint("Choose synchronization mode between songs")
    }

    // MARK: - Bottom Section

    private var bottomSection: some View {
        VStack(spacing: 12) {
            // Master tempo and volume
            HStack(spacing: 16) {
                // Master tempo
                masterTempoControl

                Spacer()

                // Master volume
                masterVolumeControl
            }
            .padding(.horizontal, 16)

            // Action buttons
            actionButtons
                .padding(.horizontal, 16)
        }
        .padding(16)
    }

    // MARK: - Master Tempo Control

    private var masterTempoControl: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "metronome")
                    .font(.caption)
                    .foregroundColor(theme.palette.text.tertiary)

                Text("Master Tempo")
                    .font(.caption)
                    .foregroundColor(theme.palette.text.secondary)

                Spacer()

                Text(String(format: "%.1fx", state.masterTempo))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(theme.palette.accent.primary)
            }

            Slider(value: $state.masterTempo, in: 0.5...2.0, step: 0.1)
                .accentColor(theme.palette.accent.primary)
                .frame(height: 20)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Master tempo")
        .accessibilityValue(String(format: "%.1f times", state.masterTempo))
        .accessibilityHint("Controls tempo for all songs in ratio or locked mode")
    }

    // MARK: - Master Volume Control

    private var masterVolumeControl: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "speaker.wave.3")
                    .font(.caption)
                    .foregroundColor(theme.palette.text.tertiary)

                Text("Master Volume")
                    .font(.caption)
                    .foregroundColor(theme.palette.text.secondary)

                Spacer()

                Text(String(format: "%.0f%%", state.masterVolume * 100))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(theme.palette.accent.primary)
            }

            Slider(value: $state.masterVolume, in: 0...1, step: 0.05)
                .accentColor(theme.palette.accent.primary)
                .frame(height: 20)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Master volume")
        .accessibilityValue(String(format: "%.0f percent", state.masterVolume * 100))
        .accessibilityHint("Controls overall volume for all songs")
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 12) {
            // Add song button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    // Add song action
                    hapticGenerator.impactOccurred(intensity: 0.5)
                }
            } label: {
                Label("Add Song", systemImage: "plus.circle.fill")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(theme.palette.accent.primary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity)
                    .background(theme.palette.accent.primary.opacity(0.1))
                    .cornerRadius(12)
            }
            .accessibilityLabel("Add song")
            .accessibilityHint("Add a new song to the player")

            // Save preset button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    // Save preset action
                    notificationGenerator.notificationOccurred(.success)
                }
            } label: {
                Label("Save", systemImage: "square.and.arrow.down.fill")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(theme.palette.background.primary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity)
                    .background(theme.palette.accent.primary)
                    .cornerRadius(12)
            }
            .accessibilityLabel("Save preset")
            .accessibilityHint("Save current configuration as a preset")
        }
    }
}

// =============================================================================
// MARK: - Loop Controls
// =============================================================================

/**
 Loop controls for master transport
 */
struct LoopControls: View {

    @Binding var transport: MasterTransportState
    @Environment(\.theme) var theme

    var body: some View {
        VStack(spacing: 8) {
            // Loop range slider
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    RoundedRectangle(cornerRadius: 4)
                        .fill(theme.palette.borders.subtle)
                        .frame(height: 8)

                    // Loop range
                    RoundedRectangle(cornerRadius: 4)
                        .fill(theme.palette.accent.primary.opacity(0.3))
                        .frame(
                            width: geometry.size.width * (transport.loopEnd - transport.loopStart),
                            height: 8
                        )
                        .offset(x: geometry.size.width * transport.loopStart)

                    // Start handle
                    Circle()
                        .fill(theme.palette.accent.primary)
                        .frame(width: 16, height: 16)
                        .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                        .offset(x: (geometry.size.width * transport.loopStart) - 8)
                        .gesture(
                            DragGesture()
                                .onChanged { value in
                                    transport.loopStart = min(max(value.location.x / value.location.x, 0), transport.loopEnd - 0.1)
                                }
                        )

                    // End handle
                    Circle()
                        .fill(theme.palette.accent.primary)
                        .frame(width: 16, height: 16)
                        .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                        .offset(x: (geometry.size.width * transport.loopEnd) - 8)
                        .gesture(
                            DragGesture()
                                .onChanged { value in
                                    transport.loopEnd = min(max(value.location.x / value.location.x, transport.loopStart + 0.1), 1)
                                }
                        )
                }
            }
            .frame(height: 8)

            // Loop time display
            HStack {
                Text("Start: \(formatTime(transport.loopStart))")
                    .font(.caption2)
                    .foregroundColor(theme.palette.text.tertiary)

                Spacer()

                Text("End: \(formatTime(transport.loopEnd))")
                    .font(.caption2)
                    .foregroundColor(theme.palette.text.tertiary)
            }
        }
        .padding(16)
        .background(theme.palette.background.tertiary)
        .cornerRadius(12)
    }

    private func formatTime(_ progress: Double) -> String {
        let totalDuration: TimeInterval = 180.0 // This should come from actual song duration
        let seconds = totalDuration * progress
        let minutes = Int(seconds) / 60
        let secs = Int(seconds) % 60
        return String(format: "%02d:%02d", minutes, secs)
    }
}

// =============================================================================
// MARK: - Visual Timeline
// =============================================================================

/**
 Visual timeline showing parallel progress for all songs
 */
struct VisualTimeline: View {

    @ObservedObject var state: MultiSongState
    @Environment(\.theme) var theme

    var body: some View {
        VStack(spacing: 8) {
            // Timeline label
            HStack {
                Text("Timeline")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(theme.palette.text.tertiary)

                Spacer()
            }

            // Parallel progress bars
            VStack(spacing: 4) {
                ForEach(state.songs) { slot in
                    SongProgressRow(slot: slot)
                }
            }
        }
        .padding(16)
        .background(theme.palette.background.secondary)
        .cornerRadius(12)
    }
}

// =============================================================================
// MARK: - Song Progress Row
// =============================================================================

/**
 Single song progress row in the visual timeline
 */
struct SongProgressRow: View {

    var slot: SongSlot
    @Environment(\.theme) var theme

    var body: some View {
        HStack(spacing: 8) {
            // Song name
            Text(slot.song?.name ?? "Empty")
                .font(.caption2)
                .foregroundColor(slot.transport.isMuted ? theme.palette.text.tertiary : theme.palette.text.secondary)
                .frame(width: 80, alignment: .leading)
                .lineLimit(1)

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    RoundedRectangle(cornerRadius: 2)
                        .fill(theme.palette.borders.subtle)
                        .frame(height: 4)

                    // Progress fill
                    RoundedRectangle(cornerRadius: 2)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    slot.transport.isSolo ? theme.palette.accent.secondary : theme.palette.accent.primary,
                                    slot.transport.isSolo ? theme.palette.accent.tertiary : theme.palette.accent.secondary
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * (slot.transport.currentPosition / 180.0), height: 4) // Assuming 3 min song
                        .opacity(slot.transport.isMuted ? 0.3 : 1.0)

                    // Playhead
                    Circle()
                        .fill(slot.transport.isPlaying ? theme.palette.feedback.success : theme.palette.text.tertiary)
                        .frame(width: 8, height: 8)
                        .offset(x: (geometry.size.width * (slot.transport.currentPosition / 180.0)) - 4)
                }
            }
            .frame(height: 4)

            // Current time
            Text(String(format: "%02d:%02d", Int(slot.transport.currentPosition) / 60, Int(slot.transport.currentPosition) % 60))
                .font(.caption2)
                .foregroundColor(theme.palette.text.tertiary)
                .frame(width: 40, alignment: .trailing)
        }
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#Preview("Master Controls") {
    let state = MultiSongState.createEmptySession()

    VStack {
        Spacer()

        MasterTransportControls(state: state)
            .padding()

        Spacer()
    }
    .background(Color(UIColor.systemBackground))
}
