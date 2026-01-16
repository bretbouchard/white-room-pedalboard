//
//  SongCard.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

#if os(macOS)

import SwiftUI

/**
 Card component displaying a song and its performances in the Song Orchestrator.
 */
public struct SongCard: View {
    let song: Song
    let performances: [PerformanceState]
    let isSelected: Bool
    let onSelect: () -> Void
    let onEditPerformance: (PerformanceState) -> Void
    let onDuplicatePerformance: (PerformanceState) -> Void
    let onDeletePerformance: (PerformanceState) -> Void

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(song.name)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text("\(song.sections.count) sections • \(song.roles.count) roles")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Menu button
                Menu {
                    Button("Edit Song", action: onSelect)
                    Button("Duplicate") {
                        // Duplicate song
                    }
                    Divider()
                    Button("Export") {
                        // Export song
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                .menuStyle(.borderlessButton)
            }

            Divider()

            // Performances List
            if performances.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "music.note")
                        .font(.title)
                        .foregroundColor(.secondary)

                    Text("No performances")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Button("Create Performance") {
                        // Create new performance
                    }
                    .buttonStyle(.borderedProminent)
                }
                .frame(maxWidth: .infinity)
                .padding()
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(performances) { performance in
                        PerformanceRow(
                            performance: performance,
                            onEdit: { onEditPerformance(performance) },
                            onDuplicate: { onDuplicatePerformance(performance) },
                            onDelete: { onDeletePerformance(performance) }
                        )
                    }
                }
            }

            // Footer
            HStack {
                Text("Tempo: \(Int(song.metadata.tempo)) BPM")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if let timeSig = song.metadata.timeSignature.first,
                   let timeSigDenom = song.metadata.timeSignature.last {
                    Text("\(timeSig)/\(timeSigDenom)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(NSColor.controlBackgroundColor))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
        )
        .shadow(radius: isSelected ? 4 : 2)
        .onTapGesture {
            onSelect()
        }
    }
}

/**
 Row component for a single performance in the song card.
 */
private struct PerformanceRow: View {
    let performance: PerformanceState
    let onEdit: () -> Void
    let onDuplicate: () -> Void
    let onDelete: () -> Void

    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 8) {
            // Mode indicator
            Circle()
                .fill(modeColor)
                .frame(width: 8, height: 8)

            // Performance name
            VStack(alignment: .leading, spacing: 2) {
                Text(performance.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                HStack(spacing: 4) {
                    Text(performance.mode.rawValue.capitalized)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.secondary.opacity(0.2))
                        .cornerRadius(4)

                    Text("\(Int(performance.globalDensityMultiplier * 100))% density")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            // Actions (shown on hover)
            if isHovered {
                HStack(spacing: 4) {
                    Button(action: onEdit) {
                        Image(systemName: "pencil")
                            .font(.caption)
                    }
                    .buttonStyle(.borderless)

                    Button(action: onDuplicate) {
                        Image(systemName: "doc.on.doc")
                            .font(.caption)
                    }
                    .buttonStyle(.borderless)

                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .font(.caption)
                    }
                    .buttonStyle(.borderless)
                    .foregroundColor(.red)
                }
                .transition(.opacity)
            }
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .background(isHovered ? Color.secondary.opacity(0.1) : Color.clear)
        .cornerRadius(6)
        .onHover { hovering in
            isHovered = hovering
        }
    }

    private var modeColor: Color {
        switch performance.mode {
        case .piano:
            return .blue
        case .satb:
            return .green
        case .techno:
            return .purple
        case .custom:
            return .orange
        }
    }
}

#endif
