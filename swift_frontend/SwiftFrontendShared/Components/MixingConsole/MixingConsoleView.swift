//
//  MixingConsoleView.swift
//  White Room Mixing Console
//
//  Professional mixing console UI
//

import SwiftUI

public struct MixingConsoleView: View {
    @StateObject private var console = MixingConsole()
    @State private var selectedChannel: String?

    public init() {}

    public var body: some View {
        VStack(spacing: 0) {
            // Console header
            consoleHeader

            // Channel strips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    // Mix channels
                    ForEach(console.channels) { channel in
                        ChannelStripView(
                            channel: channel,
                            isSelected: selectedChannel == channel.id
                        )
                        .onTapGesture {
                            selectedChannel = channel.id
                        }
                    }

                    // Master bus (wider)
                    ChannelStripView(
                        channel: console.masterBus,
                        isMaster: true,
                        isSelected: selectedChannel == "master"
                    )
                    .frame(width: 100)
                    .onTapGesture {
                        selectedChannel = "master"
                    }
                }
                .padding()
            }
            .background(Color.secondaryBackground)
        }
    }

    private var consoleHeader: some View {
        HStack {
            Text("Mixing Console")
                .font(.headline)
                .foregroundColor(.primary)

            Spacer()

            HStack(spacing: 16) {
                Button("Reset All") {
                    resetAllLevels()
                }
                .buttonStyle(.bordered)

                Button("Save Preset") {
                    savePreset()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .background(Color.tertiaryBackground)
    }

    private func resetAllLevels() {
        for channel in console.channels {
            console.setVolume(id: channel.id, volume: 0.8)
            console.setPan(id: channel.id, pan: 0.0)
            console.setMute(id: channel.id, muted: false)
            console.setSolo(id: channel.id, solo: false)
        }
    }

    private func savePreset() {
        // TODO: Implement preset saving
        print("Saving preset...")
    }
}

// MARK: - Channel Strip View

struct ChannelStripView: View {
    @ObservedObject var channel: ChannelStrip
    var isMaster: Bool = false
    var isSelected: Bool = false

    @State private var isDraggingVolume = false
    @State private var isDraggingPan = false

    var body: some View {
        VStack(spacing: 8) {
            // Channel name
            Text(channel.name)
                .font(.caption)
                .fontWeight(isSelected ? .bold : .regular)
                .lineLimit(1)
                .foregroundColor(.primary)

            // Mute/Solo buttons
            if !isMaster {
                HStack(spacing: 4) {
                    Button(action: { channel.isMuted.toggle() }) {
                        Text("M")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .frame(width: 24, height: 20)
                    }
                    .buttonStyle(.bordered)
                    .foregroundColor(channel.isMuted ? .red : .primary)

                    Button(action: { channel.isSolo.toggle() }) {
                        Text("S")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .frame(width: 24, height: 20)
                    }
                    .buttonStyle(.bordered)
                    .foregroundColor(channel.isSolo ? .yellow : .primary)
                }
            }

            // Volume fader (vertical)
            VStack(spacing: 4) {
                Text("Vol")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                GeometryReader { geometry in
                    ZStack(alignment: .bottom) {
                        // Track
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.tertiaryBackground)
                            .frame(height: 120)

                        // Fill
                        RoundedRectangle(cornerRadius: 4)
                            .fill(
                                LinearGradient(
                                    colors: [.green, .yellow, .orange, .red],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .frame(height: CGFloat(channel.volume) * geometry.size.height)
                    }
                }
                .frame(height: 120)
                .gesture(
                    DragGesture()
                        .onChanged { gesture in
                            isDraggingVolume = true
                            let delta = -gesture.translation.height / 120
                            channel.volume = max(0.0, min(1.0, channel.volume + delta))
                        }
                        .onEnded { _ in
                            isDraggingVolume = false
                        }
                )

                // Volume display
                Text(String(format: "%.1f dB", channel.volumeDB))
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .frame(width: 60)
            }

            // Pan knob
            VStack(spacing: 4) {
                Text("Pan")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                KnobView(
                    value: $channel.pan,
                    range: -1.0...1.0
                )
                .frame(width: 50, height: 50)

                Text(panLabel)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            // Stereo meters
            HStack(spacing: 2) {
                MeterBar(level: $channel.levelL, peak: $channel.peakL)
                MeterBar(level: $channel.levelR, peak: $channel.peakR)
            }
        }
        .padding(8)
        .background(isSelected ? Color.accentColor.opacity(0.2) : Color.tertiaryBackground)
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
        )
    }

    private var panLabel: String {
        switch channel.pan {
        case -1.0: return "L"
        case 1.0: return "R"
        case 0.0: return "C"
        default: return String(format: "%.1f", channel.pan)
        }
    }
}

// MARK: - Meter Bar

struct MeterBar: View {
    @Binding var level: Double
    @Binding var peak: Double

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                Spacer()

                // Peak indicator
                Rectangle()
                    .fill(peak > -10 ? Color.red : Color.green)
                    .frame(height: 2)

                // Level bar
                Rectangle()
                    .fill(levelColor(level))
                    .frame(height: max(0, CGFloat(geometry.size.height) * CGFloat((60 + level) / 60)))
            }
        }
        .frame(width: 6)
        .background(Color.black.opacity(0.3))
        .cornerRadius(2)
    }

    private func levelColor(_ level: Double) -> Color {
        if level > -6 { return .red }
        if level > -12 { return .orange }
        if level > -24 { return .yellow }
        return .green
    }
}

// MARK: - Knob View

struct KnobView: View {
    @Binding var value: Double
    let range: ClosedRange<Double>

    @GestureState private var isDragging = false
    @State private var startPos: CGPoint = .zero
    @State private var startValue: Double = 0.0

    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .stroke(Color.secondary, lineWidth: 4)
                .frame(width: 50, height: 50)

            // Tick marks
            ForEach(0..<11) { i in
                RoundedRectangle(cornerRadius: 1)
                    .fill(i == 5 ? Color.accentColor : Color.secondary)
                    .frame(width: 2, height: i == 5 ? 8 : 4)
                    .offset(y: -20)
                    .rotationEffect(.degrees(Double(i) * 27 - 135))
            }

            // Indicator
            RoundedRectangle(cornerRadius: 2)
                .fill(Color.accentColor)
                .frame(width: 4, height: 15)
                .offset(y: -12)
                .rotationEffect(.degrees(rotationAngle), anchor: .center)
        }
        .frame(width: 50, height: 50)
        .scaleEffect(isDragging ? 1.1 : 1.0)
        .animation(.spring(response: 0.3), value: isDragging)
        .gesture(
            DragGesture()
                .onChanged { gesture in
                    if !isDragging {
                        startPos = gesture.startLocation
                        startValue = value
                    }

                    let deltaY = startPos.y - gesture.location.y
                    let delta = deltaY / 100
                    value = max(range.lowerBound, min(range.upperBound, startValue + delta))
                }
        )
    }

    private var rotationAngle: Double {
        let normalized = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        return -135 + (normalized * 270)
    }
}

// MARK: - Preview

#Preview {
    MixingConsoleView()
        .frame(width: 800, height: 400)
        .preferredColorScheme(.dark)
}
