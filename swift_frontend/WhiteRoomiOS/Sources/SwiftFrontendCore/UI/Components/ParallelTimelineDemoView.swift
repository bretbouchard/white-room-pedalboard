//
//  ParallelTimelineDemoView.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//
//  Comprehensive demo showcasing parallel timeline components.
//  Displays all features: progress bars, waveforms, markers, and controls.

import SwiftUI

// =============================================================================
// MARK: - Parallel Timeline Demo View
// =============================================================================

/**
 Demo view showcasing all parallel timeline components.

 Features:
 - Tab-based navigation between components
 - Interactive controls
 - Real-time updates
 - Beautiful visual design
 - Multiple layout options
 */
public struct ParallelTimelineDemoView: View {

    // MARK: - State

    @StateObject private var engine = MultiSongEngine()
    @State private var selectedTab: DemoTab = .progress
    @State private var showingControls = false

    // MARK: - Environment

    @Environment(\.colorScheme) private var colorScheme

    // MARK: - Types

    enum DemoTab: String, CaseIterable {
        case progress = "Progress"
        case waveforms = "Waveforms"
        case markers = "Markers"
        case all = "All Together"

        var icon: String {
            switch self {
            case .progress: return "timeline.selection"
            case .waveforms: return "waveform.path"
            case .markers: return "scope"
            case .all: return "rectangle.stack"
            }
        }
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            demoHeader

            // Tab selection
            tabPicker

            // Content
            TabView(selection: $selectedTab) {
                // Progress tab
                progressTab
                    .tag(DemoTab.progress)

                // Waveforms tab
                waveformsTab
                    .tag(DemoTab.waveforms)

                // Markers tab
                markersTab
                    .tag(DemoTab.markers)

                // All together tab
                allTab
                    .tag(DemoTab.all)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // Bottom controls
            if showingControls {
                demoControls
            }
        }
        .background(backgroundColor)
    }

    // MARK: - Header

