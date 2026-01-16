//
//  SongCard.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Song Card
// =============================================================================

/**
 A card displaying a song in the library

 Platform adaptations:
 - iOS: Tap to select, swipe actions, compact layout
 - macOS: Hover effects, click to select, larger layout
 - tvOS: Focus engine, select button, high contrast
 */
public struct SongCard: View {

    // MARK: - Properties

    let song: SongOrderContract
    let isSelected: Bool
    let onTap: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // MARK: - Computed Properties

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    // MARK: - Initialization

    public init(
        song: SongOrderContract,
        isSelected: Bool = false,
        onTap: @escaping () -> Void,
        onEdit: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.song = song
        self.isSelected = isSelected
        self.onTap = onTap
        self.onEdit = onEdit
        self.onDelete = onDelete
    }

    // MARK: - Body

    public var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: isCompact ? Spacing.small : Spacing.medium) {
                // Header
                headerView

                Divider()

                // Details
                detailsView

                // Tags
                if !song.tags.isEmpty {
                    tagsView
                }
            }
            .padding(isCompact ? Spacing.medium : Spacing.large)
            .background(
                RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium)
                    .fill(Color.secondaryBackground)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium)
                    .stroke(borderColor, lineWidth: borderWidth)
            )
            .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: shadowOffset)
        }
        .buttonStyle(PlainButtonStyle())
        .contextMenu {
            contextualMenu
        }
        .tvFocusable()
    }

    // MARK: - Header View

    private var headerView: some View {
        HStack(spacing: Spacing.medium) {
            VStack(alignment: .leading, spacing: Spacing.xSmall) {
                Text(song.name)
                    .font(isCompact ? .displaySmall : .displayMedium)
                    .foregroundColor(.primaryText)
                    .lineLimit(1)

                if let description = song.description {
                    Text(description)
                        .font(.bodySmall)
                        .foregroundColor(.secondaryText)
                        .lineLimit(2)
                }
            }

            Spacer()

            // Intent icon
            intentIcon
        }
    }

    // MARK: - Details View

    private var detailsView: some View {
        HStack(spacing: isCompact ? Spacing.small : Spacing.medium) {
            // Intent
            detailItem(
                icon: "sparkles",
                label: song.intent.displayName,
                color: intentColor(song.intent)
            )

            // Motion
            detailItem(
                icon: "arrow.forward",
                label: song.motion.displayName,
                color: .blue
            )

            // Harmony
            detailItem(
                icon: "music.note",
                label: song.harmonicBehavior.displayName,
                color: .purple
            )

            Spacer()

            // Certainty indicator
            certaintyIndicator
        }
    }

    private func detailItem(icon: String, label: String, color: Color) -> some View {
        HStack(spacing: Spacing.xSmall) {
            Image(systemName: icon)
                .font(isCompact ? .labelSmall : .labelMedium)
                .foregroundColor(color)

            Text(label)
                .font(isCompact ? .labelSmall : .labelMedium)
                .foregroundColor(.secondaryText)
        }
    }

    // MARK: - Certainty Indicator

    private var certaintyIndicator: some View {
        VStack(alignment: .trailing, spacing: Spacing.xSmall) {
            Text("Certainty")
                .font(isCompact ? .labelSmall : .labelSmall)
                .foregroundColor(.tertiaryText)

            HStack(spacing: Spacing.xSmall) {
                Text(certaintyLabel)
                    .font(isCompact ? .labelMedium : .labelLarge)
                    .fontWeight(.semibold)
                    .foregroundColor(certaintyColor)

                Image(systemName: certaintyIcon)
                    .font(isCompact ? .labelSmall : .labelMedium)
                    .foregroundColor(certaintyColor)
            }
        }
    }

    private var certaintyLabel: String {
        switch song.certainty {
        case 0.0..<0.33:
            return "Certain"
        case 0.33..<0.66:
            return "Balanced"
        case 0.66..<1.0:
            return "Tense"
        default:
            return "Volatile"
        }
    }

    private var certaintyColor: Color {
        switch song.certainty {
        case 0.0..<0.33:
            return .success
        case 0.33..<0.66:
            return .warning
        case 0.66..<1.0:
            return .error
        default:
            return .destructive
        }
    }

    private var certaintyIcon: String {
        switch song.certainty {
        case 0.0..<0.33:
            return "checkmark.circle.fill"
        case 0.33..<0.66:
            return "minus.circle.fill"
        case 0.66..<1.0:
            return "exclamationmark.triangle.fill"
        default:
            return "xmark.circle.fill"
        }
    }

    // MARK: - Tags View

    private var tagsView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.xSmall) {
                ForEach(song.tags, id: \.self) { tag in
                    Text(tag)
                        .font(isCompact ? .labelSmall : .labelSmall)
                        .foregroundColor(.secondaryText)
                        .padding(.horizontal, Spacing.small)
                        .padding(.vertical, Spacing.xSmall)
                        .background(
                            Capsule()
                                .fill(Color.tertiaryBackground)
                        )
                }
            }
        }
    }

    // MARK: - Intent Icon

    private var intentIcon: some View {
        ZStack {
            Circle()
                .fill(intentColor(song.intent).opacity(0.2))
                .frame(
                    width: isCompact ? 40 : 50,
                    height: isCompact ? 40 : 50
                )

            Image(systemName: intentIconName(song.intent))
                .font(isCompact ? .title3 : .title2)
                .foregroundColor(intentColor(song.intent))
        }
    }

    private func intentIconName(_ intent: Intent) -> String {
        switch intent {
        case .identity:
            return "person.fill"
        case .song:
            return "music.quarternote.3"
        case .cue:
            return "film.fill"
        case .ritual:
            return "flame.fill"
        case .loop:
            return "repeat"
        }
    }

    private func intentColor(_ intent: Intent) -> Color {
        switch intent {
        case .identity:
            return .identityIntent
        case .song:
            return .songIntent
        case .cue:
            return .cueIntent
        case .ritual:
            return .ritualIntent
        case .loop:
            return .loopIntent
        }
    }

    // MARK: - Contextual Menu

    @ViewBuilder
    private var contextualMenu: some View {
        Button(action: onEdit) {
            Label("Edit", systemImage: "pencil")
        }

        Button(role: .destructive, action: onDelete) {
            Label("Delete", systemImage: "trash")
        }

        #if os(macOS)
        Button(action: {} ) {
            Label("Duplicate", systemImage: "doc.on.doc")
        }
        #endif
    }

    // MARK: - Styling

    private var borderColor: Color {
        isSelected ? .brand : .clear
    }

    private var borderWidth: CGFloat {
        isSelected ? Spacing.borderMedium : 0
    }

    private var shadowColor: Color {
        isSelected ? .brand.opacity(0.3) : .black.opacity(0.08)
    }

    private var shadowRadius: CGFloat {
        isSelected ? Spacing.shadowLarge : Spacing.shadowMedium
    }

    private var shadowOffset: CGFloat {
        isSelected ? Spacing.shadowMedium : Spacing.shadowSmall
    }
}

