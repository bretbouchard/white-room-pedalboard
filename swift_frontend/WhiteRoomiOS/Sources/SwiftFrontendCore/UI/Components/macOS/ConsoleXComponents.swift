//
//  ConsoleXComponents.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

#if os(macOS)

import SwiftUI

/**
 ConsoleX channel strip component for detailed mixer control.
 */
public struct ConsoleXChannelStrip: View {
    let track: TrackConfig
    let isMuted: Bool
    let isSolo: Bool
    let onVolumeChange: (Double) -> Void
    let onPanChange: (Double) -> Void
    let onMuteToggle: () -> Void
    let onSoloToggle: () -> Void

    @State private var volume: Double
    @State private var pan: Double

    public init(
        track: TrackConfig,
        isMuted: Bool,
        isSolo: Bool,
        onVolumeChange: @escaping (Double) -> Void,
        onPanChange: @escaping (Double) -> Void,
        onMuteToggle: @escaping () -> Void,
        onSoloToggle: @escaping () -> Void
    ) {
        self.track = track
        self.isMuted = isMuted
        self.isSolo = isSolo
        self.onVolumeChange = onVolumeChange
        self.onPanChange = onPanChange
        self.onMuteToggle = onMuteToggle
        self.onSoloToggle = onSoloToggle
        self._volume = State(initialValue: track.volume)
        self._pan = State(initialValue: track.pan)
    }