    private var demoHeader: some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Parallel Timeline")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Multi-song visualization demo")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Engine status
                HStack(spacing: 8) {
                    Circle()
                        .fill(engine.isPlaying ? Color.green : Color.orange)
                        .frame(width: 8, height: 8)

                    Text("\(engine.songs.count) songs")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.secondary.opacity(0.1))
                )
            }

            // Feature badges
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FeatureBadge(icon: "bolt.fill", text: "60fps")
                    FeatureBadge(icon: "waveform.path", text: "Waveforms")
                    FeatureBadge(icon: "arrow.left.arrow.right", text: "Scrubbing")
                    FeatureBadge(icon: "magnifyingglass", text: "Zoom")
                    FeatureBadge(icon: "repeat", text: "Looping")
                }
                .padding(.horizontal, 4)
            }
        }
        .padding()
    }

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 0) {
            ForEach(DemoTab.allCases, id: \.self) { tab in
                Button(action: { selectedTab = tab }) {
                    VStack(spacing: 6) {
                        Image(systemName: tab.icon)
                            .font(.title3)
                            .foregroundColor(selectedTab == tab ? accentColor : .secondary)

                        Text(tab.rawValue)
                            .font(.caption)
                            .fontWeight(selectedTab == tab ? .semibold : .regular)
                            .foregroundColor(selectedTab == tab ? accentColor : .secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(selectedTab == tab ? accentColor.opacity(0.1) : Color.clear)
                    )
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding()
    }

    // MARK: - Tabs

    private var progressTab: some View {
        VStack(spacing: 0) {
            ParallelProgressView(engine: engine)

            // Tab-specific info
            tabInfo(
                title: "Parallel Progress",
                description: "Multiple songs progressing like moving walkways. Drag to scrub, pinch to zoom.",
                tips: [
                    "Drag on any track to scrub",
                    "Pinch to zoom in/out",
                    "Use controls to play/pause"
                ]
            )
        }
    }

    private var waveformsTab: some View {
        VStack(spacing: 0) {
            MultiSongWaveformView(engine: engine)

            // Tab-specific info
            tabInfo(
                title: "Waveform Display",
                description: "Real-time waveform visualization with cached rendering for performance.",
                tips: [
                    "Playheads sync with engine",
                    "Loop regions highlighted",
                    "Cached for 60fps performance"
                ]
            )
        }
    }

    private var markersTab: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 16) {
                    ForEach(engine.songs.prefix(3)) { song in
                        MarkerDemoCard(song: song, engine: engine)
                    }
                }
                .padding()
            }

            // Tab-specific info
            tabInfo(
                title: "Timeline Markers",
                description: "Draggable loop markers with snap-to-grid and visual feedback.",
                tips: [
                    "Drag markers to reposition",
                    "Double-tap to reset",
                    "Markers snap to beat grid"
                ]
            )
        }
    }

    private var allTab: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 20) {
                    // Progress section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Progress Timeline")
                            .font(.headline)
                            .fontWeight(.semibold)

                        ParallelProgressView(engine: engine)
                            .frame(height: 400)
                    }

                    Divider()

                    // Waveforms section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Waveform Overview")
                            .font(.headline)
                            .fontWeight(.semibold)

                        MultiSongWaveformView(engine: engine)
                            .frame(height: 300)
                    }
                }
                .padding()
            }

            // Tab-specific info
            tabInfo(
                title: "All Components",
                description: "Complete view showing all timeline components working together.",
                tips: [
                    "All components sync in real-time",
                    "Smooth 60fps animations",
                    "Beautiful visual design"
                ]
            )
        }
    }

    // MARK: - Tab Info

    private func tabInfo(title: String, description: String, tips: [String]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Title and description
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)

                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Tips
            VStack(alignment: .leading, spacing: 6) {
                Text("Tips")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)

                ForEach(tips, id: \.self) { tip in
                    HStack(spacing: 8) {
                        Image(systemName: "lightbulb.fill")
                            .font(.caption2)
                            .foregroundColor(.yellow)

                        Text(tip)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            // Toggle controls button
            Button(action: { showingControls.toggle() }) {
                HStack {
                    Spacer()

                    Image(systemName: showingControls ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text(showingControls ? "Hide Controls" : "Show Controls")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Spacer()
                }
                .padding(.vertical, 8)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.secondary.opacity(0.05))
        )
        .padding()
    }

    // MARK: - Demo Controls

    private var demoControls: some View {
        VStack(spacing: 12) {
            // Playback controls
            HStack(spacing: 16) {
                Button(action: { engine.play() }) {
                    Label("Play", systemImage: "play.fill")
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.green)
                        .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())

                Button(action: { engine.pause() }) {
                    Label("Pause", systemImage: "pause.fill")
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.orange)
                        .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())

                Button(action: { engine.stop() }) {
                    Label("Stop", systemImage: "stop.fill")
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.red)
                        .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())

                Spacer()

                Button(action: { engine.loadDemoSongs() }) {
                    Label("Reset", systemImage: "arrow.counterclockwise")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())
            }

            // Zoom controls
            HStack {
                Text("Zoom")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Slider(value: Binding(
                    get: { engine.zoomLevel },
                    set: { engine.setZoomLevel($0) }
                ), in: 10...200)

                Text("\(Int(engine.zoomLevel))")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(width: 30)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.secondary.opacity(0.05))
        )
        .padding()
        .transition(.move(edge: .bottom))
    }

    // MARK: - Helper Properties

    private var backgroundColor: Color {
        colorScheme == .dark ? Color.black : Color.white
    }

    private var accentColor: Color {
        .blue
    }
}

// =============================================================================
// MARK: - Feature Badge
// =============================================================================

private struct FeatureBadge: View {

    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundColor(.blue)

            Text(text)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.blue.opacity(0.1))
        )
    }
}

// =============================================================================
// MARK: - Marker Demo Card
// =============================================================================

private struct MarkerDemoCard: View {

    let song: MultiSongState
    let engine: MultiSongEngine

    @State private var loopStart: Double = 30.0
    @State private var loopEnd: Double = 60.0
    @State private var isLooping: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Song header
            HStack {
                Text(song.name)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Spacer()

                Text("\(Int(loopStart))s - \(Int(loopEnd))s")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .monospacedDigit()
            }

            // Marker visualization
            ZStack(alignment: .leading) {
                // Background track
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.secondary.opacity(0.05))

                // Loop markers
                LoopMarkersPair(
                    loopStart: $loopStart,
                    loopEnd: $loopEnd,
                    duration: song.duration,
                    color: song.color,
                    isEnabled: isLooping
                )
                .frame(height: 60)
            }

            // Control panel
            MarkerControlPanel(
                loopStart: $loopStart,
                loopEnd: $loopEnd,
                isLooping: $isLooping,
                duration: song.duration,
                color: song.color
            )
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.secondary.opacity(0.05))
        )
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct ParallelTimelineDemoView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            ParallelTimelineDemoView()
                .previewDisplayName("Demo View")
                .preferredColorScheme(.light)

            ParallelTimelineDemoView()
                .previewDisplayName("Demo View - Dark")
                .preferredColorScheme(.dark)

            ParallelTimelineDemoView()
                .previewDevice("iPhone 14 Pro")
                .previewDisplayName("iPhone")

            ParallelTimelineDemoView()
                .previewDevice("iPad Pro (12.9-inch)")
                .previewDisplayName("iPad")
        }
    }
}
#endif