// =============================================================================
// MARK: - Song Order Contract Extension
// =============================================================================

private extension SongOrderContract {
    var tags: [String] {
        // Extract tags from contract properties
        var tags: [String] = []

        tags.append(intent.displayName)
        tags.append(motion.displayName)

        if certainty > 0.66 {
            tags.append("Volatile")
        } else if certainty < 0.33 {
            tags.append("Certain")
        }

        return tags
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct SongCard_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iOS - Compact
            SongCard(
                song: mockContract,
                isSelected: true,
                onTap: {},
                onEdit: {},
                onDelete: {}
            )
            .previewDevice("iPhone 14 Pro")
            .previewDisplayName("iOS - Selected")

            // iOS - Normal
            SongCard(
                song: mockContract,
                isSelected: false,
                onTap: {},
                onEdit: {},
                onDelete: {}
            )
            .previewDevice("iPhone 14 Pro")
            .previewDisplayName("iOS - Normal")

            // macOS
            SongCard(
                song: mockContract,
                isSelected: false,
                onTap: {},
                onEdit: {},
                onDelete: {}
            )
            .previewDevice("Mac Pro")
            .previewDisplayName("macOS")

            // tvOS
            SongCard(
                song: mockContract,
                isSelected: false,
                onTap: {},
                onEdit: {},
                onDelete: {}
            )
            .previewDevice("Apple TV")
            .previewDisplayName("tvOS")
        }
        .padding()
        .frame(width: 400)
    }

    private static let mockContract = SongOrderContract(
        name: "HBO Cue",
        description: "Tense, accelerating dramatic cue for scene",
        intent: .cue,
        motion: .accelerating,
        harmonicBehavior: .revealed,
        certainty: 0.6,
        identityLocks: IdentityLocks(rhythm: true, pitch: false, form: true),
        evolutionMode: .adaptive
    )
}
#endif