    public var body: some View {
        VStack(spacing: 12) {
            // Track name
            Text(track.name)
                .font(.caption)
                .fontWeight(.semibold)
                .lineLimit(2)
                .frame(height: 40)

            // Volume meter
            VStack(spacing: 2) {
                // Meter (visual representation)
                Rectangle()
                    .fill(meterGradient)
                    .frame(width: 20, height: 150)
                    .overlay(
                        // Peak indicator
                        Rectangle()
                            .fill(Color.red)
                            .frame(width: 20, height: 3)
                            .offset(y: -70)
                    )
                    .cornerRadius(4)

                // Volume fader
                VStack(spacing: 4) {
                    Slider(value: $volume, in: 0...1) { _ in
                        onVolumeChange(volume)
                    }
                    .labelsHidden()
                    .rotationEffect(.degrees(-90))
                    .frame(width: 150, height: 20)

                    Text("\(Int(volume * 100))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            // Pan knob
            VStack(spacing: 4) {
                ZStack {
                    Circle()
                        .stroke(Color.secondary.opacity(0.3), lineWidth: 2)
                        .frame(width: 40, height: 40)

                    // Indicator
                    Rectangle()
                        .fill(Color.accentColor)
                        .frame(width: 2, height: 15)
                        .offset(y: -10)
                        .rotationEffect(.degrees(pan * 180))
                }

                Text(panLabel)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            // Mute/Solo buttons
            HStack(spacing: 8) {
                Button(action: onMuteToggle) {
                    Text("M")
                        .font(.caption)
                        .fontWeight(.bold)
                        .frame(width: 28, height: 28)
                        .background(isMuted ? Color.yellow : Color.secondary.opacity(0.2))
                        .foregroundColor(isMuted ? .black : .primary)
                        .cornerRadius(4)
                }
                .buttonStyle(.plain)

                Button(action: onSoloToggle) {
                    Text("S")
                        .font(.caption)
                        .fontWeight(.bold)
                        .frame(width: 28, height: 28)
                        .background(isSolo ? Color.blue : Color.secondary.opacity(0.2))
                        .foregroundColor(isSolo ? .white : .primary)
                        .cornerRadius(4)
                }
                .buttonStyle(.plain)
            }

            Spacer()
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(8)
    }

    private var meterGradient: LinearGradient {
        LinearGradient(
            gradient: Gradient(colors: [
                .green,
                .yellow,
                .orange,
                .red
            ]),
            startPoint: .bottom,
            endPoint: .top
        )
    }

    private var panLabel: String {
        switch pan {
        case (-1.0)..<(-0.3):
            return "L"
        case (-0.3)..<(-0.1):
            return "L-C"
        case (-0.1)..<(0.1):
            return "C"
        case (0.1)..<(0.3):
            return "R-C"
        case (0.3)...(1.0):
            return "R"
        default:
            return "C"
        }
    }
}

/**
 Template card for the Template Manager.
 */
// DUPLICATE: public struct TemplateCard: View {
// DUPLICATE:     let template: PerformanceTemplate
// DUPLICATE:     let onApply: (String) -> Void
// DUPLICATE:     let onDelete: () -> Void
// DUPLICATE: 
// DUPLICATE:     @State private var isHovered = false
// DUPLICATE: 
// DUPLICATE:     public var body: some View {
// DUPLICATE:         VStack(alignment: .leading, spacing: 8) {
// DUPLICATE:             HStack {
// DUPLICATE:                 VStack(alignment: .leading, spacing: 4) {
// DUPLICATE:                     Text(template.name)
// DUPLICATE:                         .font(.headline)
// DUPLICATE: 
// DUPLICATE:                     Text(template.description)
// DUPLICATE:                         .font(.caption)
// DUPLICATE:                         .foregroundColor(.secondary)
// DUPLICATE:                 }
// DUPLICATE: 
// DUPLICATE:                 Spacer()
// DUPLICATE: 
// DUPLICATE:                 if isHovered {
// DUPLICATE:                     Button(action: onDelete) {
// DUPLICATE:                         Image(systemName: "trash")
// DUPLICATE:                             .foregroundColor(.red)
// DUPLICATE:                     }
// DUPLICATE:                     .buttonStyle(.plain)
// DUPLICATE:                 }
// DUPLICATE:             }
// DUPLICATE: 
// DUPLICATE:             Divider()
// DUPLICATE: 
// DUPLICATE:             VStack(alignment: .leading, spacing: 4) {
// DUPLICATE:                 Text("Mode: \(template.performance.mode.rawValue.capitalized)")
// DUPLICATE:                     .font(.caption)
// DUPLICATE:                     .foregroundColor(.secondary)
// DUPLICATE: 
// DUPLICATE:                 Text("Density: \(Int(template.performance.globalDensityMultiplier * 100))%")
// DUPLICATE:                     .font(.caption)
// DUPLICATE:                     .foregroundColor(.secondary)
// DUPLICATE: 
// DUPLICATE:                 Text("Tempo: x\(template.performance.tempoMultiplier, specifier: "%.1f")")
// DUPLICATE:                     .font(.caption)
// DUPLICATE:                     .foregroundColor(.secondary)
// DUPLICATE:             }
// DUPLICATE: 
// DUPLICATE:             Spacer()
// DUPLICATE: 
// DUPLICATE:             Button("Apply to Song") {
// DUPLICATE:                 onApply(template.id)
// DUPLICATE:             }
// DUPLICATE:             .buttonStyle(.borderedProminent)
// DUPLICATE:             .frame(maxWidth: .infinity)
// DUPLICATE:         }
// DUPLICATE:         .padding()
// DUPLICATE:         .frame(height: 150)
// DUPLICATE:         .background(Color(NSColor.controlBackgroundColor))
// DUPLICATE:         .cornerRadius(8)
// DUPLICATE:         .onHover { hovering in
// DUPLICATE:             isHovered = hovering
// DUPLICATE:         }
// DUPLICATE:     }
// DUPLICATE: }

/**
 Available templates - placeholder data
 */
private let availableTemplates: [PerformanceTemplate] = [
    PerformanceTemplate(
        id: "template-1",
        name: "HBO Cue",
        description: "Tense, accelerating orchestral cue",
        performance: PerformanceState(
            id: "default",
            name: "HBO Cue Template",
            version: "1.0",
            mode: .custom,
            roleOverrides: [:],
            globalDensityMultiplier: 0.75,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .push,
            tempoMultiplier: 1.2,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: ["tense", "accelerating"],
            createdAt: Date(),
            updatedAt: Date()
        )
    ),
    PerformanceTemplate(
        id: "template-2",
        name: "Ambient Loop",
        description: "Sparse, evolving ambient texture",
        performance: PerformanceState(
            id: "default",
            name: "Ambient Loop Template",
            version: "1.0",
            mode: .custom,
            roleOverrides: [:],
            globalDensityMultiplier: 0.3,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .drag,
            tempoMultiplier: 0.8,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: ["ambient", "evolving"],
            createdAt: Date(),
            updatedAt: Date()
        )
    ),
    PerformanceTemplate(
        id: "template-3",
        name: "Ritual Collage",
        description: "Complex, layered ritual music",
        performance: PerformanceState(
            id: "default",
            name: "Ritual Collage Template",
            version: "1.0",
            mode: .custom,
            roleOverrides: [:],
            globalDensityMultiplier: 0.9,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .swing,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: ["ritual", "layered"],
            createdAt: Date(),
            updatedAt: Date()
        )
    )
]

#endif
