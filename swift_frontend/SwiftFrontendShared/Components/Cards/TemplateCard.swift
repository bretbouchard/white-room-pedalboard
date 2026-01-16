//
//  TemplateCard.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Template Card
// =============================================================================

/**
 A card displaying a song contract template

 Platform adaptations:
 - iOS: Tap to apply, swipe for preview, compact layout
 - macOS: Hover for details, click to apply, larger layout
 - tvOS: Focus engine, select button to apply
 */
public struct TemplateCard: View {

    // MARK: - Properties

    let template: SongOrderTemplate
    let isSelected: Bool
    let onApply: () -> Void

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // MARK: - Computed Properties

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    // MARK: - Initialization

    public init(
        template: SongOrderTemplate,
        isSelected: Bool = false,
        onApply: @escaping () -> Void
    ) {
        self.template = template
        self.isSelected = isSelected
        self.onApply = onApply
    }

    // MARK: - Body

    public var body: some View {
        Button(action: onApply) {
            VStack(alignment: .leading, spacing: isCompact ? Spacing.small : Spacing.medium) {
                // Icon and Name
                headerView

                // Description
                descriptionView

                // Preview badges
                previewBadgesView
            }
            .padding(isCompact ? Spacing.medium : Spacing.large)
            .background(cardBackground)
            .overlay(cardBorder)
            .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: shadowOffset)
        }
        .buttonStyle(PlainButtonStyle())
        .tvFocusable()
        .macOSHover()
    }

    // MARK: - Header View

    private var headerView: some View {
        HStack(spacing: Spacing.medium) {
            // Template icon
            templateIcon

            VStack(alignment: .leading, spacing: Spacing.xSmall) {
                Text(template.displayName)
                    .font(isCompact ? .displaySmall : .displayMedium)
                    .foregroundColor(.primaryText)

                Text("Quick Start Template")
                    .font(isCompact ? .labelSmall : .labelSmall)
                    .foregroundColor(.tertiaryText)
            }

            Spacer()

            // Apply indicator
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(isCompact ? .title3 : .title2)
                    .foregroundColor(.brand)
            }
        }
    }

    // MARK: - Template Icon

    private var templateIcon: some View {
        ZStack {
            Circle()
                .fill(iconColor.opacity(0.2))
                .frame(
                    width: isCompact ? 50 : 60,
                    height: isCompact ? 50 : 60
                )

            Image(systemName: iconName)
                .font(isCompact ? .title2 : .title)
                .foregroundColor(iconColor)
        }
    }

    private var iconColor: Color {
        switch template {
        case .hboCue:
            return .cueIntent
        case .ambientLoop:
            return .loopIntent
        case .ritualCollage:
            return .ritualIntent
        case .performancePiece:
            return .songIntent
        }
    }

    private var iconName: String {
        switch template {
        case .hboCue:
            return "film.fill"
        case .ambientLoop:
            return "repeat"
        case .ritualCollage:
            return "flame.fill"
        case .performancePiece:
            return "music.quarternote.3"
        }
    }

    // MARK: - Description View

    private var descriptionView: some View {
        Text(template.description)
            .font(isCompact ? .bodyMedium : .bodyLarge)
            .foregroundColor(.secondaryText)
            .lineLimit(3)
    }

    // MARK: - Preview Badges View

    private var previewBadgesView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.xSmall) {
                ForEach(templateProperties, id: \.label) { property in
                    PropertyBadge(
                        label: property.label,
                        value: property.value,
                        color: property.color
                    )
                }
            }
        }
    }

    private var templateProperties: [(label: String, value: String, color: Color)] {
        switch template {
        case .hboCue:
            return [
                ("Intent", "Cue", .cueIntent),
                ("Motion", "Accelerating", .blue),
                ("Certainty", "Tense", .warning),
                ("Harmony", "Revealed", .purple)
            ]

        case .ambientLoop:
            return [
                ("Intent", "Loop", .loopIntent),
                ("Motion", "Oscillating", .blue),
                ("Certainty", "Certain", .success),
                ("Harmony", "Static", .purple)
            ]

        case .ritualCollage:
            return [
                ("Intent", "Ritual", .ritualIntent),
                ("Motion", "Colliding", .blue),
                ("Certainty", "Volatile", .error),
                ("Harmony", "Expanding", .purple)
            ]

        case .performancePiece:
            return [
                ("Intent", "Song", .songIntent),
                ("Motion", "Static", .blue),
                ("Certainty", "Certain", .success),
                ("Harmony", "Cyclic", .purple)
            ]
        }
    }

    // MARK: - Card Styling

    private var cardBackground: some View {
        RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium)
            .fill(isSelected ? Color.brand.opacity(0.1) : Color.secondaryBackground)
    }

    private var cardBorder: some View {
        RoundedRectangle(cornerRadius: Spacing.cornerRadiusMedium)
            .stroke(
                isSelected ? Color.brand : Color.clear,
                lineWidth: isSelected ? Spacing.borderMedium : 0
            )
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
// MARK: - Property Badge
// =============================================================================

/**
 A small badge showing a template property
 */
private struct PropertyBadge: View {

    let label: String
    let value: String
    let color: Color

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var isCompact: Bool {
        horizontalSizeClass == .compact
    }

    var body: some View {
        HStack(spacing: Spacing.xSmall) {
            Text(label)
                .font(isCompact ? .caption2 : .caption)
                .foregroundColor(.tertiaryText)

            Text(":")
                .font(isCompact ? .caption2 : .caption)
                .foregroundColor(.tertiaryText)

            Text(value)
                .font(isCompact ? .caption2 : .caption)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
        .padding(.horizontal, Spacing.small)
        .padding(.vertical, Spacing.xSmall)
        .background(
            Capsule()
                .fill(Color.tertiaryBackground)
        )
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct TemplateCard_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iOS - Selected
            TemplateCard(
                template: .hboCue,
                isSelected: true,
                onApply: {}
            )
            .previewDevice("iPhone 14 Pro")
            .previewDisplayName("iOS - Selected")

            // iOS - Normal
            TemplateCard(
                template: .ambientLoop,
                isSelected: false,
                onApply: {}
            )
            .previewDevice("iPhone 14 Pro")
            .previewDisplayName("iOS - Normal")

            // macOS
            TemplateCard(
                template: .ritualCollage,
                isSelected: false,
                onApply: {}
            )
            .previewDevice("Mac Pro")
            .previewDisplayName("macOS")

            // tvOS
            TemplateCard(
                template: .performancePiece,
                isSelected: false,
                onApply: {}
            )
            .previewDevice("Apple TV")
            .previewDisplayName("tvOS")
        }
        .padding()
        .frame(width: 400)
    }
}
#endif
