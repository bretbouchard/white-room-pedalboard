//
//  PerformanceCard.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Performance Card
// =============================================================================

/**
 A card displaying a performance in the performance strip

 Platform adaptations:
 - iOS: Tap to select, long-press for edit, swipe-up for editor
 - macOS: Click to select, hover effects, context menu
 - tvOS: Focus engine, select button for actions
 */
public struct PerformanceCard: View {

    // MARK: - Properties

    let performance: PerformanceState_v1
    let isActive: Bool
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
        performance: PerformanceState_v1,
        isActive: Bool = false,
        onTap: @escaping () -> Void,
        onEdit: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.performance = performance
        self.isActive = isActive
        self.onTap = onTap
        self.onEdit = onEdit
        self.onDelete = onDelete
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: isCompact ? Spacing.small : Spacing.medium) {
            // Thumbnail with waveform
            thumbnailView

            // Performance Name
            Text(performance.name)
                .font(isCompact ? .labelMedium : .labelLarge)
                .fontWeight(isActive ? .semibold : .regular)
                .foregroundColor(isActive ? .primaryText : .secondaryText)
                .lineLimit(1)
                .frame(maxWidth: isCompact ? 100 : 120)

            // Quick Stats
            quickStatsView
        }
        .padding(isCompact ? Spacing.small : Spacing.medium)
        .background(cardBackground)
        .overlay(cardBorder)
        .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: shadowOffset)
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
        .gesture(cardGesture)
        .buttonStyle(PlainButtonStyle())
        .contextMenu {
            contextualMenu
        }
        .tvFocusable()
    }

    // MARK: - Thumbnail View

    private var thumbnailView: some View {
        ZStack {
            // Background gradient based on arrangement style
            LinearGradient(
                gradient: gradientForStyle(performance.arrangementStyle),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .opacity(isActive ? 0.8 : 0.6)

            // Waveform visualization
            waveformView

            // Active indicator
            if isActive {
                VStack {
                    HStack {
                        Spacer()

                        Image(systemName: "checkmark.circle.fill")
                            .font(isCompact ? .caption : .body)
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                    }
                    Spacer()
                }
                .padding(Spacing.xSmall)
            }
        }
        .frame(
            width: isCompact ? 100 : 120,
            height: isCompact ? 60 : 80
        )
        .clipShape(RoundedRectangle(cornerRadius: isCompact ? Spacing.cornerRadiusSmall : Spacing.cornerRadiusMedium))
    }

    // MARK: - Waveform View

    private var waveformView: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height

            // Generate waveform bars based on density
            let barCount = isCompact ? 20 : 30
            let barWidth = width / CGFloat(barCount)

            ZStack {
                ForEach(0..<barCount, id: \.self) { i in
                    let barHeight = generateBarHeight(for: i, total: barCount, maxHeight: height)
                    let xPosition = CGFloat(i) * barWidth

                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.white.opacity(isActive ? 0.9 : 0.6))
                        .frame(width: barWidth - 2, height: barHeight)
                        .offset(y: (height - barHeight) / 2)
                }
            }
        }
    }

    private func generateBarHeight(for index: Int, total: Int, maxHeight: CGFloat) -> CGFloat {
        // Generate pseudo-random but consistent waveform based on performance ID
        let hash = performance.id.hashValue
        let seed = abs(hash + index * 13)

        // Use density to affect overall height
        let densityMultiplier = performance.density
        let randomFactor = CGFloat(seed % 100) / 100.0

        let minHeight = maxHeight * 0.2
        let maxBarHeight = maxHeight * 0.8 * densityMultiplier

        return minHeight + (maxBarHeight * randomFactor)
    }

    private func gradientForStyle(_ style: ArrangementStyle) -> Gradient {
        switch style {
        case .SOLO_PIANO:
            return Gradient(colors: [.blue, .purple])
        case .SATB:
            return Gradient(colors: [.green, .teal])
        case .AMBIENT_TECHNO, .ELECTRONIC:
            return Gradient(colors: [.orange, .red])
        case .JAZZ_TRIO, .JAZZ_COMBO:
            return Gradient(colors: [.yellow, .orange])
        default:
            return Gradient(colors: [.pink, .purple])
        }
    }

    // MARK: - Quick Stats View

    private var quickStatsView: some View {
        HStack(spacing: isCompact ? Spacing.xSmall : Spacing.small) {
            // Density indicator
            statIndicator(
                icon: "circle.fill",
                value: String(format: "%.0f%%", performance.density * 100)
            )

            // Arrangement style
            statIndicator(
                icon: styleIcon(performance.arrangementStyle),
                value: styleLabel(performance.arrangementStyle)
            )
        }
    }

    private func statIndicator(icon: String, value: String) -> some View {
        HStack(spacing: 2) {
            Image(systemName: icon)
                .font(isCompact ? .caption2 : .caption2)
                .foregroundColor(.secondary)

            Text(value)
                .font(isCompact ? .caption2 : .caption2)
                .foregroundColor(.secondary)
        }
    }

    private func styleIcon(_ style: ArrangementStyle) -> String {
        switch style {
        case .SOLO_PIANO: return "pianokeys"
        case .SATB: return "person.3.fill"
        case .AMBIENT_TECHNO, .ELECTRONIC: return "waveform.path"
        case .JAZZ_TRIO, .JAZZ_COMBO: return "music.quarternote.3"
        default: return "star.fill"
        }
    }

    private func styleLabel(_ style: ArrangementStyle) -> String {
        switch style {
        case .SOLO_PIANO: return "Piano"
        case .SATB: return "SATB"
        case .AMBIENT_TECHNO: return "Techno"
        case .ELECTRONIC: return "Electro"
        case .JAZZ_TRIO: return "Trio"
        case .JAZZ_COMBO: return "Jazz"
        default: return "Custom"
        }
    }

    // MARK: - Card Styling

    @State private var isPressed = false

    private var cardBackground: some View {
        RoundedRectangle(cornerRadius: isCompact ? Spacing.cornerRadiusSmall : Spacing.cornerRadiusMedium)
            .fill(isActive ? Color.blue.opacity(0.1) : Color.secondary.opacity(0.05))
    }

    private var cardBorder: some View {
        RoundedRectangle(cornerRadius: isCompact ? Spacing.cornerRadiusSmall : Spacing.cornerRadiusMedium)
            .stroke(
                isActive ? Color.blue : Color.clear,
                lineWidth: 2
            )
    }

    private var shadowColor: Color {
        isActive ? .blue.opacity(0.3) : .black.opacity(0.1)
    }

    private var shadowRadius: CGFloat {
        isActive ? Spacing.shadowLarge : Spacing.shadowMedium
    }

    private var shadowOffset: CGFloat {
        isActive ? Spacing.shadowMedium : Spacing.shadowSmall
    }

    // MARK: - Gesture

    private var cardGesture: some Gesture {
        SimultaneousGesture(
            // Tap gesture
            TapGesture()
                .onEnded { _ in
                    onTap()
                },

            // Long press gesture
            LongPressGesture(minimumDuration: 0.5)
                .onEnded { _ in
                    onEdit()
                }
        )
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

        Button(action: {} ) {
            Label("Export", systemImage: "square.and.arrow.up")
        }
        #endif
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct PerformanceCard_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iOS - Active
            PerformanceCard(
                performance: mockPerformance,
                isActive: true,
                onTap: {},
                onEdit: {},
                onDelete: {}
            )
            .previewDevice("iPhone 14 Pro")
            .previewDisplayName("iOS - Active")

            // iOS - Inactive
            PerformanceCard(
                performance: mockPerformance,
                isActive: false,
                onTap: {},
                onEdit: {},
                onDelete: {}
            )
            .previewDevice("iPhone 14 Pro")
            .previewDisplayName("iOS - Inactive")

            // macOS
            PerformanceCard(
                performance: mockPerformance,
                isActive: false,
                onTap: {},
                onEdit: {},
                onDelete: {}
            )
            .previewDevice("Mac Pro")
            .previewDisplayName("macOS")

            // tvOS
            PerformanceCard(
                performance: mockPerformance,
                isActive: false,
                onTap: {},
                onEdit: {},
                onDelete: {}
            )
            .previewDevice("Apple TV")
            .previewDisplayName("tvOS")
        }
        .padding()
    }

    private static let mockPerformance = PerformanceState_v1(
        id: "piano-perf-1",
        name: "Solo Piano",
        arrangementStyle: .SOLO_PIANO,
        density: 0.6,
        grooveProfileId: "straight",
        instrumentationMap: [
            "piano": PerformanceInstrumentAssignment(instrumentId: "LocalGal")
        ],
        consoleXProfileId: "default",
        mixTargets: [:]
    )
}
#endif
